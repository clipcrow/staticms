# UI Design & Screen Flow

Staticms V2 の画面構成と遷移設計について定義します。 デザインシステムは
**Semantic UI** をベースとし、シンプルかつモダンな管理画面を目指します。

## 1. Global Layout

アプリケーション全体で共通して使用されるレイアウト構造です。

- **Header**:
  - **Logo**: Staticms ロゴ（リンクなし）。
  - **Breadcrumb**:
    - `<GitHub Icon> (Root)` / `Owner/Repo (Branch Label)` / `:collectionName` /
      `:articleName`
    - **Branch Label**:
      リポジトリのデフォルトブランチと異なる場合のみ表示します。
    - **FOUC Prevention**:
      データのロード中であってもヘッダー情報（タイトルやパンくず）を即座に表示するため、画面遷移時に必要なメタデータを引き継ぐことを推奨します。
    - 各階層はリンクとなっており、上位階層へ戻ることができる。
  - **User Menu**: Avatar アイコン (現在のユーザーを表示)。
  - **Right Content**:
    画面固有のステータスインジケーター（Editor画面など）を表示する場合がある。
- **Main Content**:
  - 中央に配置されるコンテンツエリア。`ui container` を基本とする。
- **Footer**:
  - **Fixed Footer**:
    コンテンツ編集画面や設定画面では、画面下部に固定されたフッター領域を使用し、保存・キャンセル・削除などの主要アクションボタンを配置する。

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
    RepoSelect[Repository Selection /] -->|Select Repo| Dashboard[Content Dashboard /:owner/:repo]
    RepoSelect -->|Query: ?settings=...| RepoSettings[Repository Settings]
    
    Dashboard -->|Select Collection| ArticleList[Article List /:owner/:repo/:content]
    Dashboard -->|Query: ?settings| ConfigEditorNew[Content Config (New)]
    Dashboard -->|Query: ?settings=:content| ConfigEditor[Content Config (Edit)]
    
    Dashboard -->|Select Singleton| Editor[Content Editor /:owner/:repo/:content]
    
    ArticleList -->|Select Article| EditorArticle[Article Editor /:owner/:repo/:content/:article]
    ArticleList -->|Create New Article| EditorArticle
```

## 4. Screen Definitions

### 4.1 Repository Selection (Root)

- **Path**: `/`
- **Settings Path**: `/?settings=:owner|:repo` (Repository Settings)
- **UI**:
  - **Header**:
    - List: `[GitHub Icon] Repositories`
    - Settings: `[GitHub Icon] Repository Settings`
  - **Content**:
    - アクセス可能なリポジトリの一覧カード。
    - 各カードにはリポジトリ名に加え、**設定済みブランチ名**（デフォルトブランチと異なる場合）を表示。
  - **Actions**:
    - "Connect Repository" (Install App)。
    - 各カードの "Settings" ボタン -> Repository Settings (`/?settings=...`)
      へ。

### 4.2 Content Dashboard (Content Browser)

- **Path**: `/:owner/:repo`
- **Config Path**:
  - New: `/:owner/:repo?settings`
  - Edit: `/:owner/:repo?settings=:content`
- **UI**:
  - **Header**:
    - Dashboard: `[GitHub Icon] > :owner/:repo (Branch) Contents`
    - Config (New): `[GitHub Icon] > :owner/:repo (Branch) New Content`
    - Config (Edit): `[GitHub Icon] > :owner/:repo (Branch) Content Settings`
  - **Toolbar**:
    - View Toggle (Card/List), Search, "Add New Content" ボタン。
  - **Content Cards**:
    - コンテンツ定義（Collection / Singleton）のカード一覧。
    - **Actions**:
      - "Browse" (Collection) -> Article List (`/:owner/:repo/:content`) へ
      - "Edit" (Singleton) -> Content Editor (`/:owner/:repo/:content`) へ
      - "Edit Config" -> 同じパスでクエリ付加 `?settings=:content`

### 4.3 Article List

- **Path**: `/:owner/:repo/:content`
- **UI**:
  - **Header**: `[GitHub Icon] > :owner/:repo (Branch) > :contentName (or Path)`
  - **Toolbar**:
    - View Toggle (Card/List), Search, "New Article" ボタン (Create)。
  - **Content**:
    - 記事一覧（ファイルリスト）。
    - **削除機能**:
      一覧画面からの削除ボタンは廃止されました。各記事の編集画面へ移動して削除を行います。

### 4.4 Content / Article Editor

- **Path**:
  - Singleton: `/:owner/:repo/:content`
  - Article: `/:owner/:repo/:content/:article`
- **UI**:
  - **Header**:
    - Singleton:
      `[GitHub Icon] > :owner/:repo (Branch) > :contentName (or Path) Edit Content`
    - Article:
      `[GitHub Icon] > :owner/:repo (Branch) > :content (Name or Path) > :article Edit Article`
    - **Right Content**: Status Indicators (Draft, In Review, Approved, etc.)
      を配置。
  - **Layout**:
    - **Top Area (Front Matter)**:
      - メタデータ編集フォーム (Fields defined in Config)。
    - **Bottom Area (Editor & Preview)**:
      - `react-md-editor` (Markdown) または YAML Editor。
  - **Fixed Footer**:
    - 画面下部に固定配置。
    - **Left Actions**: Reset, Save (Create/Update PR).
    - **Right Actions**: Delete (Singletonおよび新規作成時は非表示).

### 4.5 Content Config Editor (Overlay/View)

- **Path**:
  - New: `/:owner/:repo?settings`
  - Edit: `/:owner/:repo?settings=:content`
- **UI**:
  - **Header**:
    - New: `[GitHub Icon] > :owner/:repo (Branch) New Content`
    - Edit: `[GitHub Icon] > :owner/:repo (Branch) Content Settings`
  - **Form**: Type, Name, Path, Fields Definition.
  - **Fixed Footer**:
    - **Left**: Cancel, Save.
    - **Right**: Delete (Edit mode only).

### 4.6 Repository Settings

- **Path**: `/?settings=:owner|:repo`
- **UI**:
  - **Header**: `[GitHub Icon] Repository Settings`
  - **Form**:
    - Branch Name: コンテンツ管理に使用するブランチ名（デフォルトは `main`
      またはリポジトリのデフォルトブランチ）。
  - **Fixed Footer**:
    - **Left**: Cancel, Save.
  - **Logic**:
    - 保存時に指定されたブランチがリモートに存在しない場合、確認ダイアログを表示し、承認されればブランチを自動作成して設定を保存する。

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
