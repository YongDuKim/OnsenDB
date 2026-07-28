import { useState } from 'react'
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
import type { Metric, OnsenRecord } from '../types'

interface ScatterDatum {
  name: string
  x: number
  y: number
  builtin: boolean
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
  // 点数が多いときは点を小さくして重なりを見やすくする(値は recharts の面積指定)
  const dotArea = data.length > 1500 ? 18 : data.length > 300 ? 42 : 90
  // 海水は比較基準であって温泉ではないため、回帰・相関の計算からは除く
  const fit = linearFit(data)
  const band = correlationBand(fit?.r ?? 0)
  // ReferenceLine の segment は2点固定のタプル。縁取りと本体で同じものを使う
  const fitSegment: readonly [{ x: number; y: number }, { x: number; y: number }] | undefined = fit
    ? [
        { x: fit.xMin, y: fit.slope * fit.xMin + fit.intercept },
        { x: fit.xMax, y: fit.slope * fit.xMax + fit.intercept },
      ]
    : undefined

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
            onChange={(e) => setXId(e.target.value)}
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
            onChange={(e) => setYId(e.target.value)}
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
        <ResponsiveContainer width="100%" height={380}>
          <ScatterChart margin={{ left: 8, right: 24, top: 12, bottom: 12 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#DDE4E2" />
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
              domain={['auto', 'auto']}
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
              domain={['auto', 'auto']}
            />
            {/* 産総研データなど数千点の描画に備え、点数に応じて点を小さくする */}
            <ZAxis range={[dotArea, dotArea]} />
            <ZAxis zAxisId="sea" range={[90, 90]} />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              content={<ScatterTooltip mx={mx} my={my} />}
            />
            <Scatter
              data={data}
              fill="#35577D"
              fillOpacity={data.length > 300 ? 0.55 : 0.85}
              isAnimationActive={false}
            />
            {seaData.length > 0 && (
              <Scatter
                data={seaData}
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
          </ScatterChart>
        </ResponsiveContainer>
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
