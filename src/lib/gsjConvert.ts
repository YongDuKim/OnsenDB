/**
 * 産総研地質調査総合センター「地熱情報データベース」温泉分析値データ
 * (GSJ_DB_GRES-DB_ONSEN_2020.csv)を、本アプリの配布用データセット
 * (public/gsj/*.json)へ変換するための純ロジック。
 *
 * 実際の変換は scripts/convert-gsj.ts が行う。このファイルは Node からも
 * 直接 import できるよう、他モジュールに依存させない(依存すると Node の
 * 型ストリップ実行で拡張子なし import が解決できないため)。
 * lib/radon.ts・lib/molar.ts と重複する定数は、テストで同値を検証している。
 *
 * 出典:産総研地質調査総合センター 地熱情報データベース
 * https://gbank.gsj.jp/gres-db/
 */

/* ============================================================
   配布データセットの形式
   ============================================================ */

/** 配布 JSON の1レコード。転送量を抑えるためキーは1〜2文字。値が無い項目は省略 */
export interface GsjCompactRecord {
  /** 元データの Ser(通し番号)。アプリ内 id は `gsj-${i}` */
  i: number
  /** 温泉名(泉源名があれば空白区切りで併記) */
  n: string
  /** 都道府県 */
  p: string
  /** 市区町村 */
  c: string
  /** 緯度(位置ポリゴンの重心。元データは約200m四方にぼかされている) */
  la?: number
  /** 経度(同上) */
  lo?: number
  /** 採水年月日(YYYY / YYYY-MM / YYYY-MM-DD) */
  d?: string
  /** 泉温 (℃) */
  t?: number
  /** pH */
  h?: number
  /** 溶存物質総量 TSM */
  s?: number
  /** 泉質(元データの表記のまま) */
  q?: string
  /** 泉質の簡易分類(QUALITY_CATEGORIES のビットマスク)。フィルタ用の便宜分類 */
  qc?: number
  /** 濃度の単位。省略 = mg/kg、1 = mg/l、2 = 記載なし・不明 */
  u?: 1 | 2
  /** ラドン (Bq/kg 換算値) */
  rn?: number
  /** 成分値(キーは schema.ts の成分id、値は u の単位) */
  v?: Record<string, number>
  /** 出典コード(元データの「出典」列) */
  sr?: string
}

export interface GsjDatasetMeta {
  title: string
  source: string
  sourceUrl: string
  sourceFile: string
  license: string
  licenseUrl: string
  processedBy: string
  processedNote: string
  generatedAt: string
}

export interface GsjDataset {
  format: 1
  meta: GsjDatasetMeta
  records: GsjCompactRecord[]
}

/* ============================================================
   CSV
   ============================================================ */

/** RFC 4180 相当の CSV パーサ(引用符・引用符内の改行とカンマ・"" エスケープに対応) */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuote = false
  for (let k = 0; k < text.length; k++) {
    const ch = text[k]!
    if (inQuote) {
      if (ch === '"') {
        if (text[k + 1] === '"') {
          field += '"'
          k++
        } else inQuote = false
      } else field += ch
    } else if (ch === '"') inQuote = true
    else if (ch === ',') {
      row.push(field)
      field = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[k + 1] === '\n') k++
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else field += ch
  }
  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

/* ============================================================
   値のクリーニング
   ============================================================ */

/**
 * 元データの数値セルを number へ。欠測(空・"N/A")と、量が確定しない
 * 痕跡 "TR"・検出限界未満 "<0.1" は null(集計に混ぜると歪むため欠測扱い)。
 */
export function cleanNumber(raw: string): number | null {
  const s = raw.trim()
  if (s === '' || s === 'N/A') return null
  if (/^tr$/i.test(s) || s.startsWith('<')) return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

/**
 * 採水年月日を YYYY / YYYY-MM / YYYY-MM-DD へ。
 * 元データは "1977.5"・"1998.10.3"・"1959"・"1955～1957"(先頭年を採用)などが混在する。
 * 月・日として解釈できない部分は落とし、確からしい所まで残す。
 */
export function parseSamplingDate(raw: string): string | null {
  const m = raw.trim().match(/(\d{4})(?:\D+(\d{1,2}))?(?:\D+(\d{1,2}))?/)
  if (!m) return null
  const year = Number(m[1])
  if (year < 1850 || year > 2025) return null
  const month = m[2] ? Number(m[2]) : null
  if (month == null || month < 1 || month > 12) return String(year)
  const day = m[3] ? Number(m[3]) : null
  const mm = String(month).padStart(2, '0')
  if (day == null || day < 1 || day > 31) return `${year}-${mm}`
  return `${year}-${mm}-${String(day).padStart(2, '0')}`
}

/**
 * 位置ポリゴン(WKT "POLYGON((lng lat,…))")の重心。
 * 元データの位置は約200m四方のポリゴンにぼかされているため、
 * 頂点平均(末尾の閉じ点は除く)を代表点とする。精度は±100m程度。
 */
export function polygonCentroid(wkt: string): { lat: number; lng: number } | null {
  const m = wkt.match(/\(\(([^)]+)\)\)/)
  if (!m) return null
  const pts = m[1]!
    .split(',')
    .map((p) => p.trim().split(/\s+/).map(Number))
    .filter((p): p is [number, number] => p.length === 2 && p.every(Number.isFinite))
  if (pts.length === 0) return null
  const first = pts[0]!
  const last = pts[pts.length - 1]!
  const open =
    pts.length > 1 && first[0] === last[0] && first[1] === last[1] ? pts.slice(0, -1) : pts
  const lng = open.reduce((a, p) => a + p[0], 0) / open.length
  const lat = open.reduce((a, p) => a + p[1], 0) / open.length
  const r5 = (x: number) => Math.round(x * 1e5) / 1e5 // 約1m。ぼかし幅より十分細かい
  return { lat: r5(lat), lng: r5(lng) }
}

/* ============================================================
   ラドン
   ============================================================ */

/** 1×10⁻¹⁰ Ci/kg = 3.7 Bq/kg(lib/radon.ts の BQ_PER_CI と同じ定義値) */
const BQ_PER_CI_E10 = 3.7
/** 1 マッヘ単位 = 13.468 Bq/kg(lib/radon.ts の BQ_PER_MACHE と同値) */
const BQ_PER_MACHE = 3.64e-10 * 3.7e10
export const RADON_FACTORS = { BQ_PER_CI_E10, BQ_PER_MACHE }

/**
 * 元データのラドン値を Bq/kg へ正規化する。
 * 単位表記は "10-10Ci/kg"・"10^(-10)Cu/kg"・"マッヘ"・"M.E./kg" など20種以上が
 * 混在するため、キュリー系・マッヘ系・Bq系の3系統に丸めて換算する。
 * kg/l の違いは希薄溶液の近似(密度≈1)として無視する。
 * 解釈できない単位・単位の記載がない値は null(誤換算を避ける)。
 */
export function normalizeRadon(value: number, unitRaw: string): number | null {
  const u = unitRaw.normalize('NFKC').trim()
  if (!u) return null
  const round2 = (x: number) => Math.round(x * 100) / 100
  if (/bq/i.test(u)) return round2(value)
  // "10-10Ci/kg"・"10^(-10)cu/kg"・"10-10curie" など。×10⁻¹⁰ Ci 系として扱う
  if (/c[iu]/i.test(u)) return round2(value * BQ_PER_CI_E10)
  // "マッヘ"・"M.E./kg"・"M・E" など(マッヘ単位 = Mache-Einheit)
  if (/マッヘ|M\s*[.・]?\s*E/i.test(u)) return round2(value * BQ_PER_MACHE)
  return null
}

/* ============================================================
   泉質の簡易分類(フィルタ用)
   ============================================================ */

/**
 * フィルタで使う泉質の便宜分類。元データの泉質表記は571通りあり
 * (旧泉質名・化学式表記・表記ゆれが混在)、正式な泉質判定ではなく
 * 「表記に含まれる語からの推定」であることに注意。
 */
export const QUALITY_CATEGORIES: { bit: number; label: string }[] = [
  { bit: 0, label: '単純温泉' },
  { bit: 1, label: '塩化物泉(食塩泉)' },
  { bit: 2, label: '炭酸水素塩泉(重曹泉)' },
  { bit: 3, label: '硫酸塩泉(芒硝・石膏泉)' },
  { bit: 4, label: '二酸化炭素泉(炭酸泉)' },
  { bit: 5, label: '含鉄泉' },
  { bit: 6, label: '硫黄泉' },
  { bit: 7, label: '酸性泉' },
  { bit: 8, label: '放射能泉' },
  { bit: 9, label: 'その他' },
]

/** 化学式トークン(例 "Na-Cl" の "Cl")→ 分類ビット */
const TOKEN_BITS: Record<string, number> = {
  Cl: 1,
  HCO3: 2,
  CO3: 2,
  SO4: 3,
  CO2: 4,
  Fe: 5,
  Fe2: 5,
  Fe3: 5,
  S: 6,
  H2S: 6,
  HS: 6,
  Rn: 8,
  Ra: 8,
}

/**
 * 泉質の表記文字列から分類ビットマスクを推定する。
 * 「炭酸水素」を消してから「炭酸」を見る、のように部分文字列の包含関係が
 * あるため、日本語キーワードはマッチした部分を消しながら順に判定する。
 * どの分類にも当たらない表記は「その他」に落とす。
 */
export function classifyQuality(quality: string): number {
  let s = quality.normalize('NFKC')
  if (!s.trim()) return 0
  let mask = 0
  const take = (re: RegExp, bit: number) => {
    if (re.test(s)) {
      mask |= 1 << bit
      s = s.replace(new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g'), '')
    }
  }
  // 包含関係のある語から先に(炭酸水素→炭酸、塩化土類→塩化、硫化水素→硫化 の順)
  take(/炭酸水素|重炭酸|重曹/, 2)
  take(/塩化土類|食塩|塩化物/, 1)
  take(/硫化水素|硫黄/, 6)
  take(/硫酸塩|芒硝|石膏|苦味/, 3)
  take(/二酸化炭素|炭酸/, 4)
  take(/緑礬|鉄/, 5)
  take(/放射能|ラジウム|ラドン/, 8)
  take(/酸性/, 7)
  take(/単純/, 0)
  // 化学式表記("含S-Na-Cl"・"Na-Cl泉" など)
  for (const token of s.match(/[A-Z][A-Za-z0-9]*/g) ?? []) {
    const bit = TOKEN_BITS[token]
    if (bit != null) mask |= 1 << bit
  }
  return mask === 0 ? 1 << 9 : mask
}

/* ============================================================
   1行の変換
   ============================================================ */

/**
 * CSV 列名 → schema.ts の成分 id。
 * ここに無い成分列(TFe・B・Hg・As・Ni・Rb・Cs・S など)は、対応する成分定義が
 * アプリ側に無いため取り込まない。SiO2 は下の特別扱いで H2SiO3 に換算する。
 */
export const COMPONENT_COLUMN_MAP: [string, string][] = [
  ['H', 'h'],
  ['Li', 'li'],
  ['Na', 'na'],
  ['K', 'k'],
  ['NH4', 'nh4'],
  ['Ca', 'ca'],
  ['Mg', 'mg'],
  ['Fe2+', 'fe2'],
  ['Fe3+', 'fe3'],
  ['Mn', 'mn'],
  ['Al', 'al'],
  ['F', 'f'],
  ['Cl', 'cl'],
  ['HS', 'hs'],
  ['SO4', 'so4'],
  ['HSO4', 'hso4'],
  ['S2O3', 's2o3'],
  ['HCO3', 'hco3'],
  ['CO3', 'co3'],
  ['Br', 'br'],
  ['I', 'i'],
  ['OH', 'oh'],
  ['NO3', 'no3'],
  ['PO4', 'po4'],
  ['HPO4', 'hpo4'],
  ['H2PO4', 'h2po4'],
  ['AsO2', 'aso2'],
  ['BO2', 'bo2'],
  ['HSiO3', 'hsio3'],
  ['SiO3', 'sio3'],
  ['HAsO2', 'haso2'],
  ['H2SiO3', 'h2sio3'],
  ['HBO2', 'hbo2'],
  ['CO2', 'co2'],
  ['H2S', 'h2s'],
  ['Sr', 'sr'],
  ['Ba', 'ba'],
  ['Cu', 'cu'],
  ['Pb', 'pb'],
  ['Zn', 'zn'],
  ['Cd', 'cd'],
  ['Cr', 'cr'],
]

/**
 * SiO2 (溶存シリカ) → メタケイ酸 H2SiO3 の重量換算係数。
 * M(H2SiO3)/M(SiO2) = 78.098/60.083(lib/molar.ts の原子量と同値。テストで検証)。
 * 古い分析はシリカを SiO2 として報告するため、H2SiO3 の記載が無い行だけ換算する。
 */
export const SIO2_TO_H2SIO3 = (2 * 1.008 + 28.085 + 3 * 15.999) / (28.085 + 2 * 15.999)

export interface ConvertRowResult {
  record: GsjCompactRecord | null
  warnings: string[]
}

/** CSV 1行(列名→セル値)を配布用レコードへ変換する */
export function convertRow(cols: Record<string, string>): ConvertRowResult {
  const warnings: string[] = []
  const serRaw = (cols['Ser'] ?? '').trim()
  const ser = serRaw === '' ? NaN : Number(serRaw) // Number('') は 0 になるため空は先に弾く
  if (!Number.isFinite(ser)) return { record: null, warnings: ['Ser が数値でない行を除外'] }

  const name = (cols['温泉名'] ?? '').trim()
  const spring = (cols['泉源名'] ?? '').trim()
  const rec: GsjCompactRecord = {
    i: ser,
    n: spring && spring !== name ? `${name} ${spring}` : name,
    p: (cols['都道府県'] ?? '').trim(),
    c: (cols['市区町村'] ?? '').trim(),
  }

  const pos = polygonCentroid(cols['位置'] ?? '')
  if (pos) {
    rec.la = pos.lat
    rec.lo = pos.lng
  } else warnings.push('位置ポリゴンを解釈できない')

  const d = parseSamplingDate(cols['採水年月日'] ?? '')
  if (d) rec.d = d

  const t = cleanNumber(cols['泉温'] ?? '')
  if (t != null) rec.t = t
  const ph = cleanNumber(cols['pH'] ?? '')
  if (ph != null) rec.h = ph
  const tsm = cleanNumber(cols['TSM'] ?? '')
  if (tsm != null) rec.s = tsm

  const q = (cols['泉質'] ?? '').trim()
  if (q) {
    rec.q = q
    rec.qc = classifyQuality(q)
  }

  const unit = (cols['単位'] ?? '').trim()
  if (unit === 'mg/l') rec.u = 1
  else if (unit !== 'mg/kg') {
    rec.u = 2
    if (unit) warnings.push(`単位を解釈できない: "${unit}"`)
  }

  const values: Record<string, number> = {}
  for (const [col, id] of COMPONENT_COLUMN_MAP) {
    const v = cleanNumber(cols[col] ?? '')
    if (v != null) values[id] = v
  }
  // H2SiO3 の記載が無く SiO2 だけがある行は、メタケイ酸に重量換算して取り込む
  const sio2 = cleanNumber(cols['SiO2'] ?? '')
  if (values['h2sio3'] == null && sio2 != null) {
    values['h2sio3'] = Math.round(sio2 * SIO2_TO_H2SIO3 * 100) / 100
  }
  if (Object.keys(values).length > 0) rec.v = values

  const rnRaw = cleanNumber(cols['Rn'] ?? '')
  if (rnRaw != null) {
    const rn = normalizeRadon(rnRaw, cols['Rn単位'] ?? '')
    if (rn != null) rec.rn = rn
    else warnings.push(`ラドン単位を解釈できない: "${(cols['Rn単位'] ?? '').trim()}"`)
  }

  const src = (cols['出典'] ?? '').trim()
  if (src) rec.sr = src

  return { record: rec, warnings }
}
