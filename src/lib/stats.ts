/**
 * 散布図の一次近似(最小二乗法)と相関係数。
 *
 * 値の変換には関与しない純粋関数として保つ。将来 x・y を対数化して回帰する
 * 場合も、呼び出し側で変換した値を渡せばこのファイルは無変更で使える。
 */

export interface LinearFit {
  /** 回帰に使った点の数 */
  n: number
  /** 傾き */
  slope: number
  /** 切片 */
  intercept: number
  /** ピアソンの積率相関係数(-1〜1) */
  r: number
  /** データの存在する x の範囲。近似直線を外挿せずに引くために使う */
  xMin: number
  xMax: number
}

/** 点が2つ以下だと相関係数が常に ±1 になり意味を持たないため、3点を下限とする */
export const MIN_POINTS = 3

/**
 * 最小二乗法で y = slope·x + intercept を求め、あわせて相関係数を返す。
 * 点が足りない場合と、x または y の分散がゼロで計算が定義できない場合は null。
 */
export function linearFit(points: ReadonlyArray<{ x: number; y: number }>): LinearFit | null {
  const pts = points.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y))
  const n = pts.length
  if (n < MIN_POINTS) return null

  const mx = pts.reduce((a, p) => a + p.x, 0) / n
  const my = pts.reduce((a, p) => a + p.y, 0) / n
  let sxy = 0
  let sxx = 0
  let syy = 0
  for (const p of pts) {
    sxy += (p.x - mx) * (p.y - my)
    sxx += (p.x - mx) ** 2
    syy += (p.y - my) ** 2
  }
  // どちらかの軸で全点が同じ値だと、傾きも相関係数も定義できない
  if (sxx === 0 || syy === 0) return null

  const slope = sxy / sxx
  const xs = pts.map((p) => p.x)
  return {
    n,
    slope,
    intercept: my - slope * mx,
    r: sxy / Math.sqrt(sxx * syy),
    xMin: Math.min(...xs),
    xMax: Math.max(...xs),
  }
}

/** 相関係数の表示。-1〜1 に収まるため小数3桁で固定する */
export const formatR = (r: number): string => r.toFixed(3)

/**
 * 回帰式の係数の表示。指標により桁が 0.0001〜数万と大きく振れるため
 * 有効数字3桁とし、toPrecision が返す指数表記は通常表記へ直す。
 */
export function formatCoef(v: number): string {
  if (v === 0) return '0'
  const p = Number(v.toPrecision(3))
  // 1e-4 未満のような極端な値だけは指数表記のほうが読める
  if (Math.abs(p) < 1e-4 || Math.abs(p) >= 1e6) return p.toExponential(2)
  return String(p)
}

/** 「y = 1.82x + 12.3」形式の回帰式。負の係数はマイナスで連結する */
export function formatEquation(fit: LinearFit): string {
  const sign = fit.intercept < 0 ? '−' : '+'
  return `y = ${formatCoef(fit.slope)}x ${sign} ${formatCoef(Math.abs(fit.intercept))}`
}
