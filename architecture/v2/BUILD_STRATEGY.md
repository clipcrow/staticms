# Build & Deployment Strategy

Staticms v2
では、Denoエコシステムの標準的なツールを活用し、シンプルで堅牢なビルドパイプラインを構築します。

## 1. Frontend Build (Bundling)

React アプリケーション (`src/app/`) をブラウザで実行可能な単一の JS
ファイルに変換するため、**`esbuild`** を採用します。

### 1.1 Tool Selection: `esbuild`

Deno エコシステムで広く使われている **`deno_esbuild`**
(`@luca/esbuild-deno-loader`) を使用して、Deno のモジュール解決と `esbuild`
の高速なバンドル機能を組み合わせます。これにより、npmパッケージとDenoモジュールの混在が可能になります。

### 1.2 Build Script (`scripts/build.ts`)

`deno task build` で実行されるビルドスクリプトです。

```typescript
// scripts/build.ts
import * as esbuild from "esbuild";
import { denoPlugins } from "deno_esbuild";

try {
  console.log("Building...");
  await esbuild.build({
    plugins: [
      ...denoPlugins({
        configPath: new URL("../deno.json", import.meta.url).pathname,
      }),
    ],
    entryPoints: ["./src/app/main.tsx"],
    outfile: "./public/js/bundle.js",
    bundle: true,
    format: "esm",
    platform: "browser",
    jsx: "automatic",
    logLevel: "info",
  });
  console.log("Build success");
} catch (e) {
  console.error("Build failed:", e);
  Deno.exit(1);
} finally {
  esbuild.stop();
}
```

### 1.3 Development Watch Mode

`deno task dev` (`scripts/dev.ts`) では、以下のプロセスを並行して管理します。

1. **Frontend Bundle**: ソースコード変更検知時に `scripts/build.ts` を実行。
2. **SCSS Build**: `scripts/build_css.ts` を実行。
3. **Server**: バックエンドサーバーを起動 (`deno run --watch`)。

## 2. Server Runtime

サーバーサイド (`src/server/`) はバンドルせず、Deno
ランタイムで直接実行します。これにより、デバッグが容易になり、ビルド時間が短縮されます。

- **Execution**: `deno run --unstable-kv --allow-net ... src/server/main.ts`
- **Assets Serving**: `oak` の `send` ミドルウェアを使用し、`public/`
  ディレクトリ（ビルド済み JS や CSS）を配信します。

## 3. CSS Handling

Semantic UI の言語的なクラス名設計 (`ui icon button` 等)
を最大限活用するため、TSX 側でのインラインスタイル定義は **非推奨** とします。
代わりに、アプリケーション固有のスタイルは **Sass (SCSS)**
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

### 4.1 Production Build

GitHub Actions 等の CI 環境で以下を実行します。

1. `deno task test` (Unit & E2E)
2. `deno task build` (Generate `public/js/bundle.js`)
3. 成果物（`src/server`,
   `public`）をDockerイメージ化、またはデプロイ対象サーバーへ転送。

### 4.2 Local Execution (Production Mode)

ユーザーが手元で本番モードで動かす場合。

```bash
deno task build
deno task start # Runs server without watching
```

## 5. Configuration Management

環境変数 (`.env`) と `deno.json` を活用します。
ビルド時に埋め込むべき変数（もしあれば `process.env`
置換）と、ランタイムでサーバーが読み込むべき秘密鍵（`GITHUB_CLIENT_SECRET`
等）を明確に区別します。フロントエンドには原則として機密情報を持たせません。
