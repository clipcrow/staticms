# 設定編集画面 (Content Config / Settings) 仕様書

## 概要

本画面は、コンテンツ設定（Config）内の `collections`
定義を追加・編集するための画面です。 GUI
を通じて、コンテンツの種類（コレクション/シングルトン）、パス、および使用するフィールド定義（Schema）を管理します。
設定情報は Staticms サーバーのデータベース (Deno KV)
に保存され、リポジトリ内のファイルには影響しません。

## UI 構成

### 1. 基本設定フォーム (Basic Settings)

- **Content Name**: UI 上での表示名 (`label`)。必須。
- **Identifier**: システム内部で使用するスラッグ (`name`)。必須・一意。
- **Type**:
  - `Collection` (Folder based): 複数の記事を持つタイプ。
  - `Singleton` (File based): 単一のファイル（例: トップページ、Aboutページ）。
- **Binding Path**:
  - `Folder Path` (Collection時): `content/posts` など。
  - `File Path` (Singleton時): `content/about.md` など。

### 2. フィールド定義エディタ (Field Schema Editor)

コンテンツが持つべきメタデータ（FrontMatter）の構造を定義します。

- **Field List**:
  システムは、定義済みのフィールド一覧を表示します。ドラッグ＆ドロップでの並び替えに対応。
- **Field Editor (Modal / Inline)**:
  - **Label**: 表示名。
  - **Name**: FrontMatter のキー名。
  - **Widget**: 入力タイプを選択。
    - v2.5 サポート: `string` (短文), `text` (長文), `boolean` (スイッチ),
      `image` (画像選択)。
    - Future: `date`, `list`, `object`。
  - **Required**: 必須項目かどうか。
  - **Default**: 初期値。

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
3. **Transformation**:
   - UI 上のステートから保存用の JSON オブジェクトへ変換。
4. **Save**:
   - `POST /api/repo/:owner/:repo/config`
   - サーバー側で Deno KV を更新。
