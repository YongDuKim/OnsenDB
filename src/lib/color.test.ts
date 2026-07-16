import { describe, expect, it } from 'vitest'
import { lerpColor, metricColor } from './color'

describe('lerpColor', () => {
  it('t=0 で始点、t=1 で終点の色', () => {
    expect(lerpColor('#000000', '#ffffff', 0)).toBe('rgb(0,0,0)')
    expect(lerpColor('#000000', '#ffffff', 1)).toBe('rgb(255,255,255)')
  })
  it('t=0.5 で中間色', () => {
    expect(lerpColor('#000000', '#ffffff', 0.5)).toBe('rgb(128,128,128)')
  })
})

describe('metricColor', () => {
  it('null はグレー', () => {
    expect(metricColor('temp', null, 0, 100)).toBe('#B9C4C2')
  })
  it('min == max でもクラッシュしない(中間色)', () => {
    expect(metricColor('conc', 5, 5, 5)).toMatch(/^rgb\(/)
  })
  it('範囲外の値はクランプされる', () => {
    expect(metricColor('conc', -100, 0, 10)).toBe(metricColor('conc', 0, 0, 10))
    expect(metricColor('conc', 999, 0, 10)).toBe(metricColor('conc', 10, 0, 10))
  })
  it('pH は範囲固定(1〜11)で色が決まる', () => {
    // 酸性側は朱系(R成分が大きい)、アルカリ側は藍系(B成分が優勢)
    expect(metricColor('ph', 1, 0, 0)).toBe('rgb(196,68,46)')
    expect(metricColor('ph', 11, 0, 0)).toBe('rgb(53,87,125)')
  })
})
