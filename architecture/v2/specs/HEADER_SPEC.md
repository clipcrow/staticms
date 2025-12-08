# ヘッダーコンポーネント (Header) 仕様書

## 概要

本仕様書は、Staticms アプリケーション全体のヘッダー
UI、および各画面ごとのコンテキストヘッダー（Context
Header）の詳細仕様を定義します。 StaticMS v2
では、ナビゲーション（パンくずリスト）とアクションボタン（保存、作成、表示切替など）を一貫したレイアウトで提供します。

## UI 構成

ヘッダーは主に以下の要素で構成されます。レイアウトは Semantic UI
のメニューまたはフレックスボックスを使用します。

### 1. グローバル領域 (Global Area)

操作ユーザーの情報やログアウトなど、アプリケーション全体に関わる機能。

- **Brand / Home**:
  左端。「**Staticms**」のロゴテキスト。クリックでリポジトリ選択画面（ルート）へ遷移。
- **User Profile**: 右端。操作ユーザーのGitHubアバターを表示。
  - **Dropdown Menu**:
    - `Logout`: サインアウト処理。

### 2. コンテキスト領域 (Context Area)

現在のページに応じたナビゲーションとアクション。グローバル領域の下段、または統合されたバーとして配置します。

- **Breadcrumbs (左側)**:
  - 階層構造を表示（例: `Owner/Repo > Collection > Article`）。
  - 各階層はリンクとして機能。
  - 現在地（末尾）はアクティブスタイル（太字など）で表示。
- **Actions (右側)**:
  - 画面固有の操作ボタン群（後述）。

## 画面別ヘッダー仕様

各画面における「Actions（右側エリア）」の構成定義です。

### A. リポジトリ選択画面 (`RepositorySelector`)

- **Breadcrumbs**: `Repositories` (固定)
- **Actions**:
  1. **Search/Filter**:
     リポジトリ検索・絞り込み入力欄（UI上のスペース許容範囲でヘッダーに配置、またはメインエリア上部）。
  2. **View Toggle**:
     - `Card View` (Grid Icon) / `List View` (List Icon) の排他切替。
     - 状態は `localStorage` に保存。
  3. **Connect Repository**: `Connect` ボタン (Secondary)。

### B. コンテンツ一覧画面 (`ContentList`)

- **Breadcrumbs**: `Owner / Repo`
- **Actions**:
  1. **View Toggle**: `Card` / `List` 切替。
  2. **Add Content**: `Add Content` ボタン (Primary)。設定画面へ遷移。

### C. 記事一覧画面 (`ArticleList`)

- **Breadcrumbs**: `Owner / Repo > Collection`
- **Actions**:
  1. **View Toggle**: `Card` / `List` 切替。
  2. **New Article Form**:
     - `Input`: 新規記事名入力欄。
     - `Button`: `Create` ボタン (Primary)。

### D. 記事エディタ画面 (`ContentEditor`)

- **Breadcrumbs**: `Owner / Repo > Collection > Filename`
- **Actions**:
  1. **Status Indicator**:
     - `Draft Restored` (Label, Orange): ローカルドラフト復元時。
     - `Locked by PR #123` (Link): PRロック時。
  2. **Edit Actions**:
     - `Reset`: ドラフト破棄ボタン (Negative/Basic)。
     - `Save / Update PR`: 保存ボタン (Primary)。
       - 保存中は `Saving...` (Loading Spinner)。

### E. 設定編集画面 (`ContentConfigEditor`)

- **Breadcrumbs**: `Owner / Repo > Settings` (or `Add Content`)
- **Actions**:
  1. **Cancel**: 戻るボタン。
  2. **Save**: `Save Config` ボタン (Primary)。

## コンポーネント設計

`AppHeader` または `Layout` コンポーネントの一部として実装します。

```typescript
export interface BreadcrumbItem {
  label: string;
  to?: string; // リンク先がない場合は現在のページ（テキストのみ）
  active?: boolean;
}

export interface HeaderProps {
  // ナビゲーション
  breadcrumbs: BreadcrumbItem[];

  // 右側のアクションエリア (React Node)
  actions?: React.ReactNode;

  // ユーザー情報 (Contextから取得する場合はProp不要)
  user?: UserProfile;

  // ローディング状態
  loading?: boolean;
}
```

## デザインガイドライン (Visual Style)

- **Background**: 白 (`#ffffff`) または非常に薄いグレー。
- **Border**: 下部に薄いボーダー (`1px solid #e0e0e0`)
  を配置し、コンテンツエリアと分離する。
- **Spacing**:
  - 左右パディング: `1rem` (Mobile) ~ `2rem` (Desktop).
  - 高さ: `60px` 程度を確保し、タップターゲットを十分に取る。
- **Responsive**:
  - モバイル時は Breadcrumbs
    を短縮表示（`... > Current`）するか、横スクロールを許可する。
  - Actions が多い場合は「その他メニュー
    (`...`)」に格納するなどのレスポンシブ対応を行う。
