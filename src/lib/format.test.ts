import { describe, expect, it } from 'vitest'
import {
  fmt,
  getMetricValue,
  getMolarMetricValue,
  num,
  parseCoordText,
  placeOf,
  recordLabel,
} from './format'
import { emptyRecord } from '../schema'

describe('num', () => {
  it('数値文字列を数値に変換する', () => {
    expect(num('42')).toBe(42)
    expect(num('3.14')).toBeCloseTo(3.14)
    expect(num('0')).toBe(0)
  })
  it('空・null・undefined・非数値は null', () => {
    expect(num('')).toBeNull()
    expect(num(null)).toBeNull()
    expect(num(undefined)).toBeNull()
    expect(num('abc')).toBeNull()
  })
})

describe('fmt', () => {
  it('null は em ダッシュ', () => {
    expect(fmt(null)).toBe('—')
    expect(fmt(undefined)).toBe('—')
  })
  it('桁区切りと小数2桁まで', () => {
    expect(fmt(19350)).toBe('19,350')
    expect(fmt(3.14159)).toBe('3.14')
  })
})

describe('parseCoordText', () => {
  it('カンマ区切りの座標を認識する', () => {
    expect(parseCoordText('36.6227, 138.5963')).toEqual({ lat: 36.6227, lng: 138.5963 })
  })
  it('空白・読点区切りも認識する', () => {
    expect(parseCoordText('36.6 138.5')).toEqual({ lat: 36.6, lng: 138.5 })
    expect(parseCoordText('36.6、138.5')).toEqual({ lat: 36.6, lng: 138.5 })
  })
  it('日本の範囲外は棄却する', () => {
    expect(parseCoordText('51.5, 0.1')).toBeNull() // ロンドン
    expect(parseCoordText('35.68, 300')).toBeNull()
  })
  it('座標を含まない文字列は null', () => {
    expect(parseCoordText('')).toBeNull()
    expect(parseCoordText('草津温泉')).toBeNull()
  })
})

describe('recordLabel / placeOf', () => {
  const of = (pref: string, city: string, name = 'ひょうたん温泉') => ({
    ...emptyRecord(),
    name,
    pref,
    city,
  })
  it('施設名の後ろに都道府県と市区町村を付ける', () => {
    expect(recordLabel(of('大分県', '別府市'))).toBe('ひょうたん温泉(大分県別府市)')
  })
  it('片方だけでも括弧に入れる', () => {
    expect(recordLabel(of('東京都', ''))).toBe('ひょうたん温泉(東京都)')
    expect(recordLabel(of('', '別府市'))).toBe('ひょうたん温泉(別府市)')
  })
  it('場所が未入力なら施設名のみ(海水など)', () => {
    expect(recordLabel(of('', '', '海水(標準)'))).toBe('海水(標準)')
    expect(placeOf(of('', ''))).toBe('')
  })
})

describe('getMetricValue', () => {
  const rec = { ...emptyRecord(), temp: '42.5', ph: '2.1', tds: '', values: { cl: '1000' } }
  it('基本指標を取り出す', () => {
    expect(getMetricValue(rec, 'temp')).toBe(42.5)
    expect(getMetricValue(rec, 'ph')).toBe(2.1)
    expect(getMetricValue(rec, 'tds')).toBeNull()
  })
  it('成分値は values から取り出す', () => {
    expect(getMetricValue(rec, 'cl')).toBe(1000)
    expect(getMetricValue(rec, 'so4')).toBeNull()
  })
  it('ラドンは Bq/kg の保存値から他単位へ換算される', () => {
    const rn = { ...emptyRecord(), values: { rn: '91.8' } }
    expect(getMetricValue(rn, 'rn')).toBe(91.8)
    expect(getMetricValue(rn, 'rn_ci')).toBeCloseTo(24.8, 1)
    expect(getMetricValue(rn, 'rn_mache')).toBeCloseTo(6.82, 1)
  })
  it('ラドン未入力なら換算指標も null', () => {
    expect(getMetricValue(rec, 'rn')).toBeNull()
    expect(getMetricValue(rec, 'rn_ci')).toBeNull()
    expect(getMetricValue(rec, 'rn_mache')).toBeNull()
  })
})

describe('getMolarMetricValue', () => {
  const rec = {
    ...emptyRecord(),
    temp: '42.5',
    ph: '2.1',
    tds: '3000',
    values: { cl: '1000', na: '1000', rn: '91.8' },
  }

  it('成分は mmol/kg に換算される', () => {
    expect(getMolarMetricValue(rec, 'cl')).toBeCloseTo(1000 / 35.45, 3)
    expect(getMolarMetricValue(rec, 'na')).toBeCloseTo(1000 / 22.99, 3)
  })

  it('同じ重量でも成分ごとに物質量は違う', () => {
    const cl = getMolarMetricValue(rec, 'cl')!
    const na = getMolarMetricValue(rec, 'na')!
    expect(na).toBeGreaterThan(cl)
  })

  it('ラドンは換算せず Bq/kg などのまま', () => {
    expect(getMolarMetricValue(rec, 'rn')).toBe(91.8)
    expect(getMolarMetricValue(rec, 'rn_ci')).toBeCloseTo(24.8, 1)
    expect(getMolarMetricValue(rec, 'rn_mache')).toBeCloseTo(6.82, 1)
  })

  it('泉温・pH・溶存物質総量はそのまま', () => {
    expect(getMolarMetricValue(rec, 'temp')).toBe(42.5)
    expect(getMolarMetricValue(rec, 'ph')).toBe(2.1)
    expect(getMolarMetricValue(rec, 'tds')).toBe(3000)
  })

  it('未入力は null', () => {
    expect(getMolarMetricValue(rec, 'so4')).toBeNull()
  })
})
