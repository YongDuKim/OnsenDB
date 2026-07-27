import { PREF_ORDER } from '../schema'
import type { OnsenRecord } from '../types'

/** PREFS に無い都道府県(未入力・表記ゆれ・取り込んだ不正データ)は末尾へ送る */
const orderOf = (pref: string): number => PREF_ORDER[pref] ?? Number.MAX_SAFE_INTEGER

/**
 * 一覧の並び順。都道府県を北海道から沖縄県の順に並べ、
 * 同じ都道府県のなかは市区町村、さらに施設名で揃える。
 *
 * 市区町村と施設名は漢字の読みではなく文字コードでの比較になるため
 * 五十音順にはならないが、同じ並びが常に再現されることを優先している。
 */
export function compareByPref(a: OnsenRecord, b: OnsenRecord): number {
  const d = orderOf(a.pref) - orderOf(b.pref)
  if (d !== 0) return d
  const city = a.city.localeCompare(b.city, 'ja')
  if (city !== 0) return city
  return a.name.localeCompare(b.name, 'ja')
}

/** 元の配列を変更せずに都道府県順で並べ替える */
export const sortByPref = (records: readonly OnsenRecord[]): OnsenRecord[] =>
  [...records].sort(compareByPref)
