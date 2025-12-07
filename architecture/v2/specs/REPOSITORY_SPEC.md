# リポジトリ選択画面 (RepositorySelector) 仕様書

## 概要

ログイン直後に表示される、編集対象のリポジトリを選択する画面です。 GitHub App
がインストールされているリポジトリの一覧を表示し、ユーザーをコンテンツブラウザ（ダッシュボード）へ誘導します。

## UI 構成

- **ヘッダー**:
  - パンくずリスト: `Repositories` (固定)
  - アクション: `Connect Repository` ボタン (GitHub App
    インストールページへ遷移)。
- **リスト表示 (`RepositorySelector`)**:
  - ログインユーザーがアクセス権を持つ（GitHub App
    が導入された）リポジトリ一覧。
  - **アイコン**: GitHub リポジトリなど (`github` icon)。
  - **メインテキスト**: `Owner/Repo` 名。
  - **サブテキスト**: 説明文 (Description) や Private/Public 表示。
  - **クリック時の挙動**: コンテンツ一覧画面 (`/:owner/:repo`) へ遷移。

## データフローとロジック

### 1. リポジトリ取得

- **API**: `GET /api/user/repos` (v2 では `src/server/app.ts` で
  `/api/repositories` のエイリアスとして実装)。
- **レスポンス**: GitHub App Installation に紐付くリポジトリのリスト。

### 2. リポジトリ追加 (Connect)

- **ボタン**: `Connect Repository`
- **挙動**: `https://github.com/apps/YOUR_APP_NAME/installations/new`
  (環境変数で設定される GitHub App URL)
  へ遷移させて、ユーザーにリポジトリへの権限付与を行わせる。

### 3. リアルタイム更新 (SSE)

- **イベント**: `repository_update`
- GitHub 側で App が追加/削除された際、Webhook を経由してサーバーから SSE
  が飛んでくる。
- 画面はこれを受け取り、リポジトリリストを自動でリロードする。

### v1 からの課題と新規仕様案

- **空の状態**:
  初回ログイン時など、リポジトリが一つも接続されていない場合のガイダンス表示（v1実装済みだが、UX向上の余地あり）。
- **検索/フィルタ**: リポジトリ数が多い場合の検索機能。

---

**実装状況メモ (v2)**:

- [x] `RepositorySelector` コンポーネント (共通)
- [x] API APIエンドポイント実装 (`/api/repositories`, `/api/user/repos`)
- [x] SSE 基盤 (`ServerSentEvents`)
- [ ] 検索機能の実装（未実装）
