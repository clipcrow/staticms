# Server API Specification

Staticms サーバーが提供する RESTful API の定義ドキュメントです。 全ての API は
`/api` プレフィックスを持ちます。

## 共通仕様

### レスポンス形式

成功時は各エンドポイントの定義に従った JSON (またはバイナリ) を返します。
エラー時は以下の JSON 形式を返します。

```json
{
  "error": "エラーメッセージの詳細"
}
```

### 認証

多くのエンドポイントは認証を必要とします。認証は Cookie (`session_id`)
によって行われます。 未認証のリクエストに対しては `401 Unauthorized`
を返します。

---

## 1. 認証 (Authentication)

### `GET /api/auth/login`

GitHub OAuth フローを開始します。

- **Query Params**:
  - `returnTo`: ログイン完了後にリダイレクトさせるパス (Optional)
  - `prompt`: `login` を指定すると強制的にログイン画面を表示 (Optional)
- **Response**: GitHub への 302 Redirect

### `GET /api/auth/callback`

GitHub からのコールバックを受け付けるエンドポイントです。

- **Query Params**:
  - `code`: Authorization Code
- **Response**:
  - Success: `returnTo` または `/` への 302 Redirect (Cookie `session_id` set)
  - Error: 400 Bad Request or 500 Internal Server Error

### `GET /api/auth/logout`

ログアウト処理を行います。

- **Response**:
  ```json
  { "success": true }
  ```
- **Side Effects**: `session_id` クッキーの削除、サーバー側セッションの破棄。

---

## 2. ユーザー (User)

### `GET /api/user`

現在ログイン中のユーザー情報を取得します。

- **Auth**: Required
- **Response**: GitHub User Object
  ```json
  {
    "login": "username",
    "avatar_url": "...",
    "name": "Full Name",
    ...
  }
  ```

### `GET /api/user/repos`

ユーザーがアクセス可能なリポジトリ一覧を取得します。GitHub App
のインストール状況に基づきます。

- **Auth**: Required
- **Response**: Array of Repository Objects
  ```json
  [
    {
      "id": 12345,
      "full_name": "owner/repo",
      "default_branch": "main",
      ...
    }
  ]
  ```

---

## 3. 設定 (Configuration)

### `GET /api/config`

アプリケーション全体の設定を取得します。

- **Response**: Config Object (from Deno KV)
  ```json
  {
    "contents": [
      { "owner": "foo", "repo": "bar", ... }
    ]
  }
  ```

### `POST /api/config`

アプリケーション設定を保存し、対象リポジトリへの Webhook 設定を行います。

- **Auth**: Required
- **Body**: Config Object
- **Response**: `{ "success": true }`
- **Side Effects**: 指定されたリポジトリに対して Webhook (`push`,
  `pull_request`) を自動設定します。

---

## 4. コンテンツ操作 (Content Operations)

### `GET /api/content`

ファイル内容またはディレクトリ一覧を取得します。

- **Auth**: Required
- **Query Params**:
  - `owner`: (Required)
  - `repo`: (Required)
  - `filePath`: (Required) コンテンツへのパス
  - `branch`: (Optional) 参照ブランチ名（デフォルトはリポジトリの既定ブランチ）
  - `media`: `true` の場合、バイナリとしてレスポンスし適切な Content-Type
    を設定する
  - `validate`: `true` の場合、404 エラーをサーバーログに出力する
- **Response**:
  - **Directory**:
    ```json
    {
      "type": "dir",
      "branch": "main",
      "files": [{ "name": "...", "type": "file|dir", "sha": "..." }]
    }
    ```
  - **File (Text)**:
    ```json
    {
      "type": "file",
      "branch": "main",
      "sha": "blob_sha",
      "content": "UTF-8 string content"
    }
    ```
  - **File (Media)**: バイナリデータ (Image data etc.)

### `POST /api/content`

ファイルを保存します。実際には **新しいブランチを作成し、PRを作成** します。

- **Auth**: Required
- **Body**:
  ```json
  {
    "owner": "string",
    "repo": "string",
    "path": "string",
    "content": "string", // ファイルの中身
    "sha": "string", // 元ファイルのSHA（競合検知用）
    "branch": "string", // ベースとなるブランチ
    "title": "string", // PRタイトル
    "description": "string" // PR本文
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "prUrl": "https://github.com/owner/repo/pull/123"
  }
  ```

---

## 5. ヘルパー (Helpers)

### `GET /api/commits`

指定ファイルのコミット履歴を取得します。

- **Auth**: Required
- **Query Params**: `owner`, `repo`, `filePath`, `branch`
- **Response**:
  ```json
  {
    "commits": [
      {
        "message": "Update file",
        "author": { "name": "...", "date": "..." },
        "html_url": "..."
      }
    ]
  }
  ```

### `GET /api/pr-status`

PR の現在のステータスを取得します。

- **Auth**: Required
- **Query Params**:
  - `prUrl`: PR の HTML URL (e.g., `https://github.com/owner/repo/pull/123`)
- **Response**:
  ```json
  {
    "state": "open|closed",
    "merged": boolean,
    "title": "...",
    ...
  }
  ```

---

## 6. リアルタイムイベント (Realtime Events)

### `GET /api/events`

Server-Sent Events (SSE)
エンドポイント。クライアントは常時接続し、更新を受け取ります。

- **Events**:
  - `push`: リポジトリへの Push イベント。
  - `pull_request`: PR の状態変化。
  - `repository_update`: GitHub App のインストール状態変化。

### `POST /api/webhook`

GitHub からの Webhook 受信口。

- **Auth**: GitHub Signature check (Note:
  現状の実装で署名検証が行われているか確認が必要。`staticms.ts`
  には明示的な署名検証コードが見当たらなかったため要確認)
- **Behavior**: 受信したイベントを解析し、`GET /api/events`
  に接続中のクライアントへブロードキャストします。
