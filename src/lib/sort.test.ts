import { describe, expect, it } from 'vitest'
import { compareByPref, sortByPref } from './sort'
import { DEFAULT_RECORDS } from '../defaultRecords'
import { PREFS, emptyRecord } from '../schema'
import type { OnsenRecord } from '../types'

const rec = (pref: string, city = '', name = ''): OnsenRecord => ({
  ...emptyRecord(),
  pref,
  city,
  name,
})

const prefsOf = (rs: OnsenRecord[]) => rs.map((r) => r.pref)

describe('compareByPref', () => {
  it('北海道から沖縄県の順に並ぶ', () => {
    const rs = sortByPref([rec('沖縄県'), rec('東京都'), rec('北海道'), rec('大分県')])
    expect(prefsOf(rs)).toEqual(['北海道', '東京都', '大分県', '沖縄県'])
  })

  it('PREFS の定義順をそのまま再現する', () => {
    const shuffled = [...PREFS].reverse().map(([n]) => rec(n))
    expect(prefsOf(sortByPref(shuffled))).toEqual(PREFS.map(([n]) => n))
  })

  it('都道府県が未入力のレコードは末尾へ送る', () => {
    const rs = sortByPref([rec(''), rec('沖縄県'), rec('北海道')])
    expect(prefsOf(rs)).toEqual(['北海道', '沖縄県', ''])
  })

  it('PREFS に無い都道府県も末尾へ送る(取り込んだ不正データ対策)', () => {
    const rs = sortByPref([rec('東京都'), rec('架空県'), rec('北海道')])
    expect(prefsOf(rs)).toEqual(['北海道', '東京都', '架空県'])
  })

  it('同じ都道府県のなかは市区町村で並ぶ', () => {
    const rs = sortByPref([rec('東京都', '八丈島'), rec('東京都', '青ヶ島')])
    expect(rs.map((r) => r.city)).toEqual(['青ヶ島', '八丈島'])
  })

  it('都道府県と市区町村が同じなら施設名で並ぶ', () => {
    const rs = sortByPref([
      rec('山形県', '山形市', '蔵王温泉(大湯一号源泉)'),
      rec('山形県', '山形市', '蔵王温泉(おおみや旅館)'),
    ])
    expect(rs.map((r) => r.name)).toEqual(['蔵王温泉(おおみや旅館)', '蔵王温泉(大湯一号源泉)'])
  })

  it('元の配列を書き換えない', () => {
    const src = [rec('沖縄県'), rec('北海道')]
    const before = prefsOf(src)
    sortByPref(src)
    expect(prefsOf(src)).toEqual(before)
  })

  it('比較関数は対称で、同一レコードでは 0 を返す', () => {
    const a = rec('北海道', '網走市', 'A')
    const b = rec('大分県', '別府市', 'B')
    expect(compareByPref(a, b)).toBeLessThan(0)
    expect(compareByPref(b, a)).toBeGreaterThan(0)
    expect(compareByPref(a, a)).toBe(0)
  })

  it('既定データは北海道が先頭、沖縄県以外の最後は大分県の並びになる', () => {
    const sorted = sortByPref(DEFAULT_RECORDS)
    expect(sorted).toHaveLength(DEFAULT_RECORDS.length)
    expect(sorted[0]!.pref).toBe('北海道')
    expect(sorted[sorted.length - 1]!.pref).toBe('大分県')
    // 並べ替えの前後で件数と中身の集合は変わらない
    expect(new Set(sorted.map((r) => r.id))).toEqual(new Set(DEFAULT_RECORDS.map((r) => r.id)))
  })
})
