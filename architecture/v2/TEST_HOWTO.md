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
