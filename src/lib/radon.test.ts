import { describe, expect, it } from 'vitest'
import { BQ_PER_CI, BQ_PER_MACHE, bqToCi, bqToMache } from './radon'

describe('ラドンの単位換算', () => {
  it('1 Ci = 3.7×10¹⁰ Bq(定義値)', () => {
    expect(BQ_PER_CI).toBe(3.7e10)
  })

  it('1 マッヘ単位 = 13.468 Bq/kg', () => {
    expect(BQ_PER_MACHE).toBeCloseTo(13.468, 3)
  })

  it('療養泉基準(111 Bq/kg)は 30×10⁻¹⁰ Ci/kg・8.25 マッヘ単位', () => {
    expect(bqToCi(111)).toBeCloseTo(30, 1)
    // 指針の 8.25 は丸めた値で、換算すると 8.242
    expect(bqToMache(111)).toBeCloseTo(8.25, 1)
  })

  // 既定データの3件は分析書に3単位すべてが載っており、換算の検算に使える
  it.each([
    ['阿寒湖温泉', 0.24, 0.06, 0.018],
    ['榊原温泉', 5.7, 1.5, 0.42],
    ['猫啼温泉', 91.8, 24.8, 6.82],
  ])('%s の分析書表記を再現できる', (_name, bq, ci, mache) => {
    expect(bqToCi(bq)).toBeCloseTo(ci, 1)
    expect(bqToMache(bq)).toBeCloseTo(mache, 1)
  })

  it('0 は 0 のまま', () => {
    expect(bqToCi(0)).toBe(0)
    expect(bqToMache(0)).toBe(0)
  })
})
