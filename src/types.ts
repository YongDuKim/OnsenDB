/** 成分1項目の定義 */
export interface ComponentDef {
  id: string
  label: string
  short: string
  unit: string
  /**
   * モル濃度への換算に使う化学式(電荷は含めない)。
   * 重量濃度でない項目(Bq/kg のラドンなど)は換算できないため持たない。
   */
  formula?: string
}

export type ComponentGroupId = 'cation' | 'anion' | 'free' | 'gas' | 'radioactivity'

export interface ComponentGroup {
  id: ComponentGroupId
  title: string
  items: ComponentDef[]
}

/**
 * 温泉分析書1件分のレコード。
 * 数値項目は入力欄と直結するため文字列で保持し、集計時に num() で変換する。
 * この形式は Artifact 版のバックアップ JSON と互換。
 */
export interface OnsenRecord {
  id: string
  builtin?: boolean
  name: string
  pref: string
  city: string
  date: string
  quality: string
  temp: string
  ph: string
  tds: string
  lat: number | null
  lng: number | null
  coordText: string
  memo: string
  /** 出典コード(産総研データ由来のレコードのみ。自分の登録では使わない) */
  source?: string
  values: Record<string, string>
}

export type MetricKind = 'temp' | 'ph' | 'conc'

export interface Metric {
  id: string
  label: string
  unit: string
  kind: MetricKind
}

export interface AcidSystem {
  id: string
  name: string
  species: string[]
  pka: number[]
  note?: string
}
