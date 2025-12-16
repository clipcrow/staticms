# Build & Deployment Strategy

Staticms v2
では、DDenoエコシステムの標準的なツールを活用し、シンプルで堅牢なビルドパイプラインを構築します。

## 1. Frontend Build (Bundling)

React アプリケーション (`src/app/`) をブラウザで実行可能な単一の JS
ファイルに変換するため、**`esbuild`** を採用します。

### 1.1 Tool Selection: `esbuild`

Deno エコシステムで広く使われている **`deno_esbuild`**
(`@luca/esbuild-deno-loader`) を使用して、Deno のモジュール解決と `esbuild`
の高速なバンドル機能を組み合わせます。これにより、npmパッケージとDenoモジュールの混在が可能になります。

### 1.2 Build Logic (`src/server/build_assets.ts`)

ビルドロジックはサーバーコード (`src/server/build_assets.ts`)
に集約し、静的ファイル生成 (`scripts/build.ts`) から参照可能にします。

## 2. Server Runtime

サーバーサイド (`src/server/`) はバンドルせず、Deno ランタイムで直接実行します。

- **Execution**: `deno run --unstable-kv --allow-net ... src/server/main.ts`
- **Assets Serving**: 静的ファイル (`public/`) を配信します。

## 3. CSS Handling

Semantic UI の言語的なクラス名設計 (`ui icon button` 等)
を最大限活用するため、TSX 側でのインラインスタイル定義は **非推奨**
とします。代わりに、アプリケーション固有のスタイルは **Sass (SCSS)**
で記述し、ビルドプロセスで CSS にコンパイルして読み込みます。

### 3.1 Style Strategy

- **Base**: Semantic UI CSS (CDN または npm パッケージ) を `<link>`
  で読み込み、基本スタイルとします。
- **Custom**: `src/app/styles/main.scss`
  をエントリーポイントとし、ここに変数定義や各コンポーネント用 SCSS ファイル
  (`@use`) を集約します。
- **Conventions**:
  - BEM (Block Element Modifier) などの命名規則を採用し、Semantic UI
    のクラス名との意図しない競合を防ぎます。
  - Sass 変数 (`$primary-color`, `$spacing-md` など)
    を定義し、デザインの一貫性を保ちます。

### 3.2 Build Process for SCSS

Deno 環境で Sass をコンパイルするために、`npm:sass` (Official Dart Sass)
を使用します。これにより、最新の SCSS 文法をサポートします。

```typescript
// scripts/build_css.ts
import * as sass from "sass";
import { ensureDir } from "@std/fs";

const SCSS_ENTRY = "./src/app/styles/main.scss";
const CSS_OUT = "./public/styles/main.css";

try {
  const result = sass.compile(SCSS_ENTRY, {
    style: "compressed", // Production build
    sourceMap: false,
  });

  await ensureDir("./public/styles");
  await Deno.writeTextFile(CSS_OUT, result.css);
} catch (error) {
  console.error("SCSS Compilation failed:", error);
  Deno.exit(1);
}
```

### 3.3 Loading in HTML

ビルドされた CSS ファイルを HTML から読み込みます。

```html
<!-- public/index.html -->
<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/semantic-ui-css@2.5.0/semantic.min.css"
>
<link rel="stylesheet" href="/styles/main.css">
<!-- Compiled from SCSS -->
```

## 4. Deployment Strategy

### 4.1 Production Build (Deno Deploy)

Deno Deploy はデプロイ時に `deno task build` (項目 `deno.json` > `tasks` >
`build`)
を自動的に実行することができます。このタスク内でJSバンドルとCSSコンパイルを行い、`public/`
ディレクトリに生成物を配置する戦略をとります。

### 4.2 Local Execution

ローカル環境でも同様に `deno task build`
を実行してからサーバーを起動するか、`deno task dev` (開発用スクリプト)
を使用します。

```bash
deno task build
deno task start
```

## 5. Configuration Management

環境変数 (`.env`) と `deno.json` を活用します。
ビルド時に埋め込むべき変数（もしあれば `process.env`
置換）と、ランタイムでサーバーが読み込むべき秘密鍵（`GITHUB_CLIENT_SECRET`
等）を明確に区別します。フロントエンドには原則として機密情報を持たせません。
