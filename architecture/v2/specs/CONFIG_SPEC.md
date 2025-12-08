# 設定編集画面 (Content Config / Settings) 仕様書

## 概要

本画面は、コンテンツ設定（Config）内の `collections`
定義を追加・編集するための画面です。 GUI
を通じて、コンテンツの種類（コレクション/シングルトン）、パス、および使用するフィールド定義（Schema）を管理します。
設定情報は Staticms サーバーのデータベース (Deno KV)
に保存され、リポジトリ内のファイルには影響しません。

## UI 構成

### 1. 基本設定フォーム (Basic Settings)

- **Content Name**: UI 上での表示名 (`label`)。オプション。
  - 値がある場合: カード/リスト行とヘッダのパンくずリストに表示されます。
  - 値がない場合: **Path** の値が表示に使用されます。
- **Identifier**: システム内部で使用するスラッグ (`name`)。必須・一意。
- **Content Binding**:
  - **Type**: `Collection` または `Singleton`。
  - **Binding**: `File` または `Directory`。
  - **Path**:
    - 設定値の入力フィールドラベルは、**Binding**
      の選択に応じて動的に変化します。
    - Binding = `File` の場合: **"Content File Path"**
    - Binding = `Directory` の場合: **"Content Folder Path"**

  ### 組み合わせの挙動定義:

  1. **Collection + File**:
     - パスで指定されたフォルダ内の「複数の Markdown ファイル」を管理します。
     - 例: Path=`posts` -> `posts/a.md`, `posts/b.md`
  2. **Collection + Directory**:
     - パスで指定されたフォルダ内の「複数のサブフォルダ」を管理し、各フォルダ内の
       `index.md` を対象とします。
     - 例: Path=`posts` -> `posts/bucket-a/index.md`, `posts/bucket-b/index.md`
  3. **Singleton + File**:
     - パスで指定された「単一のファイル」を編集します。
     - **Note**: この組み合わせのみ、YAML
       ファイル等のデータファイルも取り扱い可能です。
     - 例: Path=`config.yml` -> `config.yml` (Data), Path=`about.md` ->
       `about.md` (Markdown)
  4. **Singleton + Directory**:
     - パスで指定されたフォルダ内の `index.md` を編集対象とします。
     - 例: Path=`about` -> `about/index.md`

### 2. フィールド定義エディタ (Field Schema Editor)

コンテンツが持つべきメタデータ（FrontMatter）の構造を定義します。 **Note**:
Markdown の本文 (Body) は自動的に扱われるため、ここで定義する必要はありません。

- **Field List**:
  システムは、定義済みのフィールド一覧を表示します。ドラッグ＆ドロップでの並び替えに対応。
- **Field Editor (Modal / Inline)**:
  - **Name**: FrontMatter のキー名（項目名）。
  - **Widget**: 値の型（入力タイプ）。
    - v2.5 サポート: `string` (短文), `text` (長文), `boolean` (スイッチ),
      `image` (画像選択)。
  - **Default**: 初期値（オプション）。
    - **Note**: コンテンツタイプが `Collection`
      の場合のみ設定可能です。新規記事作成時のデフォルト値として利用されます。
  - **Required**: 必須項目かどうか。

### 3. テンプレート設定 (Archetype) - Collection Only

- **Archetype Body**: 新規作成時に初期挿入される Markdown 本文のテンプレート。

### 4. アクション

- **Save**: 設定を保存する (Primary)。
  - 即座にサーバー (Deno KV) に反映されます。Pull Request は作成されません。
- **Delete**: このコレクション定義を削除する。

## データフロー

1. **Load**:
   - `GET /api/repo/:owner/:repo/config`
   - Deno KV からリポジトリの設定を読み込み、フォーム初期値に反映。
2. **Validation**:
   - `name` の重複チェック。
   - パス形式の整合性チェック。
3. **Sanitization**:
   - 以下のフィールドは保存時に前後の空白がトリムされます。
     - Content Name
     - Path
     - Branch (将来的な拡張)
     - Field Names (FrontMatter Keys)
4. **Transformation**:
   - UI 上のステートから保存用の JSON オブジェクトへ変換。
5. **Save**:
   - `POST /api/repo/:owner/:repo/config`
   - サーバー側で Deno KV を更新。
