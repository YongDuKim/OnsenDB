/**
 * 産総研地質調査総合センター「地熱情報データベース」温泉分析値データの CSV を
 * 配布用データセット(public/gsj/gsj-onsen-2020.json)へ変換する。
 *
 * 使い方:
 *   node scripts/convert-gsj.ts <GSJ_DB_GRES-DB_ONSEN_2020.csv のパス>
 *
 * 入力 CSV は https://gbank.gsj.jp/gres-db/ からダウンロードした
 * GSJ_DB_GRESDB_ONSEN_2020.zip に含まれるもの(Shift_JIS)。
 * CSV 自体はリポジトリに含めず、変換結果の JSON だけをコミットする。
 * 変換ロジックの本体は src/lib/gsjConvert.ts(テスト対象)にある。
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import process from 'node:process'
import { convertRow, parseCsv } from '../src/lib/gsjConvert.ts'
import type { GsjCompactRecord, GsjDataset } from '../src/lib/gsjConvert.ts'

const csvPath = process.argv[2]
if (!csvPath) {
  console.error('使い方: node scripts/convert-gsj.ts <GSJ_DB_GRES-DB_ONSEN_2020.csv のパス>')
  process.exit(1)
}

// 元データは Shift_JIS(CP932)。Node 標準の TextDecoder で復号する
const text = new TextDecoder('shift_jis').decode(readFileSync(csvPath))
const rows = parseCsv(text)
const header = rows[0]
if (!header || !header.includes('温泉名')) {
  console.error('ヘッダー行に「温泉名」が見つかりません。想定と異なる CSV です。')
  process.exit(1)
}

const records: GsjCompactRecord[] = []
const warningCounts = new Map<string, number>()
let skipped = 0
for (const row of rows.slice(1)) {
  if (row.every((cell) => cell.trim() === '')) continue // 末尾の空行
  const cols: Record<string, string> = {}
  header.forEach((h, i) => {
    if (h) cols[h] = row[i] ?? ''
  })
  const { record, warnings } = convertRow(cols)
  for (const w of warnings) warningCounts.set(w, (warningCounts.get(w) ?? 0) + 1)
  if (record) records.push(record)
  else skipped++
}

const dataset: GsjDataset = {
  format: 1,
  meta: {
    title: '地熱情報データベース 温泉分析値データ(2020年版)',
    source: '産総研地質調査総合センター 地熱情報データベース',
    sourceUrl: 'https://gbank.gsj.jp/gres-db/',
    sourceFile: 'GSJ_DB_GRES-DB_ONSEN_2020.csv',
    license:
      '産総研地質調査総合センターウェブサイト利用規約(政府標準利用規約(第2.0版)準拠・CC BY 4.0 互換)',
    licenseUrl: 'https://www.gsj.jp/license/license.html',
    processedBy: '温泉分析帳(YongDuKim)',
    processedNote:
      '文字コード変換・JSON化、位置ポリゴンの重心点化、採水年月日の表記統一、' +
      'ラドンの Bq/kg 換算、SiO2 のメタケイ酸(H2SiO3)換算、泉質の簡易分類の付与、' +
      '欠測(N/A・TR・検出限界未満)の除外、収録項目の取捨選択を行った。',
    generatedAt: new Date().toISOString().slice(0, 10),
  },
  records,
}

const outPath = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'public',
  'gsj',
  'gsj-onsen-2020.json',
)
mkdirSync(dirname(outPath), { recursive: true })
writeFileSync(outPath, JSON.stringify(dataset))

// ---- 変換サマリ ----
const count = (pred: (r: GsjCompactRecord) => boolean) => records.filter(pred).length
console.log(`変換完了: ${records.length} 件(除外 ${skipped} 件) → ${outPath}`)
console.log(`  位置あり: ${count((r) => r.la != null)}`)
console.log(`  泉温あり: ${count((r) => r.t != null)} / pHあり: ${count((r) => r.h != null)}`)
console.log(`  泉質あり: ${count((r) => r.q != null)} / ラドンあり: ${count((r) => r.rn != null)}`)
console.log(`  単位 mg/l: ${count((r) => r.u === 1)} / 単位不明: ${count((r) => r.u === 2)}`)
if (warningCounts.size > 0) {
  console.log('警告:')
  for (const [w, n] of [...warningCounts.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${n} 件: ${w}`)
  }
}
