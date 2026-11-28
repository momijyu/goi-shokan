# 語彙召喚(仮) — GOI-SHOKAN(KARI)

日常の文章（日記・メモ・企画書・小説など）を形態素解析して語彙カードを採掘し、集めた言葉のシナジーと遺物（レリック）で迷宮を攻略する **日本語語彙デッキ構築ローグライク** です！

> 🎮 **プレイはこちら（登録・DL不要）**: https://goi-shokan.pages.dev

---

## 主な特徴・ゲームサイクル

### 1. 召喚の間 — 文章採掘（`/`）
- 日本語テキストを入力するとブラウザ上で形態素解析（Kuromoji）を実行し、名詞・動詞・形容詞・副詞などを語彙カードとして抽出（1回最大6枚）
- 初回アクセス時はサンプル文プリセットを自動入力し、即座に採掘体験が可能
- マスター辞書未収録の難語・独自表現などはランク **『異（UR）』** の未知語カードとして動的生成
- 同一語の過度な連呼は劣化カード **『不（F）』** として排出（あえて軸にする逆転ビルドも可能）
- 採掘完了時の召喚陣・ランク別リビール演出（自動スクロール対応）、**未登録語彙の一括マイ辞書登録**、**採掘結果の X ポスト＆PNG カード画像保存**に対応

### 2. マイ辞書・デッキ編成（`/deck`）
- 迷宮へ持ち込む **マイ辞書（6〜30枚）** と初期手札確定の **★エース語彙** を設定可能
- 最大 **8件** のデッキプリセット保存・切替・削除に対応

### 3. 迷宮バトル（`/dungeon`）
- **4属性 × 3コマンド**:
  - 各カードを「こうげき（感情・感覚 ×1.25 / 論理・極異は貫通）」「スキル」「ぼうぎょ（論理・物質 ×1.25）」の3通りで運用可能
  - 手札選択時に「こうげき / スキル / ぼうぎょ」それぞれの予想出力・**撃破**判定をリアルタイム表示
  - `base * multipliers` による直感的な青天井乗算で、万・億・兆・京・垓〜**無量大数**スケールまで出力が成長
  - カード発動カットイン・集中線・討伐スタンプ・攻撃/貫通/連撃/防御/被弾アニメーションおよび **Web Audio API による効果音（SE・ミュート切替可）** を搭載
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
- ローカル履歴管理に加え、Supabase 設定時はステージ／ジャンル別のオンライン全国ランキングへ記録送信・閲覧が可能（`game_version` による現行バージョン別分離・過去データ保持に対応）
- クリア／ゲームオーバー時の戦績ハイライトの **X シェア ＆ PNG 戦績画像保存**に対応（制作者 `@ID` 表記・告知ポスト引用リポスト設定可）

---

## 技術スタック

- **Framework**: Next.js 16 (App Router / Static Export `output: "export"`), React 19, TypeScript
- **Styling / UI**: Tailwind CSS v4 (`@tailwindcss/turbopack`), shadcn/ui (`@base-ui/react`), Lucide React
- **Animation / Audio**: Framer Motion, Web Audio API (`soundFx.ts`), Canvas 2D シェア画像生成 (`shareUtils.ts`)
- **Morphological Analysis**: `kuromoji`（ローカル `/dict` または外部配信辞書）
- **Backend / Hosting**: Supabase（ランキング機能用・任意）, Cloudflare Pages（静的サイト配信対応）

---

## ローカル開発・デプロイセットアップ

リポジトリルートで以下を実行します。

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
| `npm run dev` | 開発サーバー起動（`next dev` / Turbopack） |
| `npm run build` | 本番静的ビルド（`next build` → `out/` へ静的出力） |
| `npm run lint` | ESLint による静的チェック |

### Cloudflare Pages デプロイ設定

`output: "export"` により完全静的サイトとして `out/` に出力されるため、Cloudflare Pages でそのまま配信できます（[`public/_headers`](./public/_headers) にて `/dict/*` のキャッシュ設定を同梱）。

- **Build command**: `npm run build`
- **Build output directory**: `out`
- **Root directory**: 空欄（`/`）

---

## 環境変数・外部連携（任意）

`.env.example` に定義されている環境変数です。未設定でもゲーム本編・ローカル保存・辞書解析はすべて動作します。

| 変数名 | 用途 | 未設定時の挙動 |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | 公開サイトURL（OGP/Twitterカード用 `metadataBase`） | `VERCEL_PROJECT_PRODUCTION_URL` / `VERCEL_URL` / `CF_PAGES_URL` / `localhost` にフォールバック |
| `NEXT_PUBLIC_X_CREATOR_HANDLE` | 制作者の X ID（シェア文面・フッターリンクに表示） | 制作者表記を省略 |
| `NEXT_PUBLIC_X_PROMO_POST_URL` | X 告知ポストの URL（設定時はシェアが元ポストの引用リポストになる） | プレイ中サイトの URL を付与 |
| `NEXT_PUBLIC_DICT_BASE_URL` | Kuromoji辞書データの外部配信URL（Cloudflare R2 / Pages 等） | 同一サイト内の `/dict` を参照 |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase プロジェクト URL | オンラインランキング機能が無効化（ローカル記録のみ） |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anon / Publishable Key | オンラインランキング機能が無効化（ローカル記録のみ） |

### Supabase ランキングテーブル構築

オンラインランキングを有効化する場合は、Supabase の SQL Editor で以下のSQLを実行してください。

1. 新規構築: [`supabase/schema.sql`](./supabase/schema.sql)
2. 既存テーブルへのジャンル追加マイグレーション: [`supabase/migration_issue_12_ranking_genres.sql`](./supabase/migration_issue_12_ranking_genres.sql)
3. 既存テーブルへの `game_version` 列追加・旧データ分離マイグレーション: [`supabase/migration_ranking_version.sql`](./supabase/migration_ranking_version.sql)

---

## ディレクトリ構成（抜粋）

```text
goi-shokan/
├── public/
│   ├── _headers                  # Cloudflare Pages 向け /dict/* 長期キャッシュ設定
│   ├── dict/                     # Kuromoji 形態素解析辞書アセット
│   └── THIRD_PARTY_NOTICES.txt   # 辞書・サードパーティライセンス表記
├── supabase/
│   ├── schema.sql                # ランキングテーブル定義・RLS設定
│   ├── migration_issue_12_ranking_genres.sql
│   └── migration_ranking_version.sql
└── src/
    ├── app/
    │   ├── page.tsx              # 召喚の間（文章採掘）
    │   ├── deck/page.tsx         # マイ辞書・プリセット編成
    │   ├── dungeon/page.tsx      # 迷宮ロビー・戦闘画面
    │   ├── codex/page.tsx        # 語彙図鑑・遺物図鑑・実績
    │   └── records/page.tsx      # 戦績・全国ランキング
    ├── components/               # カード・敵スプライト・戦闘/採掘演出等
    ├── data/                     # 語彙(words)・遺物(relics)・敵(enemies)・実績(achievements)
    ├── lib/                      # 解析・戦闘エンジン・大数表示・保存・ランキング・Xシェア・SE
    └── types/                    # ゲーム全体型定義・スキル説明フォーマット
```

---

## ライセンス・サードパーティ表記

利用している形態素解析辞書およびサードパーティライブラリのライセンス表記は [`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md) および [`public/THIRD_PARTY_NOTICES.txt`](./public/THIRD_PARTY_NOTICES.txt) をご参照ください。
