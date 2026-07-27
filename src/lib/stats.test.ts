import { describe, expect, it } from 'vitest'
import { formatCoef, formatEquation, formatR, linearFit } from './stats'
import { DEFAULT_RECORDS } from '../defaultRecords'
import { num } from './format'

const pts = (xs: number[], ys: number[]) => xs.map((x, i) => ({ x, y: ys[i]! }))

describe('linearFit', () => {
  it('完全に直線上の点は r = 1、傾きと切片も厳密に一致する', () => {
    const fit = linearFit(pts([1, 2, 3, 4], [3, 5, 7, 9]))!
    expect(fit.n).toBe(4)
    expect(fit.slope).toBeCloseTo(2, 10)
    expect(fit.intercept).toBeCloseTo(1, 10)
    expect(fit.r).toBeCloseTo(1, 10)
  })

  it('完全な逆相関は r = -1', () => {
    const fit = linearFit(pts([1, 2, 3], [10, 8, 6]))!
    expect(fit.slope).toBeCloseTo(-2, 10)
    expect(fit.r).toBeCloseTo(-1, 10)
  })

  it('x に対して対称な配置では r = 0 になる', () => {
    const fit = linearFit(pts([1, 2, 3, 4], [1, 5, 5, 1]))!
    expect(fit.r).toBeCloseTo(0, 10)
    expect(fit.slope).toBeCloseTo(0, 10)
  })

  it('データのある x の範囲を返す(外挿しないため)', () => {
    const fit = linearFit(pts([5, 1, 3], [1, 2, 3]))!
    expect(fit.xMin).toBe(1)
    expect(fit.xMax).toBe(5)
  })

  it('2点以下は null(相関係数が常に ±1 になり意味がないため)', () => {
    expect(linearFit(pts([1, 2], [1, 2]))).toBeNull()
    expect(linearFit(pts([1], [1]))).toBeNull()
    expect(linearFit([])).toBeNull()
  })

  it('x の分散がゼロなら null(傾きが定義できない)', () => {
    expect(linearFit(pts([2, 2, 2], [1, 2, 3]))).toBeNull()
  })

  it('y の分散がゼロなら null(相関係数が定義できない)', () => {
    expect(linearFit(pts([1, 2, 3], [4, 4, 4]))).toBeNull()
  })

  it('NaN や Infinity を含む点は除外して計算する', () => {
    const fit = linearFit([
      { x: 1, y: 3 },
      { x: 2, y: 5 },
      { x: 3, y: 7 },
      { x: NaN, y: 1 },
      { x: 4, y: Infinity },
    ])!
    expect(fit.n).toBe(3)
    expect(fit.slope).toBeCloseTo(2, 10)
  })

  // 既定データを使った検算。海水は含めない
  const valueOf = (id: string) => (r: (typeof DEFAULT_RECORDS)[number]) =>
    id === 'temp' ? num(r.temp) : id === 'ph' ? num(r.ph) : num(r.values[id])
  const fitOf = (xId: string, yId: string) => {
    const gx = valueOf(xId)
    const gy = valueOf(yId)
    return linearFit(
      DEFAULT_RECORDS.map((r) => ({ x: gx(r), y: gy(r) })).filter(
        (p): p is { x: number; y: number } => p.x != null && p.y != null,
      ),
    )
  }

  it('既定データの Na⁺ × Cl⁻ は強い正の相関', () => {
    const fit = fitOf('na', 'cl')!
    expect(fit.n).toBe(21)
    expect(fit.r).toBeCloseTo(0.998, 3)
  })

  it('既定データの pH × 泉温 は弱い負の相関(pH 未入力の3件は除かれる)', () => {
    const fit = fitOf('ph', 'temp')!
    expect(fit.n).toBe(19)
    expect(fit.r).toBeCloseTo(-0.359, 3)
  })

  it('ラドンは入力が3件で、下限ちょうどでも計算できる', () => {
    const fit = fitOf('rn', 'temp')!
    expect(fit.n).toBe(3)
  })
})

describe('表示の整形', () => {
  it('相関係数は小数3桁に固定する(fmt では 0.998 が 1 になってしまうため)', () => {
    expect(formatR(0.9981)).toBe('0.998')
    expect(formatR(-0.3592)).toBe('-0.359')
    expect(formatR(0)).toBe('0.000')
  })

  it('係数は有効数字3桁', () => {
    expect(formatCoef(1.8195)).toBe('1.82')
    expect(formatCoef(17.8806)).toBe('17.9')
    expect(formatCoef(0)).toBe('0')
  })

  it('係数が指数表記になる桁でも通常表記に直す', () => {
    expect(formatCoef(17880.5)).toBe('17900')
    expect(formatCoef(0.000123)).toBe('0.000123')
  })

  it('極端に小さい・大きい値だけは指数表記のままにする', () => {
    expect(formatCoef(0.0000123)).toBe('1.23e-5')
    expect(formatCoef(12300000)).toBe('1.23e+7')
  })

  it('回帰式は負の切片をマイナスで連結する', () => {
    const up = linearFit(pts([1, 2, 3], [3, 5, 7]))!
    expect(formatEquation(up)).toBe('y = 2x + 1')
    const down = linearFit(pts([1, 2, 3], [-1, 1, 3]))!
    expect(formatEquation(down)).toBe('y = 2x − 3')
  })
})
