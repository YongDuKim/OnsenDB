/* ============================================================
   成分1件分の数値入力欄
   コンポーネントの識別を安定させるためFormViewの外側で定義。
   (内側で定義すると描画のたびに別コンポーネント扱いとなり、
    1文字入力するごとにDOMが作り直されてスマホでキーボードが
    閉じてしまう不具合が起きるため)
   ============================================================ */
export function NumField({
  id,
  label,
  unit,
  value,
  onChange,
}: {
  id: string
  label: string
  unit: string
  value: string | undefined
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}) {
  return (
    <div>
      <label className="o-label" htmlFor={`num-${id}`}>
        {label}
        {unit ? `(${unit})` : ''}
      </label>
      <input
        id={`num-${id}`}
        className="o-input"
        type="number"
        step="any"
        inputMode="decimal"
        value={value ?? ''}
        onChange={onChange}
        placeholder="—"
      />
    </div>
  )
}
