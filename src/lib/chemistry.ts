/**
 * n価の酸の各化学種の存在割合(%)を返す。
 * 対数空間で計算してオーバーフローを回避する。
 * 返り値の長さは pka.length + 1(全プロトン付加形→全解離形の順)。
 */
export function speciation(pka: number[], ph: number): number[] {
  const logs = [0]
  let acc = 0
  for (const k of pka) {
    acc += ph - k
    logs.push(acc)
  }
  const m = Math.max(...logs)
  const terms = logs.map((L) => Math.pow(10, L - m))
  const sum = terms.reduce((a, b) => a + b, 0)
  return terms.map((t) => (t / sum) * 100)
}
