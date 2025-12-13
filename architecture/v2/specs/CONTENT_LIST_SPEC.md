# コンテンツ一覧・記事一覧画面 (ContentList / ArticleList) 仕様書

## 概要

本仕様書は、リポジトリ内のコンテンツ管理を行うための画面群の仕様を定義します。
**コンテンツ一覧 (`ContentList`)**
で管理対象のコレクション（またはシングルトン）を選択し、**記事一覧
(`ArticleList`)** で具体的なファイルを選択、作成、または削除します。

## 1. コンテンツ一覧画面 (ContentList)

Config API (Deno KV) から取得したコンテンツ設定の一覧を表示します。

### UI 構成

### UI 構成

- **ヘッダー**:
  - **Breadcrumbs**: `Owner/Repo (Branch Label)` (現在地)
- **Toolbar**:
  - **View Toggle**: 表示モード切替 (`th` / `list`)。`localStorage` で維持。
  - **Search Input**: コンテンツ名でリアルタイムフィルタリングするための入力欄。
  - **Add New Content**: 設定追加画面への遷移ボタン。

### リスト表示 (`ContentList`)

- **Card View**:
  - 大きなアイコンとラベルで視認性を重視。
  - **Status Tags**:
    - **Collection**:
      構成記事のステータスを集計し、同種のタグが複数ある場合は件数を接尾表示（例:
      `Draft (3)`）。
    - **Singleton**: 単体のステータス（`Draft`, `PR`）を表示。
  - **Actions**: カード右下に「設定」(`cog` アイコン)
    ボタンを配置。クリックで設定編集画面へ遷移。
- **List View**:
  - 省スペースなテーブル表示。
  - Columns: `Type` (Icon), `Name`, `Identifier`, `Status`
    (Collectionの場合は集計数を表示), `Last Modified`, `Actions`。
  - **Actions**:
    - **Settings**: `cog` アイコン。クリックで設定編集画面へ遷移。

### インタラクション

- カード全体がクリッカブルエリア。
- コレクション -> `ArticleList` 画面へ。
- シングルトン -> `ContentEditor` 画面へ。
- 設定ボタン -> コンテンツ設定編集画面 (`/config/:collectionName`) へ。

### データフロー

- **Load**: `/api/repo/:owner/:repo/config` から設定を取得。
- **Status Check**: `localStorage`
  をスキャンし、各コンテンツに対応するドラフトが存在するか確認
  (`getContentStatus`)。

## 2. 記事一覧画面 (ArticleList)

選択されたコレクション（ディレクトリ）内のファイル一覧を表示します。

### UI 構成

- **ヘッダー**:
  - **Breadcrumbs**: `Owner/Repo (Branch Label) > CollectionName`
    - ブランチラベルが表示され、ブランチ切り替え中はローディング状態を維持する。
- **Toolbar**:
  - **View Toggle**: 表示モード切替 (`th` / `list`)。`localStorage` で維持。
  - **Search Input**: ファイル名でリアルタイムフィルタリングするための入力欄。
  - **New Article**: 入力欄と `Create` ボタン。
    - **Validation**:
      - 空白入力禁止
      - 重複名禁止（既存記事と同名、および拡張子違いのみも禁止）
      - 無効文字 (`/`, `:`, `*`, `?`, `"`, `<`, `>`, `|`) 禁止

### リスト表示 (`ArticleList`)

- **Loading Policy**:
  - リポジトリ情報（ブランチ等）のロードが完了するまで、コンテンツの取得・表示を保留する。これにより、デフォルトブランチの一時的な表示（FOUC）を防ぎ、正しいターゲットブランチの内容のみを表示する。

- **Card View**:
  - ファイルをカードとして表示。画像ファイルの場合はサムネイルプレビューを表示。
  - **Status Tags**: `Draft`, `PR` 等のステータスを表示。
    - **Local Drafts**:
      リモートに存在しない（新規作成された）ローカルドラフトも、`localStorage`
      からスキャンして一覧にマージ表示する。これらは `Draft`
      バッジ付きで表示される。
  - Markdown の場合は概要（Excerpt）を表示（Future Scope）。
- **List View**:
  - 標準的なファイル一覧テーブル。
  - **Columns**:
    - **Name**: ファイル名 (クリックで編集画面へ)。
    - **Updated**: 最終更新日時 (Git Commit Date)。
    - **Status**: `Draft` / `PR Open` 等のステータスバッジ。
    - **Actions**: なし（削除は編集画面で実行）。

### インタラクション詳細

#### 1. 記事の新規作成 (Create New)

1. 操作ユーザーがヘッダーの入力欄にファイル名（例:
   `my-new-post`）を入力し、Create ボタンを押下。
2. アプリは入力値を正規化し（拡張子 `.md` の補完など）、URL 生成。
3. `/:owner/:repo/:collection/new?filename=my-new-post.md` へ遷移。
4. エディタ画面が「新規モード」で開き、FrontMatter の `title`
   等にファイル名がプリセットされる。

#### 2. 記事の削除 (Delete)

一覧画面からの削除機能を提供します。

1. 削除対象の `Delete` ボタン（またはメニュー）を選択。
2. 確認モーダルが表示される。
3. 実行すると、API
   を通じてリモートリポジトリから削除し、完了後に画面をリロードする。

## UI Polish Guidelines

- **Empty States**:
  - **Content List**: 設定が0件の場合、「No content definitions
    found.」等のメッセージと共に、**「Add New Content」ボタン** (CTA)
    を表示する。
  - **Article List**: 記事が0件の場合、「No articles found. Create
    one!」といったフレンドリーなメッセージと CTA を表示する。
- **Loading**: スケルトンローディング `Placeholder`
  を使用し、体感速度を向上させる。
