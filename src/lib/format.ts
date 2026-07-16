import type { OnsenRecord } from '../types'

/** 入力文字列を数値に変換。空・非数値は null */
export const num = (v: string | number | null | undefined): number | null =>
  v === '' || v == null || isNaN(Number(v)) ? null : Number(v)

/** 表示用フォーマット(null は em ダッシュ) */
export const fmt = (v: number | null | undefined): string =>
  v == null ? '—' : Number(v).toLocaleString('ja-JP', { maximumFractionDigits: 2 })

/** "35.123, 138.456" などの貼り付け文字列から座標を抽出(日本近辺のみ受理) */
export function parseCoordText(text: string): { lat: number; lng: number } | null {
  const m = String(text).match(/(-?\d{1,2}\.?\d*)[,\s、]+(-?\d{1,3}\.?\d*)/)
  if (!m) return null
  const lat = parseFloat(m[1]!)
  const lng = parseFloat(m[2]!)
  if (lat < 20 || lat > 46 || lng < 122 || lng > 154) return null
  return { lat, lng }
}

export function getMetricValue(rec: OnsenRecord, metricId: string): number | null {
  if (metricId === 'temp') return num(rec.temp)
  if (metricId === 'ph') return num(rec.ph)
  if (metricId === 'tds') return num(rec.tds)
  return num(rec.values?.[metricId])
}
