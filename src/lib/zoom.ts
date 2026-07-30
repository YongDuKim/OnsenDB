/**
 * 散布図の拡大表示(ドラッグで囲んだ矩形)を扱う純粋ロジック。
 *
 * 画素とデータ値の変換はグラフ側(recharts)が持っているため、
 * ここではデータ値に直したあとの範囲だけを扱う。
 */

export interface Point {
  x: number
  y: number
}

/** 拡大して表示する範囲。x0 < x1、y0 < y1 に正規化されている */
export interface ZoomRange {
  x0: number
  x1: number
  y0: number
  y1: number
}

/**
 * 選択とみなす最小のドラッグ幅(画素)。
 * タップのぶれで意図しない極端な拡大が起きないよう、縦横ともこの幅を要求する。
 */
export const MIN_DRAG_PX = 12

/**
 * ドラッグの2隅から拡大範囲を作る。右下方向でも左上方向でも同じ範囲になる。
 * 幅か高さがゼロ(または数値でない)場合は拡大できないため null。
 */
export function rangeFromCorners(a: Point, b: Point): ZoomRange | null {
  if (![a.x, a.y, b.x, b.y].every((v) => Number.isFinite(v))) return null
  const x0 = Math.min(a.x, b.x)
  const x1 = Math.max(a.x, b.x)
  const y0 = Math.min(a.y, b.y)
  const y1 = Math.max(a.y, b.y)
  if (x0 === x1 || y0 === y1) return null
  return { x0, x1, y0, y1 }
}

/** 拡大範囲に含まれる点か(境界上は含む) */
export function withinRange(p: Point, r: ZoomRange): boolean {
  return p.x >= r.x0 && p.x <= r.x1 && p.y >= r.y0 && p.y <= r.y1
}

/**
 * 拡大中の軸ラベルに使う小数桁数。
 *
 * 拡大すると軸の範囲が半端な値になり、既定では 19.360902255639097 のような
 * 目盛りが並んでしまう。かといって固定桁で丸めると、狭い範囲まで拡大したときに
 * 隣の目盛りと同じ表示になる。目盛りの間隔から必要な桁数を決めることで、
 * どこまで拡大しても隣と区別でき、かつ短いラベルになる。
 */
export function tickDecimals(span: number): number {
  if (!Number.isFinite(span) || span <= 0) return 0
  const step = span / 4 // 目盛りは既定で5本(=4区間)
  return Math.max(0, Math.min(8, Math.ceil(-Math.log10(step)) + 1))
}

/** 拡大中の軸ラベル・範囲表示のフォーマット(桁数は tickDecimals で揃える) */
export const formatValue = (v: number, decimals: number): string =>
  Number.isFinite(v)
    ? v.toLocaleString('ja-JP', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })
    : '—'
