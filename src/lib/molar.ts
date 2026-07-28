/**
 * 重量濃度(mg/kg)とモル濃度(mmol/kg)の換算。
 *
 * 分析書の値は重量濃度だが、成分どうしを2軸で並べると原子量の差がそのまま
 * 効いてしまい、量の多い少ないが読み取りづらい(例:Na⁺ 100 mg/kg と
 * Cl⁻ 100 mg/kg は物質量では 4.35 mmol/kg 対 2.82 mmol/kg で 1.5 倍違う)。
 * モル濃度にそろえると化学量論どおりに比べられるため、散布図ではこちらを使う。
 */

/**
 * 原子量(IUPAC 2021 の標準原子量。範囲で与えられる元素は代表値)。
 * 温泉分析書に現れる元素だけを持つ。
 */
export const ATOMIC_WEIGHTS: Record<string, number> = {
  H: 1.008,
  Li: 6.94,
  B: 10.81,
  C: 12.011,
  N: 14.007,
  O: 15.999,
  F: 18.998,
  Na: 22.99,
  Mg: 24.305,
  Al: 26.982,
  Si: 28.085,
  P: 30.974,
  S: 32.06,
  Cl: 35.45,
  K: 39.098,
  Ca: 40.078,
  Cr: 51.996,
  Mn: 54.938,
  Fe: 55.845,
  Cu: 63.546,
  Zn: 65.38,
  As: 74.922,
  Br: 79.904,
  Sr: 87.62,
  Cd: 112.414,
  I: 126.904,
  Ba: 137.327,
  Pb: 207.2,
}

/** 「元素記号 + 個数(省略時1)」の並びだけを受け付ける。括弧付きの式は温泉成分には現れない */
const FORMULA_RE = /^([A-Z][a-z]?\d*)+$/
const TERM_RE = /([A-Z][a-z]?)(\d*)/g

/**
 * 化学式(例 "SO4"、"H2SiO3")からモル質量 (g/mol) を求める。
 * イオンの電荷は式に含めない(電子の質量は分析書の桁では効かないため無視する)。
 * 未知の元素記号や解釈できない式は、定義の書き間違いに気づけるよう例外にする。
 */
export function molarMass(formula: string): number {
  if (!FORMULA_RE.test(formula)) throw new Error(`解釈できない化学式: ${formula}`)
  let sum = 0
  for (const [, el, n] of formula.matchAll(TERM_RE)) {
    const w = ATOMIC_WEIGHTS[el!]
    if (w == null) throw new Error(`原子量が未定義の元素: ${el}(化学式 ${formula})`)
    sum += w * (n ? Number(n) : 1)
  }
  return sum
}

/**
 * mg/kg → mmol/kg。
 * 1 g/mol = 1 mg/mmol なので、重量濃度をモル質量で割るだけで mmol/kg になる。
 */
export const mgToMmol = (mgPerKg: number, molarMass: number): number => mgPerKg / molarMass
