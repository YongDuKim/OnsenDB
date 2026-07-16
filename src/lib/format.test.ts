import { describe, expect, it } from 'vitest'
import { fmt, getMetricValue, num, parseCoordText } from './format'
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
})
