# 設定編集画面仕様 (Config Editors Specification)

本ドキュメントでは、Staticms v2
における「リポジトリ設定」および「コンテンツ設定」の仕様を定義します。

設定情報は Staticms サーバーのデータベース (Deno KV)
に保存され、リポジトリ内のコードやコンテンツファイルには直接影響しません。

---

## 1. リポジトリ設定 (Repository Settings)

リポジトリ全体に適用される共通設定を管理する画面です。

- **URL**: `/:owner/:repo/settings`
- **アクセス元**: リポジトリ一覧 (`/`)
  の各カード・行にある設定ボタン、またはアプリ内ナビゲーション。

### UI 構成

#### 設定フォーム

- **Target Branch** (Required):
  - コンテンツの読み書きに使用するデフォルトのブランチ名。
  - デフォルト: リポジトリのデフォルトブランチ（例: `main`）。
  - 説明:
    このブランチ設定は、特別な指定がない限り配下の全てのコンテンツ設定に適用されます。

#### アクション (Fixed Footer)

画面下部に固定配置。

- **Cancel**: 変更を破棄してリポジトリ一覧に戻る。
- **Save**:
  設定を保存する。変更されたブランチが存在しない場合、作成確認フロー（ダイアログ）を実行する。

---

## 2. コンテンツ設定 (Content Config)

個別のコンテンツユニット（コレクションまたはシングルトン）の定義を追加・編集する画面です。

- **URL**: `/:owner/:repo/config/:collectionName`

### UI 構成

#### 1. ヘッダー情報 (Header)

- **Content Name (Label)**:
  - UI 上での表示名。
  - 値がある場合: アプリ内のナビゲーションやリストのヘッダに表示されます。
  - 値がない場合: **Path** の値が表示に使用されます。
- **Identifier** (Internal):
  - システム内部で使用する一意なID (`name`)。
  - **Note**: ユーザーによる直接編集は行いません。**Path**
    の値をベースに、英数字以外を `-`
    に置換して小文字化することで自動生成されます。

#### 2. コンテンツ定義

- **Type** (Required):
  - `Singleton (File/One-off)`: 単一のファイルを管理。
  - `Collection (Folder based)`: フォルダ内の複数ファイルを管理。
- **Binding** (Required):
  - `File`: ファイルそのものをコンテンツとする。
  - `Directory`: ディレクトリ（フォルダ）単位でコンテンツとし、その中の
    `index.md` を実体とする。
- **Path**:
  - コンテンツの格納場所（リポジトリルートからの相対パス）。
  - Binding が `File` の場合: "Content File Path"
  - Binding が `Directory` の場合: "Content Folder Path"

#### 組み合わせの挙動定義:

| Type       | Binding   | 対象                               | 例 (Path=`posts`)                      |
| :--------- | :-------- | :--------------------------------- | :------------------------------------- |
| Collection | File      | 指定フォルダ内のMarkdownファイル群 | `posts/a.md`, `posts/b.md`             |
| Collection | Directory | 指定フォルダ内のサブフォルダ群     | `posts/a/index.md`, `posts/b/index.md` |
| Singleton  | File      | 指定された単一ファイル             | `posts/about.md`                       |
| Singleton  | Directory | 指定フォルダ内の `index.md`        | `posts/about/index.md`                 |

#### 3. フィールドスキーマ (Field Schema)

コンテンツ（FrontMatter）のデータ構造を定義します。

- 新規追加時は空の状態から開始されます。
- **Field Editor**:
  - **Name**: キー名。
  - **Widget**: 入力タイプ (`string`, `text`, `boolean`, `image` 等)。
  - **Default**: 初期値（Collectionのみ有効）。
  - **Required**: 必須フラグ。

#### 4. アーキタイプテンプレート (Archetype Template)

- **対象**: Content Type が `Collection` の場合のみ表示。
- **機能**: 新規コンテンツ作成時に、本文 (Body) に初期挿入される Markdown
  テキストを設定できます。

#### 5. アクション (Fixed Footer)

画面下部に固定配置。

- **Cancel**: コンテンツ一覧に戻る。
- **Save / Add**: 設定を保存する。
- **Delete**: (編集時のみ) 右端に配置され、設定を削除する。

---

## データフローと保存プロセス

1. **Load**: `GET /api/repo/:owner/:repo/config`
   - Deno KV からリポジトリ全体の設定を取得。
2. **Validation**:
   - 必須項目のチェック。
   - `path` 等の形式チェック。
3. **Save**: `POST /api/repo/:owner/:repo/config`
   - **Repository Settings**: Config
     オブジェクトのルートプロパティ（`branch`）を更新。
   - **Content Config**: `collections`
     配列内の該当アイテムを追加・更新・削除して保存。
