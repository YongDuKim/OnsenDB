import { STORAGE_KEY } from '../schema'
import type { OnsenRecord } from '../types'

/**
 * localStorage による永続化層。
 * プライベートブラウズ等で localStorage が使えない環境でも
 * アプリ自体は動くよう、失敗は例外でなく戻り値で伝える。
 */

const SELFTEST_KEY = 'onsen-db-selftest'

export function loadRecords(): OnsenRecord[] {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (!v) return []
    const data: unknown = JSON.parse(v)
    return Array.isArray(data) ? (data as OnsenRecord[]) : []
  } catch {
    return []
  }
}

export function saveRecords(records: OnsenRecord[]): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
    return true
  } catch {
    return false
  }
}

/** 書き込み→読み戻しのテストで、この環境で永続保存が使えるか確認 */
export function storageSelfTest(): boolean {
  try {
    const stamp = String(Date.now())
    localStorage.setItem(SELFTEST_KEY, stamp)
    const ok = localStorage.getItem(SELFTEST_KEY) === stamp
    localStorage.removeItem(SELFTEST_KEY)
    return ok
  } catch {
    return false
  }
}
