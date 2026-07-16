import { useState } from 'react'
import { METRICS } from '../schema'
import { fmt, getMetricValue } from '../lib/format'
import { metricColor } from '../lib/color'
import { COAST, coastPath, proj, recordPosition } from '../lib/geo'
import type { OnsenRecord } from '../types'

interface MapPoint {
  rec: OnsenRecord
  lat: number
  lng: number
  exact: boolean
  v: number | null
}

/* ============================================================
   日本地図
   ============================================================ */
export function MapView({ records }: { records: OnsenRecord[] }) {
  const [metricId, setMetricId] = useState('temp')
  const [hover, setHover] = useState<string | null>(null)
  const metric = METRICS.find((m) => m.id === metricId) ?? METRICS[0]!

  const pts: MapPoint[] = records
    .map((r) => {
      const pos = recordPosition(r)
      if (!pos) return null
      return { rec: r, ...pos, v: getMetricValue(r, metricId) }
    })
    .filter((p): p is MapPoint => p != null)

  // 同一地点(同県代表点)の重なりを少しずらす
  const seen: Record<string, number> = {}
  pts.forEach((p) => {
    const key = `${p.lat.toFixed(2)}_${p.lng.toFixed(2)}`
    const n = seen[key] ?? 0
    seen[key] = n + 1
    if (n > 0) {
      p.lat += 0.14 * Math.cos(n * 2.1)
      p.lng += 0.17 * Math.sin(n * 2.1)
    }
  })

  const withV = pts.filter((p) => p.v != null).map((p) => p.v as number)
  const vMin = withV.length ? Math.min(...withV) : 0
  const vMax = withV.length ? Math.max(...withV) : 1

  const main = pts.filter((p) => p.lat >= 30)
  const south = pts.filter((p) => p.lat < 30) // 沖縄・奄美はインセットに

  const W = 700
  const H = 800
  const legendStops = [0, 0.25, 0.5, 0.75, 1]

  return (
    <div className="o-card">
      <div className="o-section-title">各地の分布(色は選択した指標)</div>
      <label className="o-label" htmlFor="map-metric">
        色分けする指標
      </label>
      <select
        id="map-metric"
        className="o-select"
        style={{ maxWidth: 320, marginBottom: 12 }}
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

      {pts.length === 0 ? (
        <div className="o-empty">都道府県または座標が入力された温泉がまだありません。</div>
      ) : (
        <>
          <div style={{ position: 'relative' }}>
            <svg
              viewBox={`0 0 ${W} ${H}`}
              style={{
                width: '100%',
                height: 'auto',
                background: '#E3EBEE',
                borderRadius: 10,
                display: 'block',
              }}
            >
              {Object.values(COAST).map((pts2, i) => (
                <path
                  key={i}
                  d={coastPath(pts2)}
                  fill="#F5F4EC"
                  stroke="#9FB2AE"
                  strokeWidth="1.5"
                />
              ))}
              {main.map((p, i) => {
                const { x, y } = proj(p.lat, p.lng)
                return (
                  <circle
                    key={i}
                    cx={x}
                    cy={y}
                    r={hover === p.rec.id ? 13 : 10}
                    fill={metricColor(metric.kind, p.v, vMin, vMax)}
                    stroke={p.exact ? '#1E3231' : '#FBFCFB'}
                    strokeWidth={2}
                    strokeDasharray={p.exact ? '' : '3 2'}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHover(p.rec.id)}
                    onMouseLeave={() => setHover(null)}
                    onClick={() => setHover(hover === p.rec.id ? null : p.rec.id)}
                  />
                )
              })}
              {/* 沖縄・奄美インセット */}
              {south.length > 0 && (
                <g>
                  <rect
                    x={20}
                    y={H - 190}
                    width={190}
                    height={170}
                    fill="#E3EBEE"
                    stroke="#9FB2AE"
                    strokeDasharray="5 4"
                    rx={8}
                  />
                  <text x={32} y={H - 168} fontSize="13" fill="#5A6B69">
                    南西諸島
                  </text>
                  {south.map((p, i) => {
                    const x = 40 + ((p.lng - 123) / 8) * 150
                    const y = H - 40 - ((p.lat - 24) / 5) * 120
                    return (
                      <circle
                        key={i}
                        cx={x}
                        cy={y}
                        r={hover === p.rec.id ? 13 : 10}
                        fill={metricColor(metric.kind, p.v, vMin, vMax)}
                        stroke={p.exact ? '#1E3231' : '#FBFCFB'}
                        strokeWidth={2}
                        strokeDasharray={p.exact ? '' : '3 2'}
                        style={{ cursor: 'pointer' }}
                        onMouseEnter={() => setHover(p.rec.id)}
                        onMouseLeave={() => setHover(null)}
                        onClick={() => setHover(hover === p.rec.id ? null : p.rec.id)}
                      />
                    )
                  })}
                </g>
              )}
            </svg>
            {hover &&
              (() => {
                const p = pts.find((q) => q.rec.id === hover)
                if (!p) return null
                return (
                  <div
                    style={{
                      position: 'absolute',
                      top: 10,
                      right: 10,
                      background: '#FBFCFB',
                      border: '1px solid #C9D3D1',
                      borderRadius: 8,
                      padding: '10px 14px',
                      fontSize: 12,
                      maxWidth: 240,
                      boxShadow: '0 2px 8px rgba(30,50,49,.15)',
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{p.rec.name}</div>
                    <div style={{ color: '#5A6B69' }}>
                      {[p.rec.pref, p.rec.city].filter(Boolean).join(' ')}
                    </div>
                    <div style={{ marginTop: 4 }}>
                      {metric.label}:{' '}
                      <b>{p.v == null ? 'データなし' : `${fmt(p.v)} ${metric.unit}`}</b>
                    </div>
                    {!p.exact && (
                      <div style={{ color: '#8A6A16', marginTop: 2 }}>
                        ※県代表点に配置(座標未入力)
                      </div>
                    )}
                  </div>
                )
              })()}
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginTop: 12,
              flexWrap: 'wrap',
              fontSize: 12,
              color: '#5A6B69',
            }}
          >
            <span>低 {fmt(vMin)}</span>
            <div
              style={{
                display: 'flex',
                height: 12,
                borderRadius: 6,
                overflow: 'hidden',
                flex: '0 0 160px',
              }}
            >
              {legendStops.map((t, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    background: metricColor(metric.kind, vMin + t * (vMax - vMin), vMin, vMax),
                  }}
                />
              ))}
            </div>
            <span>
              高 {fmt(vMax)} {metric.unit}
            </span>
            <span style={{ marginLeft: 12 }}>● 実線縁 = 座標入力あり / 破線縁 = 県代表点</span>
          </div>
        </>
      )}
    </div>
  )
}
