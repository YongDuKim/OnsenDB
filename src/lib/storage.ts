import { defaultRecords } from '../defaultRecords'
import { STORAGE_KEY } from '../schema'
import type { OnsenRecord } from '../types'

/**
 * localStorage による永続化層。
 * プライベートブラウズ等で localStorage が使えない環境でも
 * アプリ自体は動くよう、失敗は例外でなく戻り値で伝える。
 */

const SELFTEST_KEY = 'onsen-db-selftest'

/**
 * 保存済みレコードを読み出す。
 * キーが存在しない初回起動時のみ既定データを返す。全件削除して保存した場合は
 * 空配列が保存されているため、既定データが復活することはない。
 */
export function loadRecords(): OnsenRecord[] {
  let raw: string | null
  try {
    raw = localStorage.getItem(STORAGE_KEY)
  } catch {
    // localStorage 自体が使えない環境。毎回が初回起動と同じ状態になる
    return defaultRecords()
  }
  if (raw === null) return defaultRecords()
  try {
    const data: unknown = JSON.parse(raw)
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
