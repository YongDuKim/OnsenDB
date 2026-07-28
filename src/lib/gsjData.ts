import type { OnsenRecord } from '../types'
import type { GsjCompactRecord, GsjDataset } from './gsjConvert'

/**
 * 産総研データモードの実行時データ層。
 * 変換済みデータセット(public/gsj/*.json)を必要になったときに一度だけ取得する。
 * 7,200件超を localStorage のマイ分析帳と混ぜると容量上限を超えるため、
 * 閲覧専用の別レイヤーとして保持し、保存はしない(PWA のキャッシュに任せる)。
 */

/** データセットの配置先(ファイル名でバージョンを固定し、キャッシュと衝突させない) */
export const GSJ_DATASET_PATH = 'gsj/gsj-onsen-2020.json'

export const GSJ_SOURCE_NAME = '産総研地質調査総合センター 地熱情報データベース'
export const GSJ_SOURCE_URL = 'https://gbank.gsj.jp/gres-db/'
export const GSJ_LICENSE_URL = 'https://www.gsj.jp/license/license.html'

/** 圧縮レコードをアプリ共通の OnsenRecord へ展開する(閲覧専用。id は gsj- 接頭辞) */
export function toOnsenRecord(c: GsjCompactRecord): OnsenRecord {
  const values: Record<string, string> = {}
  for (const [id, v] of Object.entries(c.v ?? {})) values[id] = String(v)
  if (c.rn != null) values['rn'] = String(c.rn)
  return {
    id: `gsj-${c.i}`,
    name: c.n,
    pref: c.p,
    city: c.c,
    date: c.d ?? '',
    quality: c.q ?? '',
    temp: c.t != null ? String(c.t) : '',
    ph: c.h != null ? String(c.h) : '',
    tds: c.s != null ? String(c.s) : '',
    lat: c.la ?? null,
    lng: c.lo ?? null,
    coordText: '',
    memo: '',
    source: c.sr,
    values,
  }
}

let cache: Promise<GsjDataset> | null = null

/** データセットを取得する(成功したらモジュール内に保持。失敗時は次回また試す) */
export function loadGsjDataset(): Promise<GsjDataset> {
  if (!cache) {
    cache = fetch(`${import.meta.env.BASE_URL}${GSJ_DATASET_PATH}`).then((res) => {
      if (!res.ok) throw new Error(`データセットを取得できませんでした (HTTP ${res.status})`)
      return res.json() as Promise<GsjDataset>
    })
    cache.catch(() => {
      cache = null
    })
  }
  return cache
}
