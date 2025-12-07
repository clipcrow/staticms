# 記事エディタ画面 (ContentEditor) 仕様書

## 概要

記事エディタ画面は、StaticMS の中核機能であり、Markdown
コンテンツの作成・編集、FrontMatter（メタデータ）の管理、画像投稿、および GitHub
への保存（Pull Request 作成）を行う画面です。

## UI 構成

画面は以下の領域で構成されます。

1. **ヘッダー (Header)**
   - パンくずリスト: `Owner/Repo > Collection > Filename` などの階層表示。
   - アクションボタン群 (右側配置):
     - PR ステータス表示 (ロック状態など)
     - `Draft Restored` ラベル (ローカルドラフト復元時)
     - `Reset` ボタン (ローカル変更の破棄)
     - `Save` / `Create PR` ボタン (保存実行)

2. **メインエリア (左カラム: 12 wide)**
   - **FrontMatter エディタ**:
     - コレクション設定で定義されたフィールドごとの入力フォーム。
     - `FrontMatterItemEditor` (単一アイテム) または `FrontMatterListEditor`
       (リスト形式) を使用。
     - 入力フィールドは動的に生成され、テキスト、数値、日付などをサポート（v2
       では当面 String のみ）。
   - **Markdown エディタ**:
     - `MarkdownEditor` コンポーネントを使用。
     - 本文 (`body`) の編集。
     - プレビューモードへの切り替えタブ。
     - **画像ドラッグ＆ドロップ / ペースト対応**（後述）。

3. **サイドバー (右カラム: 4 wide)**
   - **PR / ドラフト状態表示**:
     - PR がオープンされている場合: PR 番号、タイトル、リンクを表示。
     - PR 未作成の場合: ドラフト保存時刻、PR 作成用の Description
       入力欄、`Create PR` ボタン。
   - **画像管理 (ContentImages)**:
     - `Images Nearby`: 記事と同じディレクトリにある画像ファイルの一覧を表示。
     - `Pending`: 保存前のアップロード待機中画像を表示（黄色いラベル付き）。
     - 画像クリックでプレビューモーダル表示。
     - `Add Image` ボタンまたは D&D で画像追加。
   - **更新履歴 (ContentHistory)**:
     - 直近の Git コミットログを表示 (最大10件)。
     - GitHub のコミット履歴ページへのリンク。

## データフローと状態管理

### 状態 (State)

- **remoteContent**: GitHub API から取得したリモートのコンテンツ（FrontMatter +
  Body）。
- **localDraft**: `localStorage` に保存されるユーザーの作業中データ。
  - Key: `draft_{username}|{owner}|{repo}|{branch}|{path}`
  - 変更があるたびに `localDraft` を更新。
- **pendingImages**: アップロード待機中の画像データ（Base64）。
- **prInfo**: 関連する Pull Request の情報 (URL, Number, Status)。

### ロード処理 (Initialization)

1. `localStorage` から `localDraft` の取得を試みる。
   - 存在する場合: ドラフトデータを採用し、`fromStorage` フラグを true にする。
2. `remoteContent` を API からフェッチ。
   - ドラフトがない場合: リモートデータをエディタにセット。
   - ドラフトがある場合:
     ドラフトを優先しつつ、リモートデータとの差異があればユーザーに通知（またはサイレントにドラフト優先）。
3. PR 状態の確認。
   - リモートデータのブランチに関連する PR
     があれば、エディタを「ロック状態（編集不可）」にする（競合防止のため）。
   - ただし、ドラフトがすでに存在する場合はドラフトの編集を許可する（場合による）。

### 保存処理 (Save / Create PR)

1. **バリデーション**: 必須フィールドの確認など。
2. **ペイロード作成**:
   - FrontMatter オブジェクトを YAML 文字列に変換。
   - `---\n{yaml}---\n{body}` の形式でファイルコンテンツを作成。
   - Base64 エンコード。
3. **API リクエスト**:
   - `PUT /api/repo/:owner/:repo/contents/:path`
   - `pendingImages` がある場合、それらも同時に（あるいは順次）コミットする。
   - コミットメッセージには PR Description またはデフォルトメッセージを使用。
4. **保存後処理**:
   - 成功時: `localDraft` をクリア (`localStorage.removeItem`).
   - Toast で成功メッセージを表示。
   - 作成された PR 情報を State
     に反映し、画面をロック状態にする（必要であれば）。

### 画像処理 (Image Handling)

- **追加**: D&D またはファイル選択 -> `FileReader` で Base64 化 ->
  `pendingImages` State に追加 -> `localStorage` にも保存。
- **参照**: Markdown 内での参照は相対パス (`./image.png` or `image.png`)
  を使用。
- **プレビュー**:
  - エディタプレビュー: `markdown-it`
    等のレンダラで、相対パスを解決して表示する必要がある。
  - `pendingImages` にある画像は DataURI (`data:image/...`) として表示。
  - リモートにある画像は API 経由 (`/api/content?media=true`) で取得して表示。

## コンポーネント詳細仕様

### `MarkdownEditor`

- ライブラリ: `react-md-editor` (v3.6.0)
- **Props**:
  - `body`: string
  - `setBody`: (val: string) => void
  - `onImageUpload`: (file: File) => Promise<string>
- **機能**:
  - Paste イベント: クリップボードの画像を検知し、`onImageUpload`
    を呼ぶ。戻り値（ファイル名）を使って Markdown に `![image](filename)`
    を挿入。
  - Drop イベント: ファイルドロップを検知し、同様に処理。
  - プレビュー時の画像パス解決: カスタムレンダラを使用し、`src`
    属性を書き換える（Pending 画像なら DataURI、そうでなければ API Proxy URL）。

### `ContentImages`

- **Props**:
  - `images`: リモート画像リスト
  - `pendingImages`: ローカル追加画像リスト
- **機能**:
  - 統合リスト表示。
  - Pending 画像にはバッジを表示。
  - プレビューモーダル機能。

---

**実装状況メモ (v2)**:

- [x] `ContentEditor` レイアウト (Grid, Header)
- [x] `FrontMatterItemEditor`
- [x] `MarkdownEditor` (Basic)
- [ ] `ContentImages` (サイドバー未実装)
- [ ] `ContentHistory` (サイドバー未実装)
- [ ] 画像アップロードロジック (`onImageUpload` 未接続)
- [ ] PR ロック制御の厳密な実装
- [ ] ドラフト破棄(`Reset`)の詳細挙動
