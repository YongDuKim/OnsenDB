import type { MetricKind } from '../types'

/** #RRGGBB 2色の線形補間 */
export function lerpColor(c1: string, c2: string, t: number): string {
  const p = (c: string): number[] => [
    parseInt(c.slice(1, 3), 16),
    parseInt(c.slice(3, 5), 16),
    parseInt(c.slice(5, 7), 16),
  ]
  const a = p(c1)
  const b = p(c2)
  const r = a.map((v, i) => Math.round(v + (b[i]! - v) * t))
  return `rgb(${r[0]},${r[1]},${r[2]})`
}

/** 指標の値 → 色(泉温: 青→黄→朱 / 濃度: 水色→藍 / pH: 朱(酸性)→緑→藍(アルカリ)) */
export function metricColor(kind: MetricKind, v: number | null, min: number, max: number): string {
  if (v == null) return '#B9C4C2'
  if (kind === 'ph') {
    const t = Math.max(0, Math.min(1, (v - 1) / 10)) // pH1〜11
    return t < 0.5
      ? lerpColor('#C4442E', '#5E9C6F', t * 2)
      : lerpColor('#5E9C6F', '#35577D', (t - 0.5) * 2)
  }
  const t = max === min ? 0.5 : Math.max(0, Math.min(1, (v - min) / (max - min)))
  if (kind === 'temp') {
    return t < 0.5
      ? lerpColor('#4C86B0', '#D9A62E', t * 2)
      : lerpColor('#D9A62E', '#C4442E', (t - 0.5) * 2)
  }
  return lerpColor('#A8CBD6', '#35577D', t)
}
