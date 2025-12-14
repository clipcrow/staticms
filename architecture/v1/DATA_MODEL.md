# Data Model Specification

Staticms で扱われる主要なデータモデルと、その永続化方法についての仕様です。

## 1. サーバーサイド永続化 (Deno KV)

Deno KV はシンプルかつ堅牢なキーバリューストアとして利用されます。

### 1.1 セッション管理

ログインユーザーのアクセストークンを管理します。

- **Key**: `["sessions", <sessionId: uuid>]`
- **Value**: `string` (GitHub Access Token)
- **TTL**: 1週間 (自動失効)

### 1.2 アプリケーション設定

全ユーザーで共有されるアプリケーション設定です。

- **Key**: `["config"]`
- **Value**: `JsonObject` (`Config` Interface 参照)
- **更新**: `/api/config` への POST によって上書き更新されます。

---

## 2. クライアントサイド永続化 (LocalStorage)

ブラウザの LocalStorage
を利用して、ユーザーごとの設定や編集中のドラフトを保存します。

### 2.1 ログインユーザー

現在ブラウザを利用しているユーザーを識別するために使用します。これにより、同じブラウザで別ユーザーがログインした際などにドラフトの混同を防ぎます。

- **Key**: `staticms_user`
- **Value**: `string` (GitHub Username)
- **ライフサイクル**: ログイン時に保存、ログアウト時に削除。

### 2.2 編集ドラフト (Drafts)

サーバーへ送信する前のローカル変更内容です。これが Staticms の UX
の核となります。

- **Key Pattern**: `draft_<username>|<owner>|<repo>|<branch>|<filePath>`
- **Value**: JSON String (`Draft` Interface 参照)
- **特徴**:
  - キーに `username` を含むことで、マルチユーザー対応。
  - ファイルパスだけでなくブランチもキーに含むことで、ブランチごとの編集を分離。

---

## 3. データ型定義 (TypeScript Interfaces)

システムの主要なデータ構造の定義です。

### 3.1 Config & Content

Staticmsの設定データの構造です。

```typescript
export interface Config {
  contents: Content[];
}

export interface Content {
  // コンテンツの所在
  owner: string;
  repo: string;
  branch?: string; // 指定がなければ default branch
  filePath: string; // ファイルパスまたはディレクトリパス

  // UI表示用
  name?: string; // 表示名

  // コンテンツ種別（エディタの挙動を決定）
  type?:
    | "singleton-file" // 単一ファイル（例: Aboutページ）
    | "singleton-dir" // (Deprecated/Unused?)
    | "collection-files" // ディレクトリ内のファイル群（例: ブログ記事）
    | "collection-dirs"; // ディレクトリ群

  // 入力フィールド定義（FrontMatter用など）
  fields: Field[];

  // コレクション作成時のテンプレートなど
  collectionName?: string;
  archetype?: string;
}

export interface Field {
  name: string;
  value: string; // 識別子？もしくはデフォルト値的に使われる？要確認
  defaultValue?: string;
}
```

### 3.2 Draft (Local State)

`draft_...` キーの値として保存されるオブジェクトです。

```typescript
export interface Draft {
  // コンテンツ本体
  body?: string; // Markdown本文
  frontMatter?: Record<string, unknown> | Record<string, unknown>[]; // YAML FrontMatter Object

  // PR関連メタデータ
  prDescription?: string; // ユーザーが入力したPRの説明文
  prUrl?: string | null; // 作成済みPRのURL。これがある＝PR提出済み状態

  // 画像アップロード用バッファ
  pendingImages?: FileItem[]; // 保存時に一緒にコミットされる画像リスト

  // メタデータ
  timestamp?: number; // 最終更新日時
  type?: string; // "created" なら新規作成中のドラフト
}
```

### 3.3 FileItem

ファイルシステム上のアイテム、またはアップロード待ち画像を表現します。

```typescript
export interface FileItem {
  name: string;
  path: string;
  type: "file" | "dir";
  sha: string; // GitHub Blob SHA
  content?: string; // base64 encoded content (optional)
}
```
