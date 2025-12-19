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
  - **Branch Label**: Breadcrumb
    内のリポジトリ名部分にブランチ名を表示する（デフォルトブランチと異なる場合のみ）。
- **Actions (右側)**:
  - 画面固有の操作ボタン群（後述）。

## 画面別ヘッダー仕様

各画面における「Actions（右側エリア）」の構成定義です。

### A. リポジトリ選択画面 (`RepositorySelector`)

- **Breadcrumbs**: `Repositories` (固定)
- **Settings Breadcrumbs**: `Repository Settings` (クエリ `?settings=...` 時)
- **Actions**:
  1. **Search/Filter**:
     - `Save / Update PR`: 保存ボタン (Primary)。
       - 保存中は `Saving...` (Loading Spinner)。

### E. 設定編集画面 (`ContentConfigEditor`)

- **Breadcrumbs**:
  - New: `Owner / Repo (Branch) New Content`
  - Edit: `Owner / Repo (Branch) Content Settings`
- **Actions**:
  1. **Cancel**: 戻るボタン。
  2. **Save**: `Save Config` ボタン (Primary)。

## コンポーネント設計

`AppHeader` または `Layout` コンポーネントの一部として実装します。

`HeaderProvider` と `useSetHeader` フックを使用してヘッダーの状態を管理します。

```typescript
export interface BreadcrumbItem {
  label: ReactNode;
  to?: string;
  onClick?: () => void;
  // deno-lint-ignore no-explicit-any
  state?: any;
  key?: string; // 更新検知用のユニークキー
}

// ページコンポーネント内での使用
useSetHeader(breadcrumbs, titleNode, rightContent, disableRootLink);
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
