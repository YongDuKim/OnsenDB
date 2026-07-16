import { describe, expect, it } from 'vitest'
import { speciation } from './chemistry'

describe('speciation', () => {
  it('化学種の数は pKa の数 + 1', () => {
    expect(speciation([7.0], 7)).toHaveLength(2)
    expect(speciation([7.0, 12.9], 7)).toHaveLength(3)
    expect(speciation([2.15, 7.2, 12.35], 7)).toHaveLength(4)
  })

  it('存在割合の合計は常に100%', () => {
    for (const ph of [0, 3.5, 7, 10.2, 14]) {
      const fr = speciation([7.0, 12.9], ph)
      expect(fr.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 6)
    }
  })

  it('pH = pKa で隣接2種が50:50になる', () => {
    const fr = speciation([9.24], 9.24)
    expect(fr[0]).toBeCloseTo(50, 6)
    expect(fr[1]).toBeCloseTo(50, 6)
  })

  it('強酸性側では全プロトン付加形が優勢', () => {
    const fr = speciation([7.0, 12.9], 0)
    expect(fr[0]).toBeGreaterThan(99.9)
  })

  it('強アルカリ側では全解離形が優勢', () => {
    const fr = speciation([7.0, 12.9], 14)
    expect(fr[2]).toBeGreaterThan(90)
  })

  it('極端なpH・pKaでもオーバーフローせず有限値を返す', () => {
    const fr = speciation([-3, 1.99], 14)
    for (const v of fr) {
      expect(Number.isFinite(v)).toBe(true)
    }
    expect(fr.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 6)
  })
})
