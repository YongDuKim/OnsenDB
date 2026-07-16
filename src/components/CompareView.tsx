import { useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { METRICS } from '../schema'
import { fmt, getMetricValue } from '../lib/format'
import { metricColor } from '../lib/color'
import type { OnsenRecord } from '../types'

/* ============================================================
   比較(棒グラフ)
   ============================================================ */
export function CompareView({ records }: { records: OnsenRecord[] }) {
  const [metricId, setMetricId] = useState('temp')
  const metric = METRICS.find((m) => m.id === metricId) ?? METRICS[0]!
  const data = records
    .map((r) => ({ name: r.name, value: getMetricValue(r, metricId), builtin: !!r.builtin }))
    .filter((d): d is { name: string; value: number; builtin: boolean } => d.value != null)
    .sort((a, b) => b.value - a.value)
  const vals = data.filter((d) => !d.builtin).map((d) => d.value)
  const vMin = vals.length ? Math.min(...vals) : 0
  const vMax = vals.length ? Math.max(...vals) : 1
  const seaShown = data.some((d) => d.builtin)

  return (
    <div className="o-card">
      <div className="o-section-title">全温泉の横並び比較</div>
      <label className="o-label" htmlFor="compare-metric">
        指標を選択
      </label>
      <select
        id="compare-metric"
        className="o-select"
        style={{ maxWidth: 320, marginBottom: 8 }}
        value={metricId}
        onChange={(e) => setMetricId(e.target.value)}
      >
        {METRICS.map((m) => (
          <option key={m.id} value={m.id}>
            {m.label}
            {m.unit ? `(${m.unit})` : ''}
          </option>
        ))}
      </select>
      <div style={{ fontSize: 12, color: '#5A6B69', marginBottom: 12 }}>
        {seaShown ? (
          <span>
            <span style={{ color: '#0E7490', fontWeight: 700 }}>■</span>{' '}
            青緑のバーが海水(比較基準)です
          </span>
        ) : (
          '※ 海水(比較基準)はこの指標のデータがないため表示されません(泉温など)'
        )}
      </div>
      {data.length === 0 ? (
        <div className="o-empty">この指標のデータが入力された温泉がまだありません。</div>
      ) : (
        <ResponsiveContainer width="100%" height={Math.max(220, data.length * 38)}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ left: 8, right: 40, top: 4, bottom: 4 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#DDE4E2" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fontSize: 11 }}
              unit={metric.unit ? ` ${metric.unit}` : ''}
            />
            <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => [`${fmt(Number(v))} ${metric.unit}`, metric.label]} />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {data.map((d, i) => (
                <Cell
                  key={i}
                  fill={d.builtin ? '#0E7490' : metricColor(metric.kind, d.value, vMin, vMax)}
                  stroke={d.builtin ? '#155E75' : 'none'}
                  strokeWidth={d.builtin ? 2 : 0}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
