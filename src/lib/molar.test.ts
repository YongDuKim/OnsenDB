import { describe, expect, it } from 'vitest'
import { mgToMmol, molarMass } from './molar'
import { ALL_COMPONENTS, MOLAR_MASS } from '../schema'

describe('molarMass', () => {
  it('単原子は原子量そのもの', () => {
    expect(molarMass('Na')).toBeCloseTo(22.99, 3)
    expect(molarMass('Cl')).toBeCloseTo(35.45, 3)
    // 硫化物イオン S²⁻ は電荷が2でも原子は1つ
    expect(molarMass('S')).toBeCloseTo(32.06, 3)
  })

  it('個数付きの式を合算する', () => {
    expect(molarMass('SO4')).toBeCloseTo(96.06, 2)
    expect(molarMass('HCO3')).toBeCloseTo(61.02, 2)
    expect(molarMass('NH4')).toBeCloseTo(18.04, 2)
    expect(molarMass('H2SiO3')).toBeCloseTo(78.1, 2)
    expect(molarMass('S2O3')).toBeCloseTo(112.12, 2)
  })

  it('未知の元素・不正な式は例外', () => {
    expect(() => molarMass('Xx')).toThrow()
    expect(() => molarMass('so4')).toThrow()
    expect(() => molarMass('SO₄')).toThrow()
    expect(() => molarMass('')).toThrow()
  })
})

describe('mgToMmol', () => {
  it('mg/kg をモル質量で割ると mmol/kg になる', () => {
    // Na⁺ 100 mg/kg = 4.35 mmol/kg
    expect(mgToMmol(100, molarMass('Na'))).toBeCloseTo(4.35, 2)
    // 同じ 100 mg/kg でも Cl⁻ は 2.82 mmol/kg。重量では見えない差が出る
    expect(mgToMmol(100, molarMass('Cl'))).toBeCloseTo(2.82, 2)
  })

  it('0 は 0 のまま', () => {
    expect(mgToMmol(0, molarMass('SO4'))).toBe(0)
  })
})

describe('MOLAR_MASS', () => {
  it('mg/kg の成分はすべてモル質量を持つ', () => {
    const missing = ALL_COMPONENTS.filter((c) => c.unit === 'mg/kg' && MOLAR_MASS[c.id] == null)
    expect(missing.map((c) => c.id)).toEqual([])
  })

  it('重量濃度でないラドンは持たない', () => {
    expect(MOLAR_MASS['rn']).toBeUndefined()
  })

  it('海水の主要成分の値が化学の教科書どおり', () => {
    expect(MOLAR_MASS['cl']).toBeCloseTo(35.45, 2)
    expect(MOLAR_MASS['so4']).toBeCloseTo(96.06, 2)
    expect(MOLAR_MASS['ca']).toBeCloseTo(40.08, 2)
    // Fe²⁺・Fe³⁺ は価数が違ってもモル質量は同じ
    expect(MOLAR_MASS['fe2']).toBeCloseTo(MOLAR_MASS['fe3']!, 6)
  })
})
