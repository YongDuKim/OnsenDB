import { mgToMmol } from './molar'
import { bqToCi, bqToMache } from './radon'
import { MOLAR_MASS } from '../schema'
import type { OnsenRecord } from '../types'

/** 入力文字列を数値に変換。空・非数値は null */
export const num = (v: string | number | null | undefined): number | null =>
  v === '' || v == null || isNaN(Number(v)) ? null : Number(v)

/** 表示用フォーマット(null は em ダッシュ) */
export const fmt = (v: number | null | undefined): string =>
  v == null ? '—' : Number(v).toLocaleString('ja-JP', { maximumFractionDigits: 2 })

/** 「都道府県市区町村」。どちらも未入力なら空文字 */
export const placeOf = (rec: OnsenRecord): string => [rec.pref, rec.city].filter(Boolean).join('')

/** グラフの見出し用に「施設名(場所)」を組み立てる。場所が未入力なら施設名のみ */
export function recordLabel(rec: OnsenRecord): string {
  const place = placeOf(rec)
  return place ? `${rec.name}(${place})` : rec.name
}

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
  // ラドンは Bq/kg の保存値から他単位へ換算する
  if (metricId === 'rn_ci' || metricId === 'rn_mache') {
    const bq = num(rec.values?.rn)
    if (bq == null) return null
    return metricId === 'rn_ci' ? bqToCi(bq) : bqToMache(bq)
  }
  return num(rec.values?.[metricId])
}

/**
 * 2軸比較(散布図)用の値。成分の重量濃度 (mg/kg) はモル濃度 (mmol/kg) へ換算する。
 * モル質量を持たない指標(ラドン・溶存物質総量・泉温・pH)は getMetricValue と同じ値を返す。
 * 単位の表記は MOLAR_METRICS 側が揃えている。
 */
export function getMolarMetricValue(rec: OnsenRecord, metricId: string): number | null {
  const v = getMetricValue(rec, metricId)
  const mass = MOLAR_MASS[metricId]
  return v == null || mass == null ? v : mgToMmol(v, mass)
}
