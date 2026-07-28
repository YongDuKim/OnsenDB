import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { GsjDataset } from '../lib/gsjConvert'

/**
 * 産総研データモードのテスト。
 * データセットは fetch で取得するため、小さな模擬データセットを返すスタブを使う。
 * gsjData.ts のモジュール内キャッシュがテスト間で残らないよう resetModules する。
 */

const dataset: GsjDataset = {
  format: 1,
  meta: {
    title: '地熱情報データベース 温泉分析値データ(2020年版)',
    source: '産総研地質調査総合センター 地熱情報データベース',
    sourceUrl: 'https://gbank.gsj.jp/gres-db/',
    sourceFile: 'GSJ_DB_GRES-DB_ONSEN_2020.csv',
    license: 'テスト',
    licenseUrl: 'https://www.gsj.jp/license/license.html',
    processedBy: 'テスト',
    processedNote: 'テスト',
    generatedAt: '2026-07-28',
  },
  records: [
    {
      i: 1,
      n: '和琴半島 和琴地獄',
      p: '北海道',
      c: '川上郡弟子屈町',
      la: 43.5815,
      lo: 144.3128,
      d: '1977-05',
      t: 98.2,
      h: 9.1,
      s: 1439,
      q: '含S-Na-Cl',
      qc: (1 << 6) | (1 << 1),
      v: { na: 334.5, cl: 320.5 },
      sr: 'R:01-08',
    },
    {
      i: 2,
      n: '別府温泉テスト',
      p: '大分県',
      c: '別府市',
      t: 60,
      q: '単純温泉',
      qc: 1 << 0,
      u: 1,
      v: { na: 100 },
    },
  ],
}

beforeEach(() => {
  vi.resetModules()
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(dataset) }),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
})

/** gsjData.ts のデータセットキャッシュを避けるため、テストごとに App を読み込み直す */
const renderApp = async () => {
  const { default: FreshApp } = await import('./App')
  return render(<FreshApp />)
}

const toGsjMode = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: '産総研データ' }))
  // データ読み込み完了を待つ(一覧の1件目が出るまで)
  await screen.findByText('和琴半島 和琴地獄')
}

describe('産総研データモード', () => {
  it('モードを切り替えるとデータセットを読み込んで一覧が表示される', async () => {
    const user = userEvent.setup()
    await renderApp()

    await user.click(screen.getByRole('button', { name: '産総研データ' }))
    expect(await screen.findByText('和琴半島 和琴地獄')).toBeInTheDocument()
    expect(screen.getByText(/対 象|対象/)).toBeInTheDocument()
    expect(screen.getByText(/閲覧専用/)).toBeInTheDocument()
    // 出典の常時表示(利用規約1)ア)
    expect(
      screen.getAllByText(/産総研地質調査総合センター 地熱情報データベース/).length,
    ).toBeGreaterThan(0)
  })

  it('編集・削除・新規登録のUIが無い(閲覧専用)', async () => {
    const user = userEvent.setup()
    await renderApp()
    await toGsjMode(user)

    await user.click(screen.getByText('和琴半島 和琴地獄'))
    expect(screen.queryByRole('button', { name: '編集' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '削除' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '＋ 新規登録' })).not.toBeInTheDocument()
    // 開いた詳細に成分と出典コードが出る
    expect(screen.getByText(/出典コード R:01-08/)).toBeInTheDocument()
    expect(screen.getByText(/Na⁺ 334\.5 mg\/kg/)).toBeInTheDocument()
  })

  it('都道府県で絞り込める', async () => {
    const user = userEvent.setup()
    await renderApp()
    await toGsjMode(user)

    await user.selectOptions(screen.getByLabelText('都道府県'), '大分県')
    expect(screen.queryByText('和琴半島 和琴地獄')).not.toBeInTheDocument()
    expect(screen.getByText('別府温泉テスト')).toBeInTheDocument()
  })

  it('泉質の簡易分類で絞り込める', async () => {
    const user = userEvent.setup()
    await renderApp()
    await toGsjMode(user)

    const sel = screen.getByLabelText('泉質(簡易分類)')
    await user.selectOptions(sel, within(sel).getByRole('option', { name: '硫黄泉' }))
    expect(screen.getByText('和琴半島 和琴地獄')).toBeInTheDocument()
    expect(screen.queryByText('別府温泉テスト')).not.toBeInTheDocument()
  })

  it('mg/l 表記の分析書はその旨を表示する', async () => {
    const user = userEvent.setup()
    await renderApp()
    await toGsjMode(user)

    await user.click(screen.getByText('別府温泉テスト'))
    expect(screen.getByText(/濃度は mg\/l 表記/)).toBeInTheDocument()
    expect(screen.getByText(/Na⁺ 100 mg\/l/)).toBeInTheDocument()
  })

  it('「データについて」に出典・加工・利用条件が記載される', async () => {
    const user = userEvent.setup()
    await renderApp()
    await toGsjMode(user)

    await user.click(screen.getByRole('button', { name: 'データについて' }))
    expect(screen.getByText(/出典:産総研地質調査総合センター 地熱情報データベース/)).toBeVisible()
    expect(screen.getByText(/YongDuKim/)).toBeVisible()
    expect(
      screen.getByText(/産総研地質調査総合センターが\s*作成したものではありません/),
    ).toBeVisible()
    expect(screen.getByText(/現在の泉質・成分・湧出状況を示すものではありません/)).toBeVisible()
    expect(screen.getByRole('link', { name: /利用規約/ })).toHaveAttribute(
      'href',
      'https://www.gsj.jp/license/license.html',
    )
  })

  it('取得に失敗するとエラーと再試行ボタンが出る', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }))
    const user = userEvent.setup()
    await renderApp()

    await user.click(screen.getByRole('button', { name: '産総研データ' }))
    expect(await screen.findByText(/読み込めませんでした/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '再試行' })).toBeInTheDocument()
  })

  it('マイ分析帳モードに戻ると既存の一覧が表示される', async () => {
    const user = userEvent.setup()
    await renderApp()
    await toGsjMode(user)

    await user.click(screen.getByRole('button', { name: 'マイ分析帳' }))
    expect(screen.getByText('海水(標準)')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '＋ 新規登録' })).toBeInTheDocument()
  })
})
