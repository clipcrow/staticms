# UI Design & Screen Flow

Staticms V2 の画面構成と遷移設計について定義します。 デザインシステムは
**Semantic UI** をベースとし、シンプルかつモダンな管理画面を目指します。

## 1. Global Layout

アプリケーション全体で共通して使用されるレイアウト構造です。

- **Header**:
  - **Logo**: Staticms ロゴ（リンクなし）。
  - **Breadcrumb**:
    - `<GitHub Icon> (Root)` / `:owner :repo` / `:collectionName` /
      `:articleName`
    - 各階層はリンクとなっており、上位階層へ戻ることができる。
  - **User Menu**: Avatar アイコン (現在のユーザーを表示)。
- **Main Content**:
  - 中央に配置されるコンテンツエリア。`ui container` を基本とする。
- **Footer**:
  - なし（コンテンツ表示領域を最大化）。

## 2. Common Behavior

- **Authentication**:
  - すべての画面 (`/` を含む) は認証必須です。
  - 未認証ユーザーがアクセスした場合、直ちに GitHub OAuth
    フローへリダイレクトされます。
- **Deep Linking**:
  - 特定のパスへ直接アクセスした場合も、認証後に元のパスへ正しくリダイレクトバックされます。

## 3. Screen Flow (Sitemap)

```mermaid
graph TD
    RepoSelect[Repository Selection] -->|Select Repo| Dashboard[Content Dashboard]
    
    Dashboard -->|Select Collection| ArticleList[Article List]
    Dashboard -->|Query: ?action=add| ConfigEditorNew[Content Config (New)]
    Dashboard -->|Query: ?action=edit| ConfigEditor[Content Config (Edit)]
    
    Dashboard -->|Select Singleton| Editor[Content Editor]
    
    ArticleList -->|Select Article| Editor
    ArticleList -->|Create New Article| Editor
```

## 4. Screen Definitions

### 4.1 Repository Selection (Root)

- **Path**: `/`
- **UI**:
  - **Header**: `[GitHub Icon]` (表示のみ・リンクなし)
  - アクセス可能なリポジトリの一覧カード。
  - "Install App" への外部リンク。

### 4.2 Content Dashboard (Content Browser)

- **Path**: `/:owner/:repo`
- **UI**:
  - **Header**: `[GitHub Icon] / :owner :repo`
  - **Content Cards**:
    - コンテンツ定義（Collection / Singleton）のカード一覧。
    - **Actions**:
      - "Browse" (Collection) -> Article List へ
      - "Edit" (Singleton) -> Content Editor へ
      - "Edit Config" -> 同じパスでクエリ付加
        `?action=edit&target=:collectionName`
  - **Global Actions**:
    - "Add New Content" ボタン -> 同じパスでクエリ付加 `?action=add`

### 4.3 Article List

- **Path**: `/:owner/:repo/:collectionName`
- **UI**:
  - **Header**: `[GitHub Icon] / :owner :repo / :collectionName`
  - **Actions**:
    - "New Article" ボタン。
    - 検索バー。
  - **Content**: 記事一覧（ファイルリスト）。

### 4.4 Content Editor

- **Path**:
  - Article: `/:owner/:repo/:collectionName/:articleName`
  - Singleton: `/:owner/:repo/:singletonName`
- **UI**:
  - **Header**:
    - Article: `[GitHub Icon] / :owner :repo / :collectionName / :articleName`
    - Singleton: `[GitHub Icon] / :owner :repo / :singletonName`
  - **Layout**:
    - **Top Area (Front Matter)**:
      - メタデータ編集フォーム (Fields defined in Config)。
      - YAML/Json
        データファイルの場合はここだけが表示される（配列型の場合はリストUIとなり、追加・削除が可能）。
    - **Bottom Area (Editor & Preview)**:
      - `react-md-editor` を採用。
      - Markdown 編集とプレビューの切り替え・同時表示機能を提供。
      - YAML データファイルの場合は非表示。
  - **Toolbar (Sticky/Fixed)**: Save (Create PR), Reset.

### 4.5 Content Config Editor (Overlay/View)

- **Path**: `/:owner/:repo` (Dashboard state)
- **Query**:
  - New: `?action=add`
  - Edit: `?action=edit&target=:collectionName`
- **UI**:
  - **Header**:
    - Edit: `[GitHub Icon] / :owner :repo / Settings / :collectionName`
    - New: `[GitHub Icon] / :owner :repo / Add Content`
  - **Form**: Type, Name, Path, Fields Definition.
  - **Actions**: Save, Delete (Edit only).

## 5. 技術的な制約とベストプラクティス

### Markdown Editor (react-md-editor) の統合

- **`MarkdownEditor` を Semantic UI の `.ui.form .field` でラップしないこと**:
  - `react-md-editor` は内部で複雑な Flexbox レイアウトを使用しています。これを
    `.field`
    でラップすると、レイアウトの衝突（特に高さ計算やテキストエリアのリサイズの問題）が発生します。
  - ラベル付けには独立したコンテナ `div` や `Header`
    コンポーネントを使用し、エディタコンポーネントをブロック/Input挙動を強制するスタイルコンテキストの外に配置してください。

### Layout Pattern: Toolbar (Toolbox)

リスト画面などでのフィルターやアクションボタンを配置するツールボックス（Toolbar）行の実装パターンです。

- **Placement**: ヘッダーコンポーネントの直下 (`marginTop: 1rem`) に配置します。
- **Padding**:
  リストコンテンツ（CardやTable）と左右の余白を揃えるため、Toolbar自体には
  `ui container` のようなパディングを持たせず、内包する `ui container`
  によってレイアウトを制御します。
- **Flexbox**: 内部要素は Flexbox (`display: flex`) を使用し、`gap`
  で間隔を調整します。`ui form .fields` 等の Semantic UI
  グリッドシステムは、不要なネガティブマージンやパディングを生む可能性があるため、ここでは使用を避けてください。

```tsx
// Example Structure
<>
  <Header ... />
  <div className="ui container" style={{ marginTop: "1rem", marginBottom: "1rem" }}>
    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
       {/* Actions / Filters */}
    </div>
  </div>
  <div className="ui container">
     {/* Main Content (List) */}
  </div>
</>
```
