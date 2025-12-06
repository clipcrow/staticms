# Deno + React テスト戦略について

このプロジェクトでは、Denoの標準テストランナーと
`@testing-library/react`、および `HappyDOM`
を組み合わせて、ブラウザライクな環境でReactコンポーネントやフックのテストを行っています。

## 1. セットアップと構成

### 環境セットアップ (`src/testing/setup_dom.ts`)

Deno内でブラウザ環境（DOM、Window、グローバルオブジェクト）をシミュレートするために
`HappyDOM` を使用しています。 このセットアップファイルは、テストファイル内で
**Reactテストライブラリやコンポーネントをインポートする前に**
インポートする必要があります。

```typescript
// 重要: これを最初にインポートしてください！
import "@/testing/setup_dom.ts";
import { render } from "@testing-library/react";
```

### 依存関係 (`deno.json`)

テストの依存関係は `deno.json`
で管理されています。インポート文を簡潔かつ標準化するためにインポートマップを使用しています。

- `@testing-library/react`: コンポーネントやフックのレンダリング用。
- `@happy-dom/global-registrator`: ブラウザ環境のポリフィル用。
- `@std/testing`: モック（Spy）や時間シミュレーション用。
- `@std/assert`: アサーション（検証）ユーティリティ。

また、パスエイリアス（例:
`"@/": "./src/"`）を使用して、インポートパスを簡素化しています。

## 2. ユーティリティ

共通のテストユーティリティは `src/testing/` に抽出されています。

### LocalStorage モック (`mock_local_storage.ts`)

標準の `localStorage`
はテスト実行間の永続性や挙動が扱いづらい場合があるため、またはメソッド（`setItem`,
`getItem`）をスパイしたい場合は、このユーティリティを使用してグローバルの
`localStorage` を完全に制御可能なインメモリ・モックに置き換えてください。

```typescript
import { setupLocalStorageMock } from "@/testing/mock_local_storage.ts";

const { mock, reset } = setupLocalStorageMock();

// テスト内で:
reset();
assertSpyCall(mock.setItem, 0, { args: ["key", "value"] });
```

### モックイベント (`create_mock_event.ts`)

イベントハンドラを直接呼び出す際に `as any`
キャストを避け、型安全性を確保するために `createMockEvent` を使用してください。

```typescript
import { createMockEvent } from "@/testing/create_mock_event.ts";

// 特定のプロパティをオーバーライドしたMouseEventを作成
const event = createMockEvent({ button: 2 });
handler.onMouseDown(event);
```

## 3. テストパターン

### コンポーネントテスト

- `@testing-library/react` の `render` を使用します。
- インタラクションの検証には `@std/testing/mock` の `spy()` を使用します。
- **分離**: テスト間での状態漏れを防ぐため、スパイは各 `t.step` の **内部で**
  定義してください。

```typescript
Deno.test("MyComponent", async (t) => {
  await t.step("calls onClick", () => {
    const onClick = spy();
    render(<Button onClick={onClick} />);

    const btn = screen.getByRole("button");
    fireEvent.click(btn);

    assertSpyCalls(onClick, 1);
    cleanup(); // DOMをクリーンアップする良い習慣
  });
});
```

### フックのテスト

- カスタムフックのテストには `renderHook` を使用します。
- 状態の更新は `act()` でラップします。

```typescript
const { result } = renderHook(() => useMyHook());
act(() => {
  result.current.doSomething();
});
assertEquals(result.current.value, "updated");
```

### 時間依存のテスト

タイマー（`setTimeout`、長押しなど）を含む機能の場合、`FakeTime` を使用します。
`using` キーワードを使用することで、ブロックを抜けた後に FakeTime
が自動的にリストアされます。

```typescript
import { FakeTime } from "@std/testing/time";

Deno.test("Long Press", async (t) => {
  await t.step("triggers after delay", () => {
    using time = new FakeTime();

    // ... イベントを発火 ...

    time.tick(500); // 時間を進める

    // ... 検証 ...
  });
});
```

## 4. ベストプラクティス

1. **Bare Specifiers（裸の識別子）を使用する**: `jsr:` や `npm:`
   URLを直接書くのではなく、`deno.json` で定義された名前（例:
   `import ... from "@std/assert"`）を使用してください。
2. **パスエイリアスを使用する**: プロジェクト内のファイルをインポートする際は
   `@/`（例: `import { Foo } from "@/components/Foo.tsx"`）を使用してください。
3. **クリーンな状態**: `localStorage` や DOM
   の状態は、前のテストステップの影響を受けている可能性があります。必要に応じて
   `reset()` ヘルパーや `cleanup()` を明示的に使用し、状態を管理してください。

## 5. ルーターと統合テストのベストプラクティス

ルーティングロジックを持つコンポーネント（「ページ」や「ルート」コンポーネント）をテストする際の推奨パターンです。

### Dependency Injection (DI) によるコンポーネントモック

ルートコンポーネントが複雑な子コンポーネント（非同期データの取得などを行うもの）をレンダリングする場合、テストの安定性を保つために「依存性の注入」パターンが有効です。

**実装例 (`MangaListRoute.tsx`):**

```typescript
interface Props {
  // テスト時にモックコンポーネントを渡せるようにする
  MangaListComponent?: React.ComponentType<any>;
}

export default function MangaListRoute(
  { MangaListComponent = MangaList, ...props }: Props,
) {
  // デフォルトでは実際のコンポーネントを使用
  return <MangaListComponent {...props} />;
}
```

**テスト例:**

```typescript
const MockMangaList = (props: any) => (
  <div data-testid="mock-list">{props.someProp}</div>
);

render(
  <MangaListRoute
    MangaListComponent={MockMangaList}
    {...otherProps}
  />,
);
```

これにより、DOMの構造に依存せず、正確にPropsが渡されているか、ルーティングロジックが機能しているかを検証できます。

### ルーターのテストとURL検証

`react-router-dom` の `MemoryRouter`
を使用してルーティングをシミュレートします。現在のパスを検証するには、ヘルパーコンポーネント
`LocationDisplay` を利用します。

```typescript
import { LocationDisplay } from "@/testing/LocationDisplay.tsx";

render(
  <MemoryRouter initialEntries={["/initial/path"]}>
    <Routes>
      <Route path="/" element={<MyRoute />} />
      {/* ... */}
    </Routes>
    {/* ルーター内に配置して現在のパスを表示 */}
    <LocationDisplay />
  </MemoryRouter>,
);

// URL遷移の検証
await waitFor(() => {
  assertEquals(
    screen.getByTestId("location-display").textContent,
    "/expected/path",
  );
});
```

### Denoテストランナーの設定とリソースリーク回避

非同期処理やタイマーを含むテスト（React Testing Libraryの `waitFor`
など）を実行する場合、Denoが「リソースリーク（Resource
Leak）」エラー（タイマーが完了していない等）を報告することがあります。これを回避するには、テスト設定でサニタイザーを無効化し、明示的に
`cleanup()` を呼び出します。

```typescript
Deno.test({
  name: "My Route Test",
  sanitizeOps: false, // 非同期操作の完了待ちを無効化
  sanitizeResources: false, // リソースリークチェックを無効化
  fn: async (t) => {
    const setup = () => {
      cleanup(); // 前のテストのDOMをクリーンアップ
      // ... render ...
    };
    // ...
  },
});
```

## 6. テストしやすいアプリケーション設計 (Design for Testability)

テスト容易性を高めるためのコーディング規約と推奨パターンです。

### 1. コンポーネントの責務分離 (Container/Presenter パターン)

コンポーネントを「データ管理・ロジック（Container）」と「表示（Presenter）」の2つに分けるとテストが劇的に簡単になります。

- **悪い例**: 一つのコンポーネント内でデータ取得
  (`fetch`)、状態管理、複雑なDOMレンダリングを全て行う。
- **良い例**:
  - **Container**: `fetch`
    や状態管理を行い、データをPropsとして子コンポーネントに渡す。
  - **Presenter**: 受け取ったPropsを表示するだけ（副作用を持たない）。

こうすることで、Containerのテストは「データが正しく渡されるか」に集中でき（子をモック化）、Presenterのテストは「表示が正しいか」に集中できます。

### 2. 子コンポーネントの注入 (Dependency Injection)

特にRouteコンポーネントなどのContainerにおいて、子コンポーネントを固定の
`import` ではなく、Props経由で注入可能（デフォルト引数を使用）に設計します。

```typescript
// ChildComponentをPropsで受け取る（デフォルトは本物）
export default function MyContainer({ Child = RealChildComponent }: Props) {
  const data = useData();
  return <Child data={data} />;
}
```

これにより、テストコード側で `RealChildComponent`
の代わりに軽量なMockを渡すことができ、深いコンポーネントツリーのレンダリングや内部動作に依存しないテストが可能になります。

### 3. グローバルオブジェクトへの依存を避ける

`window` や `document`、`localStorage`
への直接アクセスは極力避け、フックやユーティリティ関数にラップするか、Propsで受け取るようにします。これにより、テスト時にモック（`spy`）やスタブの挿入が容易になります。

### 4. Props型の公開 (Exporting Props)

コンポーネントのProps型定義（`interface` や `type`）は必ず `export`
してください。これにより、親コンポーネントがDI（依存性の注入）用の型定義を行ったり、テストコードでモックデータを作成したりする際に、型安全性を維持できます。

**推奨パターン:**

```typescript
// components/MyChild.tsx
export interface MyChildProps { ... } // exportする
export default function MyChild(props: MyChildProps) { ... }
```

```typescript
// routes/MyRoute.tsx
import MyChild, { MyChildProps } from "@/components/MyChild.tsx";

interface ContainerProps {
  // 正しいProps型を使用して、互換性のあるコンポーネントのみを受け付けるようにする
  ChildComponent?: React.ComponentType<MyChildProps>;
}

export default function MyRoute({ ChildComponent = MyChild }: ContainerProps) {
  // ...
}
```

## 7. 実践的なテストテクニック (Tips & Tricks)

### 1. Deno + React Testing Library でのリソースリーク回避

多くのテストを一括実行（`deno task test`）する場合、`useLongPress`
のようなタイマーを使用するフックや、非同期のイベントハンドラを含むコンポーネントで「Resource
Leak」や「Ops
Leak」エラーが発生しやすくなります。これを防ぐには、テストケース全体に対してサニタイザーを無効にします。

```typescript
Deno.test({
  name: "Complex Component Test",
  sanitizeOps: false, // 非クリティカルな非同期Opsの残存を許容
  sanitizeResources: false, // タイマーリソース等の残存を許容
  fn: async (t) => {
    // ... setup & cleanupを確実に行う ...
  },
});
```

※
ただし、これはあくまで「テスト実行」を通すための措置であり、プロダクションコードの重大なメモリリークを隠蔽しないよう注意が必要です。明示的な
`cleanup()` 呼び出しを推奨します。

### 2. カスタムフックの統合テストには `fireEvent` より詳細なシミュレーションを

`click`
イベントだけに頼るのではなく、実装詳細に近いイベントフローを再現が必要な場合があります。例えば
`useLongPress` は `mouseDown` -> `mouseUp` (または `touchStart` -> `touchEnd`)
のシーケンスに依存しています。

```typescript
// useLongPressを使用している要素のクリックテスト
const target = screen.getByTestId("target");

// fireEvent.click(target) だけでは不十分な場合がある
fireEvent.mouseDown(target);
fireEvent.mouseUp(target);
```

### 3. テストにおける `App` コンポーネントの責務分離

`App.tsx` 内で `BrowserRouter` や `Routes`
を直接定義すると、ルーティングのテストが困難になります。ルーティング定義部分を
`AppRoutes` として分離・エクスポートし、テストコードで `MemoryRouter`
から利用できるようにします。

**App.tsx:**

```typescript
export function AppRoutes(props: Dependencies) {
  return <Routes>...</Routes>;
}

export default function App() {
  return <BrowserRouter><AppRoutes ... /></BrowserRouter>;
}
```

**App.test.tsx:**

```typescript
render(
  <MemoryRouter initialEntries={["/target/path"]}>
    <AppRoutes {...mockDeps} />
  </MemoryRouter>,
);
```

### 4. `main.tsx` へのエントリーポイント分離

サイドエフェクト（`createRoot(...).render(...)`）を含むコードは、インポートされただけで実行されてしまうため、テスト時に意図しないDOM操作を引き起こす原因になります。
コンポーネント定義 (`App.tsx`) と、それをDOMにマウントするエントリーポイント
(`main.tsx`) を分離するのがベストプラクティスです。
