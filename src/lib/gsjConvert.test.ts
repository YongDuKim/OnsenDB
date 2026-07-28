import { describe, expect, it } from 'vitest'
import {
  QUALITY_CATEGORIES,
  RADON_FACTORS,
  SIO2_TO_H2SIO3,
  classifyQuality,
  cleanNumber,
  convertRow,
  normalizeRadon,
  parseCsv,
  parseSamplingDate,
  polygonCentroid,
} from './gsjConvert'
import { BQ_PER_CI, BQ_PER_MACHE, CI_DISPLAY_EXPONENT } from './radon'
import { molarMass } from './molar'
import { ALL_COMPONENTS } from '../schema'
import { COMPONENT_COLUMN_MAP } from './gsjConvert'

const bit = (label: string): number => {
  const c = QUALITY_CATEGORIES.find((x) => x.label.startsWith(label))
  if (!c) throw new Error(`分類が見つからない: ${label}`)
  return 1 << c.bit
}

describe('parseCsv', () => {
  it('引用符内のカンマ・改行・"" を扱える', () => {
    const rows = parseCsv('a,"b,1","c""d"\r\n"e\nf",g,\n')
    expect(rows).toEqual([
      ['a', 'b,1', 'c"d'],
      ['e\nf', 'g', ''],
    ])
  })

  it('位置ポリゴン列(カンマ入り引用フィールド)を1セルとして読む', () => {
    const rows = parseCsv('1,"POLYGON((144.3 43.5,144.4 43.6))",x')
    expect(rows[0]).toEqual(['1', 'POLYGON((144.3 43.5,144.4 43.6))', 'x'])
  })
})

describe('cleanNumber', () => {
  it('末尾空白付きの数値を読める(元データは "98.20 " 形式)', () => {
    expect(cleanNumber('98.20 ')).toBe(98.2)
  })
  it('欠測・痕跡・検出限界未満は null', () => {
    expect(cleanNumber('')).toBeNull()
    expect(cleanNumber('N/A')).toBeNull()
    expect(cleanNumber('TR')).toBeNull()
    expect(cleanNumber('tr')).toBeNull()
    expect(cleanNumber('<0.1')).toBeNull()
    expect(cleanNumber('自噴')).toBeNull()
  })
})

describe('parseSamplingDate', () => {
  it('年.月.日 の各形式を ISO 風に整える', () => {
    expect(parseSamplingDate('1977.5')).toBe('1977-05')
    expect(parseSamplingDate('1998.10.3')).toBe('1998-10-03')
    expect(parseSamplingDate('1959')).toBe('1959')
    expect(parseSamplingDate('1959.')).toBe('1959')
  })
  it('年の範囲表記は先頭の年だけを採用する', () => {
    // "1955～1957" は月に読めない "19" が続くため年のみになる
    expect(parseSamplingDate('1955～1957')).toBe('1955')
  })
  it('不明・範囲外は null', () => {
    expect(parseSamplingDate('')).toBeNull()
    expect(parseSamplingDate('N/A')).toBeNull()
    expect(parseSamplingDate('0012.3')).toBeNull()
  })
})

describe('polygonCentroid', () => {
  it('閉じた六角形の重心を返す(元データの位置ぼかしポリゴン)', () => {
    const wkt =
      'POLYGON((144.313281 43.582369,144.314034 43.581468,144.313082 43.580672,' +
      '144.311741 43.581081,144.311863 43.582129,144.313281 43.582369))'
    const c = polygonCentroid(wkt)!
    expect(c.lat).toBeCloseTo(43.5815, 3)
    expect(c.lng).toBeCloseTo(144.3128, 3)
  })
  it('解釈できない文字列は null', () => {
    expect(polygonCentroid('')).toBeNull()
    expect(polygonCentroid('POINT(1 2)')).toBeNull()
  })
})

describe('normalizeRadon', () => {
  it('換算係数は lib/radon.ts と同値', () => {
    expect(RADON_FACTORS.BQ_PER_CI_E10).toBeCloseTo(BQ_PER_CI * CI_DISPLAY_EXPONENT, 10)
    expect(RADON_FACTORS.BQ_PER_MACHE).toBeCloseTo(BQ_PER_MACHE, 10)
  })
  it('キュリー系の表記ゆれを ×10⁻¹⁰ Ci として Bq/kg へ換算する', () => {
    expect(normalizeRadon(10, '10-10Ci/kg')).toBe(37)
    expect(normalizeRadon(10, '10-10 Ci/l')).toBe(37)
    expect(normalizeRadon(10, '10^(-10)cu/kg')).toBe(37)
    expect(normalizeRadon(10, '10-10curie')).toBe(37)
  })
  it('マッヘ系の表記ゆれを Bq/kg へ換算する', () => {
    expect(normalizeRadon(8.25, 'マッヘ')).toBeCloseTo(111.1, 1) // 療養泉基準と一致
    expect(normalizeRadon(1, 'M.E./kg')).toBeCloseTo(13.47, 2)
    expect(normalizeRadon(1, 'M・E')).toBeCloseTo(13.47, 2)
  })
  it('Bq はそのまま、不明な単位・単位なしは null', () => {
    expect(normalizeRadon(50, 'Bq/kg')).toBe(50)
    expect(normalizeRadon(5.1, '5.1')).toBeNull()
    expect(normalizeRadon(5.1, '')).toBeNull()
  })
})

describe('classifyQuality', () => {
  it('日本語の泉質名を分類する', () => {
    expect(classifyQuality('単純温泉')).toBe(bit('単純温泉'))
    expect(classifyQuality('アルカリ性単純')).toBe(bit('単純温泉'))
    expect(classifyQuality('含塩化土類食塩泉')).toBe(bit('塩化物泉'))
    expect(classifyQuality('重曹泉')).toBe(bit('炭酸水素塩泉'))
    expect(classifyQuality('芒硝泉')).toBe(bit('硫酸塩泉'))
    expect(classifyQuality('単純炭酸泉')).toBe(bit('単純温泉') | bit('二酸化炭素泉'))
    expect(classifyQuality('放射能泉')).toBe(bit('放射能泉'))
    expect(classifyQuality('酸性泉')).toBe(bit('酸性泉'))
    expect(classifyQuality('含鉄泉')).toBe(bit('含鉄泉'))
    expect(classifyQuality('単純硫黄泉')).toBe(bit('単純温泉') | bit('硫黄泉'))
  })
  it('炭酸水素塩泉は二酸化炭素泉と混同しない', () => {
    expect(classifyQuality('ナトリウム-炭酸水素塩泉')).toBe(bit('炭酸水素塩泉'))
  })
  it('化学式表記を分類する', () => {
    expect(classifyQuality('Na-Cl泉')).toBe(bit('塩化物泉'))
    expect(classifyQuality('含S-Na-Cl')).toBe(bit('硫黄泉') | bit('塩化物泉'))
    expect(classifyQuality('Na-HCO3')).toBe(bit('炭酸水素塩泉'))
  })
  it('どの分類にも当たらない表記は「その他」', () => {
    expect(classifyQuality('鉱泉')).toBe(bit('その他'))
  })
  it('空文字は 0(記載なし)', () => {
    expect(classifyQuality('')).toBe(0)
  })
})

describe('SiO2 → H2SiO3 換算', () => {
  it('係数は lib/molar.ts のモル質量比と同値', () => {
    expect(SIO2_TO_H2SIO3).toBeCloseTo(molarMass('H2SiO3') / molarMass('SiO2'), 6)
  })
})

describe('COMPONENT_COLUMN_MAP', () => {
  it('対応先の成分 id はすべて schema.ts に存在する', () => {
    const ids = new Set(ALL_COMPONENTS.map((c) => c.id))
    for (const [, id] of COMPONENT_COLUMN_MAP) expect(ids.has(id), id).toBe(true)
  })
})

describe('convertRow', () => {
  const baseRow: Record<string, string> = {
    Ser: '1',
    温泉名: '和琴半島',
    泉源名: '和琴地獄',
    都道府県: '北海道',
    市区町村: '川上郡弟子屈町',
    位置: 'POLYGON((144.31 43.58,144.32 43.58,144.32 43.59,144.31 43.59,144.31 43.58))',
    採水年月日: '1977.5',
    泉温: '98.20 ',
    pH: '9.10 ',
    TSM: '1439.000 ',
    Na: '334.500 ',
    Cl: '320.500 ',
    SiO2: '452.641 ',
    HAsO2: '0.929 ',
    単位: 'mg/kg',
    Rn: 'N/A',
    泉質: '含S-Na-Cl',
    出典: 'R:01-08',
  }

  it('実データ相当の1行を圧縮レコードへ変換する', () => {
    const { record: r, warnings } = convertRow(baseRow)
    expect(warnings).toEqual([])
    expect(r).not.toBeNull()
    expect(r!.i).toBe(1)
    expect(r!.n).toBe('和琴半島 和琴地獄')
    expect(r!.p).toBe('北海道')
    expect(r!.d).toBe('1977-05')
    expect(r!.t).toBe(98.2)
    expect(r!.h).toBe(9.1)
    expect(r!.s).toBe(1439)
    expect(r!.q).toBe('含S-Na-Cl')
    expect(r!.qc).toBe(bit('硫黄泉') | bit('塩化物泉'))
    expect(r!.u).toBeUndefined() // mg/kg は既定なので省略
    expect(r!.la).toBeCloseTo(43.585, 3)
    expect(r!.lo).toBeCloseTo(144.315, 3)
    expect(r!.v).toMatchObject({ na: 334.5, cl: 320.5, haso2: 0.929 })
    expect(r!.sr).toBe('R:01-08')
  })

  it('H2SiO3 が無い行は SiO2 から換算する', () => {
    const { record: r } = convertRow(baseRow)
    expect(r!.v!['h2sio3']).toBeCloseTo(452.641 * SIO2_TO_H2SIO3, 1)
  })

  it('H2SiO3 の記載がある行は SiO2 より優先する', () => {
    const { record: r } = convertRow({ ...baseRow, H2SiO3: '100.0 ' })
    expect(r!.v!['h2sio3']).toBe(100)
  })

  it('mg/l と単位不明はフラグで区別する', () => {
    expect(convertRow({ ...baseRow, 単位: 'mg/l' }).record!.u).toBe(1)
    expect(convertRow({ ...baseRow, 単位: '' }).record!.u).toBe(2)
  })

  it('ラドンは単位が解釈できるときだけ Bq/kg で取り込む', () => {
    const ok = convertRow({ ...baseRow, Rn: '10.0 ', Rn単位: '10-10Ci/kg' })
    expect(ok.record!.rn).toBe(37)
    const ng = convertRow({ ...baseRow, Rn: '10.0 ', Rn単位: '' })
    expect(ng.record!.rn).toBeUndefined()
    expect(ng.warnings.some((w) => w.includes('ラドン単位'))).toBe(true)
  })

  it('泉源名が温泉名と同じときは重ねない', () => {
    const { record: r } = convertRow({ ...baseRow, 泉源名: '和琴半島' })
    expect(r!.n).toBe('和琴半島')
  })

  it('Ser の無い行は除外する', () => {
    expect(convertRow({ ...baseRow, Ser: '' }).record).toBeNull()
  })
})
