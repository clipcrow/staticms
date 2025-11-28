# Staticms 開発ガイド

このドキュメントでは、Staticmsをローカル環境で開発・実行するための手順を説明します。
StaticmsはGitHub Appとして動作するため、開発にはGitHub
Appの作成とngrokを用いたローカルサーバーの公開が必要です。

## 前提条件

- [Deno](https://deno.land/) (v1.37以上推奨)
- [ngrok](https://ngrok.com/) (ローカルサーバー公開用)
- GitHubアカウント (OrganizationでのApp作成を推奨)

## 環境構築手順

### 1. リポジトリのクローン

```bash
git clone https://github.com/clipcrow/staticms.git
cd staticms
```

### 2. ngrokの起動

GitHub
AppからのWebhookを受信するため、ローカルサーバーをインターネットに公開する必要があります。

```bash
ngrok http 3030
```

起動後、表示されるHTTPSのURL（例:
`https://xxxx-xxxx.ngrok-free.app`）をメモしてください。

### 3. GitHub Appの作成

GitHub
Appは個人アカウントではなく、Organizationで作成してください。個人アカウントでは作成できません。

1. GitHubでOrganizationの **Settings** > **Developer settings** > **GitHub
   Apps** を開きます。
2. **New GitHub App** をクリックします。
3. 以下の項目を入力します：
   - **GitHub App name**: 任意の名前（例: `staticms-dev-yourname`）
   - **Homepage URL**: ngrokのURL（例: `https://xxxx-xxxx.ngrok-free.app`）
   - **Callback URL**: `https://xxxx-xxxx.ngrok-free.app/api/auth/callback`
     - "Expire user authorization tokens" のチェックは外しておきます。
   - **Webhook URL**: `https://xxxx-xxxx.ngrok-free.app/api/webhook`
   - **Webhook secret**: 任意（現状の実装では空欄で可）
4. **Permissions** を設定します：
   - **Repository contents**: `Read & Write`
   - **Pull requests**: `Read & Write`
   - **Webhooks**: `Read & Write`
   - **Metadata**: `Read` (デフォルト)
5. **Subscribe to events** で以下を選択します：
   - `Push`
   - `Pull request`
6. **Where can this GitHub App be installed?** は "Any account" または "Only on
   this account" を選択し、**Create GitHub App** をクリックします。

### 4. 認証情報の取得と設定

App作成後、以下の情報を取得し、`.env` ファイルに設定します。

1. **App ID**: "About" セクションに表示されています。
2. **Client ID**: "Client secrets" セクションに表示されています。
3. **Client Secret**: "Generate a new client secret" をクリックして生成します。
4. **Private Key**: ページ下部の "Generate a private key"
   をクリックしてPEMファイルをダウンロードします。

ルートディレクトリに `.env` ファイルを作成し、以下の内容を記述してください。

```env
# サーバー設定
STATICMS_PORT=3030
PUBLIC_URL=https://xxxx-xxxx.ngrok-free.app

# GitHub App設定
GITHUB_APP_ID=あなたのAppID
GITHUB_CLIENT_ID=あなたのClientID
GITHUB_CLIENT_SECRET=あなたのClientSecret

# Private Key (改行を \n に置換して1行にするか、以下のように記述)
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----
...ダウンロードしたPEMファイルの中身をそのまま貼り付け...
-----END RSA PRIVATE KEY-----"
```

### 5. アプリケーションのビルドと起動

依存関係の解決とビルドを行います。

```bash
deno task build
```

サーバーを起動します。

```bash
deno task serve
```

ブラウザで `http://localhost:3030` にアクセスしてください。

## 開発フロー

1. **GitHub Appのインストール**:
   - 初回起動時、またはリポジトリ選択画面でリポジトリが表示されない場合、GitHub
     Appの公開ページ（Public link）から、開発に使用するリポジトリ（例:
     `yourname/test-repo`）にAppをインストールしてください。
2. **動作確認**:
   - ログイン -> リポジトリ選択 -> コンテンツ一覧 -> 編集 -> 保存（PR作成）
   - Webhookによるリアルタイム更新（GitHub上でファイルを編集し、Staticmsエディタに反映されるか）

## トラブルシューティング

- **Webhookが届かない**:
  - ngrokのURLが変わっていないか確認してください。変わっている場合は、GitHub
    Appの設定（Webhook URL）と `.env` の `PUBLIC_URL`
    を更新し、サーバーを再起動してください。
  - GitHub Appの設定画面の "Advanced" タブでWebhookの配信履歴（Recent
    Deliveries）を確認できます。
- **認証エラー**:
  - `.env` の `GITHUB_CLIENT_ID`、`GITHUB_CLIENT_SECRET`
    が正しいか確認してください。
  - Callback URLが正しく設定されているか確認してください。
