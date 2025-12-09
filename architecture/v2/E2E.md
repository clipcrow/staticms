# E2Eテストのベストプラクティス

このディレクトリには、かつてDenoとAstralを使用して実装されていたStaticmsのEnd-to-End
(E2E) テストの知見が含まれています。 **注記**:
2025年12月、維持コストの観点からE2Eテストコードは削除されました。本ドキュメントはその運用の記録です。

## ベストプラクティスと学んだ教訓

### 1. 要素だけでなく、安定性を待つ

`globalThis.location.href`
の変更などによるフルページリロードをテストする場合、URLをチェックする単純な
`waitForSelector` や `waitForFunction`
だけでは、新しいページのDOMが完全に構築または安定する前にパスしてしまうことがあります。

- **問題点**:
  HTMLダンプに要素が含まれていても、リロード中の実行コンテキストの消失などが原因で
  `waitForSelector` がタイムアウトしたりエラーになったりすることがあります。
- **解決策**: ナビゲーション/リロードを確認した後、明示的な `sleep` (例:
  `setTimeout`)
  を挟んで、ブラウザがドキュメントを完全に切り替え、新しいDOMが安定するのを確実に待ちます。

  ```typescript
  // URLの変化を待つ
  await page.waitForFunction(() => !location.search.includes("action="));
  // DOMの安定化を待つ（重要）
  await new Promise((r) => setTimeout(r, 2000));
  // その後、要素を確認する
  await page.waitForSelector(".collection-item");
  ```

### 2. リスト内での一意な Key の確保

Reactはリスト項目に一意な `key`
プロップを要求します。E2Eテストにおいて、バックエンドの状態が汚染されたり、ロジックのバグで同じ
`key`
を持つエントリが重複して生成されたりすると、Reactがリストを正しくレンダリングできなかったり、警告/エラーを出してテストセレクタの動作を妨げたりすることがあります。

- **解決策**:
  コンポーネントが真に一意なキーを使用するようにします（開発/テスト中に重複の可能性がある場合は
  `${id}-${index}` のような複合キーを使用するなど）。
- **検証**:
  テストでは、項目の存在だけでなく、その**数**をアサートすることが重要です。

### 3. Configオブジェクトのディープコピー

メモリ内で設定オブジェクトを変更する場合（APIに送信する前など）、そのオブジェクトが共有ソース（フックやグローバル状態など）から来ている場合は、必ずディープコピーを行ってください。シャローコピー
(`{ ...config }`)
ではネストされた配列やオブジェクトが共有されたままになり、元のオブジェクトがレンダリングや他のテストで再利用された場合に予期しない副作用を引き起こします。

- **解決策**:
  JSONシリアライズ可能な設定オブジェクトの場合、`JSON.parse(JSON.stringify(config))`
  がディープコピーを行うためのシンプルで効果的な方法です。

### 4. デバッグ手法

- **HTMLダンプ**: セレクタが見つからずに失敗した場合、エラーをキャッチして
  `document.body.innerHTML`
  をログに出力すると、ヘッドレスブラウザの状態を把握するのに非常に役立ちます。
- **コンソールログ**: `page.on("console", ...)`
  を使用してブラウザのコンソールログをDenoのターミナルにプロキシ出力することで、フロントエンドのエラーやロジックのトレースを確認できます。

### 5. React Controlled Inputs の操作

React 16以降、`input` や `textarea` に対する `value`
プロパティのsetterがオーバーライドされており、プログラムから単に
`el.value = 'foo'`
としてもReactの状態更新（OnChangeイベント）が発火しないことがあります。

- **解決策**:
  ネイティブのプロパティディスクリプタを使用して値を設定し、その後でイベントをディスパッチします。
  ```typescript
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    globalThis.window.HTMLInputElement.prototype,
    "value",
  )?.set;
  nativeInputValueSetter?.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  ```

### 6. Astral の Console Event Listener

Astral の `Page` オブジェクトは Puppeteer
と完全に同じAPIではなく、`page.on("console", ...)`
は存在しない場合があります（バージョンによる）。代わりに標準的な
`addEventListener` を使用します。

- **解決策**:
  ```typescript
  // deno-lint-ignore no-explicit-any
  page.addEventListener("console", (e: any) => {
    console.log(`[Browser] ${e.detail.text}`);
  });
  ```

### 7. Drag & Drop シミュレーション

ヘッドレスブラウザでドラッグ＆ドロップ（特にファイルアップロード）をテストする場合、`DataTransfer`
オブジェクトを作成し、`DragEvent` を手動で発火させるのが最も確実です。

- **解決策**:
  ```typescript
  const dataTransfer = new DataTransfer();
  dataTransfer.items.add(file); // Fileオブジェクト
  const event = new DragEvent("drop", {
    bubbles: true,
    cancelable: true,
    dataTransfer: dataTransfer,
  });
  targetElement.dispatchEvent(event);
  ```

## 技術スタックの評価 (当時)

今回のE2Eテスト実装において採用した技術スタック（Deno +
Astral）の評価は以下の通りです。

### Astral (Headless Browser Automation)

- **長所**:
  - Denoネイティブであり、セットアップが非常に軽量で高速。`npm install`
    で重いPuppeteer/Playwrightのバイナリ管理をする必要がない。
  - Playwright互換に近いAPIを持っており、学習コストが低い。
  - テストランナーとシームレスに統合できる。
- **短所**:
  - `waitForNavigation` や `waitForFunction` の挙動が、ページのFull
    Refresh時においてPlaywrightほど堅牢ではない場合がある（今回の `sleep`
    対応が必要だった主因）。
  - エラーメッセージが簡素で、DOMの状態把握には工夫（HTMLダンプ等）が必要。

### Deno Test Runner

- **長所**:
  - 設定ゼロでTypeScriptを実行でき、高速。
  - `deno task` との統合が容易。
- **短所**:
  - 標準出力のバッファリングや並列実行時のログ出力制御など、大規模なE2Eテストスイートを扱うにはレポーティング機能がまだ最小限。

### 8. GitHub API モックの課題と対策

外部API（GitHub
API）に依存するテストでは、実際のAPIを叩くと認証やレート制限の問題が発生します。

- **モック手法**: `std/testing/mock` の `stub` を使い、`globalThis.fetch`
  をインターセプトしてモックレスポンスを返す手法が有効です。
- **課題**:
  - 網羅的なエンドポイント定義が必要。未定義のパスへリクエストが飛ぶと、本物のAPIに到達してしまい、認証エラー（Bad
    credentials）やネットワークエラーを引き起こします。
  - OAuth認証フロー（リダイレクトなど）の完全な再現は複雑であり、テストコードが肥大化しやすい。

### 9. テストランナーの並列実行とリソース競合

- **問題点**:
  - `deno test` ランナーが複数のテストファイルを並列実行する場合、各ファイルで
    `app.listen()` によってサーバーを起動すると、固定ポート（例:
    8001）の競合が発生し、テストが失敗することがあります。
  - テスト終了時のリソースクリーンアップ（サーバー停止、ブラウザ閉じる）タイミングとDenoのプロセス終了判定が競合し、`Promise resolution is still pending`
    エラーが発生することがあります。
- **教訓**:
  - E2Eテストでは、サーバーインスタンスを一箇所で管理するか、動的ポートを使用する設計が望ましいです。
  - リソース管理が複雑になりがちなため、小規模チームでは維持コストが高くなります。

## 廃止の決定 (2025-12-09)

E2Eテストは上記のような維持コスト（APIモックのメンテナンス、実行環境の不安定さ）が高いため、プロジェクトから削除し、今後は**ユニットテスト**と**手動検証**に注力する方針に転換しました。
