/**
 * ラドンの単位換算。
 * 分析書では Bq/kg・Ci/kg・マッヘ単位の3通りで記載されるが、いずれも同じ量を
 * 表すだけなので、保存するのは Bq/kg の1値だけとし、残りは都度換算する。
 */

/** 1 Ci = 3.7×10¹⁰ Bq(定義値) */
export const BQ_PER_CI = 3.7e10

/**
 * 1 マッヘ単位 = 3.64×10⁻¹⁰ Ci/kg = 13.468 Bq/kg。
 * 鉱泉分析法指針の療養泉基準「111 Bq/kg = 30×10⁻¹⁰ Ci/kg = 8.25 マッヘ単位」と一致する。
 */
export const BQ_PER_MACHE = 3.64e-10 * BQ_PER_CI

/**
 * Ci/kg はそのままだと 10⁻¹⁰ 台の値になり表示桁に収まらないため、
 * 分析書と同じ「×10⁻¹⁰ Ci/kg」を単位として扱う。
 */
export const CI_DISPLAY_EXPONENT = 1e-10

/** Bq/kg → ×10⁻¹⁰ Ci/kg */
export const bqToCi = (bq: number): number => bq / BQ_PER_CI / CI_DISPLAY_EXPONENT

/** Bq/kg → マッヘ単位 */
export const bqToMache = (bq: number): number => bq / BQ_PER_MACHE
