import type { AcidSystem, ComponentGroup, Metric, OnsenRecord } from './types'

/* ============================================================
   スキーマ定義 — ここに項目を追加すれば入力欄・グラフに自動反映
   ============================================================ */
export const COMPONENT_GROUPS: ComponentGroup[] = [
  {
    id: 'cation',
    title: '陽イオン',
    items: [
      // 1価(第1族:H→Li→Na→K、次いでNH₄⁺)
      { id: 'h', label: '水素イオン (H⁺)', short: 'H⁺', unit: 'mg/kg' },
      { id: 'li', label: 'リチウムイオン (Li⁺)', short: 'Li⁺', unit: 'mg/kg' },
      { id: 'na', label: 'ナトリウムイオン (Na⁺)', short: 'Na⁺', unit: 'mg/kg' },
      { id: 'k', label: 'カリウムイオン (K⁺)', short: 'K⁺', unit: 'mg/kg' },
      { id: 'nh4', label: 'アンモニウムイオン (NH₄⁺)', short: 'NH₄⁺', unit: 'mg/kg' },
      // 2価(第2族:Mg→Ca→Sr→Ba、以降は族番号順)
      { id: 'mg', label: 'マグネシウムイオン (Mg²⁺)', short: 'Mg²⁺', unit: 'mg/kg' },
      { id: 'ca', label: 'カルシウムイオン (Ca²⁺)', short: 'Ca²⁺', unit: 'mg/kg' },
      { id: 'sr', label: 'ストロンチウムイオン (Sr²⁺)', short: 'Sr²⁺', unit: 'mg/kg' },
      { id: 'ba', label: 'バリウムイオン (Ba²⁺)', short: 'Ba²⁺', unit: 'mg/kg' },
      { id: 'mn', label: 'マンガンイオン (Mn²⁺)', short: 'Mn²⁺', unit: 'mg/kg' },
      { id: 'fe2', label: '鉄(II)イオン (Fe²⁺)', short: 'Fe²⁺', unit: 'mg/kg' },
      { id: 'fe3', label: '鉄(III)イオン (Fe³⁺)', short: 'Fe³⁺', unit: 'mg/kg' },
      { id: 'cu', label: '銅イオン (Cu²⁺)', short: 'Cu²⁺', unit: 'mg/kg' },
      { id: 'zn', label: '亜鉛イオン (Zn²⁺)', short: 'Zn²⁺', unit: 'mg/kg' },
      { id: 'cd', label: 'カドミウムイオン (Cd²⁺)', short: 'Cd²⁺', unit: 'mg/kg' },
      { id: 'pb', label: '鉛イオン (Pb²⁺)', short: 'Pb²⁺', unit: 'mg/kg' },
      // 3価(鉄はFe²⁺の隣に配置済み)
      { id: 'cr', label: 'クロムイオン (Cr³⁺)', short: 'Cr³⁺', unit: 'mg/kg' },
      { id: 'al', label: 'アルミニウムイオン (Al³⁺)', short: 'Al³⁺', unit: 'mg/kg' },
    ],
  },
  {
    id: 'anion',
    title: '陰イオン',
    items: [
      // ハロゲンを先頭に、以降は酸の系列ごと(系列内は価数順、系列は族番号順)
      { id: 'f', label: 'フッ化物イオン (F⁻)', short: 'F⁻', unit: 'mg/kg' },
      { id: 'cl', label: '塩化物イオン (Cl⁻)', short: 'Cl⁻', unit: 'mg/kg' },
      { id: 'br', label: '臭化物イオン (Br⁻)', short: 'Br⁻', unit: 'mg/kg' },
      { id: 'i', label: 'ヨウ化物イオン (I⁻)', short: 'I⁻', unit: 'mg/kg' },
      { id: 'bo2', label: 'メタホウ酸イオン (BO₂⁻)', short: 'BO₂⁻', unit: 'mg/kg' },
      { id: 'hco3', label: '炭酸水素イオン (HCO₃⁻)', short: 'HCO₃⁻', unit: 'mg/kg' },
      { id: 'co3', label: '炭酸イオン (CO₃²⁻)', short: 'CO₃²⁻', unit: 'mg/kg' },
      { id: 'hsio3', label: 'メタケイ酸水素イオン (HSiO₃⁻)', short: 'HSiO₃⁻', unit: 'mg/kg' },
      { id: 'sio3', label: 'メタケイ酸イオン (SiO₃²⁻)', short: 'SiO₃²⁻', unit: 'mg/kg' },
      { id: 'no2', label: '亜硝酸イオン (NO₂⁻)', short: 'NO₂⁻', unit: 'mg/kg' },
      { id: 'no3', label: '硝酸イオン (NO₃⁻)', short: 'NO₃⁻', unit: 'mg/kg' },
      { id: 'h2po4', label: 'リン酸二水素イオン (H₂PO₄⁻)', short: 'H₂PO₄⁻', unit: 'mg/kg' },
      { id: 'hpo4', label: 'リン酸水素イオン (HPO₄²⁻)', short: 'HPO₄²⁻', unit: 'mg/kg' },
      { id: 'po4', label: 'リン酸イオン (PO₄³⁻)', short: 'PO₄³⁻', unit: 'mg/kg' },
      { id: 'aso2', label: 'メタ亜ヒ酸イオン (AsO₂⁻)', short: 'AsO₂⁻', unit: 'mg/kg' },
      { id: 'oh', label: '水酸化物イオン (OH⁻)', short: 'OH⁻', unit: 'mg/kg' },
      { id: 'hs', label: '硫化水素イオン (HS⁻)', short: 'HS⁻', unit: 'mg/kg' },
      { id: 's2', label: '硫化物イオン (S²⁻)', short: 'S²⁻', unit: 'mg/kg' },
      { id: 'hs2o3', label: 'チオ硫酸水素イオン (HS₂O₃⁻)', short: 'HS₂O₃⁻', unit: 'mg/kg' },
      { id: 's2o3', label: 'チオ硫酸イオン (S₂O₃²⁻)', short: 'S₂O₃²⁻', unit: 'mg/kg' },
      { id: 'hso4', label: '硫酸水素イオン (HSO₄⁻)', short: 'HSO₄⁻', unit: 'mg/kg' },
      { id: 'so4', label: '硫酸イオン (SO₄²⁻)', short: 'SO₄²⁻', unit: 'mg/kg' },
    ],
  },
  {
    id: 'free',
    title: '遊離成分',
    items: [
      { id: 'h2sio3', label: 'メタケイ酸 (H₂SiO₃)', short: 'メタケイ酸', unit: 'mg/kg' },
      { id: 'hbo2', label: 'メタホウ酸 (HBO₂)', short: 'メタホウ酸', unit: 'mg/kg' },
      { id: 'haso2', label: 'メタ亜ヒ酸 (HAsO₂)', short: 'メタ亜ヒ酸', unit: 'mg/kg' },
    ],
  },
  {
    id: 'gas',
    title: '溶存ガス成分',
    items: [
      { id: 'co2', label: '遊離二酸化炭素 (CO₂)', short: '遊離CO₂', unit: 'mg/kg' },
      { id: 'h2s', label: '遊離硫化水素 (H₂S)', short: '遊離H₂S', unit: 'mg/kg' },
    ],
  },
]

// 派生リスト(既存データのid・保存形式はそのまま)
export const ALL_COMPONENTS = COMPONENT_GROUPS.flatMap((g) => g.items)
export const ION_COMPONENTS = COMPONENT_GROUPS.filter(
  (g) => g.id === 'cation' || g.id === 'anion',
).flatMap((g) => g.items)

/* ============================================================
   酸解離定数(25℃・希薄水溶液での標準値)
   ここに系を追加すれば定数表・分布図に自動反映
   ============================================================ */
export const ACID_SYSTEMS: AcidSystem[] = [
  {
    id: 'sulfuric',
    name: '硫酸系',
    species: ['H₂SO₄', 'HSO₄⁻', 'SO₄²⁻'],
    pka: [-3, 1.99],
    note: 'pKa₁は強酸のため概算値',
  },
  {
    id: 'h2s',
    name: '硫化水素系',
    species: ['H₂S', 'HS⁻', 'S²⁻'],
    pka: [7.0, 12.9],
    note: 'pKa₂は文献により12〜17と幅がある',
  },
  {
    id: 'carbonic',
    name: '炭酸系',
    species: ['CO₂(aq)', 'HCO₃⁻', 'CO₃²⁻'],
    pka: [6.35, 10.33],
    note: 'pKa₁は溶存CO₂込みの実効値',
  },
  {
    id: 'phosphoric',
    name: 'リン酸系',
    species: ['H₃PO₄', 'H₂PO₄⁻', 'HPO₄²⁻', 'PO₄³⁻'],
    pka: [2.15, 7.2, 12.35],
  },
  {
    id: 'silicic',
    name: 'メタケイ酸系',
    species: ['H₂SiO₃', 'HSiO₃⁻', 'SiO₃²⁻'],
    pka: [9.8, 11.8],
    note: 'ケイ酸のpKaは文献により差が大きい',
  },
  { id: 'boric', name: 'メタホウ酸系', species: ['HBO₂', 'BO₂⁻'], pka: [9.24] },
  { id: 'arsenious', name: 'メタ亜ヒ酸系', species: ['HAsO₂', 'AsO₂⁻'], pka: [9.29] },
  {
    id: 'thiosulfate',
    name: 'チオ硫酸系',
    species: ['H₂S₂O₃', 'HS₂O₃⁻', 'S₂O₃²⁻'],
    pka: [0.6, 1.7],
    note: '概算値',
  },
  { id: 'hf', name: 'フッ化水素系', species: ['HF', 'F⁻'], pka: [3.17] },
  { id: 'nitrous', name: '亜硝酸系', species: ['HNO₂', 'NO₂⁻'], pka: [3.25] },
  { id: 'ammonium', name: 'アンモニウム系', species: ['NH₄⁺', 'NH₃'], pka: [9.25] },
]

export const SPECIES_COLORS = ['#C4442E', '#D9A62E', '#35577D', '#5E9C6F']

// 比較・散布図・地図で選べる指標
export const METRICS: Metric[] = [
  { id: 'temp', label: '泉温', unit: '℃', kind: 'temp' },
  { id: 'ph', label: 'pH', unit: '', kind: 'ph' },
  { id: 'tds', label: '溶存物質総量', unit: 'mg/kg', kind: 'conc' },
  ...ALL_COMPONENTS.map((c): Metric => ({ id: c.id, label: c.short, unit: c.unit, kind: 'conc' })),
]

export const PREFS: [string, number, number][] = [
  ['北海道', 43.06, 141.35],
  ['青森県', 40.82, 140.74],
  ['岩手県', 39.7, 141.15],
  ['宮城県', 38.27, 140.87],
  ['秋田県', 39.72, 140.1],
  ['山形県', 38.24, 140.36],
  ['福島県', 37.75, 140.47],
  ['茨城県', 36.34, 140.45],
  ['栃木県', 36.57, 139.88],
  ['群馬県', 36.39, 139.06],
  ['埼玉県', 35.86, 139.65],
  ['千葉県', 35.61, 140.12],
  ['東京都', 35.69, 139.69],
  ['神奈川県', 35.45, 139.64],
  ['新潟県', 37.9, 139.02],
  ['富山県', 36.7, 137.21],
  ['石川県', 36.59, 136.63],
  ['福井県', 36.07, 136.22],
  ['山梨県', 35.66, 138.57],
  ['長野県', 36.65, 138.18],
  ['岐阜県', 35.39, 136.72],
  ['静岡県', 34.98, 138.38],
  ['愛知県', 35.18, 136.91],
  ['三重県', 34.73, 136.51],
  ['滋賀県', 35.0, 135.87],
  ['京都府', 35.02, 135.76],
  ['大阪府', 34.69, 135.52],
  ['兵庫県', 34.69, 135.18],
  ['奈良県', 34.69, 135.83],
  ['和歌山県', 34.23, 135.17],
  ['鳥取県', 35.5, 134.24],
  ['島根県', 35.47, 133.05],
  ['岡山県', 34.66, 133.93],
  ['広島県', 34.4, 132.46],
  ['山口県', 34.19, 131.47],
  ['徳島県', 34.07, 134.56],
  ['香川県', 34.34, 134.04],
  ['愛媛県', 33.84, 132.77],
  ['高知県', 33.56, 133.53],
  ['福岡県', 33.61, 130.42],
  ['佐賀県', 33.25, 130.3],
  ['長崎県', 32.74, 129.87],
  ['熊本県', 32.79, 130.74],
  ['大分県', 33.24, 131.61],
  ['宮崎県', 31.91, 131.42],
  ['鹿児島県', 31.56, 130.56],
  ['沖縄県', 26.21, 127.68],
]

export const PREF_COORD: Record<string, [number, number]> = Object.fromEntries(
  PREFS.map(([n, la, lo]) => [n, [la, lo] as [number, number]]),
)

export const STORAGE_KEY = 'onsen-db-v1'

/* ============================================================
   海水(比較基準・常時表示)
   提供値は g/kg のため mg/kg に換算して保持
   ============================================================ */
export const SEAWATER: OnsenRecord = {
  id: 'builtin-seawater',
  builtin: true,
  name: '海水(標準)',
  pref: '',
  city: '',
  date: '',
  quality: '比較基準',
  temp: '',
  ph: '8.1',
  tds: '35130',
  lat: null,
  lng: null,
  coordText: '',
  memo: '標準的な海水の溶存成分。比較基準として常時表示。',
  values: {
    cl: '19350',
    na: '10760',
    so4: '2710',
    mg: '1290',
    ca: '410',
    k: '390',
    hco3: '140',
    br: '67',
    sr: '8',
    bo2: '4',
    f: '1',
  },
}

/* ============================================================
   空レコード
   ============================================================ */
export const emptyRecord = (): OnsenRecord => ({
  id: 'r' + Date.now() + Math.random().toString(36).slice(2, 6),
  name: '',
  pref: '',
  city: '',
  date: '',
  quality: '',
  temp: '',
  ph: '',
  tds: '',
  lat: null,
  lng: null,
  coordText: '',
  memo: '',
  values: {},
})
