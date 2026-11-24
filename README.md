# 語彙召喚(仮) — GOI-SHOKAN(KARI)

日常の文章（日記・メモ・企画書・小説など）を形態素解析して語彙カードを採掘し、集めた言葉のシナジーと遺物（レリック）で迷宮を攻略する **日本語語彙デッキ構築ローグライク** です。

---

## 主な特徴・ゲームサイクル

### 1. 召喚の間 — 文章採掘（`/`）
- 日本語テキストを入力するとブラウザ上で形態素解析（Kuromoji）を実行し、名詞・動詞・形容詞・副詞などを語彙カードとして抽出（1回最大6枚）
- マスター辞書未収録の難語・独自表現などはランク **『異（UR）』** の未知語カードとして動的生成
- 同一語の過度な連呼は劣化カード **『不（F）』** として排出（あえて軸にする逆転ビルドも可能）
- 採掘完了時のパック開封・ランク別リビール演出（自動スクロール対応）

### 2. マイ辞書・デッキ編成（`/deck`）
- 迷宮へ持ち込む **マイ辞書（6〜30枚）** と初期手札確定の **★エース語彙** を設定可能
- 最大 **8件** のデッキプリセット保存・切替・削除に対応

### 3. 迷宮バトル（`/dungeon`）
- **4属性 × 3コマンド**:
  - 各カードを「こうげき（感情・感覚 ×1.25 / 論理・極異は貫通）」「スキル」「ぼうぎょ（論理・物質 ×1.25）」の3通りで運用可能
  - `base * multipliers` による直感的な青天井乗算で、万・億・兆・京・垓〜**無量大数**スケールまで出力が成長
  - 攻撃・貫通・連撃・討伐・防御・被弾などの戦闘アニメーションを搭載
- **多彩な挑戦モード**:
  - 通常迷宮（第一層：口癖の沼地 / 第二層：文脈の書庫 / 第三層：文豪の深淵）
  - **Endless（無間地獄）**: 通常ボス撃破後に突入可能（3戦ごとのボス『無間の主』撃破で遺物ドロップ、6戦周期で書庫・祭壇イベント発生）
  - **混沌の無作為迷宮**: マイ辞書を使わず全語彙から抽選されるローグライクモード
  - **一文即興の迷宮**: その場で入力した1つの文章から生まれた語彙だけで挑む限定戦
  - **日替わり挑戦（デイリーチャレンジ）**: JST日付シードによる毎日固定条件ラン
- **全84種の遺物（レリック）**:
  - 通常遺物 54種 / 黒き契約 13種（代償付き高火力） / 白き天啓 13種（安定・防御・連鎖型） / 無限・重複可 4種

### 4. 語彙図鑑 ＆ 実績（`/codex`）・戦績 ＆ 全国ランキング（`/records`）
- テーマ別パック（6種）・マイ語彙・異ラボ・遺物図鑑（84種）・**4カテゴリ全34種の実績**（進捗バー表示付き）を収録
- ローカル履歴管理に加え、Supabase 設定時はステージ／ジャンル別のオンライン全国ランキングへ記録送信・閲覧が可能

---

## 技術スタック

- **Framework**: Next.js 16 (App Router / Turbopack / Webpack), React 19, TypeScript
- **Styling / UI**: Tailwind CSS v4, shadcn/ui (`@base-ui/react`), Lucide React
- **Animation**: Framer Motion
- **Morphological Analysis**: `kuromoji`（ローカル `/dict` または外部配信辞書）
- **Backend (Optional)**: Supabase（ランキング機能用）

---

## ローカル開発セットアップ

`goi-shokan/game` ディレクトリで以下を実行します。

```bash
# 1. 依存パッケージのインストール
npm install

# 2. 環境変数ファイルの作成（必要な場合）
cp .env.example .env.local

# 3. 開発サーバー起動
npm run dev
```

起動後、ブラウザで [http://localhost:3000](http://localhost:3000) を開きます。

### スクリプト

| コマンド | 内容 |
|---|---|
| `npm run dev` | 開発サーバー起動（`next dev`） |
| `npm run build` | 本番ビルド（`next build`） |
| `npm run start` | 本番サーバー起動（`next start`） |
| `npm run lint` | ESLint による静的チェック |

---

## 環境変数・外部連携（任意）

`.env.example` に定義されている環境変数です。未設定でもゲーム本編・ローカル保存・辞書解析はすべて動作します。

| 変数名 | 用途 | 未設定時の挙動 |
|---|---|---|
| `NEXT_PUBLIC_DICT_BASE_URL` | Kuromoji辞書データの配信URL（Cloudflare R2 / Pages 等） | ローカルの `public/dict` を参照 |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase プロジェクト URL | オンラインランキング機能が無効化（ローカル記録のみ） |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anon Key | オンラインランキング機能が無効化（ローカル記録のみ） |

### Supabase ランキングテーブル構築

オンラインランキングを有効化する場合は、Supabase の SQL Editor で以下のSQLを実行してください。

1. 新規構築: [`supabase/schema.sql`](./supabase/schema.sql)
2. 既存テーブルへのジャンル追加マイグレーション: [`supabase/migration_issue_12_ranking_genres.sql`](./supabase/migration_issue_12_ranking_genres.sql)

---

## ディレクトリ構成（抜粋）

```text
goi-shokan/game/
├── public/
│   ├── dict/                     # Kuromoji 形態素解析辞書アセット
│   └── THIRD_PARTY_NOTICES.txt   # 辞書・サードパーティライセンス表記
├── supabase/
│   ├── schema.sql                # ランキングテーブル定義・RLS設定
│   └── migration_issue_12_ranking_genres.sql
└── src/
    ├── app/
    │   ├── page.tsx              # 召喚の間（文章採掘）
    │   ├── deck/page.tsx         # マイ辞書・プリセット編成
    │   ├── dungeon/page.tsx      # 迷宮ロビー・戦闘画面
    │   ├── codex/page.tsx        # 語彙図鑑・遺物図鑑・実績
    │   └── records/page.tsx      # 戦績・全国ランキング
    ├── components/               # カード・敵スプライト・戦闘/採掘演出等
    ├── data/                     # 語彙(words)・遺物(relics)・敵(enemies)・実績(achievements)
    ├── lib/                      # 解析・戦闘エンジン・大数表示・保存・ランキング
    └── types/                    # ゲーム全体型定義・スキル説明フォーマット
```

---

## ライセンス・サードパーティ表記

利用している形態素解析辞書およびサードパーティライブラリのライセンス表記は [`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md) および [`public/THIRD_PARTY_NOTICES.txt`](./public/THIRD_PARTY_NOTICES.txt) をご参照ください。
