import { describe, expect, it } from 'vitest'
import { toOnsenRecord } from './gsjData'
import type { GsjCompactRecord } from './gsjConvert'

describe('toOnsenRecord', () => {
  const compact: GsjCompactRecord = {
    i: 42,
    n: '和琴半島 和琴地獄',
    p: '北海道',
    c: '川上郡弟子屈町',
    la: 43.5815,
    lo: 144.3128,
    d: '1977-05',
    t: 98.2,
    h: 9.1,
    s: 1439,
    q: '含S-Na-Cl',
    qc: 0b1000010,
    rn: 37,
    v: { na: 334.5, cl: 320.5 },
    sr: 'R:01-08',
  }

  it('圧縮レコードを OnsenRecord へ展開する', () => {
    const r = toOnsenRecord(compact)
    expect(r.id).toBe('gsj-42')
    expect(r.name).toBe('和琴半島 和琴地獄')
    expect(r.pref).toBe('北海道')
    expect(r.city).toBe('川上郡弟子屈町')
    expect(r.date).toBe('1977-05')
    expect(r.quality).toBe('含S-Na-Cl')
    expect(r.temp).toBe('98.2')
    expect(r.ph).toBe('9.1')
    expect(r.tds).toBe('1439')
    expect(r.lat).toBe(43.5815)
    expect(r.lng).toBe(144.3128)
    expect(r.values).toEqual({ na: '334.5', cl: '320.5', rn: '37' })
    expect(r.source).toBe('R:01-08')
  })

  it('欠測項目は空文字・null になる(既存ビューの欠測扱いに合わせる)', () => {
    const r = toOnsenRecord({ i: 1, n: 'x', p: '', c: '' })
    expect(r.temp).toBe('')
    expect(r.ph).toBe('')
    expect(r.tds).toBe('')
    expect(r.date).toBe('')
    expect(r.quality).toBe('')
    expect(r.lat).toBeNull()
    expect(r.lng).toBeNull()
    expect(r.values).toEqual({})
  })
})
