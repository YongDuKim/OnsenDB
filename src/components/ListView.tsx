import { SEAWATER } from '../schema'
import { num } from '../lib/format'
import type { OnsenRecord } from '../types'
import { RecordRow } from './RecordRow'

/* ============================================================
   一覧
   ============================================================ */
export function ListView({
  records,
  total,
  query,
  setQuery,
  openId,
  setOpenId,
  onEdit,
  onDelete,
  onExport,
  onImport,
  onNew,
}: {
  records: OnsenRecord[]
  total: number
  query: string
  setQuery: (q: string) => void
  openId: string | null
  setOpenId: (id: string | null) => void
  onEdit: (r: OnsenRecord) => void
  onDelete: (r: OnsenRecord) => void
  onExport: () => void
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void
  onNew: () => void
}) {
  const tempVals = records.map((r) => num(r.temp)).filter((v): v is number => v != null)
  const tMin = Math.min(...tempVals, 20)
  const tMax = Math.max(...tempVals, 60)

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        <input
          className="o-input"
          style={{ flex: '1 1 200px' }}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="施設名・都道府県・泉質で検索"
        />
        <button className="o-btn" onClick={onNew}>
          ＋ 新規登録
        </button>
        <button className="o-btn ghost sm" onClick={onExport}>
          エクスポート
        </button>
        <label
          className="o-btn ghost sm"
          style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}
        >
          インポート
          {/* accept は指定しない。スマホでは accept のフィルタにより
              .txt 等が選べなくなることがあるため、どのファイルでも
              選択できるようにし、中身の検証は取り込み時に行う */}
          <input type="file" onChange={onImport} style={{ display: 'none' }} />
        </label>
      </div>

      {total === 0 && (
        <div className="o-empty">
          まだ分析書が登録されていません。
          <br />
          「＋ 新規登録」から、お手元の温泉分析書を1件ずつ記録してください。
        </div>
      )}
      {total > 0 && records.length === 0 && (
        <div className="o-empty">「{query}」に一致する温泉はありません。</div>
      )}

      <RecordRow
        r={SEAWATER}
        open={openId === SEAWATER.id}
        onToggle={() => setOpenId(openId === SEAWATER.id ? null : SEAWATER.id)}
        tMin={tMin}
        tMax={tMax}
        onEdit={() => {}}
        onDelete={() => {}}
      />

      {records.map((r) => (
        <RecordRow
          key={r.id}
          r={r}
          open={openId === r.id}
          onToggle={() => setOpenId(openId === r.id ? null : r.id)}
          tMin={tMin}
          tMax={tMax}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}
