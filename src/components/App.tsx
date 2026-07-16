import { useMemo, useState } from 'react'
import { SEAWATER, emptyRecord } from '../schema'
import { loadRecords, saveRecords, storageSelfTest } from '../lib/storage'
import { mergeJsonText } from '../lib/merge'
import { parseCoordText } from '../lib/format'
import type { OnsenRecord } from '../types'
import { FormView } from './FormView'
import { ListView } from './ListView'
import { CompareView } from './CompareView'
import { ScatterView } from './ScatterView'
import { MapView } from './MapView'
import { ConstantsView } from './ConstantsView'
import { BackupModal } from './BackupModal'

type StorageStatus = 'ok' | 'unavailable'

export default function App() {
  // localStorage は同期なので、初回描画時に読み込みと保存機能の自己診断を済ませる
  const [records, setRecords] = useState<OnsenRecord[]>(() => loadRecords())
  const [storageStatus] = useState<StorageStatus>(() => (storageSelfTest() ? 'ok' : 'unavailable'))
  const [tab, setTab] = useState('list')
  const [form, setForm] = useState<OnsenRecord>(emptyRecord())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const [saveMsg, setSaveMsg] = useState('')
  const [saveFailed, setSaveFailed] = useState(false)
  const [backupOpen, setBackupOpen] = useState(false)

  const persist = (next: OnsenRecord[]): boolean => {
    setRecords(next) // 画面上のデータは保存の成否に関わらず保持する
    const ok = saveRecords(next)
    if (ok) {
      setSaveFailed(false)
      setSaveMsg('保存しました')
      setTimeout(() => setSaveMsg(''), 2000)
    } else {
      setSaveFailed(true)
      setSaveMsg('')
    }
    return ok
  }

  const retrySave = () => {
    const ok = persist(records)
    if (!ok) setBackupOpen(true) // 再試行も失敗したらバックアップ画面を開く
  }

  const submitForm = () => {
    if (!form.name.trim()) {
      alert('施設名(源泉名)を入力してください')
      return
    }
    const rec = { ...form }
    const c = parseCoordText(form.coordText)
    rec.lat = c ? c.lat : null
    rec.lng = c ? c.lng : null
    let next: OnsenRecord[]
    if (editingId) {
      next = records.map((r) => (r.id === editingId ? { ...rec, id: editingId } : r))
    } else {
      next = [...records, rec]
    }
    persist(next)
    setForm(emptyRecord())
    setEditingId(null)
    setTab('list')
  }

  const startEdit = (r: OnsenRecord) => {
    setForm({ ...emptyRecord(), ...r, values: { ...r.values } })
    setEditingId(r.id)
    setTab('form')
  }

  const remove = (r: OnsenRecord) => {
    if (window.confirm(`「${r.name}」を削除しますか?この操作は取り消せません。`))
      persist(records.filter((x) => x.id !== r.id))
  }

  const restoreJsonText = (text: string): boolean => {
    const res = mergeJsonText(records, text)
    if (res.ok) {
      persist(res.records)
      alert(`読み込みました(合計 ${res.records.length} 件)`)
      return true
    }
    alert('内容を読み込めませんでした。バックアップしたJSONを指定してください。')
    return false
  }

  const importJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => restoreJsonText(String(reader.result))
    reader.readAsText(file)
    e.target.value = ''
  }

  const filtered = useMemo(() => {
    const q = query.trim()
    if (!q) return records
    return records.filter((r) =>
      [r.name, r.pref, r.city, r.quality].some((v) => (v || '').includes(q)),
    )
  }, [records, query])

  const tabs: [string, string][] = [
    ['list', '一覧'],
    ['form', editingId ? '編集中' : '登録'],
    ['compare', '比較'],
    ['scatter', '散布図'],
    ['map', '地図'],
    ['const', '定数表'],
  ]

  return (
    <div className="onsen-root">
      <header className="o-header">
        <div className="o-seal">泉</div>
        <div>
          <h1 className="o-title">温泉分析帳</h1>
          <div className="o-sub">私設・温泉分析書データベース ─ 登録 {records.length} 件</div>
        </div>
        {saveMsg && (
          <div style={{ marginLeft: 'auto', fontSize: 12, color: '#5E9C6F', fontWeight: 700 }}>
            {saveMsg}
          </div>
        )}
        <button
          className="o-btn ghost sm"
          style={{ marginLeft: saveMsg ? 0 : 'auto', flexShrink: 0 }}
          onClick={() => setBackupOpen(true)}
        >
          バックアップ
        </button>
      </header>
      {storageStatus === 'unavailable' && (
        <div
          style={{
            background: '#F6EED8',
            borderBottom: '1px solid #D9A62E',
            color: '#6B5310',
            padding: '10px 20px',
            fontSize: 13,
            lineHeight: 1.7,
          }}
        >
          <b>この環境では自動保存(永続ストレージ)が利用できません。</b>
          閉じるとデータが消えるため、入力後は右上の「バックアップ」からコピーして保存し、次回開いたときに貼り付けて復元してください。
          {records.length === 0 && (
            <button
              className="o-btn sm"
              style={{ marginLeft: 8 }}
              onClick={() => setBackupOpen(true)}
            >
              前回のバックアップを貼り付けて復元
            </button>
          )}
        </div>
      )}
      {saveFailed && storageStatus !== 'unavailable' && (
        <div
          style={{
            background: '#FBEAE6',
            borderBottom: '1px solid #C4442E',
            color: '#8F2E1D',
            padding: '10px 20px',
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexWrap: 'wrap',
          }}
        >
          <b>自動保存に失敗しました。</b>
          入力データは画面上に残っています。この画面を閉じる前にバックアップを取ってください。
          <button className="o-btn sm" onClick={retrySave}>
            保存を再試行
          </button>
          <button className="o-btn danger sm" onClick={() => setBackupOpen(true)}>
            バックアップ
          </button>
        </div>
      )}
      {backupOpen && (
        <BackupModal
          records={records}
          onClose={() => setBackupOpen(false)}
          onRestore={restoreJsonText}
        />
      )}
      <nav className="o-tabs">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            className={'o-tab' + (tab === id ? ' active' : '')}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </nav>
      <main className="o-main">
        <>
          {tab === 'form' && (
            <FormView
              form={form}
              setForm={setForm}
              editing={!!editingId}
              onSubmit={submitForm}
              onCancel={() => {
                setForm(emptyRecord())
                setEditingId(null)
                setTab('list')
              }}
            />
          )}
          {tab === 'list' && (
            <ListView
              records={filtered}
              total={records.length}
              query={query}
              setQuery={setQuery}
              openId={openId}
              setOpenId={setOpenId}
              onEdit={startEdit}
              onDelete={remove}
              onExport={() => setBackupOpen(true)}
              onImport={importJson}
              onNew={() => {
                setForm(emptyRecord())
                setEditingId(null)
                setTab('form')
              }}
            />
          )}
          {tab === 'compare' && <CompareView records={[...records, SEAWATER]} />}
          {tab === 'scatter' && <ScatterView records={[...records, SEAWATER]} />}
          {tab === 'map' && <MapView records={records} />}
          {tab === 'const' && <ConstantsView records={[...records, SEAWATER]} />}
        </>
      </main>
    </div>
  )
}
