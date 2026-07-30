import { useCallback, useEffect, useRef, useState } from 'react'
import {
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
  usePlotArea,
  useXAxisInverseScale,
  useYAxisInverseScale,
} from 'recharts'
import { MOLAR_METRICS } from '../schema'
import { fmt, getMolarMetricValue } from '../lib/format'
import {
  CORRELATION_BANDS,
  MIN_POINTS,
  correlationBand,
  formatEquation,
  formatR,
  linearFit,
} from '../lib/stats'
import {
  MIN_DRAG_PX,
  formatValue,
  rangeFromCorners,
  tickDecimals,
  withinRange,
  type Point,
  type ZoomRange,
} from '../lib/zoom'
import type { Metric, OnsenRecord } from '../types'

interface ScatterDatum {
  name: string
  x: number
  y: number
  builtin: boolean
}

/** 点が打たれる矩形(軸の内側)。左上が (x, y) で、グラフ左上からの画素 */
interface PlotRect {
  x: number
  y: number
  width: number
  height: number
}

interface ChartGeometry {
  plot: PlotRect
  /** 画素 → データ値 */
  toDataX: (px: number) => number
  toDataY: (py: number) => number
}

const samePlot = (a: PlotRect | null, b: PlotRect | null): boolean =>
  a === b ||
  (a != null &&
    b != null &&
    a.x === b.x &&
    a.y === b.y &&
    a.width === b.width &&
    a.height === b.height)

/**
 * 描画領域の位置と「画素 → データ値」の逆変換は recharts の内部状態にしかないため、
 * グラフの子として置いたこの部品から取り出して親へ渡す(それ自体は何も描かない)。
 */
function GeometryProbe({ onChange }: { onChange: (g: ChartGeometry | null) => void }) {
  const plot = usePlotArea()
  const invX = useXAxisInverseScale()
  const invY = useYAxisInverseScale()
  // 軸や拡大範囲が変わると逆変換も変わるため、依存配列は置かず毎回の描画で報告する
  useEffect(() => {
    onChange(
      plot && invX && invY
        ? {
            plot: { x: plot.x, y: plot.y, width: plot.width, height: plot.height },
            toDataX: (px) => Number(invX(px)),
            toDataY: (py) => Number(invY(py)),
          }
        : null,
    )
  })
  return null
}

function ScatterTooltip({
  active,
  payload,
  mx,
  my,
}: {
  active?: boolean
  payload?: ReadonlyArray<{ payload?: unknown }>
  mx: Metric
  my: Metric
}) {
  if (!active || !payload?.length) return null
  const p = payload[0]?.payload as ScatterDatum | undefined
  if (!p) return null
  return (
    <div
      style={{
        background: '#FBFCFB',
        border: '1px solid #C9D3D1',
        borderRadius: 8,
        padding: '8px 12px',
        fontSize: 12,
      }}
    >
      <div style={{ fontWeight: 700 }}>{p.name}</div>
      <div>
        {mx.label}: {fmt(p.x)} {mx.unit}
      </div>
      <div>
        {my.label}: {fmt(p.y)} {my.unit}
      </div>
    </div>
  )
}

/* ============================================================
   散布図
   ============================================================ */
export function ScatterView({ records }: { records: OnsenRecord[] }) {
  const [xId, setXId] = useState('temp')
  const [yId, setYId] = useState('tds')
  // 拡大表示中の範囲(データ値)。null なら全体表示
  const [zoom, setZoom] = useState<ZoomRange | null>(null)
  // 指での操作は、押した時点で「なぞる=拡大範囲の選択」か「画面のスクロール」かを
  // 決めておく必要がある。既定ではスクロールを優先し、このモード中だけ選択に使う
  const [touchSelect, setTouchSelect] = useState(false)
  const [plot, setPlot] = useState<PlotRect | null>(null)
  const geomRef = useRef<ChartGeometry | null>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  // ドラッグ中の枠は毎フレーム動くため、状態ではなく DOM を直接書き換える。
  // 数千点のグラフを再描画せずに済み、なぞる操作が引っかからない
  const dragRef = useRef<{ from: Point; to: Point } | null>(null)

  const handleGeometry = useCallback((g: ChartGeometry | null) => {
    geomRef.current = g
    setPlot((prev) => (samePlot(prev, g?.plot ?? null) ? prev : (g?.plot ?? null)))
  }, [])

  // 軸を変えると範囲の意味が変わるため、拡大は解除して全体表示に戻す
  const changeAxis = (setId: (v: string) => void, id: string) => {
    setId(id)
    setZoom(null)
  }

  // 成分は重量ではなくモル濃度で比べる(単位・値ともに MOLAR_ 系で揃える)
  const mx = MOLAR_METRICS.find((m) => m.id === xId) ?? MOLAR_METRICS[0]!
  const my = MOLAR_METRICS.find((m) => m.id === yId) ?? MOLAR_METRICS[0]!
  const all = records
    .map((r) => ({
      name: r.name,
      x: getMolarMetricValue(r, xId),
      y: getMolarMetricValue(r, yId),
      builtin: !!r.builtin,
    }))
    .filter((d): d is ScatterDatum => d.x != null && d.y != null)
  const data = all.filter((d) => !d.builtin)
  const seaData = all.filter((d) => d.builtin)
  // 拡大中は範囲外の点を渡さない(軸の外にはみ出さず、描画する点数も減らせる)
  const shown = zoom ? data.filter((d) => withinRange(d, zoom)) : data
  const shownSea = zoom ? seaData.filter((d) => withinRange(d, zoom)) : seaData
  // 点数が多いときは点を小さくして重なりを見やすくする(値は recharts の面積指定)。
  // 拡大して点がまばらになれば、その分だけ点を大きく戻す
  const dotArea = shown.length > 1500 ? 18 : shown.length > 300 ? 42 : 90
  // 海水は比較基準であって温泉ではないため、回帰・相関の計算からは除く。
  // 近似直線と相関係数は拡大しても変わらない(全データの傾向を示すもの)
  const fit = linearFit(data)
  const band = correlationBand(fit?.r ?? 0)
  // 拡大中は軸の範囲が半端な値になるため、目盛りの桁を範囲の広さに合わせて丸める。
  // 全体表示のときは recharts が切りのよい目盛りを選ぶので、そのまま表示する
  const xDigits = zoom ? tickDecimals(zoom.x1 - zoom.x0) : 0
  const yDigits = zoom ? tickDecimals(zoom.y1 - zoom.y0) : 0
  const zoomTick = (digits: number) => (v: number | string) => formatValue(Number(v), digits)
  // ReferenceLine の segment は2点固定のタプル。縁取りと本体で同じものを使う
  const fitSegment: readonly [{ x: number; y: number }, { x: number; y: number }] | undefined = fit
    ? [
        { x: fit.xMin, y: fit.slope * fit.xMin + fit.intercept },
        { x: fit.xMax, y: fit.slope * fit.xMax + fit.intercept },
      ]
    : undefined

  /** グラフ左上を原点とする画素座標。描画領域の外にはみ出した分は縁に寄せる */
  const pointerAt = (e: React.PointerEvent<HTMLDivElement>, area: PlotRect): Point => {
    const rect = e.currentTarget.getBoundingClientRect()
    return {
      x: Math.min(Math.max(e.clientX - rect.left, area.x), area.x + area.width),
      y: Math.min(Math.max(e.clientY - rect.top, area.y), area.y + area.height),
    }
  }

  /** 選択中の枠を描き直す(dragRef が null なら消す) */
  const paintSelection = () => {
    const el = boxRef.current
    if (!el) return
    const d = dragRef.current
    if (!d) {
      el.style.display = 'none'
      return
    }
    el.style.display = 'block'
    el.style.left = `${Math.min(d.from.x, d.to.x)}px`
    el.style.top = `${Math.min(d.from.y, d.to.y)}px`
    el.style.width = `${Math.abs(d.to.x - d.from.x)}px`
    el.style.height = `${Math.abs(d.to.y - d.from.y)}px`
  }

  const startDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    // 指の操作は「指で範囲を選ぶ」を押している間だけ。押していなければ画面のスクロールに任せる
    if (!plot || e.button !== 0 || (e.pointerType === 'touch' && !touchSelect)) return
    // 軸や余白から始めても、いちばん近い描画領域の縁から始めたものとして扱う
    // (指では端の点を含めようとして軸の上から始めがちなため)
    e.currentTarget.setPointerCapture(e.pointerId)
    const p = pointerAt(e, plot)
    dragRef.current = { from: p, to: p }
    paintSelection()
  }

  const moveDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current
    if (!d || !plot) return
    d.to = pointerAt(e, plot)
    paintSelection()
  }

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current
    dragRef.current = null
    paintSelection()
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
    const geom = geomRef.current
    if (!d || !geom) return
    // ただのタップ・小さすぎる選択では拡大しない
    if (Math.abs(d.to.x - d.from.x) < MIN_DRAG_PX || Math.abs(d.to.y - d.from.y) < MIN_DRAG_PX) {
      return
    }
    const range = rangeFromCorners(
      { x: geom.toDataX(d.from.x), y: geom.toDataY(d.from.y) },
      { x: geom.toDataX(d.to.x), y: geom.toDataY(d.to.y) },
    )
    if (!range) return
    setZoom(range)
    // 拡大したら選択モードを抜け、画面のスクロールを元に戻す
    setTouchSelect(false)
  }

  const cancelDrag = () => {
    dragRef.current = null
    paintSelection()
  }

  return (
    <div className="o-card">
      <div className="o-section-title">2軸で傾向を見る</div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
        <div style={{ flex: '1 1 180px' }}>
          <label className="o-label" htmlFor="scatter-x">
            横軸
          </label>
          <select
            id="scatter-x"
            className="o-select"
            value={xId}
            onChange={(e) => changeAxis(setXId, e.target.value)}
          >
            {MOLAR_METRICS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
                {m.unit ? `(${m.unit})` : ''}
              </option>
            ))}
          </select>
        </div>
        <div style={{ flex: '1 1 180px' }}>
          <label className="o-label" htmlFor="scatter-y">
            縦軸
          </label>
          <select
            id="scatter-y"
            className="o-select"
            value={yId}
            onChange={(e) => changeAxis(setYId, e.target.value)}
          >
            {MOLAR_METRICS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
                {m.unit ? `(${m.unit})` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div style={{ fontSize: 12, color: '#5A6B69', marginBottom: 4 }}>
        ※ 成分は重量だと原子量の差で大小が変わるため、モル濃度(mmol/kg)に換算して比べています
        (換算できないラドン・溶存物質総量は分析書の単位のまま)
      </div>
      <div style={{ fontSize: 12, color: '#5A6B69', marginBottom: 12 }}>
        {seaData.length > 0 ? (
          <span>
            <span style={{ color: '#0E7490', fontWeight: 700 }}>◆</span>{' '}
            青緑のひし形が海水(比較基準)です。温泉の傾向を見るため、相関の計算からは除いています
          </span>
        ) : (
          '※ 海水(比較基準)は選択中の軸のデータがないため表示されません(泉温など)'
        )}
      </div>
      {all.length === 0 ? (
        <div className="o-empty">両方の指標が入力された温泉がまだありません。</div>
      ) : (
        <>
          <div
            style={{
              display: 'flex',
              gap: 8,
              alignItems: 'center',
              flexWrap: 'wrap',
              marginBottom: 8,
            }}
          >
            <button
              type="button"
              className={'o-btn sm' + (touchSelect ? '' : ' ghost')}
              aria-pressed={touchSelect}
              onClick={() => setTouchSelect((v) => !v)}
            >
              {touchSelect ? '範囲の選択をやめる' : '指で範囲を選ぶ'}
            </button>
            {zoom && (
              <button type="button" className="o-btn ghost sm" onClick={() => setZoom(null)}>
                全画面に戻す
              </button>
            )}
            <span style={{ fontSize: 12, color: '#5A6B69', lineHeight: 1.7 }}>
              {touchSelect
                ? '拡大したい範囲を指でなぞって囲んでください(選択中は画面のスクロールができません)'
                : '図の上をドラッグすると、囲んだ範囲だけを拡大して表示します(指で操作するときは左のボタンを押してから)'}
            </span>
          </div>
          {zoom && (
            <div style={{ fontSize: 12, color: '#35577D', fontWeight: 700, marginBottom: 6 }}>
              拡大中 ─ {mx.label} {formatValue(zoom.x0, xDigits)}〜{formatValue(zoom.x1, xDigits)}
              {mx.unit ? ` ${mx.unit}` : ''} / {my.label} {formatValue(zoom.y0, yDigits)}〜
              {formatValue(zoom.y1, yDigits)}
              {my.unit ? ` ${my.unit}` : ''}(この範囲に {shown.length} 件)
            </div>
          )}
          <div
            style={{
              position: 'relative',
              // 指でなぞる操作を拡大範囲の選択に使うため、その間だけ既定のスクロールを止める
              touchAction: touchSelect ? 'none' : undefined,
              userSelect: 'none',
              cursor: plot ? 'crosshair' : undefined,
            }}
            onPointerDown={startDrag}
            onPointerMove={moveDrag}
            onPointerUp={endDrag}
            onPointerCancel={cancelDrag}
          >
            <ResponsiveContainer width="100%" height={380}>
              <ScatterChart margin={{ left: 8, right: 24, top: 12, bottom: 12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#DDE4E2" />
                {/* 拡大中は選んだ範囲をそのまま軸の範囲にする(はみ出す点は切り取られる) */}
                <XAxis
                  type="number"
                  dataKey="x"
                  name={mx.label}
                  tick={{ fontSize: 11 }}
                  label={{
                    value: `${mx.label}${mx.unit ? ` (${mx.unit})` : ''}`,
                    position: 'insideBottom',
                    offset: -6,
                    fontSize: 12,
                  }}
                  domain={zoom ? [zoom.x0, zoom.x1] : ['auto', 'auto']}
                  allowDataOverflow={zoom != null}
                  tickFormatter={zoom ? zoomTick(xDigits) : undefined}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  name={my.label}
                  tick={{ fontSize: 11 }}
                  label={{
                    value: `${my.label}${my.unit ? ` (${my.unit})` : ''}`,
                    angle: -90,
                    position: 'insideLeft',
                    fontSize: 12,
                  }}
                  domain={zoom ? [zoom.y0, zoom.y1] : ['auto', 'auto']}
                  allowDataOverflow={zoom != null}
                  tickFormatter={zoom ? zoomTick(yDigits) : undefined}
                />
                {/* 産総研データなど数千点の描画に備え、点数に応じて点を小さくする */}
                <ZAxis range={[dotArea, dotArea]} />
                <ZAxis zAxisId="sea" range={[90, 90]} />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  content={<ScatterTooltip mx={mx} my={my} />}
                />
                <Scatter
                  data={shown}
                  fill="#35577D"
                  fillOpacity={shown.length > 300 ? 0.55 : 0.85}
                  isAnimationActive={false}
                />
                {shownSea.length > 0 && (
                  <Scatter
                    data={shownSea}
                    fill="#0E7490"
                    shape="diamond"
                    legendType="diamond"
                    zAxisId="sea"
                    isAnimationActive={false}
                  />
                )}
                {/*
                  データのある x 範囲だけに引く(外挿すると濃度が負の領域まで線が伸びるため)。
                  線の色は相関の強さを表すため、強い相関では点(藍)と同じ色になる。
                  重なっても線と分かるよう、白い縁取りを下に敷いてから本体を描く。
                  拡大中は ifOverflow="hidden" により描画領域の内側だけが残る。
                */}
                {fit && (
                  <ReferenceLine
                    stroke="#FBFCFB"
                    strokeWidth={6}
                    ifOverflow="hidden"
                    segment={fitSegment}
                  />
                )}
                {fit && (
                  <ReferenceLine
                    stroke={band.color}
                    strokeWidth={2.5}
                    ifOverflow="hidden"
                    segment={fitSegment}
                  />
                )}
                <GeometryProbe onChange={handleGeometry} />
              </ScatterChart>
            </ResponsiveContainer>
            {/* ドラッグ中の選択枠。位置は paintSelection が直接書き換える */}
            <div
              ref={boxRef}
              aria-hidden
              style={{
                display: 'none',
                position: 'absolute',
                border: '1.5px dashed #35577D',
                background: 'rgba(53, 87, 125, 0.12)',
                borderRadius: 2,
                pointerEvents: 'none',
              }}
            />
          </div>
        </>
      )}
      {all.length > 0 && (
        <div style={{ fontSize: 12, marginTop: 8, color: '#5A6B69' }}>
          {fit ? (
            <span>
              <span style={{ color: band.color, fontWeight: 700 }}>—</span> 近似直線 ・ n = {fit.n}{' '}
              ・ r = {/* 相関の強さを |r| の段階で色分けする。色は band の定義に従う */}
              <b
                style={{ color: band.color, fontSize: 14 }}
                title={`${band.label}(|r| ${band.min} 以上)`}
              >
                {formatR(fit.r)}
              </b>{' '}
              ・ {formatEquation(fit)}
              {/* 色の意味が分かるよう、しきい値を凡例として並べる */}
              <span style={{ display: 'inline-flex', gap: 8, marginLeft: 10, flexWrap: 'wrap' }}>
                {CORRELATION_BANDS.map((b) => (
                  <span
                    key={b.min}
                    style={{
                      color: b.color,
                      fontWeight: b === band ? 700 : 400,
                      opacity: b === band ? 1 : 0.55,
                    }}
                  >
                    ● |r| ≧ {b.min}
                  </span>
                ))}
              </span>
              {/* 拡大は見せ方だけの操作であり、統計量は全データのまま変えない
                  (範囲を絞ると相関が実際より弱く見えるため) */}
              {zoom && (
                <span style={{ display: 'block', marginTop: 4 }}>
                  ※ 近似直線・相関係数は拡大前の全 {data.length} 件で計算した値です
                </span>
              )}
            </span>
          ) : data.length < MIN_POINTS ? (
            `※ 両方の指標が入力された温泉が${MIN_POINTS}件に満たないため、近似直線と相関係数は表示できません(現在 ${data.length} 件)`
          ) : (
            '※ どちらかの指標が全温泉で同じ値のため、近似直線と相関係数を計算できません'
          )}
        </div>
      )}
    </div>
  )
}
