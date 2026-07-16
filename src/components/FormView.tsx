import { COMPONENT_GROUPS, PREFS } from '../schema'
import { parseCoordText } from '../lib/format'
import type { OnsenRecord } from '../types'
import { NumField } from './NumField'

/* ============================================================
   登録・編集フォーム
   ============================================================ */
export function FormView({
  form,
  setForm,
  editing,
  onSubmit,
  onCancel,
}: {
  form: OnsenRecord
  setForm: React.Dispatch<React.SetStateAction<OnsenRecord>>
  editing: boolean
  onSubmit: () => void
  onCancel: () => void
}) {
  const set = (k: keyof OnsenRecord, v: string) => setForm((f) => ({ ...f, [k]: v }))
  const setVal = (id: string, v: string) =>
    setForm((f) => ({ ...f, values: { ...f.values, [id]: v } }))
  const coord = parseCoordText(form.coordText)

  return (
    <div>
      <div className="o-card">
        <div className="o-section-title">基本情報</div>
        <div className="o-grid">
          <div style={{ gridColumn: '1 / -1' }}>
            <label className="o-label" htmlFor="f-name">
              施設名・源泉名 *
            </label>
            <input
              id="f-name"
              className="o-input"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="例:草津温泉 湯畑源泉"
            />
          </div>
          <div>
            <label className="o-label" htmlFor="f-pref">
              都道府県
            </label>
            <select
              id="f-pref"
              className="o-select"
              value={form.pref}
              onChange={(e) => set('pref', e.target.value)}
            >
              <option value="">選択</option>
              {PREFS.map(([n]) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="o-label" htmlFor="f-city">
              市区町村
            </label>
            <input
              id="f-city"
              className="o-input"
              value={form.city}
              onChange={(e) => set('city', e.target.value)}
              placeholder="例:吾妻郡草津町"
            />
          </div>
          <div>
            <label className="o-label" htmlFor="f-date">
              分析年月日
            </label>
            <input
              id="f-date"
              className="o-input"
              type="date"
              value={form.date}
              onChange={(e) => set('date', e.target.value)}
            />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label className="o-label" htmlFor="f-quality">
              泉質名
            </label>
            <input
              id="f-quality"
              className="o-input"
              value={form.quality}
              onChange={(e) => set('quality', e.target.value)}
              placeholder="例:酸性・含硫黄-アルミニウム-硫酸塩・塩化物温泉"
            />
          </div>
          <div>
            <label className="o-label" htmlFor="f-temp">
              泉温(℃)
            </label>
            <input
              id="f-temp"
              className="o-input"
              type="number"
              step="any"
              inputMode="decimal"
              value={form.temp}
              onChange={(e) => set('temp', e.target.value)}
              placeholder="—"
            />
          </div>
          <div>
            <label className="o-label" htmlFor="f-ph">
              pH
            </label>
            <input
              id="f-ph"
              className="o-input"
              type="number"
              step="any"
              inputMode="decimal"
              value={form.ph}
              onChange={(e) => set('ph', e.target.value)}
              placeholder="—"
            />
          </div>
          <div>
            <label className="o-label" htmlFor="f-tds">
              溶存物質総量(mg/kg)
            </label>
            <input
              id="f-tds"
              className="o-input"
              type="number"
              step="any"
              inputMode="decimal"
              value={form.tds}
              onChange={(e) => set('tds', e.target.value)}
              placeholder="—"
            />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label className="o-label" htmlFor="f-coord">
              緯度・経度(地図アプリからコピーして貼り付け/任意)
            </label>
            <input
              id="f-coord"
              className="o-input"
              value={form.coordText}
              onChange={(e) => set('coordText', e.target.value)}
              placeholder="例:36.6227, 138.5963"
            />
            <div style={{ fontSize: 12, marginTop: 4, color: coord ? '#5E9C6F' : '#5A6B69' }}>
              {form.coordText.trim() === ''
                ? '未入力の場合、地図では都道府県の代表点に配置します'
                : coord
                  ? `✓ 緯度 ${coord.lat} / 経度 ${coord.lng} として認識`
                  : '座標を認識できません(例の形式で入力してください)'}
            </div>
          </div>
        </div>
      </div>

      {COMPONENT_GROUPS.map((g) => (
        <div className="o-card" key={g.id}>
          <div className="o-section-title">{g.title}</div>
          <div className="o-grid">
            {g.items.map((c) => (
              <NumField
                key={c.id}
                id={c.id}
                label={c.label}
                unit={c.unit}
                value={form.values[c.id]}
                onChange={(e) => setVal(c.id, e.target.value)}
              />
            ))}
          </div>
        </div>
      ))}

      <div className="o-card">
        <div className="o-section-title">メモ</div>
        <textarea
          className="o-input"
          aria-label="メモ"
          rows={3}
          value={form.memo}
          onChange={(e) => set('memo', e.target.value)}
          placeholder="入浴日、湯の色や香り、かけ流しか等"
        />
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button className="o-btn" onClick={onSubmit}>
          {editing ? '変更を保存' : 'この内容で登録'}
        </button>
        <button className="o-btn ghost" onClick={onCancel}>
          キャンセル
        </button>
      </div>
    </div>
  )
}
