# Data Model Specification (v2)

Staticms v2 で扱われる主要なデータモデルと、その永続化方法についての仕様です。

## 1. サーバーサイド永続化 (Deno KV)

Deno KV はアプリケーション設定やセッションの永続化に使用されます。

### 1.1 セッション管理

- **Key**: `["sessions", <sessionId: uuid>]`
- **Value**: `string` (GitHub Access Token)
- **TTL**: 1週間 (自動失効)

### 1.2 リポジトリごとの設定 (Content Configuration)

各リポジトリにおけるコンテンツ定義（コレクション構造、フィールド定義など）は、**Deno
KV**
に保存されます。これにより、リポジリを汚染することなく設定を即座に反映・変更できます。

- **Key**: `["config", <owner>, <repo>]`
- **Value**: `object` (Config Object)
- **初期化**:
  - 初回アクセス時、KVに設定が存在しない場合は、デフォルトのテンプレート設定を使用します。

---

## 2. クライアントサイド永続化 (LocalStorage)

ブラウザの LocalStorage
を利用して、ユーザーごとの設定や編集中のドラフトを保存します。これにより、サーバーへの未送信データを保護し、オフライン作業やセッション復元を可能にします。

### 2.1 ログインユーザー

現在ブラウザを利用しているユーザーを識別するために使用します。

- **Key**: `staticms_user`
- **Value**: `string` (GitHub Username)

### 2.2 編集ドラフト (Drafts)

編集中の記事や設定の変更内容を保存します。オートセーブ機能により、文字入力や画像ドロップのたびに更新されます。

- **Key Pattern**:
  `draft_<username>|<owner>|<repo>|<branch>|<collectionName>/<filePath>`

  - `username`: `staticms_user` の値（未ログイン時は 'anonymous'）
  - `owner`, `repo`: 対象リポジトリ
  - `branch`: 編集対象ブランチ（デフォルト 'main'）
  - `collectionName`: コンテンツコレクション名（例 'posts'）
  - `filePath`: 記事のファイルパス。新規作成時は `__new__` を使用。

  例: `draft_octocat|my-org|my-blog|main|posts/__new__`

- **Value**: JSON String (`Draft` Interface)

---

## 3. データ型定義 (TypeScript Interfaces)

### 3.1 Config (Repository Configuration)

リポジリごとのコンテンツ定義（コレクション設定など）を管理します。 v2
では、**Deno KV 上に直接保存**されます。

```typescript
interface Config {
  collections: Collection[];
}

export interface Collection {
  type: "collection" | "singleton"; // Default: collection
  name: string; // ID (URL slug)
  label: string; // Display Name
  folder?: string; // For collections
  file?: string; // For singletons
  fields: Field[];
}

export interface Field {
  label: string;
  name: string;
  widget:
    | "string"
    | "text"
    | "markdown"
    | "image"
    | "boolean"
    | "list"
    | "object";
  // ... other widget specific props
}
```

### 3.2 Draft (Local State)

LocalStorage に保存されるドラフトデータの構造です。`src/app/hooks/useDraft.ts`
で定義されています。

```typescript
export interface Draft {
  // コンテンツ本体
  frontMatter: Record<string, unknown>; // YAML FrontMatter
  body: string; // Markdown Body

  // 画像アップロード用（未コミット画像）
  pendingImages?: FileItem[];

  // PR関連メタデータ (Planned for US-06)
  prTitle?: string;
  prBody?: string;

  // 更新日時
  updatedAt?: number;
}
```

### 3.3 FileItem

ファイルシステム上のアイテム、またはアップロード待ち画像を表現します。

```typescript
export interface FileItem {
  name: string;
  type: "file" | "dir";
  content?: string; // Base64 Data URL (for pending images)
  sha?: string; // GitHub Blob SHA (for existing files)
  path?: string; // Logical path (e.g., "images/foo.png")
}
```
