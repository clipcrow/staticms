# 設定編集画面 (Content Config / Settings) 仕様書

## 概要

`staticms.yml` (Config) 内の `collections` 定義を追加・編集するための画面です。
GUI を通じて、コンテンツの種類（コレクション/シングルトン）、パス、および
FrontMatter のフィールド定義を行います。

## UI 構成

- **ヘッダー**:
  - パンくずリスト: `Owner/Repo > Add Content` または `Edit Content`。
- **フォーム (`ContentSettings`)**:
  1. **基本設定**:
     - **Content Name**: 表示名 (Label)。
     - **Content Type**: `Singleton` / `Collection` ラジオボタン。
     - **Content Binding**: `File` / `Directory` ラジオボタン。
       - 組み合わせにより4パターン (`singleton-file`, `singleton-dir`,
         `collection-files`, `collection-dirs`) を内部で判定。
  2. **パス設定**:
     - **Path**: ファイルパスまたはディレクトリパス。プレースホルダーで例示
       (`e.g. content/blog`).
     - **Branch**: 対象ブランチ（任意）。
  3. **フィールド定義 (Front Matter Template)**:
     - `FrontMatterItemPanel` (v1) を再利用して、FrontMatter のスキーマを定義。
     - フィールドの追加、削除、名前変更、デフォルト値設定が可能。
     - v2 では現在 `string` 型のみ簡易サポートだが、v1 UI
       はリッチなフィールド定義を持つ。
  4. **Archetype (Collectionのみ)**:
     - 新規記事作成時の Markdown 本文テンプレート。
     - 簡易 `MarkdownEditor` で編集。
  5. **アクション**:
     - `Cancel`: 戻る。
     - `Add` / `Update`: 保存。
     - `Delete` (編集時のみ): 設定の削除。

## データフロー

- **Load**:
  - 編集モード: 既存の `Collection` 定義を読み込み、v1 の `Content`
    オブジェクト形式に変換してフォーム初期値とする。
  - 追加モード: 空のフォーム（またはデフォルト値）で開始。
- **Save**:
  - フォームの内容をバリデーション。
  - v1 `Content` オブジェクトから v2 `Collection` 定義へ変換。
  - `POST /api/repo/:owner/:repo/config` へ送信し、`staticms.yml` を更新して
    Commit/PR を作成。

## コンポーネント詳細

### `FrontMatterItemPanel` (Schema Mode)

- 通常は記事エディタで「値」を入力するために使われるが、設定画面では「スキーマ（フィールド名や初期値）」を定義するために使用される。
- `editableKeys`: true
  に設定することで、キー（フィールド名）自体の編集を許可する。

---

**実装状況メモ (v2)**:

- [x] `ContentSettings` コンポーネント (共通)
- [x] `ContentConfigEditor` (v2 Container / Adapter)
- [x] Config API (`POST /api/repo/.../config`) 実装済み
- [ ] FrontMatter フィールド定義の完全な型サポート（現在は String
      のみ扱っているため、Select や Date などの Widget
      定義が保存されない可能性がある）
