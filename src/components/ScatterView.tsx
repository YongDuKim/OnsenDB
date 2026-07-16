import { useState } from 'react'
import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts'
import { METRICS } from '../schema'
import { fmt, getMetricValue } from '../lib/format'
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
  const mx = METRICS.find((m) => m.id === xId) ?? METRICS[0]!
  const my = METRICS.find((m) => m.id === yId) ?? METRICS[0]!
  const all = records
    .map((r) => ({
      name: r.name,
      x: getMetricValue(r, xId),
      y: getMetricValue(r, yId),
      builtin: !!r.builtin,
    }))
    .filter((d): d is ScatterDatum => d.x != null && d.y != null)
  const data = all.filter((d) => !d.builtin)
  const seaData = all.filter((d) => d.builtin)

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
            {METRICS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
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
            {METRICS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div style={{ fontSize: 12, color: '#5A6B69', marginBottom: 12 }}>
        {seaData.length > 0 ? (
          <span>
            <span style={{ color: '#0E7490', fontWeight: 700 }}>◆</span>{' '}
            青緑のひし形が海水(比較基準)です
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
            <ZAxis range={[90, 90]} />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              content={<ScatterTooltip mx={mx} my={my} />}
            />
            <Scatter data={data} fill="#35577D" fillOpacity={0.85} />
            {seaData.length > 0 && (
              <Scatter data={seaData} fill="#0E7490" shape="diamond" legendType="diamond" />
            )}
          </ScatterChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
