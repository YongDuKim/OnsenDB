import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadRecords, saveRecords, storageSelfTest } from './storage'
import { DEFAULT_RECORDS } from '../defaultRecords'
import { STORAGE_KEY, emptyRecord } from '../schema'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('saveRecords / loadRecords', () => {
  it('保存したレコードを読み戻せる', () => {
    const rec = { ...emptyRecord(), name: '草津温泉' }
    expect(saveRecords([rec])).toBe(true)
    expect(loadRecords()).toEqual([rec])
  })

  it('初回起動(未保存)は既定データを返す', () => {
    expect(loadRecords()).toEqual(DEFAULT_RECORDS)
  })

  it('既定データは複製で返され、書き換えても定数へ波及しない', () => {
    const first = loadRecords()
    first[0]!.name = '書き換え'
    first[0]!.values.cl = '99999'
    expect(loadRecords()[0]!.name).toBe(DEFAULT_RECORDS[0]!.name)
    expect(loadRecords()[0]!.values.cl).toBe(DEFAULT_RECORDS[0]!.values.cl)
  })

  it('全件削除して保存した後は既定データが復活しない', () => {
    expect(saveRecords([])).toBe(true)
    expect(loadRecords()).toEqual([])
  })

  it('壊れたJSONが入っていても空配列(クラッシュしない)', () => {
    localStorage.setItem(STORAGE_KEY, '{broken')
    expect(loadRecords()).toEqual([])
  })

  it('配列以外が入っていても空配列', () => {
    localStorage.setItem(STORAGE_KEY, '{"not":"array"}')
    expect(loadRecords()).toEqual([])
  })

  it('書き込み失敗(容量超過など)は false を返す', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota exceeded', 'QuotaExceededError')
    })
    expect(saveRecords([emptyRecord()])).toBe(false)
  })
})

describe('storageSelfTest', () => {
  it('localStorage が使えれば true', () => {
    expect(storageSelfTest()).toBe(true)
  })

  it('localStorage が例外を投げる環境では false', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('unavailable')
    })
    expect(storageSelfTest()).toBe(false)
  })
})
