import type { OnsenRecord } from '../types'

export type MergeResult = { ok: true; records: OnsenRecord[] } | { ok: false }

/**
 * バックアップ JSON テキストを既存レコードにマージする。
 * 同じ id のレコードはインポート側で上書き、それ以外は追加。
 * 配列でない・壊れた JSON・必須項目のない要素は受け付けない。
 */
export function mergeJsonText(records: OnsenRecord[], text: string): MergeResult {
  try {
    const data: unknown = JSON.parse(text)
    if (!Array.isArray(data)) return { ok: false }
    const map = new Map(records.map((r) => [r.id, r]))
    for (const r of data as OnsenRecord[]) {
      if (r && r.id && r.name != null) map.set(r.id, r)
    }
    return { ok: true, records: [...map.values()] }
  } catch {
    return { ok: false }
  }
}
