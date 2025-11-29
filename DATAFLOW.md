# ContentEditor Data Flow

ContentEditor画面におけるファイル操作のデータフローとイベント処理について記述します。

## 1. 画面表示 (Initialization)

ユーザーがコンテンツリストからファイルを選択した際のフローです。

1. **Trigger**: `ContentList` でアイテムクリック ->
   `App.tsx: handleSelectContent`
2. **State Update (useNavigation Hook)**: `loadingContentIndex` をセット
3. **Fetch Content (useRemoteContent Hook)**: `loadContent` が実行される
   - `GET /api/content`: ファイルの生データ、SHA、ブランチ情報を取得
   - `GET /api/commits`: ファイルのコミット履歴を取得
4. **Parse & State Setup (useRemoteContent Hook)**:
   - ファイル拡張子 (.md, .yaml) に応じて Front Matter と Body をパース
   - `useDraft` フックのキー生成ロジックを使用して `localStorage` (`draft_...`
     ※実際は `|` 区切り) を確認
     - ドラフトが存在する場合: ドラフトの内容で State (`body`, `frontMatter`)
       を上書き (ユーザーに復元されたことを示す)
     - ドラフトがない場合: リモートの内容を State にセット
   - `usePullRequest` フックのキー生成ロジックを使用して `localStorage`
     (`pr_...` ※実際は `|` 区切り) を確認し、`prUrl` State にセット
5. **View Transition (useNavigation Hook)**:
   - `currentContent` を更新
   - `view` state を `content-editor` に変更し、`ContentEditor`
     コンポーネントを表示
   - `loadingContentIndex` をリセット

## 2. 編集 (Editing)

ユーザーがエディタで変更を加える際のフローです。

1. **User Action**: テキストエリアの変更、Front Matter フィールドの変更
2. **State Update**: `useRemoteContent` で管理される `body`, `frontMatter` State
   が更新される
3. **Auto Save Draft (useDraft Hook)**:
   - `useDraft` 内の `useEffect` が変更を検知
   - 初期ロード時の内容 (`initialBody`, `initialFrontMatter`) と比較
   - 変更がある場合 (`isDirty`):
     - `localStorage` (`draft_...` ※実際は `|` 区切り) に現在の内容を保存
     - `hasDraft` フラグを true に設定
   - 変更がない場合:
     - `localStorage` のドラフトを削除 (ただし `created` タイプのドラフトは維持)

## 3. プルリクエスト作成 (Create PR / Save)

ユーザーが「Save」ボタンを押して変更を保存する際のフローです。

1. **Trigger**: `ContentEditor` の Save ボタン -> `App.tsx: handleSaveContent`
2. **Reconstruct Content**:
   - `frontMatter` と `body` を結合し、ファイル形式に合わせて文字列化 (YAML dump
     等)
3. **API Call**:
   - `POST /api/content`
   - Payload: `owner`, `repo`, `path`, `branch`, `content`, `message`, `title`
4. **Response Handling**:
   - Server: GitHub API を使用してブランチ作成、コミット、PR 作成を行う
   - Client: レスポンスから `prUrl` を受け取る
5. **Post-Save Actions**:
   - `prUrl` を `usePullRequest` フック経由で `localStorage` (`pr_...`) に保存
   - `useDraft` フック経由でドラフト (`draft_...`) を削除
   - `initialBody`, `initialFrontMatter` を現在の内容で更新 (Unsaved changes
     状態の解除)
   - `isPrOpen` (Draft UI) を閉じる

## 4. プルリクエストのクローズ検知 (Detect PR Close & Remote Changes)

外部で PR
がマージ/クローズされたり、リモートで変更があった場合の同期フローです。

### A. Polling (Status Check via usePullRequest & App.tsx)

- **Trigger**: `App.tsx` の `useEffect` (prUrl 依存)
- **Action**: `checkPrStatus` (from `usePullRequest`) -> `GET /api/pr-status`
- **Result**:
  - `open`: `isPrLocked` を true に設定 (編集ロック)
  - `merged` / `closed`:
    - `usePullRequest` が `prUrl`, `prStatus` をクリア
    - `App.tsx` が `closed` ステータスを受け取り、`clearDraft()` と
      `resetContent()` (内部で `loadContent` を呼び出し) を実行して最新化

### B. Server-Sent Events (Real-time)

- **Trigger**: `EventSource("/api/events")` からのメッセージ
- **Event: `push`**:
  - 現在のファイルが変更されたかチェック
  - ローカルに未保存の変更があるかチェック (`isDirty`)
    - Dirty: リセットをスキップ (ユーザーの作業を優先)
    - Clean: `checkPrStatus` または `resetContent` を実行して最新化
- **Event: `pull_request`**:
  - `action: closed` かつ現在の PR URL と一致する場合
  - `checkPrStatus` を実行し、`closed` であれば `resetContent()` で最新化

## 5. コンテンツ設定管理 (Content Configuration)

コンテンツ設定（監視対象ファイルのリスト）の管理フローです。ロジックは
`useContentConfig` フックに集約されています。

1. **Initialization**:
   - `App.tsx` マウント時に `useContentConfig` 内の `useEffect` が発火
   - `GET /api/config`: 現在の設定（コンテンツリスト）を取得し、`contents` State
     にセット

2. **Add / Edit Config**:
   - **Trigger**: `ContentSettings` 画面での保存ボタン
   - **Validation**: `GET /api/content?validate=true`
     を呼び出し、指定されたパスがリポジトリに存在するか確認
     - ディレクトリの場合は `index.md` を付与して補完
   - **Save**: `POST /api/config`
     - Payload: 更新された全コンテンツリスト (`contents`)
     - Server: `staticms-config.json` (または `config.json`) を更新
   - **Update State**: レスポンスが成功なら `contents` State
     を更新し、リスト画面へ遷移

3. **Delete Config**:
   - **Trigger**: `ContentList` 画面での削除ボタン
   - **Action**: 確認ダイアログ後、対象を除外したリストで `POST /api/config`
     を実行
   - **Update State**: 成功なら `contents` State を更新
