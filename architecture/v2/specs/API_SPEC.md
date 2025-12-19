# サーバーAPI仕様書 (Server API Specification)

## 概要

Staticms v2 サーバーが提供するREST APIのエンドポイント仕様です。 サーバーは
Deno + Oak で実装されており、フロントエンド（React
SPA）からのリクエストを処理します。

## 認証 (Authentication)

GitHub OAuthを利用した認証フローを提供します。

### Login

- **Method**: `GET`
- **Path**: `/api/auth/login`
- **Query Params**:
  - `returnTo` (optional): 認証完了後のリダイレクト先パス。
- **Description**: GitHubのOAuth認可画面へリダイレクトします。

### Callback

- **Method**: `GET`
- **Path**: `/api/auth/callback`
- **Query Params**:
  - `code`: GitHubから返却された一時認証コード。
- **Description**:
  認証コードを検証し、アクセストークンを取得します。成功後、ユーザーセッション（Cookie:
  `session_id`）を発行し、`returnTo` またはトップページへリダイレクトします。

### Get Current User

- **Method**: `GET`
- **Path**: `/api/user`
- **Description**:
  現在のセッションに関連付けられたGitHubユーザー情報を取得します。
- **Response**:
  ```json
  {
    "login": "username",
    "id": 12345,
    "avatar_url": "..."
  }
  ```

### Logout

- **Method**: `GET`
- **Path**: `/api/auth/logout`
- **Description**: セッションCookieを破棄し、トップページへリダイレクトします。

## リポジトリ (Repositories)

### List Repositories

- **Method**: `GET`
- **Path**: `/api/repositories` (Alias: `/api/user/repos`)
- **Description**: ユーザーがアクセス可能なリポジトリ一覧を取得します。

### Get Repository

- **Method**: `GET`
- **Path**: `/api/repo/:owner/:repo`
- **Description**:
  特定のリポジトリの詳細情報を取得します（ブランチ一覧を含む）。

### Get Repository Config

- **Method**: `GET`
- **Path**: `/api/repo/:owner/:repo/config`
- **Description**: リポジトリの `config.yml` (または `.staticms.yml`)
  の内容を解決して返します。

### Save Repository Config

- **Method**: `POST`
- **Path**: `/api/repo/:owner/:repo/config`
- **Body**:
  ```json
  {
    "content": "yaml_string",
    "sha": "original_sha"
  }
  ```
- **Description**: `config.yml` を保存（コミット）します。

## コンテンツ (Content)

### Get Content

- **Method**: `GET`
- **Path**: `/api/repo/:owner/:repo/contents/:path*`
- **Query Params**:
  - `branch`: 対象ブランチ名
- **Description**:
  指定されたパスのファイル内容またはディレクトリエントリ一覧を取得します。

### Delete Content

- **Method**: `DELETE`
- **Path**: `/api/repo/:owner/:repo/contents/:path*`
- **Body**:
  ```json
  {
    "branch": "main",
    "sha": "file_sha",
    "message": "Commit message"
  }
  ```
- **Description**: 指定されたファイルを削除します。

### Batch Commit (Save/Update)

- **Method**: `POST`
- **Path**: `/api/repo/:owner/:repo/batch-commit`
- **Body**:
  ```json
  {
    "branch": "main", // Base branch
    "message": "Commit message",
    "updates": [
      {
        "path": "content/posts/hello.md",
        "content": "base64_encoded_content",
        "encoding": "base64"
      }
    ],
    "createPr": false, // PRを作成する場合 true
    "newBranchName": "feature-branch" // PR用ブランチ名 (optional)
  }
  ```
- **Description**: 複数のファイルをアトミックにコミットします。`createPr: true`
  の場合、新しいブランチを作成してPRをオープンします。

### Batch Commit Dates (Last Updated)

- **Method**: `POST`
- **Path**: `/api/repo/:owner/:repo/commits/batch`
- **Body**:
  ```json
  {
    "paths": ["path/to/file1.md", "path/to/file2.md"],
    "branch": "main"
  }
  ```
- **Description**:
  指定された複数のパスにおける最新のコミット日時とAuthorを一括取得します。
- **Response**:
  ```json
  {
    "path/to/file1.md": { "date": "ISO8601", "author": "Name" },
    "path/to/file2.md": null
  }
  ```

## ブランチ & PR (Branches & PRs)

### Get Branch

- **Method**: `GET`
- **Path**: `/api/repo/:owner/:repo/branches/:branch`
- **Description**: 特定のブランチ情報を取得します。

### Create Branch

- **Method**: `POST`
- **Path**: `/api/repo/:owner/:repo/branches`
- **Body**:
  ```json
  {
    "branchName": "new-branch",
    "baseBranch": "main"
  }
  ```
- **Description**: 新しいブランチを作成します。

### Compare Commits

- **Method**: `GET`
- **Path**: `/api/repo/:owner/:repo/compare`
- **Query Params**:
  - `base`: 比較元ブランチ
  - `head`: 比較先ブランチ
- **Description**: ブランチ間の差分（未マージのコミット一覧）を取得します。

### Create Pull Request

- **Method**: `POST`
- **Path**: `/api/repo/:owner/:repo/pulls`
- **Body**:
  ```json
  {
    "title": "PR Title",
    "head": "feature-branch",
    "base": "main",
    "body": "Description"
  }
  ```
- **Description**: GitHub Pull Request を作成します。

### Get PR Status

- **Method**: `GET`
- **Path**: `/api/repo/:owner/:repo/pr/:number/status`
- **Description**: PRの現在のステータス（Open/Merged/Closed）を取得します。

## システム & ユーティリティ (System & Utility)

### Health Check

- **Method**: `GET`
- **Path**: `/api/health`
- **Description**: APIサーバーの生存確認。`{ "status": "ok" }` を返します。

### Webhook Receiver

- **Method**: `POST`
- **Path**: `/api/webhook`
- **Description**: GitHub アプリからのWebhookイベントを受け取ります。

### Server-Sent Events (SSE)

- **Method**: `GET`
- **Path**: `/api/events`
- **Description**: リアルタイム通知用のSSEエンドポイント。GitHub
  Webhookなどで受信したイベントをクライアントにプッシュします。

### Debug Shutdown

- **Method**: `POST`
- **Path**: `/_debug/shutdown`
- **Headers**:
  - `X-Admin-Token`: 環境変数 `STATICMS_ADMIN_TOKEN` と一致する必要あり。
- **Description**:
  テスト終了時などにサーバーをグレースフルシャットダウンします。
