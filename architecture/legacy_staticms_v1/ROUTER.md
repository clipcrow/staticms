# サーバーAPIドキュメント

本ドキュメントは `src/server/staticms.ts`
に実装されているサーバー側APIエンドポイントの概要です。

## 認証 (Authentication)

### `GET /api/auth/login`

GitHub
OAuthフローを開始します。ユーザーをGitHubにリダイレクトし、アプリケーションを承認させます。

### `GET /api/auth/callback`

GitHub OAuthのコールバックURLです。

- **クエリパラメータ**:
  - `code`: GitHubから返されたOAuthコード。
- **動作**: コードをアクセストークンと交換し、セッションを作成して `/`
  にリダイレクトします。

### `GET /api/auth/logout`

現在のユーザーをログアウトさせます。

- **動作**: KVからセッションを削除し、セッションクッキーをクリアします。
- **レスポンス**: `{ success: true }`

## ユーザー (User)

### `GET /api/user`

認証されたユーザーのGitHubプロフィールを取得します。

- **認証**: 必須
- **レスポンス**: GitHubユーザーオブジェクト (JSON)

### `GET /api/user/repos`

GitHub
Appのインストール情報に基づいて、ユーザーがアクセス可能なリポジトリのリストを取得します。

- **認証**: 必須
- **レスポンス**: リポジトリオブジェクトの配列

## 設定 (Configuration)

### `GET /api/config`

現在のアプリケーション設定を取得します。

- **レスポンス**: 設定オブジェクト (JSON)

### `POST /api/config`

アプリケーション設定を更新し、設定されたリポジトリに対してWebhookを設定します。

- **認証**: 必須
- **ボディ**: 設定オブジェクト (JSON)
- **動作**:
  設定をKVに保存し、リストされたすべてのリポジトリに対してWebhookが設定されていることを確認します。
- **レスポンス**: `{ success: true }`

## Webhook & リアルタイムイベント (Webhooks & Real-time Events)

### `POST /api/webhook`

GitHub Webhookを受信するためのエンドポイントです。

- **処理するイベント**: `push`, `pull_request`
- **動作**: Server-Sent Events (SSE)
  を介して、接続されているクライアントにイベントをブロードキャストします。

### `GET /api/events`

リアルタイム更新のためのServer-Sent Events (SSE) エンドポイントです。

- **動作**:
  接続を開いたままにし、イベント（プッシュやPRの更新など）をクライアントにストリーミングします。

## コンテンツ管理 (Content Management)

### `GET /api/content`

GitHubリポジトリからファイルの内容またはディレクトリリストを取得します。

- **認証**: 必須
- **クエリパラメータ**:
  - `owner`: リポジトリの所有者
  - `repo`: リポジトリ名
  - `filePath`: ファイルまたはディレクトリへのパス
  - `branch` (任意):
    取得元のブランチ。デフォルトはリポジトリのデフォルトブランチ。
  - `validate` (任意): "true" の場合、404エラーをログに記録します。
  - `allowMissing` (任意): "true" の場合、404エラーをログに記録しません。
- **レスポンス**:
  - ファイルの場合:
    `{ type: "file", content: string, sha: string, branch: string }`
  - ディレクトリの場合: `{ type: "dir", branch: string }`

### `POST /api/content`

新しいブランチを作成し、変更をコミットしてプルリクエスト (PR)
を作成することで、ファイルを更新します。

- **認証**: 必須
- **ボディ**:
  - `owner`: リポジトリの所有者
  - `repo`: リポジトリ名
  - `path`: ファイルパス
  - `content`: 新しいファイルの内容
  - `sha`: 元のファイルのSHA（競合チェック用）
  - `description` (任意): コミットメッセージ / PRの本文
  - `title` (任意): PRのタイトル
  - `branch` (任意): 作業のベースとなるブランチ
- **レスポンス**: `{ success: true, prUrl: string }`

## プルリクエスト & コミット (Pull Requests & Commits)

### `GET /api/pr-status`

特定のプルリクエストのステータスを取得します。

- **認証**: 必須
- **クエリパラメータ**:
  - `prUrl`: プルリクエストの完全なHTML URL
- **レスポンス**:
  - `{ state, merged, number, title, body, user: { login, avatar_url }, created_at, html_url }`

### `GET /api/commits`

特定のファイルのコミット履歴を取得します。

- **認証**: 必須
- **クエリパラメータ**:
  - `owner`: リポジトリの所有者
  - `repo`: リポジトリ名
  - `filePath`: ファイルパス
  - `branch` (任意): フィルタリングするブランチ
- **レスポンス**:
  - `{ commits: Array<{ message, author, date, sha, html_url }> }`
