import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadRecords, saveRecords, storageSelfTest } from './storage'
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

  it('未保存なら空配列', () => {
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
