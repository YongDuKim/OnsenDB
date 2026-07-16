import { useState } from 'react'
import type { OnsenRecord } from '../types'

/* ============================================================
   バックアップ/復元モーダル
   スマホ環境ではファイルのダウンロードが動かない場合が
   あるため、テキストのコピー&貼り付けを主な手段にする
   ============================================================ */
export function BackupModal({
  records,
  onClose,
  onRestore,
}: {
  records: OnsenRecord[]
  onClose: () => void
  onRestore: (text: string) => boolean
}) {
  const [text, setText] = useState(() => JSON.stringify(records, null, 2))
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // クリップボードAPIが使えない環境では全選択して手動コピーを促す
      const ta = document.getElementById('o-backup-ta') as HTMLTextAreaElement | null
      if (ta) {
        ta.focus()
        ta.select()
      }
      alert('自動コピーできませんでした。選択された文字列を長押し等でコピーしてください。')
    }
  }
  const download = () => {
    try {
      const blob = new Blob([text], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'onsen-database.json'
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 3000)
    } catch {
      alert('この環境ではダウンロードできません。「コピー」でメモ帳等に保存してください。')
    }
  }
  const restore = () => {
    if (onRestore(text)) onClose()
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(30,50,49,.5)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        className="o-card"
        style={{ maxWidth: 560, width: '100%', maxHeight: '85vh', overflowY: 'auto', margin: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="o-section-title" style={{ marginTop: 0 }}>
          バックアップ / 復元
        </div>
        <div style={{ fontSize: 13, color: '#5A6B69', marginBottom: 10, lineHeight: 1.7 }}>
          下の内容をコピーしてメモ帳などに保存すればバックアップ完了です。
          復元するときは、保存しておいた内容を下の欄に貼り付けてから「取り込む」を押してください。
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          <button className="o-btn" onClick={copy}>
            {copied ? '✓ コピーしました' : 'コピー'}
          </button>
          <button className="o-btn ghost" onClick={download}>
            ファイル保存
          </button>
          <button className="o-btn ghost" onClick={restore}>
            取り込む
          </button>
          <button className="o-btn ghost" style={{ marginLeft: 'auto' }} onClick={onClose}>
            閉じる
          </button>
        </div>
        <textarea
          id="o-backup-ta"
          className="o-input"
          aria-label="バックアップJSON"
          style={{
            width: '100%',
            height: '38vh',
            minHeight: 150,
            fontFamily: 'monospace',
            fontSize: 11,
          }}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </div>
    </div>
  )
}
