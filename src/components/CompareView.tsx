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
import { fmt, getMetricValue, placeOf, recordLabel } from '../lib/format'
import { metricColor } from '../lib/color'
import type { OnsenRecord } from '../types'

interface Row {
  label: string
  name: string
  place: string
  value: number
  builtin: boolean
}

/** 軸の幅(140px・11px文字)に収まらない見出しは省略する(全文はツールチップで確認できる) */
const NAME_MAX = 12
const ellipsis = (s: string) => (s.length > NAME_MAX ? s.slice(0, NAME_MAX) + '…' : s)

/**
 * 縦軸の見出し。施設名と場所を2行に分けて表示する。
 * 1行にまとめると長い源泉名で軸幅に収まらないため。
 */
function CategoryTick({
  x,
  y,
  payload,
  rows,
}: {
  x?: number
  y?: number
  payload?: { value?: string }
  rows: Map<string, Row>
}) {
  const row = rows.get(String(payload?.value ?? ''))
  if (!row) return null
  // 2行のときは上下に振り分け、場所が無い1行のときは中央に置く
  return (
    <g transform={`translate(${x ?? 0},${y ?? 0})`}>
      <text
        x={-8}
        y={row.place ? -6 : 0}
        textAnchor="end"
        dominantBaseline="central"
        fontSize={11}
        fill="#2C3B39"
      >
        {ellipsis(row.name)}
      </text>
      {row.place && (
        <text x={-8} y={7} textAnchor="end" dominantBaseline="central" fontSize={10} fill="#5A6B69">
          {row.place}
        </text>
      )}
    </g>
  )
}

/* ============================================================
   比較(棒グラフ)
   ============================================================ */
export function CompareView({ records }: { records: OnsenRecord[] }) {
  const [metricId, setMetricId] = useState('temp')
  const metric = METRICS.find((m) => m.id === metricId) ?? METRICS[0]!
  const data = records
    .map((r) => ({
      label: recordLabel(r),
      name: r.name,
      place: placeOf(r),
      value: getMetricValue(r, metricId),
      builtin: !!r.builtin,
    }))
    .filter((d): d is Row => d.value != null)
    .sort((a, b) => b.value - a.value)
  const rows = new Map(data.map((d) => [d.label, d]))
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
        <ResponsiveContainer width="100%" height={Math.max(220, data.length * 42)}>
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
            <YAxis
              type="category"
              dataKey="label"
              width={140}
              tick={<CategoryTick rows={rows} />}
            />
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
