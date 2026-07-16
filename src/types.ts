/** 成分1項目の定義 */
export interface ComponentDef {
  id: string
  label: string
  short: string
  unit: string
}

export type ComponentGroupId = 'cation' | 'anion' | 'free' | 'gas'

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
