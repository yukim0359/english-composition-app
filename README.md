# 英作文ドリル

毎日の英訳課題をAIが自動生成・添削する英作文練習Webアプリ。

## 技術スタック

- **Next.js 16** (App Router, TypeScript)
- **PostgreSQL** (Vercel Postgres / Neon) + **Prisma 5**
- **NextAuth.js** (Google OAuth)
- **Google Gemini API** (gemini-1.5-flash)
- **Tailwind CSS**

## ローカル開発

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.example` をコピーして `.env` を作成し、各値を設定:

```bash
cp .env.example .env
```

- `DATABASE_URL` / `DIRECT_URL` -- PostgreSQL の接続文字列
- `NEXTAUTH_SECRET` -- `openssl rand -base64 32` で生成
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` -- Google OAuth
- `GEMINI_API_KEY` -- Gemini API キー

### Google OAuth の設定

1. https://console.cloud.google.com/ でプロジェクトを作成
2. 「APIとサービス」→「認証情報」→「OAuth 2.0 クライアント ID を作成」
3. アプリの種類: 「ウェブ アプリケーション」
4. 承認済みリダイレクト URI: `http://localhost:3000/api/auth/callback/google`
5. Client ID と Client Secret を `.env` に設定

### Gemini API の設定

https://aistudio.google.com/apikey で無料でAPIキーを取得できます（クレカ不要）。

### 3. データベースのセットアップ

```bash
npx prisma db push
```

### 4. 開発サーバーの起動

```bash
npm run dev
```

http://localhost:3000 にアクセス。

## Vercel へのデプロイ

### 1. GitHub にリポジトリを push

```bash
git init && git add . && git commit -m "initial commit"
gh repo create english-composition-app --public --source=. --push
```

### 2. Vercel でプロジェクトを作成

1. https://vercel.com/new でGitHubリポジトリをインポート
2. **Storage** タブ → **Postgres (Neon)** を追加（無料枠: 0.5GB）
3. `DATABASE_URL` と `DIRECT_URL` が自動で環境変数に設定される

### 3. 環境変数を追加

Vercel ダッシュボードの Settings → Environment Variables に以下を設定:

- `NEXTAUTH_SECRET` -- `openssl rand -base64 32` で生成した値
- `NEXTAUTH_URL` -- `https://<your-app>.vercel.app`
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
- `GEMINI_API_KEY`

### 4. Google OAuth にリダイレクト URI を追加

Google Cloud Console で本番用のリダイレクト URI を追加:

```
https://<your-app>.vercel.app/api/auth/callback/google
```

### 5. スキーマを本番DBに反映

```bash
npx prisma db push
```

デプロイ後、Vercel が自動でビルド・公開します。

## 使い方

1. Googleアカウントでログイン
2. `/practice` で難易度の配分とトピックを選択
3. 「今日の課題を生成」でAIが課題を作成
4. 各問に英訳を入力すると、AIが即時添削（修正文・フィードバック・スコア）
5. 添削前後の差分がハイライト表示される
6. `/history` で過去の回答を日付別に閲覧・復習（スコアでフィルタ可能）
