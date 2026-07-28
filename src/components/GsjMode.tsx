import { useEffect, useMemo, useState } from 'react'
import { ALL_COMPONENTS, PREFS, SEAWATER } from '../schema'
import { QUALITY_CATEGORIES } from '../lib/gsjConvert'
import type { GsjCompactRecord } from '../lib/gsjConvert'
import {
  GSJ_LICENSE_URL,
  GSJ_SOURCE_NAME,
  GSJ_SOURCE_URL,
  loadGsjDataset,
  toOnsenRecord,
} from '../lib/gsjData'
import { fmt, num } from '../lib/format'
import { sortByPref } from '../lib/sort'
import type { OnsenRecord } from '../types'
import { CompareView } from './CompareView'
import { ScatterView } from './ScatterView'
import { MapView } from './MapView'

/** 1温泉分のペア。フィルタ(qc・u)は圧縮側、表示・グラフは OnsenRecord 側を使う */
interface Pair {
  c: GsjCompactRecord
  r: OnsenRecord
}

type LoadState =
  { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; pairs: Pair[] }

/** 一覧に一度に出す件数。7,000件を一気に描くと固まるため段階的に増やす */
const PAGE = 100
/** 比較(棒グラフ)に出す最大件数 */
const MAX_BARS = 60

const unitLabel = (c: GsjCompactRecord): string =>
  c.u === 1 ? 'mg/l' : c.u === 2 ? 'mg/kg?' : 'mg/kg'

/* ============================================================
   産総研データモード
   マイ分析帳とは別レイヤーの閲覧専用データセット(7,203件)。
   出典・加工の表記は「データについて」タブと下部の常時表示が担う。
   ============================================================ */
export function GsjMode() {
  const [load, setLoad] = useState<LoadState>({ status: 'loading' })
  const [tab, setTab] = useState('list')
  const [pref, setPref] = useState('')
  const [cat, setCat] = useState('all')
  const [query, setQuery] = useState('')

  // loading のあいだだけ取得を走らせる。再試行はボタンが loading に戻すことで起きる
  useEffect(() => {
    if (load.status !== 'loading') return
    let alive = true
    loadGsjDataset()
      .then((dataset) => {
        if (alive)
          setLoad({
            status: 'ready',
            pairs: dataset.records.map((c) => ({ c, r: toOnsenRecord(c) })),
          })
      })
      .catch((e: unknown) => {
        if (alive) setLoad({ status: 'error', message: e instanceof Error ? e.message : String(e) })
      })
    return () => {
      alive = false
    }
  }, [load.status])

  const pairs = useMemo(() => (load.status === 'ready' ? load.pairs : []), [load])

  const filtered = useMemo(() => {
    const q = query.trim()
    return pairs.filter(({ c, r }) => {
      if (pref && r.pref !== pref) return false
      if (cat === 'none') {
        if (c.q) return false
      } else if (cat !== 'all' && !((c.qc ?? 0) & (1 << Number(cat)))) return false
      if (q && ![r.name, r.city, r.quality].some((v) => v.includes(q))) return false
      return true
    })
  }, [pairs, pref, cat, query])

  const records = useMemo(() => filtered.map((p) => p.r), [filtered])

  if (load.status === 'loading') {
    return (
      <main className="o-main">
        <div className="o-empty">産総研データセット(約2MB)を読み込んでいます…</div>
      </main>
    )
  }
  if (load.status === 'error') {
    return (
      <main className="o-main">
        <div className="o-empty">
          データセットを読み込めませんでした({load.message})。
          <br />
          通信環境を確認して再試行してください。
          <div style={{ marginTop: 10 }}>
            <button className="o-btn sm" onClick={() => setLoad({ status: 'loading' })}>
              再試行
            </button>
          </div>
        </div>
      </main>
    )
  }

  const tabs: [string, string][] = [
    ['list', '一覧'],
    ['compare', '比較'],
    ['scatter', '散布図'],
    ['map', '地図'],
    ['about', 'データについて'],
  ]

  return (
    <>
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
        {tab !== 'about' && (
          <div className="o-card" style={{ padding: 14 }}>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 150px' }}>
                <label className="o-label" htmlFor="gsj-pref">
                  都道府県
                </label>
                <select
                  id="gsj-pref"
                  className="o-select"
                  value={pref}
                  onChange={(e) => setPref(e.target.value)}
                >
                  <option value="">全国</option>
                  {PREFS.map(([p]) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ flex: '1 1 190px' }}>
                <label className="o-label" htmlFor="gsj-cat">
                  泉質(簡易分類)
                </label>
                <select
                  id="gsj-cat"
                  className="o-select"
                  value={cat}
                  onChange={(e) => setCat(e.target.value)}
                >
                  <option value="all">すべて</option>
                  {QUALITY_CATEGORIES.map((c) => (
                    <option key={c.bit} value={String(c.bit)}>
                      {c.label}
                    </option>
                  ))}
                  <option value="none">泉質の記載なし</option>
                </select>
              </div>
              <div style={{ flex: '2 1 200px' }}>
                <label className="o-label" htmlFor="gsj-query">
                  検索
                </label>
                <input
                  id="gsj-query"
                  className="o-input"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="温泉名・市区町村・泉質で検索"
                />
              </div>
            </div>
            <div style={{ fontSize: 12, color: '#5A6B69', marginTop: 8 }}>
              対象 <b>{filtered.length.toLocaleString('ja-JP')}</b> 件 / 全{' '}
              {pairs.length.toLocaleString('ja-JP')} 件
              ・泉質分類は表記からの推定です(正式な泉質判定ではありません)
            </div>
          </div>
        )}

        {/* フィルタが変わったら key で作り直し、表示件数・開閉状態をリセットする */}
        {tab === 'list' && <GsjList key={`${pref}|${cat}|${query}`} pairs={filtered} />}
        {tab === 'compare' && <CompareView records={[...records, SEAWATER]} maxBars={MAX_BARS} />}
        {tab === 'scatter' && <ScatterView records={[...records, SEAWATER]} />}
        {tab === 'map' && <MapView records={records} />}
        {tab === 'about' && <GsjAbout />}

        {tab !== 'about' && (
          <div style={{ fontSize: 11, color: '#5A6B69', lineHeight: 1.8 }}>
            出典:
            <a href={GSJ_SOURCE_URL} target="_blank" rel="noreferrer">
              {GSJ_SOURCE_NAME}
            </a>
            の温泉分析値データを加工して作成(加工内容は「データについて」参照)。
            掲載値は1910〜2005年の過去の分析値であり、現在の泉質・成分を示すものではありません。
          </div>
        )}
      </main>
    </>
  )
}

/* ============================================================
   一覧(閲覧専用・段階表示)
   ============================================================ */
function GsjList({ pairs }: { pairs: Pair[] }) {
  const [limit, setLimit] = useState(PAGE)
  const [openId, setOpenId] = useState<string | null>(null)
  // マイ分析帳の一覧と同じく都道府県順。ペアに戻すため id で引き直す
  const sorted = useMemo(() => {
    const byId = new Map(pairs.map((p) => [p.r.id, p]))
    return sortByPref(pairs.map((p) => p.r)).map((r) => byId.get(r.id)!)
  }, [pairs])
  const shown = sorted.slice(0, limit)

  if (pairs.length === 0)
    return <div className="o-empty">条件に一致する温泉がありません。絞り込みを緩めてください。</div>

  return (
    <div>
      {shown.map(({ c, r }) => (
        <GsjRow
          key={r.id}
          c={c}
          r={r}
          open={openId === r.id}
          onToggle={() => setOpenId(openId === r.id ? null : r.id)}
        />
      ))}
      {sorted.length > shown.length && (
        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <button className="o-btn ghost" onClick={() => setLimit((n) => n + PAGE)}>
            さらに表示({(sorted.length - shown.length).toLocaleString('ja-JP')} 件)
          </button>
        </div>
      )}
    </div>
  )
}

/** 一覧の1行。マイ分析帳の RecordRow と違い編集・削除がない閲覧専用の簡易版 */
function GsjRow({
  c,
  r,
  open,
  onToggle,
}: {
  c: GsjCompactRecord
  r: OnsenRecord
  open: boolean
  onToggle: () => void
}) {
  const t = num(r.temp)
  const rn = num(r.values['rn'])
  const entered = ALL_COMPONENTS.filter((x) => x.id !== 'rn' && num(r.values[x.id]) != null)
  return (
    <div className="o-row">
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
        onClick={onToggle}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="o-row-name" style={{ fontWeight: 700, fontSize: 15 }}>
            {r.name}
          </div>
          <div style={{ fontSize: 12, color: '#5A6B69', marginTop: 2 }}>
            {[r.pref, r.city].filter(Boolean).join(' ')}
            {r.quality ? ` ・ ${r.quality}` : ''}
            {r.date ? ` ・ 採水 ${r.date}` : ''}
          </div>
        </div>
        <div style={{ textAlign: 'right', fontSize: 13, whiteSpace: 'nowrap' }}>
          <div style={{ fontWeight: 700 }}>{t != null ? `${fmt(t)}℃` : '—'}</div>
          <div style={{ color: '#5A6B69' }}>pH {fmt(num(r.ph))}</div>
        </div>
        <span style={{ color: '#5A6B69', fontSize: 12 }}>{open ? '▲' : '▼'}</span>
      </div>
      {open && (
        <div style={{ marginTop: 10, borderTop: '1px dashed #C9D3D1', paddingTop: 10 }}>
          <div style={{ fontSize: 12, color: '#5A6B69', marginBottom: 6 }}>
            {num(r.tds) != null && (
              <span className="o-badge">
                溶存物質総量 {fmt(num(r.tds))} {unitLabel(c)}
              </span>
            )}
            {r.lat != null && (
              <span className="o-badge">
                座標 {r.lat}, {r.lng}(±100m程度)
              </span>
            )}
            {c.sr && <span className="o-badge">出典コード {c.sr}</span>}
            {c.u != null && (
              <span className="o-badge" style={{ background: '#F6EED8', color: '#8A6A16' }}>
                {c.u === 1 ? '濃度は mg/l 表記' : '濃度の単位の記載なし(mg/kg として表示)'}
              </span>
            )}
          </div>
          {entered.length === 0 && rn == null ? (
            <div style={{ fontSize: 12, color: '#5A6B69' }}>成分データはありません。</div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, fontSize: 12 }}>
              {entered.map((x) => (
                <span key={x.id} className="o-badge">
                  {x.short} {fmt(num(r.values[x.id]))} {unitLabel(c)}
                </span>
              ))}
              {rn != null && (
                <span className="o-badge" style={{ background: '#EBF2F6', color: '#2E4F70' }}>
                  ラドン {fmt(rn)} Bq/kg(換算値)
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ============================================================
   データについて(出典・加工内容・免責 ─ 利用規約1)ア・イに基づく表記)
   ============================================================ */
function GsjAbout() {
  return (
    <div className="o-card" style={{ fontSize: 13, lineHeight: 1.9 }}>
      <div className="o-section-title">このデータについて</div>
      <p>
        このモードで表示している全国 7,203 地点の温泉分析値は、以下の公開データを
        加工して作成したものです。
      </p>
      <p style={{ background: '#EDF1F0', borderRadius: 8, padding: '10px 14px' }}>
        出典:産総研地質調査総合センター 地熱情報データベース(
        <a href={GSJ_SOURCE_URL} target="_blank" rel="noreferrer">
          {GSJ_SOURCE_URL}
        </a>
        )の温泉分析値データ(GSJ_DB_GRES-DB_ONSEN_2020)を使用し、本アプリ作成者(YongDuKim)が
        以下の加工を行ったものです。加工後の内容は産総研地質調査総合センターが
        作成したものではありません。
      </p>
      <div style={{ fontWeight: 700, marginTop: 12 }}>行った加工</div>
      <ul style={{ margin: '4px 0 0', paddingLeft: 22 }}>
        <li>文字コード変換(Shift_JIS → UTF-8)と JSON 形式への変換・項目の取捨選択</li>
        <li>位置情報(約200m四方にぼかされたポリゴン)の重心点化 ─ 精度は±100m程度</li>
        <li>採水年月日の表記統一(年のみ・年月のみの記載はそのまま)</li>
        <li>
          ラドンの単位(×10⁻¹⁰Ci/kg・マッヘ単位など約20種の表記)を Bq/kg
          へ換算。単位が解釈できない値は除外
        </li>
        <li>SiO₂ として報告された溶存シリカのメタケイ酸(H₂SiO₃)への重量換算</li>
        <li>欠測(N/A)・痕跡(TR)・検出限界未満(&lt;0.1 など)の値の除外</li>
        <li>フィルタ用の泉質簡易分類の付与(表記からの推定であり正式な泉質判定ではない)</li>
      </ul>
      <div style={{ fontWeight: 700, marginTop: 12 }}>ご注意</div>
      <ul style={{ margin: '4px 0 0', paddingLeft: 22 }}>
        <li>
          掲載値は 1910〜2005 年に採取・分析された過去の値です。
          <b>現在の泉質・成分・湧出状況を示すものではありません</b>
        </li>
        <li>
          濃度の単位は mg/kg と mg/l
          の分析書が混在します(希薄溶液ではほぼ同値のため、グラフでは区別せず比較しています)
        </li>
        <li>元データの一部には都道府県資料など第三者由来の分析値が含まれます(出典コード参照)</li>
        <li>このデータは編集できません。ご自身の分析書は「マイ分析帳」に登録してください</li>
      </ul>
      <div style={{ fontWeight: 700, marginTop: 12 }}>利用条件</div>
      <p style={{ margin: '4px 0 0' }}>
        元データの利用条件は
        <a href={GSJ_LICENSE_URL} target="_blank" rel="noreferrer">
          産総研地質調査総合センターの利用規約
        </a>
        (政府標準利用規約(第2.0版)準拠・CC BY 4.0 互換)に従います。
      </p>
    </div>
  )
}
