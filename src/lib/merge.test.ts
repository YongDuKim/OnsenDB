import { describe, expect, it } from 'vitest'
import { mergeJsonText } from './merge'
import { emptyRecord } from '../schema'

const rec = (id: string, name: string) => ({ ...emptyRecord(), id, name })

describe('mergeJsonText', () => {
  it('新しいレコードを追加する', () => {
    const res = mergeJsonText([rec('a', '既存')], JSON.stringify([rec('b', '追加')]))
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.records).toHaveLength(2)
      expect(res.records.map((r) => r.name)).toEqual(['既存', '追加'])
    }
  })

  it('同じ id はインポート側で上書きする', () => {
    const res = mergeJsonText([rec('a', '旧名')], JSON.stringify([rec('a', '新名')]))
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.records).toHaveLength(1)
      expect(res.records[0]!.name).toBe('新名')
    }
  })

  it('id や name のない要素は取り込まない', () => {
    const res = mergeJsonText([], JSON.stringify([{ foo: 'bar' }, rec('a', '正常')]))
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.records).toHaveLength(1)
    }
  })

  it('壊れたJSONは拒否する', () => {
    expect(mergeJsonText([], '{broken').ok).toBe(false)
  })

  it('配列でないJSONは拒否する', () => {
    expect(mergeJsonText([], '{"a":1}').ok).toBe(false)
  })
})
