import { describe, expect, it } from 'vitest'
import { formatValue, rangeFromCorners, tickDecimals, withinRange } from './zoom'

describe('rangeFromCorners', () => {
  it('右下へドラッグした2隅から範囲を作る', () => {
    expect(rangeFromCorners({ x: 1, y: 8 }, { x: 5, y: 2 })).toEqual({ x0: 1, x1: 5, y0: 2, y1: 8 })
  })

  it('どの向きにドラッグしても同じ範囲になる', () => {
    const a = { x: 1, y: 8 }
    const b = { x: 5, y: 2 }
    expect(rangeFromCorners(b, a)).toEqual(rangeFromCorners(a, b))
    expect(rangeFromCorners({ x: 5, y: 8 }, { x: 1, y: 2 })).toEqual(rangeFromCorners(a, b))
  })

  it('負の値でも正しく並べ替える', () => {
    expect(rangeFromCorners({ x: -3, y: -1 }, { x: -7, y: -9 })).toEqual({
      x0: -7,
      x1: -3,
      y0: -9,
      y1: -1,
    })
  })

  it('幅か高さがゼロの選択は拡大できないため null', () => {
    expect(rangeFromCorners({ x: 2, y: 1 }, { x: 2, y: 5 })).toBeNull()
    expect(rangeFromCorners({ x: 1, y: 3 }, { x: 5, y: 3 })).toBeNull()
  })

  it('数値でない座標は null(軸の外へ出た場合など)', () => {
    expect(rangeFromCorners({ x: NaN, y: 1 }, { x: 5, y: 3 })).toBeNull()
    expect(rangeFromCorners({ x: 0, y: 1 }, { x: Infinity, y: 3 })).toBeNull()
  })
})

describe('withinRange', () => {
  const r = { x0: 1, x1: 5, y0: 2, y1: 8 }

  it('内側の点は含む', () => {
    expect(withinRange({ x: 3, y: 4 }, r)).toBe(true)
  })

  it('境界上の点は含む(選んだ枠のふちの点が消えないように)', () => {
    expect(withinRange({ x: 1, y: 2 }, r)).toBe(true)
    expect(withinRange({ x: 5, y: 8 }, r)).toBe(true)
  })

  it('片方の軸だけ外れていても含まない', () => {
    expect(withinRange({ x: 0.9, y: 4 }, r)).toBe(false)
    expect(withinRange({ x: 3, y: 8.1 }, r)).toBe(false)
  })
})

describe('tickDecimals', () => {
  it('広い範囲では整数で表示する', () => {
    expect(tickDecimals(40000)).toBe(0)
    expect(tickDecimals(100)).toBe(0)
  })

  it('狭い範囲ほど小数桁を増やし、隣の目盛りと区別できるようにする', () => {
    expect(tickDecimals(39)).toBe(1)
    expect(tickDecimals(2)).toBe(2)
    expect(tickDecimals(0.02)).toBe(4)
  })

  it('極端に狭い範囲でも桁数は8桁で頭打ちにする', () => {
    expect(tickDecimals(1e-12)).toBe(8)
  })

  it('範囲がゼロや不正な値なら0桁', () => {
    expect(tickDecimals(0)).toBe(0)
    expect(tickDecimals(NaN)).toBe(0)
  })
})

describe('formatValue', () => {
  it('指定した桁数で揃え、3桁区切りを入れる', () => {
    expect(formatValue(13496.9, 0)).toBe('13,497')
    expect(formatValue(19.360902, 1)).toBe('19.4')
    expect(formatValue(0.0012345, 4)).toBe('0.0012')
  })

  it('数値でない場合はダッシュ', () => {
    expect(formatValue(NaN, 2)).toBe('—')
  })
})
