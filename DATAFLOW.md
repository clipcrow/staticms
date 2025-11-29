# ContentEditor Data Flow

ContentEditor画面におけるファイル操作のデータフローとイベント処理について記述します。

## 1. 画面表示 (Initialization)

ユーザーがコンテンツリストからファイルを選択した際のフローです。

1. **Trigger**: `ContentList` でアイテムクリック ->
   `App.tsx: handleSelectContent`
2. **Fetch Content**: `loadContentData` が実行される
   - `GET /api/content`: ファイルの生データ、SHA、ブランチ情報を取得
   - `GET /api/commits`: ファイルのコミット履歴を取得
3. **Parse & State Setup**:
   - ファイル拡張子 (.md, .yaml) に応じて Front Matter と Body をパース
   * `localStorage` からドラフト (`draft_...` ※実際は `|` 区切り) を確認
     - ドラフトが存在する場合: ドラフトの内容で State (`body`, `frontMatter`)
       を上書き (ユーザーに復元されたことを示す)
     - ドラフトがない場合: リモートの内容を State にセット
   * `localStorage` から既存の PR URL (`pr_...` ※実際は `|` 区切り)
     を確認し、`prUrl` State にセット
4. **View Transition**: `view` state を `content-editor`
   に変更し、`ContentEditor` コンポーネントを表示

## 2. 編集 (Editing)

ユーザーがエディタで変更を加える際のフローです。

1. **User Action**: テキストエリアの変更、Front Matter フィールドの変更
2. **State Update**: `App.tsx` の `body`, `frontMatter` State が更新される
3. **Auto Save Draft**:
   - `App.tsx` の `useEffect` が変更を検知
   - 初期ロード時の内容 (`initialBody`, `initialFrontMatter`) と比較
   * 変更がある場合 (`isDirty`):
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
   - `prUrl` を `localStorage` (`pr_...`) に保存
   - `localStorage` のドラフト (`draft_...`) を削除
   - `initialBody`, `initialFrontMatter` を現在の内容で更新 (Unsaved changes
     状態の解除)
   - `isPrOpen` (Draft UI) を閉じる

## 4. プルリクエストのクローズ検知 (Detect PR Close & Remote Changes)

外部で PR
がマージ/クローズされたり、リモートで変更があった場合の同期フローです。

### A. Polling (Status Check)

- **Trigger**: `App.tsx` の `useEffect` (prUrl 依存)
- **Action**: `checkPrStatus` -> `GET /api/pr-status`
- **Result**:
  - `open`: `isPrLocked` を true に設定 (編集ロック)
  - `merged` / `closed`:
    - `prUrl`, `prStatus` をクリア
    - `localStorage` の関連データ (draft, pr) を削除
    - `resetContent()` を呼び出し、メインブランチの最新データを再取得

### B. Server-Sent Events (Real-time)

- **Trigger**: `EventSource("/api/events")` からのメッセージ
- **Event: `push`**:
  - 現在のファイルが変更されたかチェック
  - ローカルに未保存の変更があるかチェック (`isDirty`)
    - Dirty: リセットをスキップ (ユーザーの作業を優先)
    - Clean: `checkPrStatus` または `resetContent` を実行して最新化
- **Event: `pull_request`**:
  - `action: closed` かつ現在の PR URL と一致する場合
  - `isPrLocked` 解除
  - `localStorage` クリア
  - `resetContent()` で最新化
