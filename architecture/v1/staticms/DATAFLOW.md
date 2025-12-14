# Staticms Data Flow

Staticms
アプリケーションにおけるデータフロー、状態管理、およびイベント処理について記述します。

## 1. 認証 (Authentication)

ユーザー認証とセッション管理のフローです。

### 1.1 ログイン (Login)

- **Trigger**: ユーザーが「Login with GitHub」ボタンをクリック ->
  `useAuth: login`
- **Client**: `/api/auth/login` へリダイレクト（`returnTo`
  パラメータで遷移元を保持）
- **Server**:
  - GitHub OAuth 認証フローを開始
  - コールバック (`/api/auth/callback`) で Authorization Code を受け取る
  - GitHub API で Access Token と交換
  - `Deno.Kv` にセッションを作成 (`sessions/<sessionId>` -> `accessToken`)
  - `session_id` Cookie (HttpOnly) を設定してクライアントへリダイレクト
- **Client**:
  - アプリケーションがリロードされる
  - `useAuth` フックがマウント時に `/api/user` をコール
  - 認証成功時:
    - `isAuthenticated` state を true に設定
    - ユーザー名 (`login`) を取得し、`localStorage` の `staticms_user` に保存
      (ドラフト分離用)

### 1.2 ログアウト (Logout)

- **Trigger**: ユーザーがログアウトボタンをクリック -> `useAuth: logout`
- **Client**: `/api/auth/logout` をコール
- **Server**:
  - Cookie から `session_id` を取得
  - `Deno.Kv` から該当セッションを削除
  - `session_id` Cookie を削除
- **Client**:
  - `isAuthenticated` state を false に設定
  - ログイン画面へ遷移

## 2. コンテンツ閲覧 (Content Viewing)

### 2.1 コンテンツリスト (Content List)

- **Trigger**: リポジトリ選択後、または URL 直接アクセス
- **State**: `useContentConfig` フックが `/api/config` から設定をロード
- **View**: 設定されたファイル/ディレクトリの一覧を表示

### 2.2 コレクション/記事一覧 (Collection / Article List)

- **Trigger**: `ContentList` でディレクトリタイプのコンテンツを選択
- **Hook**: `useCollection`
- **Fetch**:
  - `GET /api/content`: ディレクトリ内のファイル一覧を取得
  - `localStorage` からドラフト (`draft_<user>|<owner>|<repo>|<branch>|<path>`)
    を検索し、一覧にマージ
    - _Note_: ユーザー名が含まれるため、他ユーザーのドラフトは表示されない
- **View**:
  リモートファイルとローカルドラフト（新規作成中含む）の統合リストを表示

### 2.3 コンテンツエディタ (Content Editor)

- **Trigger**: ファイル選択 -> `App.tsx: handleSelectContent`
- **Hook**: `useRemoteContent`
- **Fetch**:
  - `GET /api/content`: ファイル内容、SHA、ブランチ情報を取得
  - `GET /api/commits`: コミット履歴を取得
- **Draft Restoration**:
  - `useDraft` フックが `localStorage` をチェック
  - キー形式: `draft_<user>|<owner>|<repo>|<branch>|<filePath>`
  - ドラフト存在時:
    - リモート内容をドラフト内容で上書きし、`hasDraft` フラグを true に設定
    - ドラフト内に保存された `prUrl` があれば復元
    - ドラフト内に保存された `pendingImages` を復元
- **Image Preview**:
  - `MarkdownEditor` は画像パス解決時にドラフト内の `pendingImages`
    を優先的に参照
  - アップロード待ちの画像もプレビュー可能

## 3. 編集と保存 (Editing & Saving)

### 3.1 ドラフト自動保存 (Auto Save Draft)

- **Hook**: `useDraft`
- **Trigger**: `body`, `frontMatter`, `prDescription`, `pendingImages` の変更
- **Logic**:
  - 初期ロード時の内容 (`initialBody`, `initialFrontMatter`) と比較
  - 変更あり (`isDirty`) または `prUrl` が存在する場合:
    - `body`, `frontMatter`, `prDescription`, `pendingImages`, `prUrl`
      をまとめて `localStorage` に保存
  - 変更なし: `localStorage` から削除 (ただし `created`
    タイプの新規作成ドラフトは維持)

### 3.2 新規記事作成 (Create Article)

- **Context**: コレクション内
- **Action**: `useCollection: createArticle`
- **Logic**:
  - GitHub にはまだファイルを作成しない
  - `localStorage` に `type: "created"` としてドラフトを保存
  - エディタ画面へ遷移し、ドラフトとして読み込む

### 3.3 プルリクエスト作成/保存 (Create PR / Save)

- **Trigger**: 保存ボタン -> `useDraft: saveContent`
- **Client**:
  - Front Matter と Body を結合 (YAML/Markdown)
  - `pendingImages` の画像データを含めてリクエスト
  - `POST /api/content`
- **Server**:
  - 専用ブランチ (`staticms-update-<timestamp>`) を作成
  - 画像ファイルとコンテンツファイルをコミット
  - プルリクエストを作成
- **Client**:
  - レスポンスから `prUrl` を取得
  - `localStorage` のドラフトオブジェクトを更新:
    - `prUrl` を保存
    - `pendingImages` をクリア
    - `type: "created"` を設定（ロード時にリモート内容を優先するため）
  - `initialBody` 等を更新して "Unsaved Changes" 状態を解除
  - PR ステータスをポーリング開始

## 4. 同期と整合性 (Synchronization)

### 4.1 PR ステータス監視 (PR Status Polling)

- **Hook**: `useDraft`
- **Trigger**: `prUrl` が存在する場合
- **Action**: 定期的に `/api/pr-status` をコール
- **Logic**:
  - `open`: 編集ロック (`isPrLocked = true`)
  - `merged` / `closed`:
    - ローカルの PR 情報 (`prUrl`) をクリア
    - コンテンツをリセット (`resetContent`) し、リモートの最新状態を再取得

### 4.2 リアルタイム更新 (Server-Sent Events)

- **Hook**: `useSubscription`
- **Connection**: `GET /api/events`
- **Events**:
  - `push`:
    - 現在開いているファイルが更新された場合
    - ローカル変更がない (`!isDirty`) 場合のみ、自動的にリロード
    - ローカル変更がある場合は、ユーザーの作業を優先（上書きしない）
  - `pull_request`:
    - PR がクローズされた場合、ステータスチェックをトリガー
  - `repository_update`:
    - GitHub App のインストール状態が変更された場合 (`installation`,
      `installation_repositories`)
    - リポジトリリストを再取得し、UIを更新

## 5. サーバーサイド構成 (Server Architecture)

### 5.1 データストア (Deno KV)

- `sessions/<sessionId>`: アクセストークン管理 (TTLあり)
- `config`: Staticms設定

### 5.2 GitHub API 連携

- **User Token**:
  - ログインユーザーの権限で実行 (ファイル読み書き、PR作成など)
  - セッションに紐付いて管理
- **App Installation Token**:
  - Webhook 設定など、アプリとしての権限が必要な操作に使用
  - 秘密鍵から JWT を生成し、Installation Access Token を取得

### 5.3 Webhook

- `/api/webhook`: GitHub からのイベント (`push`, `pull_request`) を受信
- 接続中のクライアントへ SSE でイベントをブロードキャスト

## 6. リポジトリ選択 (Repository Selection)

作業対象のリポジトリを選択するフローです。

1. **Initialization**:
   - `App.tsx` のルーティングにより、URL (`/:owner/:repo`)
     に基づいてリポジトリが決定されます。
   - ルートパス (`/`) にアクセスした場合、`RepositorySelector` が表示されます。

2. **Select Repository**:
   - **Trigger**: `RepositorySelector` コンポーネントでの選択アクション
   - **Action**: `onSelect` コールバックが発火し、`/:owner/:repo` へ遷移
     (`navigate`)
   - **View Transition**: `ContentListWrapper`
     がマウントされ、コンテンツリストが表示される

3. **Clear Repository (Logout)**:
   - **Trigger**: ログアウト時 (`handleLogout`)
   - **Action**:
     ログイン画面へリダイレクトされることで、リポジトリ選択状態も解除される（URLが変わるため）

## 7. データ永続化とライフサイクル (Data Persistence & Lifecycle)

各ストレージにおけるデータの生成・破棄タイミングの詳細です。

### 7.1 Browser Cookie

| Key              | 内容            | 生成タイミング                     | 破棄タイミング                           | 属性                                               |
| :--------------- | :-------------- | :--------------------------------- | :--------------------------------------- | :------------------------------------------------- |
| `session_id`     | セッションID    | ログイン成功時 (Callback)          | ログアウト時、または有効期限切れ (1週間) | HttpOnly, Secure (Prod), SameSite=Lax              |
| `auth_return_to` | ログイン前のURL | ログイン開始時 (`/api/auth/login`) | ログイン完了時 (Callback)                | HttpOnly, Secure (Prod), SameSite=Lax, MaxAge=300s |

### 7.2 Browser localStorage

| Key                 | 内容                                    | 生成タイミング                               | 破棄タイミング                                           |
| :------------------ | :-------------------------------------- | :------------------------------------------- | :------------------------------------------------------- |
| `staticms_user`     | ログインユーザー名                      | ログイン成功後の初回データ取得時 (`useAuth`) | ログアウト時、または認証チェック失敗時                   |
| `draft_<user>\|...` | ドラフトデータ (本文, FM, 画像, PR URL) | エディタで変更発生時、新規作成時、PR作成時   | 変更破棄時、または変更を取り消して保存済み状態に戻った時 |

### 6.3 Server Deno KV

| Key Pattern            | 内容                  | 生成タイミング                  | 破棄タイミング                                                        | 備考                           |
| :--------------------- | :-------------------- | :------------------------------ | :-------------------------------------------------------------------- | :----------------------------- |
| `sessions/<sessionId>` | GitHub Access Token   | ログイン成功時 (Callback)       | ログアウト時 (`deleteSession`)、または TTL (1週間) 経過による自動削除 | セッションIDとトークンの紐付け |
| `config`               | コンテンツ設定 (JSON) | 設定保存時 (`POST /api/config`) | 明示的な破棄なし (上書き更新)                                         | 全ユーザー共有の設定           |

## 8. `localStorage` 内の `staticms_user`

`localStorage` の `staticms_user`
キーには、現在認証されているユーザーのユーザー名が保存されます。これは、ローカルドラフトやその他のユーザー固有データを名前空間で区切り、複数のユーザーが同じブラウザを使用した場合の競合を防ぐために重要です。

### ライフサイクル (Lifecycle)

#### 1. 作成と更新 (ログイン/認証チェック)

- **場所:** `src/app/hooks/useAuth.ts`
- **トリガー:**
  - アプリの初期化時 (`useAuth` 内の `useEffect` 経由)。
  - 手動の認証チェック時 (`checkAuth` 経由)。
- **プロセス:**
  1. アプリが `/api/user` からユーザープロファイルを取得します。
  2. リクエストが成功 (`200 OK`) した場合、レスポンスの JSON をパースします。
  3. `login` または `username` フィールドからユーザー名を抽出します。
  4. 有効なユーザー名が見つかった場合、それを `localStorage` に保存します:

  ```typescript
  localStorage.setItem("staticms_user", login);
  ```

#### 2. 読み取り (使用)

- **場所:** `src/app/hooks/utils.ts`
- **関数:** `getUsername()`
- **プロセス:**
  - 値を取得します: `localStorage.getItem("staticms_user")`。
  - 設定されていない場合は、空文字を返します。
  - **注意:** `getUsername` は同期的に `localStorage`
    のみを読み取ります。Reactコンポーネント内では、`useAuth` フックから
    `username` を取得し、それを `getDraftKey`
    などのヘルパー関数に渡すことが推奨されます。
- **利用者 (Consumers):**
  - `getDraftKey(content)`:
    ユーザー名を使用して、ドラフトを保存するための一意のキーを生成します (例:
    `draft_username|owner|repo|...`)。
  - `getRepoStatus(owner, repo)`:
    ユーザー名を使用して、リポジトリリストのドラフト/PRカウントをフィルタリングします。
  - `getContentStatus(...)`:
    ユーザー名を使用して、特定のファイルまたはコレクションのドラフト/PRを確認します。

#### 3. 削除 (ログアウト/認証失敗)

- **場所:** `src/app/hooks/useAuth.ts`
- **トリガー:**
  - 認証チェックが失敗した場合 (例: `/api/user` からの `401 Unauthorized`
    レスポンス)。
- **プロセス:**
  - 古いユーザーデータが残らないようにキーを削除します:

  ```typescript
  localStorage.removeItem("staticms_user");
  ```
