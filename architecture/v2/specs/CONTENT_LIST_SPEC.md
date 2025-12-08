# コンテンツ一覧・記事一覧画面 (ContentList / ArticleList) 仕様書

## 概要

本仕様書は、リポジトリ内のコンテンツ管理を行うための画面群の仕様を定義します。
**コンテンツ一覧 (`ContentList`)**
で管理対象のコレクション（またはシングルトン）を選択し、**記事一覧
(`ArticleList`)** で具体的なファイルを選択、作成、または削除します。

## 1. コンテンツ一覧画面 (ContentList)

Config API (Deno KV) から取得したコンテンツ設定の一覧を表示します。

### UI 構成

- **ヘッダー**:
  - **Breadcrumbs**: `Owner/Repo` (現在地)
  - **Actions**:
    - **View Toggle**: 表示モード切替 (`th` / `list`)。`localStorage` で維持。
    - **Add New Content**: 設定追加画面への遷移ボタン。

### 検索・フィルタ (Search Bar)

- **Search Input**: コンテンツ名でリアルタイムフィルタリングするための入力欄。
- **Filter**: `Collection` / `Singleton` の種別フィルタ（将来的な拡張）。

### リスト表示 (`ContentList`)

- **Card View**:
  - 大きなアイコンとラベルで視認性を重視。
  - `Unsaved Draft` バッジをカード右上に配置。
  - **Actions**: カード右下に「設定」(`cog` アイコン)
    ボタンを配置。クリックで設定編集画面へ遷移。
- **List View**:
  - 省スペースなテーブル表示。
  - Columns: `Type` (Icon), `Name`, `Identifier`, `Status`, `Last Modified`,
    `Actions`。
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
  - **Breadcrumbs**: `Owner/Repo > CollectionName`
  - **Actions**:
    - **View Toggle**: 表示モード切替 (`th` / `list`)。`localStorage` で維持。
    - **New Article**: 入力欄と `Create` ボタン。

### 検索・フィルタ (Search Bar)

- **Search Input**: ファイル名でリアルタイムフィルタリングするための入力欄。
- **Pagination**: クライアントサイドでのページネーション（1ページあたり 50
  件）。

### リスト表示 (`ArticleList`)

- **Card View**:
  - ファイルをカードとして表示。画像ファイルの場合はサムネイルプレビューを表示。
  - Markdown の場合は概要（Excerpt）を表示（Future Scope）。
- **List View**:
  - 標準的なファイル一覧テーブル。
  - **Columns**:
    - **Name**: ファイル名 (クリックで編集画面へ)。
    - **Updated**: 最終更新日時 (Git Commit Date)。
    - **Status**: `Draft` / `PR Open` 等のステータスバッジ。
    - **Actions**: `Delete` ボタン。

### インタラクション詳細

#### 1. 記事の新規作成 (Create New)

1. 操作ユーザーがヘッダーの入力欄にファイル名（例:
   `my-new-post`）を入力し、Create ボタンを押下。
2. アプリは入力値を正規化し（拡張子 `.md` の補完など）、URL 生成。
3. `/:owner/:repo/:collection/new?filename=my-new-post.md` へ遷移。
4. エディタ画面が「新規モード」で開き、FrontMatter の `title`
   等にファイル名がプリセットされる。

#### 2. 記事の削除 (Delete)

1. リスト上の `Delete` ボタンを押下。
2. **確認モーダル (Confirmation Modal)** が表示される。
   - Message: "Are you sure you want to delete 'example.md'?"
   - Warning: "This action will create a delete commit/PR."
3. `Confirm` 押下で API 呼び出し。
   - `DELETE /api/repo/:owner/:repo/contents/:path`
4. 成功時、トーストを表示しリストをリフレッシュ。

## UI Polish Guidelines

- **Empty States**:
  - **Content List**: 設定が0件の場合、「No content definitions
    found.」等のメッセージと共に、**「Add New Content」ボタン** (CTA)
    を表示する。
  - **Article List**: 記事が0件の場合、「No articles found. Create
    one!」といったフレンドリーなメッセージと CTA を表示する。
- **Loading**: スケルトンローディング `Placeholder`
  を使用し、体感速度を向上させる。
