# Component Design & Styling Strategy

Staticms v2 では、UIの一貫性と開発効率を両立するため、Semantic UI (Fomantic UI)
をベースとしつつ、React コンポーネントによる強力な抽象化層を設けます。

## 1. デザイン原則

1. **Semantic UI is the base**: スタイルの基本は Semantic UI のクラス名体系
   (`ui button primary` 等)
   に従います。これにより、「言語的」で可読性の高いコードベースを維持します。
2. **Encapsulation (カプセル化)**: `ui ...`
   というクラス名を直接使用するのは、原則として `src/app/components/common`
   配下の **Primitive Components**
   に限定します。Featureコンポーネント等の上位層では、これらの Primitive
   Components を組み合わせることで UI
   を構築し、クラス名を直接記述することを避けます。

3. **Container / Presenter Pattern**:
   ロジック（状態管理、データ取得）と表示（スタイル、レイアウト）を明確に分離します。
4. **Light Mode Only**: UI
   は常にライトモードで提供します。ダークモードはサポートせず、`prefers-color-scheme`
   メディアクエリへの応答もしません。これは Markdown エディタ (CodeMirror 等)
   のシンタックスハイライトにおける可読性を最優先するためです。

## 2. Directory Structure Review

```
src/app/
├── components/
│   ├── common/           # Primitive Components (Atoms / Molecules)
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Modal.tsx
│   │   └── ...
│   ├── layout/           # Layout Components (Templates)
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   └── PageContainer.tsx
│   └── editor/           # Editor Domain Components (Organisms)
│       ├── MarkdownPreview.tsx
│       ├── FrontMatterPanel.tsx
│       └── ImageGallery.tsx
└── features/             # Business Logic Containers (Pages)
    ├── auth/             # RequireAuth.tsx 等 (Container)
    ├── content-browser/  # "ContentListWrapper" 等のロジック
    └── content-editor/   # "ContentEditorWrapper" 等のロジック
```

## 3. Primitive Components 設計 (Semantic UI Wrappers)

`common` ディレクトリに配置するコンポーネントの設計案です。これらは `className`
prop を受け入れつつも、主要なスタイルバリエーションを Props として提供します。

### 3.1 Button

```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost"; // Semantic UI color mapping
  size?: "mini" | "small" | "medium" | "large";
  icon?: string; // Icon name (e.g., "edit", "trash")
  loading?: boolean;
  fluid?: boolean; // width: 100%
  circular?: boolean;
}

// Usage: <Button variant="primary" icon="save" onClick={save}>Save</Button>
// Output: <button class="ui primary icon button">...</button>
```

### 3.2 Input

```typescript
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: string;
  iconPosition?: "left" | "right";
  loading?: boolean;
  error?: boolean;
  fluid?: boolean;
  label?: string; // Form label if needed
}

// Usage: <Input icon="search" placeholder="Search..." />
// Output: <div class="ui icon input"><i class="search icon"></i><input ... /></div>
```

### 3.3 Card (For Content List Items)

リスト表示などで多用されるカードUI。

```typescript
interface CardProps {
  header: React.ReactNode;
  meta?: React.ReactNode;
  description?: React.ReactNode;
  extra?: React.ReactNode;
  fluid?: boolean;
  onClick?: () => void;
}
```

### 3.4 Modal (Confirmations)

ポータルを使用したモーダルダイアログ。

```typescript
interface ModalProps {
  open: boolean;
  onClose: () => void;
  header: string;
  content: React.ReactNode;
  actions: React.ReactNode; // Usually Buttons
  size?: "mini" | "small" | "large";
}
```

````
### 3.5 Auth Guard (RequireAuth)

認証状態を監視し、未認証ユーザーをリダイレクトするラッパーコンポーネント。

```tsx
// src/app/features/auth/RequireAuth.tsx
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  // ... redirect logic
  return <>{children}</>;
}
````

## 4. Container / Presenter 実装例

コンテンツ一覧画面 (`features/content-browser`) を例にします。

### Presenter: `ContentList.tsx`

データの表示のみに専念。ローディング状態や空の状態もハンドリングします。

```tsx
// src/app/features/content-browser/ContentList.tsx
import { Loader } from "@/components/common/Loader";
import { Card } from "@/components/common/Card";

interface ContentListProps {
  items: ContentItem[];
  loading: boolean;
  onSelect: (item: ContentItem) => void;
}

export function ContentList({ items, loading, onSelect }: ContentListProps) {
  if (loading) return <Loader active inline="centered" />;
  if (items.length === 0) return <div>No contents found.</div>;

  return (
    <div className="ui cards">
      {items.map((item) => (
        <Card
          key={item.sha}
          header={item.name}
          meta={item.updatedAt}
          onClick={() => onSelect(item)}
        />
      ))}
    </div>
  );
}
```

### Container: `ContentBrowser.tsx` (or `Route`)

データ取得とイベントハンドリングを担当。

```tsx
// src/app/features/content-browser/ContentBrowser.tsx
import { useRemoteContent } from "@/app/hooks/useRemoteContent";
import { ContentList } from "./ContentList";

export function ContentBrowser() {
  const { data, isLoading } = useRemoteContent();
  const navigate = useNavigate();

  const handleSelect = (item: ContentItem) => {
    navigate(item.path);
  };

  return (
    <ContentList
      items={data?.files || []}
      loading={isLoading}
      onSelect={handleSelect}
    />
  );
}
```

## 5. CSS Strategy

### Global Styles (`src/app/styles/index.css`)

Semantic UI
のデフォルトスタイルのうち、アプリケーション全体で上書きが必要なもの（フォント設定、ダークモード対応のベース変数など）を記述します。

### Feature Scoped Styles

特定のFeatureでしか使わない複雑なスタイル（例:
Markdownエディタのプレビューエリアの微調整など）は、CSSファイルとして読み込むか、Reactの
`style` オブジェクトで対応します。 Deno bundle 環境下では CSS Modules
のサポートが限定的である可能性があるため、**BEMライクなプレフィックス**
(`.ContentEditor_previewArea` 等) を付けた通常の CSS
クラス定義を推奨します。あるいは、標準的な `ui ...`
クラスとの競合を避ける記述を心がけます。
