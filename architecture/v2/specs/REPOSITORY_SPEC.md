# リポジトリ選択画面 (RepositorySelector) 仕様書

## 概要

本画面は、操作ユーザーがログインした直後に表示される、編集対象のリポジトリを選択する画面です。
Staticms GitHub App
がインストールされているリポジトリの一覧を表示し、ユーザーをコンテンツブラウザ（ダッシュボード）へ誘導します。

## UI 構成

### レイアウト

シンプルで見やすいカードリスト、またはリスト形式を採用します。

### 1. ヘッダー (Header)

- **Label**: `Repositories`
- **Actions**:
  - **View Toggle**: 表示モード切替ボタン (Icons: `th` / `list`)。
    - **Card View**: グリッド形式でカードを表示。
    - **List View**: 詳細情報をテーブル形式で表示。
    - ※ 選択設定は `localStorage` に保存して維持する。
  - **Connect Repository**: `Connect` ボタン (Secondary)。
    - Staticms GitHub App
      のインストールページへ遷移し、新しいリポジトリへの権限を付与します。

### 2. 検索・フィルタ (Search Bar)

- **Search Input**: リポジトリ名でリアルタイムフィルタリングするための入力欄。
- **Filter**: `Public` / `Private` / `Fork` のフィルタリング。

### 3. リポジトリリスト (Repository List)

データは選択されたビューモードに応じてレンダリングされます。

#### Card View (Default)

- **Card Item**:
  - **Icon**: Private (`lock`) / Public (`globe`) / Fork (`code branch`)。
  - **Name**: `Owner / Repo` (強調表示)。
  - **Description**: GitHub 上のリポジトリ説明文（2行で切り詰め）。
  - **Stats**: Star 数や最終更新日。
  - **Status Tags**:
    - `localStorage` 内のドラフト数 (`Draft (N)`) や PR数 (`PR (N)`)
      を集計して表示。

#### List View

- **Table Row**:
  - **Name**: リポジトリ名とアイコン。
  - **Visibility**: Public/Private バッジ。
  - **Updated**: 最終更新日時。
  - **Status**: ドラフト数やPR数をバッジで表示。
  - **Action**: 選択ボタン。

### 4. Empty State (リポジトリなし)

- 操作ユーザーが初めて利用する場合などで、リポジトリが一つも接続されていない場合：
  - **Illustration**: 分かりやすいイラストやアイコン。
  - **Message**: "No repositories connected yet."
  - **Call to Action**: 大きな `Connect your first repository` ボタン。

## データフローとロジック

### 1. リポジトリ取得

- **API**: `GET /api/repositories` (Internal alias for User Repos)
- **Response**: GitHub App Installation に紐付くリポジトリのリスト。

### 2. Connect Flow

1. 操作ユーザーが `Connect Repository` をクリック。
2. `https://github.com/apps/YOUR_APP_NAME/installations/new` へ遷移。
3. GitHub 側でリポジトリ選択 -> Save。
4. StaticMS 側へリダイレクト、または戻ってきた際に SSE / Polling
   でリストを自動更新。

### 3. Real-time Updates

- **SSE (Server-Sent Events)**: `repository_update` イベントを購読。
- 他のタブや別ウィンドウ、あるいは GitHub
  側での操作による権限変更を即座にリストに反映します。
