# 温泉分析帳

私設・温泉分析書データベース。訪れた温泉の分析書(成分表)を記録し、比較・散布図・地図・化学種分布図で眺めるための PWA。

**公開URL:** https://yongdukim.github.io/OnsenDB/

## 特徴

- 温泉分析書の成分(陽イオン・陰イオン・遊離成分・溶存ガス)を1件ずつ登録
- 初回起動時は既定の分析書22件が登録済み(通常のレコードとして編集・削除できる)
- 海水(標準)を比較基準として常時表示
- 泉温・pH・成分濃度での横並び比較、2軸散布図、日本地図での分布表示
- 酸解離定数(pKa)表と pH−化学種分布図
- データはブラウザの localStorage に保存(端末内のみ)。JSONでバックアップ/復元・端末間の手動移行が可能
- PWA対応:ホーム画面に追加でき、オフラインでも起動・閲覧・入力できる

## 開発

```bash
npm install
npm run dev          # 開発サーバー
npm run test         # Vitest(単体 + コンポーネントテスト)
npm run lint         # ESLint
npm run format       # Prettier
npm run build        # 型チェック + 本番ビルド
npm run preview      # ビルド結果のプレビュー
```

## 構成

- `src/schema.ts` — 成分・酸解離定数・都道府県などのスキーマ定義。ここに項目を追加すれば入力欄・グラフに自動反映
- `src/defaultRecords.ts` — 初回起動時に登録済みとなる既定の分析書
- `src/lib/` — 計算・保存などの純粋ロジック(テスト対象)
- `src/components/` — React コンポーネント(タブごとのビュー)

## デプロイ

`main` ブランチへの push で GitHub Actions が lint → format check → test → build を実行し、
すべて通れば GitHub Pages に自動デプロイされる(`.github/workflows/deploy.yml`)。
