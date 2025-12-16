# Staticms v2 開発ガイド

[アーキテクチャ設計書](./architecture/v2/PROJECT.md)に基づき、Staticms v2
の開発環境を構築する手順を説明します。 v2 はモダンな Web 標準と Deno 2+
の機能を活用して構築されています。

## 前提条件

- [Deno](https://deno.land/) (v2.1.2 以上推奨)
- [ngrok](https://ngrok.com/) (ローカルサーバーを公開し Webhook
  を受信するために必須)
- GitHub アカウント (GitHub App 所有のための Organization 推奨)

## 環境構築手順

### 1. リポジトリのクローン

```bash
git clone https://github.com/clipcrow/staticms.git
cd staticms
```

### 2. ngrok の起動

Staticms v2 は **Webhook**
を利用したリアルタイム機能（編集ロック、ステータス更新）に大きく依存しています。これらを機能させるため、ngrok
を使用してローカルサーバーをインターネットに公開してください。

```bash
ngrok http 8000
```

起動後に表示される HTTPS の URL（例:
`https://xxxx-xxxx.ngrok-free.app`）をメモしてください。

### 3. GitHub App の作成

1. GitHub の **Settings** > **Developer settings** > **GitHub Apps**
   を開きます。
2. **New GitHub App** をクリックします。
3. 以下の項目を入力します：
   - **GitHub App name**: 任意の名前（例: `staticms-v2-dev`）
   - **Homepage URL**: ngrok の URL（例: `https://xxxx-xxxx.ngrok-free.app`）
   - **Callback URL**: `https://xxxx-xxxx.ngrok-free.app/api/auth/callback`
     - "Expire user authorization tokens" のチェックは外しておきます。
   - **Webhook URL**: `https://xxxx-xxxx.ngrok-free.app/api/webhook`
   - **Webhook secret**: 推奨: ランダムな文字列を生成して設定してください（例:
     `openssl rand -hex 20`）。
4. **Permissions** を設定します：
   - **Repository contents**: `Read & Write` (編集に必須)
   - **Pull requests**: `Read & Write` (PR作成に必須)
   - **Webhooks**: `Read & Write` (自動設定に必須)
   - **Metadata**: `Read` (デフォルト)
5. **Subscribe to events** で以下を選択します：
   - `Push`
   - `Pull request`
6. **Where can this GitHub App be installed?** は "Any account" または "Only on
   this account" を選択し、**Create GitHub App** をクリックします。

### 4. .env の設定

プロジェクトルートに `.env` ファイルを作成します。以下の内容を記述してください。

#### 必須変数

1. **App ID**: "About" セクションに表示されています。
2. **Client ID**: "Client secrets" セクションに表示されています。
3. **Client Secret**: "Generate a new client secret" をクリックして生成します。
4. **Private Key**: ページ下部の "Generate a private key"
   をクリックしてPEMファイルをダウンロードします。

```env
# サーバー設定
STATICMS_PORT=8000
STATICMS_PUBLIC_URL=https://xxxx-xxxx.ngrok-free.app

# GitHub App 設定
GITHUB_APP_ID=12345
GITHUB_CLIENT_ID=Iv1.xxxxxxxxxxxx
GITHUB_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GITHUB_WEBHOOK_SECRET=your_generated_secret_string

# Private Key (改行を \n に置換して1行にするか、ダブルクォートで囲んで改行を含める)
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----
...ダウンロードしたPEMファイルの中身をそのまま貼り付け...
-----END RSA PRIVATE KEY-----"
```

> **GITHUB_WEBHOOK_SECRET について**:
>
> - **値**: 推奨はランダムで十分な長さを持つ文字列です（例:
>   `openssl rand -hex 20` コマンドで生成）。
> - **役割**: GitHub から受信した Webhook が、本当に GitHub
>   から送られた正当なリクエストであるかを検証（HMAC署名チェック）するために使用されます。セキュリティ上、**設定することを強く推奨**します。

> **重要**: `STATICMS_PUBLIC_URL`
> は非常に重要です。設定画面で「保存」を押した際、この URL を使ってリポジトリに
> Webhook を自動登録します。

### 5. アプリケーションの起動

Staticms v2 は `deno task` でライフサイクルを管理します。

#### 開発モード (Development Mode)

ファイル変更を監視し、オンデマンドでバンドルを行う開発用サーバーを起動します。

```bash
deno task dev
```

サーバーは `http://localhost:8000` で起動します。

#### 本番ビルド (Production Build)

バンドル済みの資産を使用する本番挙動を確認する場合：

```bash
deno task build
deno run -A src/server/main.ts
```

## 開発ワークフロー

1. **App のインストール**:
   - 初回ログイン後、リポジトリ一覧に何も表示されない場合、GitHub App
     の公開ページ（Public link）へ移動し、テスト用のリポジトリに App
     をインストールしてください。
2. **Webhook 自動設定の確認**:
   - Staticms のリポジトリダッシュボードを開きます。
   - **Settings**
     をクリック（または新規コンテンツを追加）して設定画面を開きます。
   - 内容を変更せずとも **Save** をクリックします。
   - **確認**: GitHub リポジトリの Settings > Webhooks
     を確認し、`https://xxxx-xxxx.ngrok-free.app/api/webhook`
     が自動的に追加されていることを確認します。
3. **リアルタイム機能の確認**:
   - エディタで記事を開きます（ステータスが Draft または Clean の状態）。
   - Staticms から PR を作成します。
   - 別タブで GitHub の PR ページを開き、**Merge** します。
   - **確認**: Staticms
     のエディタ画面に戻ると、リロードせずとも自動的にロックが解除される（または
     "Approved" ステータスになる）ことを確認します。

## トラブルシューティング

- **Webhook 自動設定が失敗する**:
  - サーバーログを確認してください。`[GitHubApp] Failed to ensure webhook`
    というエラーが出ている場合、`GITHUB_APP_ID` または `GITHUB_APP_PRIVATE_KEY`
    が正しいか確認してください。
  - `STATICMS_PUBLIC_URL` が現在の ngrok URL と一致しているか確認してください。
- **認証エラー (401)**:
  - `GITHUB_CLIENT_ID` と `GITHUB_CLIENT_SECRET` を確認してください。
  - GitHub App 設定の Callback URL が `STATICMS_PUBLIC_URL` +
    `/api/auth/callback` と一致しているか確認してください。
