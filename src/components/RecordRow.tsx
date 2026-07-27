import React from 'react'
import { ALL_COMPONENTS, COMPONENT_GROUPS, ION_COMPONENTS } from '../schema'
import { fmt, num } from '../lib/format'
import { metricColor } from '../lib/color'
import { bqToCi, bqToMache } from '../lib/radon'
import type { OnsenRecord } from '../types'

/* ============================================================
   一覧の1行(温泉・海水共通の開閉式カード)
   ============================================================ */
export function RecordRow({
  r,
  open,
  onToggle,
  tMin,
  tMax,
  onEdit,
  onDelete,
}: {
  r: OnsenRecord
  open: boolean
  onToggle: () => void
  tMin: number
  tMax: number
  onEdit: (r: OnsenRecord) => void
  onDelete: (r: OnsenRecord) => void
}) {
  const t = num(r.temp)
  const rn = num(r.values?.rn)
  const maxIon = Math.max(...ION_COMPONENTS.map((c) => num(r.values?.[c.id]) ?? 0), 1)
  const builtin = !!r.builtin
  return (
    <div
      className="o-row"
      style={builtin ? { background: '#EBF2F6', borderColor: '#4C86B0' } : undefined}
    >
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
        onClick={onToggle}
      >
        {builtin ? (
          <span style={{ fontSize: 16, flexShrink: 0 }}>🌊</span>
        ) : (
          <span
            style={{
              width: 14,
              height: 14,
              borderRadius: '50%',
              flexShrink: 0,
              background: metricColor('temp', t, tMin, tMax),
              border: '1px solid #fff',
              boxShadow: '0 0 0 1px #C9D3D1',
            }}
            title="泉温による色"
          />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>
            {r.name}
            {builtin && (
              <span
                className="o-badge"
                style={{ marginLeft: 8, background: '#4C86B0', color: '#fff' }}
              >
                比較基準
              </span>
            )}
          </div>
          <div style={{ fontSize: 12, color: '#5A6B69', marginTop: 2 }}>
            {builtin ? (
              '標準的な海水の溶存成分'
            ) : (
              <>
                {[r.pref, r.city].filter(Boolean).join(' ')}
                {r.quality ? ` ・ ${r.quality}` : ''}
              </>
            )}
          </div>
        </div>
        <div style={{ textAlign: 'right', fontSize: 13, whiteSpace: 'nowrap' }}>
          <div style={{ fontWeight: 700 }}>{t != null ? `${fmt(t)}℃` : '—'}</div>
          <div style={{ color: '#5A6B69' }}>pH {fmt(num(r.ph))}</div>
        </div>
        <span style={{ color: '#5A6B69', fontSize: 12 }}>{open ? '▲' : '▼'}</span>
      </div>

      {open && (
        <div style={{ marginTop: 12, borderTop: '1px dashed #C9D3D1', paddingTop: 12 }}>
          <div style={{ fontSize: 12, color: '#5A6B69', marginBottom: 8 }}>
            {r.date && <span className="o-badge">分析日 {r.date}</span>}
            {num(r.tds) != null && (
              <span className="o-badge">溶存物質総量 {fmt(num(r.tds))} mg/kg</span>
            )}
            {r.lat != null && (
              <span className="o-badge">
                座標 {r.lat}, {r.lng}
              </span>
            )}
          </div>
          {COMPONENT_GROUPS.filter((g) => g.id === 'cation' || g.id === 'anion').map((g) => {
            const entered = g.items.filter((c) => num(r.values?.[c.id]) != null)
            if (entered.length === 0) return null
            return (
              <div key={g.id} style={{ marginBottom: 8 }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#5A6B69',
                    letterSpacing: '0.08em',
                    marginBottom: 4,
                  }}
                >
                  {g.title}
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(70px,auto) 1fr minmax(80px,auto)',
                    gap: '5px 10px',
                    alignItems: 'center',
                    fontSize: 12,
                  }}
                >
                  {entered.map((c) => {
                    const v = num(r.values[c.id]) ?? 0
                    return (
                      <React.Fragment key={c.id}>
                        <span style={{ fontWeight: 700, color: '#35577D' }}>{c.short}</span>
                        <div className="o-minibar-track">
                          <div
                            className="o-minibar-fill"
                            style={{
                              width: `${(v / maxIon) * 100}%`,
                              background: g.id === 'cation' ? '#35577D' : '#4C86B0',
                            }}
                          />
                        </div>
                        <span style={{ textAlign: 'right' }}>{fmt(v)} mg/kg</span>
                      </React.Fragment>
                    )
                  })}
                </div>
              </div>
            )
          })}
          {COMPONENT_GROUPS.filter((g) => g.id === 'free' || g.id === 'gas').map((g) => {
            const entered = g.items.filter((c) => num(r.values?.[c.id]) != null)
            if (entered.length === 0) return null
            return (
              <div key={g.id} style={{ fontSize: 12, marginTop: 6 }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#5A6B69',
                    letterSpacing: '0.08em',
                    marginRight: 6,
                  }}
                >
                  {g.title}
                </span>
                {entered.map((c) => (
                  <span
                    key={c.id}
                    className="o-badge"
                    style={{ background: '#F6EED8', color: '#8A6A16' }}
                  >
                    {c.short} {fmt(num(r.values[c.id]))} {c.unit}
                  </span>
                ))}
              </div>
            )
          })}
          {rn != null && (
            <div style={{ fontSize: 12, marginTop: 6 }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#5A6B69',
                  letterSpacing: '0.08em',
                  marginRight: 6,
                }}
              >
                放射能
              </span>
              {/* 分析書と同じく3単位を併記する(保存値は Bq/kg のみ) */}
              <span className="o-badge" style={{ background: '#EBF2F6', color: '#2E4F70' }}>
                ラドン {fmt(rn)} Bq/kg
              </span>
              <span className="o-badge" style={{ background: '#EBF2F6', color: '#2E4F70' }}>
                {fmt(bqToCi(rn))} ×10⁻¹⁰ Ci/kg
              </span>
              <span className="o-badge" style={{ background: '#EBF2F6', color: '#2E4F70' }}>
                {fmt(bqToMache(rn))} マッヘ単位
              </span>
            </div>
          )}
          {ALL_COMPONENTS.every((c) => num(r.values?.[c.id]) == null) && (
            <div style={{ fontSize: 12, color: '#5A6B69' }}>成分データは未入力です。</div>
          )}
          {r.memo && (
            <div style={{ fontSize: 13, marginTop: 10, whiteSpace: 'pre-wrap' }}>{r.memo}</div>
          )}
          {!builtin && (
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button className="o-btn ghost sm" onClick={() => onEdit(r)}>
                編集
              </button>
              <button className="o-btn danger sm" onClick={() => onDelete(r)}>
                削除
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
