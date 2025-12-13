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

画面上部に固定され、ナビゲーションとステータス表示を提供します。

- **Left**: パンくずリスト (`Owner/Repo (Branch Label) > Collection > Filename`)
  - コレクション部分は `ArticleList` へのリンクとなります。
- **Right**: ステータス表示エリア
  - **Status Indicator**: PR Open / Merged / Locked 等の状態表示。
  - **Draft Restored Label**: ローカルドラフト復元時に表示（オレンジ色）。

### 2. メインエリア (Main Column)

#### FrontMatter エディタ (FrontMatterItemEditor)

- 画面最上部に配置。
- コンテンツ設定 (Config)
  で定義されたフィールドに基づき、フォームを動的に生成します。
- **Design**: カード形式、またはアコーディオン形式でメタデータを整理して表示。
  - **Widgets**:
  - `string`: テキスト入力 (Default)
  - `text`: 複数行テキストエリア
  - `boolean`: トグルスイッチ
  - `select`: ドロップダウン選択
  - `date`: 日付選択 (YYYY-MM-DD)
  - `datetime`: 日時選択
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

### 1. データ構造と永続化 (Data Persistence)

`localStorage`
を使用し、ドラフトおよび関連するPR情報を**単一のオブジェクト**として管理します。
これにより、データの整合性を保ちつつ、PRクローズ時の一括クリーンアップを容易にします。

- **Key**: `staticms_draft_${username}|${owner}|${repo}|${branch}|${filePath}`
- **Structure**:
  - **Key**: `staticms_draft_${username}|${owner}|${repo}|${branch}|${filePath}`
  - **Structure**:
    ```typescript
    // Basic types allowable in FrontMatter
    export type FrontMatterPrimitive =
      | string
      | number
      | boolean
      | null
      | Date
      | undefined;

    // Recursive definition for FrontMatter values
    export type FrontMatterValue =
      | FrontMatterPrimitive
      | FrontMatterValue[]
      | { [key: string]: FrontMatterValue };

    // Standard Map structure for FrontMatter
    export type FrontMatterObject = { [key: string]: FrontMatterValue };

    // Array root structure for YAML List
    export type FrontMatterList = FrontMatterObject[];

    export type FrontMatterContent = FrontMatterObject | FrontMatterList;

    interface ContentState {
      frontMatter: FrontMatterContent; // 具体的な型を使用
      body: string;
      pendingImages: PendingImage[];
      pr?: { // 統合されたPR情報
        number: number;
        url: string;
        state: "open" | "closed" | "merged";
      };
      isDirty?: boolean; // ローカル変更があるかどうか
      updatedAt: number;
    }
    ```

### 2. 初期化プロセス (Initialization)

1. **State Loading**: `localStorage`
   から上記オブジェクトを取得。ドラフト内容とPR情報の両方を復元します。
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

### 3. コンテンツ処理ルール (Content Processing Rules)

フロントマターと本文の区切りや、空行の扱いに関する正規化ルールを定義します。

1. **読み込み時 (Normalization on Load)**:
   - フロントマターブロック (`---` ... `---`)
     終了後の改行について、**直後の改行（セパレータ分）1つだけ**をシステム区切り文字として削除します。
   - 3つ以上の改行がある場合、それ以降は**ユーザーが意図した本文先頭の空白**として保持します。
   - これにより、一般的なフォーマットのファイルは先頭空白なしで読み込まれ、意図的な空白は維持されます。

2. **保存時 (Normalization on Save)**:
   - フロントマターと本文を結合する際、システム側で**常に1つの空行**
     (`\n---\n\n`) を挿入します。
   - ユーザーが手動で空行管理をする必要をなくし、ファイルフォーマットを統一します。

3. **Empty PR 防止 (Prevent Empty PR)**:
   - 保存プロセス開始時に、正規化後のコンテンツが前回保存時（または最新のリモートコンテンツ）と完全に一致する場合は、保存処理を中断し、ユーザーに通知します。

### 4. 編集プロセス (Editing)

1. **Dirty Check (Local Comparison)**:
   - 編集操作（キー入力等）のたびに、現在のエディタ内容（Draft）と、**初期ロード時（または同期時）に取得済み**のオリジナル内容（Cached
     Original）をメモリ上で比較する。
   - **Github API 通信は発生しない**ため、高頻度かつリアルタイムに実行する。
   - **状態判定**:
     - **一致する場合 (Clean)**:
       - PR情報が**ない**場合: `localStorage` からオブジェクトを削除する。
       - PR情報が**ある**場合: `body`/`frontMatter`
         はリモート一致状態としつつ、`pr`
         情報を保持するためにオブジェクトを保存・維持する。
     - **不一致の場合 (Dirty)**: `localStorage` に保存し、Dirty 状態とする。

### 4. フッター (Fixed Footer)

画面下部に固定表示されるアクションエリア。メインコンテンツのスクロールに関わらず常にアクセス可能。

- **Left Actions**:
  - **Reset Button**: ローカル変更の破棄 (Revert to Server)。
  - **Save / Create PR Button**: 保存およびPR作成/更新 (Primary)。
- **Right Actions**:
  - **Delete Button**: 記事削除（条件付き表示: 既存記事かつSingleton以外）。

### 5. 保存プロセス (Save / Create PR)

1. **Validation**: 必須 FrontMatter フィールドのチェック。
2. **Image Processing**:
   - `pendingImages` にある画像を Base64 エンコード。
3. **Commit Construction**:
   - 記事 (`.md`) と画像ファイル群をひとつの Commit (Tree) として構成。
4. **API Request**:
   - `PUT /api/repo/:owner/:repo/contents` (または Batch API) をコール。
5. **Update State**:
   - 成功時、`localStorage` のオブジェクトを更新：
     - `body`/`frontMatter` は最新（Clean）とする。
     - `pr` フィールドに新規作成/更新されたPR情報を格納する。

### 6. 外部イベント連携 (External Updates)

**Webhook / SSE** により PR の `closed` または `merged` を検知した場合：

1. **Clean Check**: 現在のエディタ内容がリモート最新と一致するか確認。
2. **State Update**:
   - `localStorage` 内のオブジェクトから `pr` フィールドを削除（`undefined`
     化）する。
   - もしコンテンツも Clean
     であれば、オブジェクトごと削除する（完全なクリーンアップ）。
   - コンテンツが Dirty
     であれば、ドラフト（未保存の変更）として保持する（PRとの紐付けのみ解除）。

### 7. 画像アップロード (Image Upload)

- 画像は即座にサーバーに送るのではなく、一旦 `pendingImages` State と
  `localStorage` に保存します（ドラフトの一部）。
- Markdown プレビュー時には、`pendingImages` 内の画像は Data URI
  (`data:image/...`) として展開し、即時プレビューを実現します。

## UI Polish Guidelines

- **Spacing**: セクション間には十分なマージン (`2rem`) を設ける。
- **Colors**:
  - アクションボタン: Semantic UI Primary Blue
- **Spacing**: セクション間には十分なマージン (`2rem`) を設ける。
- **Colors**:
  - アクションボタン: Semantic UI Primary Blue
  - 警告/ドラフト: Orange / Yellow
  - 削除/危険: Red
- **Feedback**:
  - 成功・失敗は必ず Toast 通知でフィードバックする。

## YAML Editor モード仕様

Staticms は Markdown ファイル (`.md`)
だけでなく、設定ファイルやデータファイルとして使用される YAML ファイル (`.yml`,
`.yaml`)
の編集もサポートします。ファイルのルート構造（オブジェクトか配列か）によって、2つのサブモードに自動的に切り替わります。

### 1. YAML Object Editor (Standard)

- **適用条件**:
  - ファイル拡張子が `.yml` または `.yaml`。
  - ルートが単一のオブジェクト (`Object`)、つまり配列ではない場合。
- **UI 構成**:
  - **FrontMatter Editor (Only)**: `config.fields`
    に基づくフォームのみを全画面（Main Column）に表示します。
  - **Body Editor (Hidden)**: Markdown 本文エディタは非表示となります。
- **保存形式**:
  - `---` セパレータを含まない、純粋な YAML ファイルとして保存します
    (`yaml.dump(data)`)。

### 2. YAML List Editor (Root Array)

通常の記事編集（Markdown + FrontMatter）や上記 Object Editor
とは異なり、データファイルのルート要素が「配列（Array）」である場合のエディタ仕様です。

#### 概要

- **適用条件**:
  - ファイル拡張子が `.yml` または `.yaml` (または `.json`) である。
  - ファイルをパースした結果、ルートオブジェクトが配列 (`Array<any>`) である。
- **目的**:
  ニュースフィード、バナー設定、リンクリストなど、順序を持つ構造化データの管理。

#### UI 構成 (Stack Layout)

通常の「FrontMatter +
Body」構成ではなく、「リストアイテムの積み上げ（Stack）」によるUIを提供します。

##### メインエリア表示

1. **Top Action Area**:
   - **Add Item (Top)** ボタン: 配列の先頭に新規要素を追加します。

2. **List Items Area (Sortable List)**:
   - 配列の各要素を「カード」または「アコーディオン」形式で縦にレンダリングします。
   - **Drag Handle**:
     各アイテムの左側に配置。ドラッグ＆ドロップで順序を入れ替えます。
   - **Card/Accordion Header**:
     - アイテムの「サマリー」を表示（`config.summary`
       フィールドなどが指定されている場合、または最初の文字列フィールド）。
   - **Item Editor**:
     - `config.fields`
       で定義されたウィジェットを使用して、要素内のフィールドを編集します。
     - 初期状態は「開いた」状態、または設定により「閉じた」状態で表示し、クリックで展開します。
   - **Remove Button**:
     - アイテム削除ボタン。誤操作防止のため、確認ダイアログまたはUndoトーストを推奨します。

3. **Bottom Action Area**:
   - **Add Item (Bottom)** ボタン: 配列の末尾に新規要素を追加します。

#### 操作ロジック

- **追加 (Add)**:
  - 新規アイテムは、`config.fields`
    で定義されたフィールド構成に基づき、デフォルト値で初期化されます。
  - 追加直後は、該当アイテムにフォーカス、またはスクロール位置を調整します。
- **並び替え (Reorder)**:
  - ドラッグ＆ドロップ操作完了時（Drop時）に、内部Stateの配列順序を即座に更新します。
  - `isDirty` フラグを True に設定します。
- **削除 (Remove)**:
  - 指定されたインデックスの要素を配列から削除し、Stateを更新します。

#### 保存プロセス (Save)

- **Serialize**:
  - フロントマター形式ではなく、**純粋な配列のYAML** としてダンプします。
  - `yaml.dump(arrayData)`
- **Validation**:
  - 配列内の各要素に対してバリデーションを実行します。エラーがある場合、該当アイテムを開いてエラーを表示します。

#### Config との整合性

- `config.collections` において、`type: "singleton"` かつ `path`
  がYAMLファイルを指している場合でも、その内容が配列であれば自動的に本モードが適用されます。
- `fields` 定義は、**配列内の1要素あたりのスキーマ** として解釈されます。
