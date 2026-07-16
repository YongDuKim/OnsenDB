import React, { useMemo, useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ACID_SYSTEMS, SPECIES_COLORS } from '../schema'
import { speciation } from '../lib/chemistry'
import { fmt, num } from '../lib/format'
import type { OnsenRecord } from '../types'

const speciesColor = (i: number) => SPECIES_COLORS[i % SPECIES_COLORS.length]!

/* ============================================================
   定数表 + 化学種分布図
   ============================================================ */
export function ConstantsView({ records }: { records: OnsenRecord[] }) {
  const [sysId, setSysId] = useState('h2s')
  const [ph, setPh] = useState(7.0)
  const [onsenId, setOnsenId] = useState('')
  const sys = ACID_SYSTEMS.find((s) => s.id === sysId) ?? ACID_SYSTEMS[0]!

  // pH 0〜14 の分布データ
  const curve = useMemo(() => {
    const rows: Record<string, number>[] = []
    for (let p = 0; p <= 14.001; p += 0.1) {
      const fr = speciation(sys.pka, p)
      const row: Record<string, number> = { ph: Math.round(p * 10) / 10 }
      sys.species.forEach((sp, i) => {
        row[sp] = Math.round((fr[i] ?? 0) * 10) / 10
      })
      rows.push(row)
    }
    return rows
  }, [sys])

  const current = speciation(sys.pka, ph)
  const onsenOptions = records.filter((r) => num(r.ph) != null)

  const pickOnsen = (id: string) => {
    setOnsenId(id)
    const r = records.find((x) => x.id === id)
    const v = r ? num(r.ph) : null
    if (v != null) setPh(v)
  }

  return (
    <div>
      <div className="o-card">
        <div className="o-section-title">化学種分布図(pHと存在割合)</div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
          <div style={{ flex: '1 1 180px' }}>
            <label className="o-label" htmlFor="const-sys">
              酸の系
            </label>
            <select
              id="const-sys"
              className="o-select"
              value={sysId}
              onChange={(e) => setSysId(e.target.value)}
            >
              {ACID_SYSTEMS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}({s.species.join(' / ')})
                </option>
              ))}
            </select>
          </div>
          <div style={{ flex: '1 1 180px' }}>
            <label className="o-label" htmlFor="const-onsen">
              登録温泉のpHを重ねる(任意)
            </label>
            <select
              id="const-onsen"
              className="o-select"
              value={onsenId}
              onChange={(e) => pickOnsen(e.target.value)}
            >
              <option value="">選択しない</option>
              {onsenOptions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}(pH {fmt(num(r.ph))})
                </option>
              ))}
            </select>
          </div>
        </div>

        <label className="o-label" htmlFor="const-ph">
          pH: {ph.toFixed(1)}
        </label>
        <input
          id="const-ph"
          type="range"
          min="0"
          max="14"
          step="0.1"
          value={ph}
          onChange={(e) => {
            setPh(Number(e.target.value))
            setOnsenId('')
          }}
          style={{ width: '100%', accentColor: '#35577D', marginBottom: 8 }}
        />

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          {sys.species.map((sp, i) => {
            const c = current[i] ?? 0
            return (
              <span
                key={sp}
                className="o-badge"
                style={{
                  background: '#fff',
                  border: `2px solid ${speciesColor(i)}`,
                  color: '#1E3231',
                  fontWeight: 700,
                }}
              >
                {sp}: {c < 0.1 && c > 0 ? '<0.1' : fmt(Math.round(c * 10) / 10)}%
              </span>
            )
          })}
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={curve} margin={{ left: 0, right: 16, top: 8, bottom: 12 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#DDE4E2" />
            <XAxis
              dataKey="ph"
              type="number"
              domain={[0, 14]}
              tickCount={15}
              tick={{ fontSize: 11 }}
              label={{ value: 'pH', position: 'insideBottom', offset: -6, fontSize: 12 }}
            />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" width={44} />
            <Tooltip formatter={(v, name) => [`${v}%`, name]} labelFormatter={(l) => `pH ${l}`} />
            <ReferenceLine x={ph} stroke="#1E3231" strokeDasharray="5 4" />
            {sys.species.map((sp, i) => (
              <Line
                key={sp}
                type="monotone"
                dataKey={sp}
                stroke={speciesColor(i)}
                strokeWidth={2.5}
                dot={false}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
        {sys.note && (
          <div style={{ fontSize: 12, color: '#8A6A16', marginTop: 6 }}>※ {sys.note}</div>
        )}
      </div>

      <div className="o-card">
        <div className="o-section-title">酸解離定数一覧(pKa)</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #35577D', textAlign: 'left' }}>
                <th style={{ padding: '8px 10px' }}>系</th>
                <th style={{ padding: '8px 10px' }}>解離平衡</th>
                <th style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>pKa(25℃)</th>
              </tr>
            </thead>
            <tbody>
              {ACID_SYSTEMS.map((s) => (
                <React.Fragment key={s.id}>
                  {s.pka.map((k, i) => (
                    <tr
                      key={i}
                      style={{
                        borderBottom: '1px solid #DDE4E2',
                        background: s.id === sysId ? '#F0F4F8' : 'transparent',
                        cursor: 'pointer',
                      }}
                      onClick={() => setSysId(s.id)}
                    >
                      {i === 0 && (
                        <td
                          rowSpan={s.pka.length}
                          style={{ padding: '8px 10px', fontWeight: 700, verticalAlign: 'top' }}
                        >
                          {s.name}
                        </td>
                      )}
                      <td style={{ padding: '8px 10px' }}>
                        {s.species[i]} ⇌ {s.species[i + 1]} + H⁺
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        {s.pka.length > 1 ? `pKa${'₁₂₃'[i] ?? ''} = ` : 'pKa = '}
                        {k}
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ fontSize: 12, color: '#5A6B69', marginTop: 10, lineHeight: 1.7 }}>
          行をタップすると上の分布図に反映されます。
          <br />※
          掲載値は25℃・希薄水溶液での標準値です。実際の温泉は高温・高イオン強度のため、真の解離状態はここからずれます。傾向を掴む目安としてご利用ください。
        </div>
      </div>
    </div>
  )
}
