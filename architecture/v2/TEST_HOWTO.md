# Test How-to Guide

このドキュメントは、Staticms v2
におけるテスト実装のガイドライン、ベストプラクティス、およびトラブルシューティングをまとめたものです。
開発者はこのガイドに従って、堅牢で保守性の高いテストコードを作成してください。

## 1. セットアップと構成 (Setup)

### 1.1 環境セットアップ (`src/testing/setup_dom.ts`)

Deno内でブラウザ環境をシミュレートするために `HappyDOM` を使用しています。
このセットアップファイルは、テストファイル内で
**Reactテストライブラリやコンポーネントをインポートする前に**
インポートする必要があります。

**重要**: History API (`pushState`/`replaceState`)
を正しく機能させるため、`GlobalRegistrator` には必ず `url`
オプションを指定する必要があります。

```typescript
// src/testing/setup_dom.ts
import { GlobalRegistrator } from "@happy-dom/global-registrator";

GlobalRegistrator.register({
  url: "http://localhost/", // これがないと SecurityError になる
});
```

テストファイルでの使用例:

```typescript
import "@/testing/setup_dom.ts"; // 最初にインポート
import { render } from "@testing-library/react";
```

### 1.2 依存関係

テストの依存関係は `deno.json` で管理されています。

- `@testing-library/react`: コンポーネントやフックのレンダリング用。
- `@happy-dom/global-registrator`: ブラウザ環境のポリフィル用。
- `@std/testing`: モック（Spy）や時間シミュレーション用。
- `@std/assert`: アサーション（検証）ユーティリティ。

## 2. ユーティリティ (Utilities)

### LocalStorage モック (`mock_local_storage.ts`)

標準の `localStorage`
はテスト実行間の永続性や挙動が扱いづらい場合があるため、ヘルパーを使用して制御します。

```typescript
import { setupLocalStorageMock } from "@/testing/mock_local_storage.ts";
const { mock, reset } = setupLocalStorageMock();

// テスト内で:
reset();
```

## 3. テスト実装パターン (Patterns)

### 3.1 Components

- `@testing-library/react` の `render` を使用します。
- インタラクションの検証には `@std/testing/mock` の `spy()` を使用します。

```typescript
Deno.test("MyComponent", async (t) => {
  await t.step("calls onClick", () => {
    const onClick = spy();
    render(<Button onClick={onClick} />);
    fireEvent.click(screen.getByRole("button"));
    assertSpyCalls(onClick, 1);
    cleanup();
  });
});
```

### 3.2 Hooks

カスタムフックのテストには `renderHook` を使用します。状態更新は `act()`
でラップします。

注意点:

- 非同期処理を含むフック（`useEffect` での fetch など）は `waitFor`
  を併用して状態変化を待ちます。
- **リソースリーク**: React Testing Library の `waitFor`
  はタイマーを使用するため、Deno
  のリーク検知に引っかかることがあります。後述のトラブルシューティングを参照してください。

```typescript
const { result } = renderHook(() => useMyData());

await waitFor(() => {
  assertFalse(result.current.loading);
});
assertEquals(result.current.data, "expected");
```

### 3.3 EventSource / Fetch Mocking

外部APIやSSEに依存するコードは、`globalThis` をスタブ化してテストします。

**Fetch Mocking:** `@std/testing/mock` の `stub` を使用します。

```typescript
import { stub } from "@std/testing/mock";

const fetchStub = stub(
  globalThis,
  "fetch",
  () =>
    Promise.resolve(
      new Response(JSON.stringify({ data: "ok" }), { status: 200 }),
    ),
);

try {
  // テスト実行
} finally {
  fetchStub.restore(); // 必ず戻す
}
```

**EventSource Mocking:** HappyDOM は `EventSource`
を未実装の可能性があるため、クラスごとスタブします。

```typescript
class MockEventSource {
  onmessage: ((event: MessageEvent) => void) | null = null;
  close() {}
  addEventListener() {}
  removeEventListener() {}
}
// @ts-ignore
globalThis.EventSource = MockEventSource;
```

## 4. トラブルシューティングと知見 (Troubleshooting)

### 4.1 Resource Leaks (Timer/Ops leaks)

Deno はテスト終了時に未完了の非同期操作（タイマー、Fetch等）があるとエラー
(`Leaks detected`) にします。 React Testing Library の `waitFor` や `renderHook`
内の非同期処理は、テスト終了タイミングと微妙にずれることがあり、頻繁にこのエラーを引き起こします。

**対策**: `Deno.test` のサニタイザーオプションを無効化します。

```typescript
Deno.test({
  name: "Async Hook Test",
  sanitizeOps: false, // 非同期操作の完了待ちを無効化
  sanitizeResources: false, // タイマーリソース等の残存を許容
  fn: async (t) => {
    // ...
  },
});
```

### 4.2 CSS Import Errors

Deno は `.css` ファイルのインポートを解釈できません（JSとして実行しようとして
`Expression expected` エラーになる）。 `npm` パッケージなどが CSS
をインポートしている場合（例:
`@uiw/react-md-editor`）、テスト実行時にクラッシュします。

**対策**:

1. **コンポーネントからCSS Importを排除する**: CSSは `index.html` や Sass の
   `@use` でグローバルに読み込み、コンポーネント (`.tsx`) からは
   `import "./style.css"` を削除するのが最も安全です。
2. **Import Map によるモック (非推奨)**: テスト時のみ Import Map
   を差し替えてダミーファイルに誘導する方法もありますが、設定が複雑になるため推奨されません。

### 4.3 History API SecurityError

HappyDOM で `useAuth`
などロケーション操作を行うフックをテストする際、`SecurityError: Failed to execute 'pushState' ...`
が出ることがあります。 これは HappyDOM のデフォルトURLが `about:blank`
であり、オリジンが `null` 扱いされるためです。 `setup_dom.ts` で
`url: "http://localhost/"` を指定することで回避できます。

## 5. ベストプラクティス (Best Practices)

1. **Bare Specifiers**: `jsr:` 等のURL直書きではなく、`deno.json`
   のマッピングを使う。
2. **Container/Presenter**: ロジックと表示を分離し、テストしやすくする。
3. **DI (Dependency Injection)**:
   子コンポーネントやAPIクライアントをPropsで注入可能にし、テスト時にモックに差し替えられるようにする。

## 6. Tips & Troubleshooting (v2.1 追加)

### 6.1 非同期状態と `waitFor` (Async State Updates)

Reactコンポーネントのテスト（特にフォーム入力）では、`fireEvent`
でイベントを発火させた後、Reactの状態更新（State
Updates）が完了する前に次のアサーションや操作が実行されてしまい、テストが失敗することがあります（例:
入力値が反映される前に送信ボタンを押してしまう）。

**対策**: `waitFor` を使用して、DOMが期待する状態になるまで待機します。

```typescript
// 入力イベント
fireEvent.change(input, { target: { value: "new value" } });

// State更新がDOMに反映されるのを待つ
await waitFor(() => {
  assertEquals(input.value, "new value");
});

// その後で次のアクションを実行
fireEvent.click(saveButton);
```

### 6.2 サーバーサイドAPIテスト (Oak Mocking)

`@oak/oak` の `RouterContext`
をモックしてサーバーサイドAPIをテストする場合の手法です。

**Contextの作成**: `testing.createMockContext`
を使用しますが、BodyやCookieの扱いに工夫が必要です。

```typescript
import { testing } from "@oak/oak";

const ctx = testing.createMockContext({
  path: "/api/target",
  method: "POST",
}) as unknown as RouterContext<string>;

// Cookieの設定
ctx.request.headers.set("Cookie", `session_id=...`);

// Request Body のモック (anyキャストが必要な場合が多い)
// deno-lint-ignore no-explicit-any
(ctx.request as any).body = {
  json: () => Promise.resolve({ key: "value" }),
};
```

### 6.3 JSRサブモジュールのインポート設定

テスト環境 (`src/testing/import_map_test.json`) で JSR
パッケージのサブモジュール（例:
`@std/encoding/base64`）を使用する場合、明示的なマッピングが必要になることがあります。

```json
{
  "imports": {
    "@std/encoding/base64": "jsr:@std/encoding@^1.0.0/base64",
    "@std/encoding": "jsr:@std/encoding@^1.0.0"
  }
}
```

### 6.4 テスト間のDOM汚染対策

`render`
したコンポーネントは、明示的にクリーンアップしないとDOMに残ることがあり、後続のテストに影響を与える可能性があります（例:
同一IDの要素が複数存在し、セレクタが失敗するなど）。

**対策**: 各テストケースの `finally` ブロック、または `afterEach` で必ず
`cleanup()` を呼び出してください。

```typescript
import { cleanup, render } from "@testing-library/react";

Deno.test("My Test", () => {
  try {
    render(<Component />);
    // ...
  } finally {
    cleanup(); // DOMをリセット
  }
});
```

## 7. 高度なトラブルシューティングとベストプラクティス (v2.2 追加 - Deno/Testing Library)

### 7.1 グローバルモックの競合回避 (Global Mock Conflicts)

Denoのテストランナーは並列実行される場合があり、個別のテストファイルで
`globalThis.fetch` を書き換える (`stub` する) と、他のテストと競合（Race
Condition）し、予期せぬ失敗を引き起こすことがあります。

**推奨される対策**: 個別のファイルで `stub(globalThis, 'fetch')`
するのではなく、全テストで共通して読み込まれる `setup_dom.ts`
内でモックロジックを一元管理し、リクエストURLに基づいてレスポンスを分岐させる方法が最も安全です。

```typescript
// src/testing/setup_dom.ts
globalThis.fetch = (input: RequestInfo | URL, _init?: RequestInit) => {
  const urlStr = input.toString();

  // APIごとの分岐
  if (urlStr.includes("/api/user")) {
    return Promise.resolve(new Response(JSON.stringify({...}), { status: 200 }));
  }
  
  // 未定義のURLは404
  return Promise.resolve(new Response("Not Found", { status: 404 }));
};
```

※ `fetch` モックは必ず `Promise.resolve` でラップした `Response`
を返してください。そうしないと型エラーや非同期待ちのタイミングずれが発生します。

### 7.2 ルーティングテストのパス不一致 (Routing Mismatches)

`AppRoutes`
などのルーティング定義をテストする場合、`<MemoryRouter initialEntries={["..."]}>`
で指定するパスは、実際のルート定義と**プレフィックスレベルで完全に一致**させる必要があります。

例: `AppRoutes.tsx` が `path="/:owner/:repo"` と定義されている場合:

- ❌ テストURL: `/repo/user/my-repo` （`/repo` は不要）
- ✅ テストURL: `/user/my-repo`

パスが一致しない場合、意図しないルート（例:
`ContentRouteComponent`）がマッチしてしまい、「設定が見つからない」といった無関係なエラーが発生してデバッグを困難にします。

### 7.3 フォーム入力の不安定さと回避策 (Form Input Stability)

Deno + HappyDOM 環境では、`fireEvent.change` などのイベント発火が React
のステート更新に反映されるタイミングが不安定な場合があります。これにより、「入力したはずの値が反映されずバリデーションエラーになる」といったテスト失敗が起きることがあります。

**回避策**:
「フォームに入力して保存する」という一連のフローをテストしたい場合、入力イベント(`fireEvent`)に固執せず、コンポーネントに初期値
(`initialData` Propsなど)
を注入してレンダリングし、**入力済みの状態から保存アクションのみをテストする**
設計に切り替えるのが有効です。これにより、DOMイベントの非同期性に起因するFlakyなテストを排除できます。

### 7.4 テキスト検索の部分一致 (Text Matching)

Testing Library の `findByText("text")` はデフォルトで **完全一致** かつ
**正規化されたテキストコンテンツ** を検索します。
HTML構造内に改行やアイコン、別のタグが含まれている場合（例:
`<div>Icon <br/> Text</div>`）、見た目は "Text" でも `findByText("Text")`
は失敗します。

**対策**:

- `{ exact: false }` オプションを使用する:
  `findByText("Text", { exact: false })`
- 正規表現を使用する: `findByText(/Text/)`
