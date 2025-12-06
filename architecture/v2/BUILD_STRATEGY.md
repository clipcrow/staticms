# Build & Deployment Strategy

Staticms v2
では、標準技術への回帰とDenoエコシステムの最大活用を掲げ、可能な限りシンプルかつ将来性のあるビルドパイプラインを構築します。
特に `deno bundle` (v1系Legacy) の廃止に伴い、Deno
v2系での標準的なバンドル手法を確立します。

## 1. frontend Build (Bundling)

React アプリケーション (`src/app/`) をブラウザで実行可能な単一の JS
ファイルに変換します。 Staticms v2 では外部ツールへの依存を減らし、**Deno
標準のバンドル機能** を全面的に採用します。

### 1.1 Support Strategy: Deno Native Bundle

Deno v2.4 以降で刷新された `deno bundle` (および Runtime API) を使用します。
これにより、`deno.json` の設定（Import Map
等）をそのまま再利用でき、設定の二重管理を防ぎます。

### 1.2 Build Script (`scripts/build.ts`)

`deno task build` で実行されるビルドスクリプトを作成します。 Deno の Runtime API
を使用してバンドル処理をプログラム的に制御します。

```typescript
// scripts/build.ts (Concept)

// 注意: 実際のAPIシグネチャは Deno のバージョンに依存します。
// 必要に応じて `deno bundle` CLIコマンドをサブプロセスで実行する形式も検討します。

const isDev = Deno.args.includes("--dev");
const entryPoint = new URL("../src/app/main.tsx", import.meta.url);
const outPath = new URL("../public/js/bundle.js", import.meta.url);

console.log(`Bundling ${entryPoint} to ${outPath}...`);

// CLIコマンドとして実行する場合の例
const command = new Deno.Command(Deno.execPath(), {
  args: [
    "bundle",
    "--unstable-jsx", // 必要に応じてフラグ追加
    entryPoint.pathname,
    outPath.pathname,
  ],
});

const output = await command.output();

if (output.code === 0) {
  console.log("Build successful!");
} else {
  console.error("Build failed:");
  console.error(new TextDecoder().decode(output.stderr));
  if (!isDev) Deno.exit(1);
}
```

### 1.3 Development Watch Mode

`deno task dev` では、Deno のネイティブなファイル監視機能と `bundle`
を組み合わせます。

```bash
# deno.json
"dev": "deno run -A scripts/dev.ts"
```

`scripts/dev.ts` では以下のフローを制御します：

1. **Watch & Bundle**: ソースコードの変更を検知し、都度 `bundle` を実行して
   `public/js/bundle.js` を更新する。
2. **Server**: バックエンドサーバーを起動しておく。
3. (Optional) フロントエンドに更新通知を送る（Live Reload /
   HMR）仕組みは、今後の拡張として検討する。シンプルさを優先し、まずは手動リロードを許容する。

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
