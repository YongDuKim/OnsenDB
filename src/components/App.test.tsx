import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { DEFAULT_RECORDS } from '../defaultRecords'
import { STORAGE_KEY, emptyRecord } from '../schema'
import type { OnsenRecord } from '../types'

beforeEach(() => {
  vi.spyOn(window, 'alert').mockImplementation(() => {})
})

/** 既定データの入らない空の状態から始める(保存済みの空配列を置く) */
const startEmpty = () => localStorage.setItem(STORAGE_KEY, '[]')

describe('登録フロー', () => {
  it('フォームに入力して登録すると一覧に表示され、localStorage に保存される', async () => {
    startEmpty()
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '＋ 新規登録' }))
    await user.type(screen.getByLabelText('施設名・源泉名 *'), '草津温泉 湯畑源泉')
    await user.selectOptions(screen.getByLabelText('都道府県'), '群馬県')
    await user.type(screen.getByLabelText('泉温(℃)'), '55.7')
    await user.type(screen.getByLabelText('pH'), '2.1')
    await user.type(screen.getByLabelText('塩化物イオン (Cl⁻)(mg/kg)'), '305')
    await user.click(screen.getByRole('button', { name: 'この内容で登録' }))

    // 一覧タブに戻り、登録したレコードが表示される
    expect(screen.getByText('草津温泉 湯畑源泉')).toBeInTheDocument()
    expect(screen.getByText(/登録 1 件/)).toBeInTheDocument()

    // localStorage に永続化されている
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!) as OnsenRecord[]
    expect(saved).toHaveLength(1)
    expect(saved[0]!.name).toBe('草津温泉 湯畑源泉')
    expect(saved[0]!.pref).toBe('群馬県')
    expect(saved[0]!.temp).toBe('55.7')
    expect(saved[0]!.values.cl).toBe('305')
  })

  it('施設名が空のまま登録するとエラーになり登録されない', async () => {
    startEmpty()
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '＋ 新規登録' }))
    await user.click(screen.getByRole('button', { name: 'この内容で登録' }))

    expect(window.alert).toHaveBeenCalledWith('施設名(源泉名)を入力してください')
    expect(screen.getByText(/登録 0 件/)).toBeInTheDocument()
    expect(localStorage.getItem(STORAGE_KEY)).toBe('[]')
  })

  it('保存済みレコードは次回起動時に読み込まれる', () => {
    const rec = { ...emptyRecord(), name: '別府温泉' }
    localStorage.setItem(STORAGE_KEY, JSON.stringify([rec]))
    render(<App />)
    expect(screen.getByText('別府温泉')).toBeInTheDocument()
    expect(screen.getByText(/登録 1 件/)).toBeInTheDocument()
  })
})

describe('バックアップ / 復元フロー', () => {
  it('バックアップ画面のJSONにレコードが含まれる', async () => {
    const rec = { ...emptyRecord(), name: '有馬温泉 金泉' }
    localStorage.setItem(STORAGE_KEY, JSON.stringify([rec]))
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'バックアップ' }))
    const ta = screen.getByLabelText('バックアップJSON')
    expect(ta).toHaveValue(JSON.stringify([rec], null, 2))
  })

  it('バックアップJSONを貼り付けて取り込むと復元される', async () => {
    startEmpty()
    const rec = { ...emptyRecord(), name: '道後温泉' }
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'バックアップ' }))
    const ta = screen.getByLabelText('バックアップJSON')
    await user.clear(ta)
    await user.click(ta)
    await user.paste(JSON.stringify([rec]))
    await user.click(screen.getByRole('button', { name: '取り込む' }))

    expect(screen.getByText('道後温泉')).toBeInTheDocument()
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!) as OnsenRecord[]
    expect(saved.map((r) => r.name)).toContain('道後温泉')
  })

  it('壊れたJSONを取り込もうとするとエラーになりデータは変わらない', async () => {
    startEmpty()
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'バックアップ' }))
    const ta = screen.getByLabelText('バックアップJSON')
    await user.clear(ta)
    await user.click(ta)
    await user.paste('{broken')
    await user.click(screen.getByRole('button', { name: '取り込む' }))

    expect(window.alert).toHaveBeenCalledWith(
      '内容を読み込めませんでした。バックアップしたJSONを指定してください。',
    )
    expect(screen.getByText(/登録 0 件/)).toBeInTheDocument()
  })
})

describe('既定データ', () => {
  it('初回起動では既定の分析書が登録済みの状態で表示される', () => {
    render(<App />)
    expect(screen.getByText(new RegExp(`登録 ${DEFAULT_RECORDS.length} 件`))).toBeInTheDocument()
    expect(screen.getByText('下呂温泉')).toBeInTheDocument()
    expect(screen.getByText('蔵王温泉(大湯一号源泉)')).toBeInTheDocument()
  })

  it('保存済みデータがあれば既定データは混ざらない', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([{ ...emptyRecord(), id: 'r1', name: '草津温泉' }]),
    )
    render(<App />)
    expect(screen.getByText(/登録 1 件/)).toBeInTheDocument()
    expect(screen.queryByText('下呂温泉')).not.toBeInTheDocument()
  })

  it('既定データは海水と違い編集・削除できる', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByText('下呂温泉'))
    const row = screen.getByText('下呂温泉').closest('.o-row') as HTMLElement
    expect(within(row).getByRole('button', { name: '編集' })).toBeInTheDocument()
    expect(within(row).getByRole('button', { name: '削除' })).toBeInTheDocument()
  })
})

describe('一覧の並び順', () => {
  /** 画面に出ている順に施設名を拾う。先頭は常に海水なので落とす */
  const namesInOrder = () =>
    Array.from(document.querySelectorAll('.o-row-name'))
      .map((el) => el.textContent ?? '')
      .slice(1)

  it('都道府県順(北海道→沖縄県)で並ぶ', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        { ...emptyRecord(), id: 'r1', name: '別府温泉', pref: '大分県', city: '別府市' },
        { ...emptyRecord(), id: 'r2', name: '登別温泉', pref: '北海道', city: '登別市' },
        { ...emptyRecord(), id: 'r3', name: '草津温泉', pref: '群馬県', city: '草津町' },
      ]),
    )
    render(<App />)
    expect(namesInOrder()).toEqual(['登別温泉', '草津温泉', '別府温泉'])
  })

  it('都道府県が未入力のものは末尾に来る', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        { ...emptyRecord(), id: 'r1', name: '所在地なし温泉', pref: '' },
        { ...emptyRecord(), id: 'r2', name: '登別温泉', pref: '北海道' },
      ]),
    )
    render(<App />)
    expect(namesInOrder()).toEqual(['登別温泉', '所在地なし温泉'])
  })

  it('既定データは北海道で始まり大分県で終わる', () => {
    render(<App />)
    const names = namesInOrder()
    expect(names.slice(0, 2)).toEqual(['阿寒湖温泉(第七号源泉)', '網走湖温泉'])
    expect(names[names.length - 1]).toBe('ひょうたん温泉')
  })

  it('検索で絞り込んでも並び順は保たれる', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.type(screen.getByPlaceholderText('施設名・都道府県・泉質で検索'), '東京都')
    expect(namesInOrder()).toEqual(['ひんぎゃの恵', '中之郷温泉', '末吉かん沢温泉'])
  })
})

describe('ラドン', () => {
  it('比較・散布図の指標として3単位すべてを選べる', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '比較' }))
    const compare = screen.getByLabelText('指標を選択')
    for (const u of ['ラドン(Bq/kg)', 'ラドン(×10⁻¹⁰ Ci/kg)', 'ラドン(マッヘ単位)']) {
      expect(within(compare).getByRole('option', { name: u })).toBeInTheDocument()
    }

    await user.click(screen.getByRole('button', { name: '散布図' }))
    for (const axis of ['横軸', '縦軸']) {
      const sel = screen.getByLabelText(axis)
      expect(within(sel).getByRole('option', { name: 'ラドン(Bq/kg)' })).toBeInTheDocument()
      expect(within(sel).getByRole('option', { name: 'ラドン(マッヘ単位)' })).toBeInTheDocument()
    }
  })

  it('一覧の詳細では3単位を併記する', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByText('猫啼温泉'))
    const row = screen.getByText('猫啼温泉').closest('.o-row') as HTMLElement
    // memo にも同じ記述が残っているため、放射能の欄に絞って確認する
    const radon = within(row).getByText('放射能').parentElement as HTMLElement
    expect(within(radon).getByText(/ラドン 91\.8 Bq\/kg/)).toBeInTheDocument()
    expect(within(radon).getByText(/24\.81 ×10⁻¹⁰ Ci\/kg/)).toBeInTheDocument()
    expect(within(radon).getByText(/6\.82 マッヘ単位/)).toBeInTheDocument()
  })

  it('ラドン未入力の温泉には放射能の欄が出ない', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByText('下呂温泉'))
    const row = screen.getByText('下呂温泉').closest('.o-row') as HTMLElement
    expect(within(row).queryByText(/Bq\/kg/)).not.toBeInTheDocument()
  })
})

describe('2軸比較の単位', () => {
  it('散布図では成分をモル濃度で選ぶ(比較タブは重量濃度のまま)', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '比較' }))
    const compare = screen.getByLabelText('指標を選択')
    expect(within(compare).getByRole('option', { name: 'Cl⁻(mg/kg)' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '散布図' }))
    for (const axis of ['横軸', '縦軸']) {
      const sel = screen.getByLabelText(axis)
      expect(within(sel).getByRole('option', { name: 'Cl⁻(mmol/kg)' })).toBeInTheDocument()
      expect(within(sel).queryByRole('option', { name: 'Cl⁻(mg/kg)' })).not.toBeInTheDocument()
      // 換算できない指標は分析書の単位のまま
      expect(within(sel).getByRole('option', { name: 'ラドン(Bq/kg)' })).toBeInTheDocument()
      expect(within(sel).getByRole('option', { name: '溶存物質総量(mg/kg)' })).toBeInTheDocument()
    }
  })

  it('モル濃度で比べている旨を注記する', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '散布図' }))
    expect(screen.getByText(/モル濃度\(mmol\/kg\)に換算して比べています/)).toBeInTheDocument()
  })
})

describe('散布図の拡大', () => {
  /**
   * ドラッグでの範囲選択そのものは、グラフの描画領域の大きさが必要になるため
   * jsdom では再現できない(実ブラウザで確認する)。ここでは操作の入口と、
   * 拡大していない状態での見え方を確かめる。範囲の計算は lib/zoom のテストで担保する。
   */
  it('ドラッグで拡大できることを案内する', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '散布図' }))
    expect(screen.getByText(/図の上をドラッグすると、囲んだ範囲だけを拡大/)).toBeInTheDocument()
  })

  it('拡大していないときは「全画面に戻す」を出さない', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '散布図' }))
    expect(screen.queryByRole('button', { name: '全画面に戻す' })).not.toBeInTheDocument()
    expect(screen.queryByText(/拡大中/)).not.toBeInTheDocument()
  })

  it('「指で範囲を選ぶ」で選択モードを入り切りできる', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '散布図' }))
    const start = screen.getByRole('button', { name: '指で範囲を選ぶ' })
    expect(start).toHaveAttribute('aria-pressed', 'false')

    await user.click(start)
    const stop = screen.getByRole('button', { name: '範囲の選択をやめる' })
    expect(stop).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText(/拡大したい範囲を指でなぞって囲んでください/)).toBeInTheDocument()

    await user.click(stop)
    expect(screen.getByRole('button', { name: '指で範囲を選ぶ' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })
})

describe('一覧', () => {
  it('海水(比較基準)が常に表示される', () => {
    render(<App />)
    expect(screen.getByText('海水(標準)')).toBeInTheDocument()
  })

  it('検索でレコードを絞り込める', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        { ...emptyRecord(), id: 'r1', name: '草津温泉', pref: '群馬県' },
        { ...emptyRecord(), id: 'r2', name: '別府温泉', pref: '大分県' },
      ]),
    )
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByPlaceholderText('施設名・都道府県・泉質で検索'), '大分')
    expect(screen.queryByText('草津温泉')).not.toBeInTheDocument()
    expect(screen.getByText('別府温泉')).toBeInTheDocument()
  })

  it('レコードを開くと成分の詳細が表示される', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([{ ...emptyRecord(), id: 'r1', name: '玉川温泉', values: { cl: '3000' } }]),
    )
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByText('玉川温泉'))
    const row = screen.getByText('玉川温泉').closest('.o-row')!
    expect(within(row as HTMLElement).getByText('Cl⁻')).toBeInTheDocument()
    expect(within(row as HTMLElement).getByText('3,000 mg/kg')).toBeInTheDocument()
  })
})

describe('ストレージ自己診断', () => {
  it('localStorage が使えない環境では警告バナーが出る', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('unavailable')
    })
    render(<App />)
    expect(screen.getByText(/永続ストレージ.*が利用できません/)).toBeInTheDocument()
  })
})
