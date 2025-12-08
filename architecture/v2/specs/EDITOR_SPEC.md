# 記事エディタ画面 (ContentEditor) 仕様書

## 概要

本画面（記事エディタ画面）は、Staticms の中核機能であり、Markdown
コンテンツの作成・編集、FrontMatter（メタデータ）の管理、画像投稿、および GitHub
への保存（Pull Request 作成）を行う画面です。 v2 では、**分割された直感的な UI**
と **堅牢なドラフト保存機能**
により、操作ユーザーが執筆に集中できる環境を提供します。

## UI 構成

### レイアウト (Grid Layout)

Semantic UI の Grid システムを使用し、画面を大きく2つのカラムに分割します。

- **Main Column (12 wide)**: 執筆エリア
- **Sidebar Column (4 wide)**: 支援ツール（画像管理、履歴、ヘルプなど）

### 1. ヘッダー (Header)

画面上部に固定され、ナビゲーションと主要アクションを提供します。

- **Left**: パンくずリスト (`Owner/Repo > Collection > Filename`)
  - コレクション部分は `ArticleList` へのリンクとなります。
- **Right**: アクションボタン群
  - **Status Indicator**: PR Open / Merged / Locked 等の状態表示。
  - **Draft Restored Label**: ローカルドラフト復元時に表示（オレンジ色）。
  - **Reset Button**: ローカルの変更（ドラフト）を破棄し、サーバーの状態へ戻す。
  - **Save / Create PR Button**: 変更をコミットし、PR を作成/更新する（Primary
    Action）。

### 2. メインエリア (Main Column)

#### FrontMatter エディタ (FrontMatterItemEditor)

- 画面最上部に配置。
- コンテンツ設定 (Config)
  で定義されたフィールドに基づき、フォームを動的に生成します。
- **Design**: カード形式、またはアコーディオン形式でメタデータを整理して表示。
- **Widgets**:
  - `string`: テキスト入力
  - `boolean`: トグルスイッチ
  - `image`: 画像選択（モーダル連携）

#### Body Editor (Markdown Only)

- ファイル拡張子が `.md` (Markdown) の場合のみ表示されます。
- FrontMatter とは独立した「本文」として扱われます。`config` の `fields` 定義に
  `body` を含める必要はありません。
- `react-md-editor` をベースとしたリッチな執筆エリア。
- **Tabs**: `Write` / `Preview` 切り替え。
- **Drag & Drop**:
  エディタ領域への画像ファイルのドロップを受け付け、自動的にアップロード待機リストに追加し、Markdown
  にリンクを挿入します。
- **Toolbar**: 太字、斜体、リンク、画像挿入などの標準ツールバー。

### 3. サイドバー (Sidebar Column)

#### ステータスパネル (Info Panel)

- **PR Status**: 関連する PR
  があれば、番号・タイトル・リンク・ステータス（Open/Merged/Closed）を表示。
- **Draft Status**: 最終保存時刻を表示。「Unsaved changes」警告など。

#### 画像管理パネル (ContentImages)

タブ切り替えにより、コンテキストに応じた画像を表示します。

1. **Nearby (同階層)**:
   - 編集中の記事と同じディレクトリに存在する画像ファイルを表示。
   - クリックで Markdown へのリンクコピー、またはプレビュー表示。
2. **Pending (アップロード待ち)**:
   - 今回の編集セッションで追加されたが、まだ GitHub
     にコミットされていない画像。
   - サムネイル表示。
   - 削除ボタン（アップロード取り消し）。
3. **Upload Area**:
   - 「Drop images here」エリア。

#### 履歴パネル (ContentHistory)

- このファイルに対する直近の Git Commit ログ（最大 5-10 件）を表示。
- 各コミットへの GitHub リンク。
- コミットを行ったユーザーのアバターの表示。

## データフローとロジック

### 1. 初期化プロセス (Initialization)

1. **Draft Loading**: `localStorage` から `localDraft` を取得。
2. **Remote Fetching**: GitHub API から最新のコンテンツを取得。
3. **Conflict Resolution**:
   - ドラフトが存在する場合: ドラフトを優先表示し、UI に「Draft
     Restored」と表示。
   - ドラフトがない場合: リモートコンテンツを表示。
4. **Lock Check**:
   - オープンな PR が存在する場合、原則として編集をロック（Read-Only）する。
   - **Locking Logic (Simple Lock)**:
     - 原則: **オープンな PR が存在する場合、編集不可（Read-Only）** とする。
     - 例外: **ローカルドラフトが存在し、かつ PR
       作成者が操作ユーザーと一致する場合**
       は、ドラフトの内容を優先し、編集および PR の更新を許可する。

### 2. 編集プロセス (Editing)

1. **Dirty Check**:
   - 編集のたびに、ローカル内容（Draft）とリモート内容（Original）を比較する。
   - **一致する場合 (Clean)**: `localStorage` からドラフトを削除し、Clean
     状態へ戻す。
   - **不一致の場合 (Dirty)**: `localStorage` にドラフトを保存し、Dirty
     状態（未保存）とする。

### 3. 保存プロセス (Save / Create PR)

1. **Validation**: 必須 FrontMatter フィールドのチェック。
2. **Image Processing**:
   - `pendingImages` にある画像を Base64 エンコード。
3. **Commit Construction**:
   - 記事 (`.md`) と画像ファイル群をひとつの Commit (Tree) として構成。
4. **API Request**:
   - `PUT /api/repo/:owner/:repo/contents` (または Batch API) をコール。
5. **Clean up**:
   - 成功時、`localStorage` のドラフトを削除。
   - 作成された PR 情報を State に反映し、完了トーストを表示。

### 4. 画像アップロード (Image Upload)

- 画像は即座にサーバーに送るのではなく、一旦 `pendingImages` State と
  `localStorage` に保存します（ドラフトの一部）。
- Markdown プレビュー時には、`pendingImages` 内の画像は Data URI
  (`data:image/...`) として展開し、即時プレビューを実現します。

## UI Polish Guidelines

- **Spacing**: セクション間には十分なマージン (`2rem`) を設ける。
- **Colors**:
  - アクションボタン: Semantic UI Primary Blue
  - 警告/ドラフト: Orange / Yellow
  - 削除/危険: Red
- **Feedback**:
  - 保存中 (`Saving...`) はボタンを Loading 状態にする。
  - 成功・失敗は必ず Toast 通知でフィードバックする。
