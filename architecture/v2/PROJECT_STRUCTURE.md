# Staticms2 Project Structure

Staticms2
のディレクトリ構造と、各ディレクトリの責務、およびテストの配置ルールについての定義です。

## 1. Top Level Structure

```
staticms2/
├── .vscode/               # VS Code 設定
├── architecture/          # 仕様書・設計書 (v1, v2...)
├── public/                # 静的アセット (build output, images, styles)
├── src/                   # ソースコード
│   ├── app/               # フロントエンド (React)
│   ├── server/            # バックエンド (Deno / Oak)
│   ├── testing/           # テストユーティリティ (Unit Test Helpers)
│   └── shared/            # 共通型定義・ユーティリティ (Client/Server共用)
├── tests/                 # E2E テスト (Astral scenarios)
├── deno.json              # Deno 設定・タスク定義
└── README.md
```

## 2. Source Code Structure (`src/`)

### 2.1 Frontend (`src/app/`)

**Container/Presenter パターン**
を採用し、UIの見た目とロジックの責務を分離します。

```
src/app/
├── components/            # UIコンポーネント (Presenters)
│   ├── common/            # 汎用 UI (Button, Input, Modal...) - Semantic UI ラッパー等
│   ├── editor-ui/         # エディタ画面固有のUIパーツ (Toolbar, PreviewArea...)
│   └── layout/            # レイアウト (Header, Sidebar, PageContainer...)
├── features/              # 機能ごとのコンテナ (Containers / Business Logic)
│   ├── auth/              # 認証フロー制御
│   ├── content-browser/   # リポジトリ・ファイル選択機能
│   └── content-editor/    # 記事編集・ドラフト管理・保存フロー
├── hooks/                 # 汎用カスタムフック (useLocalStorage, useTheme...)
├── contexts/              # React Context (AuthContext, ToastContext...)
├── routes/                # ルーティング定義 (AppRoutes.tsx)
├── styles/                # グローバルスタイル・テーマ設定
├── main.tsx               # エントリーポイント (DOM マウント)
└── App.tsx                # アプリケーションルート (Providers設定)
```

- **Components (Presenters)**:
  - 外部データ取得や複雑な状態管理を持たせない。Propsを受け取って描画することに専念する。
  - Semantic UI のクラス名は主にここで隠蔽する。
  - **テスト**: ビジュアルな検証、イベント発火の確認 (`testing-library` +
    `HappyDOM`)。
- **Features (Containers)**:
  - データ取得 (`fetch` / Hooks)、状態管理、ルーター制御を行う。
  - Componentsを組み合わせて画面機能を実現する。
  - **テスト**: ロジック中心のインテグレーションテスト。

### 2.2 Backend (`src/server/`)

```
src/server/
├── api/                   # API ハンドラ (Oak Routes)
│   ├── auth.ts
│   ├── content.ts
│   └── webhooks.ts
├── services/              # ビジネスロジック (APIハンドラから分離)
│   ├── github.ts          # GitHub API 連携詳細
│   └── kv.ts              # Deno KV 操作
├── middleware/            # Oak Middleware (Auth guards, Error handling)
└── main.ts                # サーバーエントリーポイント
```

## 3. Testing Strategy & Placement

テストファイルは、**対象ファイルのすぐ隣 (Co-location)**
に配置することを基本ルールとします。これにより、コード移動時のメンテナンス性を高め、テストの書き忘れを防ぎます。

### 3.1 Unit / Integration Tests

- **命名規則**: `[FileName].test.ts` または `[FileName].test.tsx`
- **対象**: `src/app/` および `src/server/` 内の全ファイル。
- **環境**: `deno test` + `HappyDOM` (Frontend), `deno test` (Backend)

例:

```
src/app/components/common/
├── Button.tsx
└── Button.test.tsx        # Buttonのレンダリング・クリックテスト
```

### 3.2 E2E Tests (`tests/`)

システム全体を通したシナリオテストは、トップレベルの `tests/`
ディレクトリに配置します。

- **ツール**: **Astral** (Deno Headless Browser)
- **対象**: `architecture/v2/USER_STORIES.md` で定義されたシナリオ。
- **実行**: `deno task test:e2e` (予定)

```
tests/
├── setup.ts               # Astral インスタンス起動・終了処理
├── auth_flow.test.ts      # ログインからリソースアクセスまで
├── editor_flow.test.ts    # 記事作成・保存・PR確認フロー
└── ...
```

### 3.3 Test Utilities (`src/testing/`)

既存の `src/testing/`
を整理・活用し、ユニットテストから参照可能なヘルパーを置きます。

- `setup_dom.ts`: HappyDOM 初期化 (import side-effect)
- `mock_local_storage.ts`: LocalStorage モック
- `render_utils.tsx`: `render` ラッパー (必要に応じて Context Provider でラップ)

## 4. Build & Bundle Strategy

Deno v2.4+ の `deno bundle` (または `deno_esbuild`)
を使用して、プロダクション用のバンドルを生成します。

- **Development**: `deno task dev`
  - サーバー起動 + ファイル監視。
  - フロントエンドはオンデマンドコンパイル、または高速なリビルド。
- **Production**: `deno task build`
  - `src/app/main.tsx` をエントリーポイントとして `public/js/bundle.js` を生成。
  - React 19, Semantic UI を適切にバンドルに含める。

## 5. Coding Standards & Best Practices

Staticms v2 プロジェクトにおける開発の掟です。

1. **Zero Lint Errors**:
   - Deno のリンター (`deno lint`) が報告するエラーや警告は放置しません。
   - どうしても抑制が必要な場合は、コードコメント等で理由を明示的に記述します。

2. **Adherence to Guidelines**:
   - `architecture/v2/` 以下の設計資料、および `src/testing/README.md`
     に記載されたテストプラクティスを遵守します。
   - 特に「ロジックと表示の分離 (Container/Presenter)」「テストの
     Co-location」は徹底します。

3. **Continuous Improvement**:
   - 既存のガイドラインよりも優れた解決策や、新しいDeno便利機能が見つかった場合は、独断で実装せず、**まず設計のアップデートを提案**
     してください。
   - 提案が承認され次第、`architecture/`
     配下のドキュメントを更新し、実装に反映させます（Documentation First）。

4. **Language Policy**:
   - **UI**: 英語のみ (`English`).
     GitHubへのリスペクトも込め、国際化（i18n）は行いません。
   - **Content**:
     ユーザーが入力するコンテンツ（記事本文、コミットメッセージ等）は **日本語
     (Japanese)**
     を第一級市民として扱います。IME入力や文字コードの問題が発生しないよう注意します。
   - **Documentation**: 設計書、README等のドキュメントは、開発者に合わせて
     **日本語** で記述します。

5. **Import Paths**:
   - ソースコード (`src/`) 内のインポートでは、`deno.json` で定義された Path
     Alias (`@/`) を積極的に使用します。
   - **絶対パスのみ** 使用してください。相対パスは禁止します。 (例:
     `../../components/Button.tsx` ではなく `@/app/components/Button.tsx`
     を使用)
