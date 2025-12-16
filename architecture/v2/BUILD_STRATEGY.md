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

### 1.2 Build Logic (`src/server/build_assets.ts`)

ビルドロジックはサーバーコード (`src/server/build_assets.ts`)
に集約し、オンデマンドビルドと静的ファイル生成 (`scripts/build.ts`)
の両方から参照可能にします。

### 1.3 On-demand Build Policy (Deno Deploy)

Deno Deploy
は書き込み可能なファイルシステムを持たないため、本番環境ではサーバー起動時（またはリクエスト時）にメモリ上でアセットをビルドして配信する
**On-demand Build** 戦略を採用します。

- **実装**: `src/server/app.ts` のミドルウェアで `/js/bundle.js`
  等へのリクエストを捕捉し、ビルド関数を実行してレスポンスを返します。
- **優先順位**: 静的ファイル (`public/`)
  が存在する場合はそちらを優先し、存在しない場合（Deno Deploy
  環境）のみオンデマンドビルドを実行します。

## 2. Server Runtime

サーバーサイド (`src/server/`) はバンドルせず、Deno ランタイムで直接実行します。

- **Execution**: `deno run --unstable-kv --allow-net ... src/server/main.ts`
- **Assets Serving**:
  静的ファイルが存在すればそれを配信し、なければオンデマンドビルドした結果を配信します。

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

### 3.4 CSS Imports in JS (Known Issue)

一部のライブラリ（例: `react-md-editor`）の JS ファイル内部で `.css` を import
している場合があります。 `esbuild` で `write: false` (オンデマンドビルド)
を使用する場合、これらが出力先を決定できずエラーになることがあります。

**対策**: `esbuild` のオプションに `loader: { ".css": "empty" }` を設定し、JS
バンドル内の CSS import を無視（空モジュールとして解決）します。必要なスタイルは
`main.scss`
などで別途読み込むか、ライブラリが適切にスタイルを提供していることを確認します。

## 4. Deployment Strategy

### 4.1 Production Build (Deno Deploy)

Deno Deploy の **Automatic Deployment** (Git Push -> Deploy) を利用します。
ビルドステップはサーバーランタイム内で完結しているため、GitHub Actions
による事前ビルドは不要です。

### 4.2 Local Execution

ユーザーが手元で本番モードで動かす場合。 (Watcherなし、オンデマンドビルド確認)

```bash
deno task start
```

deno task start # Runs server without watching

```
## 5. Configuration Management

環境変数 (`.env`) と `deno.json` を活用します。
ビルド時に埋め込むべき変数（もしあれば `process.env`
置換）と、ランタイムでサーバーが読み込むべき秘密鍵（`GITHUB_CLIENT_SECRET`
等）を明確に区別します。フロントエンドには原則として機密情報を持たせません。
```
