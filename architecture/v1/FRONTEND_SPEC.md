# Frontend Specification

Staticms のフロントエンドアーキテクチャの仕様詳解です。 React Router
を中核に据え、URL駆動の状態遷移を実現しています。

## 1. ディレクトリ構造と責務分離

`src/app/` 以下は機能的な役割に基づいて明確に分離されています。

### 1.1 `bindings/` (Route Controllers)

React Router の `Route`
コンポーネントから直接レンダリングされるラッパーコンポーネント群です。
**主な責務**:

- **URL パラメータの解析**: `useParams` を使用して `owner`, `repo`, `path`
  などを取得します。
- **データフェッチのトリガー**: 必要な Hooks (`useRemoteContent` 等)
  を初期化します。
- **コンポーネントの構築**: 取得したデータとコールバックを `components/` 内の UI
  コンポーネントに渡してレンダリングします。
- **ロジックの注入**:
  具体的なビジネスロジック（保存時の挙動など）をここで定義し、Props
  として下位に渡します。

### 1.2 `components/` (UI Components)

アプリケーションのビューを構成するコンポーネント群です。可能な限りプレゼンテーションロジックに集中させます。

- **`RepositorySelector`**: リポジトリ一覧表示・選択。
- **`ContentList`, `ArticleList`**: ファイルや記事の一覧表示。
- **`ContentEditor`**: 編集画面のルートコンポーネント。以下を統合します。
  - **`Header`**: ナビゲーションとアクションボタン（保存、リセット）。
  - **`MarkdownEditor`**: 本文編集エリア。
  - **`FrontMatter...`**: メタデータ編集エリア。
  - **`ContentImages`**: 画像管理サイドバー。

### 1.3 `hooks/` (Custom Hooks)

状態管理と副作用をカプセル化したロジック群です。

- **`useAuth`**: 認証ロジック。
- **`useDraft`**: LocalStorage との同期、自動保存、PR作成フローの管理。
- **`useRemoteContent`**: GitHub API からのデータ取得とキャッシュ管理。

## 2. ルーティング設計

URL
はアプリケーションの状態を完全に表現するように設計されており、リロードしても常に同じ画面・状態に復帰できます。

| Path Pattern               | Component (Binding)      | Description                  |
| :------------------------- | :----------------------- | :--------------------------- |
| `/`                        | `RepositorySelector`     | リポジトリ選択画面           |
| `/:owner/:repo`            | `ContentListWrapper`     | コンテンツ設定一覧の表示     |
| `/:owner/:repo/add`        | `ContentSettingsWrapper` | 設定(`config`)の追加・編集   |
| `/:owner/:repo/:contentId` | `ContentDispatcher`      | コンテンツ種別による振り分け |
| `.../:articleId`           | `ArticleEditorRoute`     | コレクション内の記事編集     |

**ContentDispatcher の役割**: `contentId` (URL上のパスの一部) に対応する設定を
`useContentConfig` で検索し、その `type`
に応じて適切なエディタやリストへ誘導します。

- `collection-files` / `collection-dirs`: -> `CollectionListRoute` (一覧表示)
- `singleton-file`: -> `SingletonEditorRoute` (直接エディタ表示)

## 3. 状態管理戦略

Redux などのグローバルステートライブラリは使用せず、React
の標準機能を活用しています。

1. **Server State**: `useRemoteContent`
   などのフック内で管理。SWR的なパターン（独自実装）を使用。
2. **Local UI State**: 各コンポーネントの `useState`。
3. **Draft State (Persistent)**: `localStorage`
   を利用した永続化ステート。`useDraft`
   フックがこれを管理し、初期ロード時にコンポーネントの状態 (`initialBody` 等)
   とマージして復元します。

## 4. コンポーネント概要

### `ContentEditor`

最も複雑なコンポーネントであり、以下の Props を受け取って動作します。

- `initialBody`, `initialFrontMatter`:
  初期表示データ（リモートまたはドラフト）。
- `onSave`: 保存ボタン押下時のコールバック。
- `onImageUpload`: 画像ドロップ時のコールバック。
- `isDraft`, `prUrl`: 現在の状態表示用フラグ。

この分離により、`ContentEditor`
自体はデータソースが「新規作成」なのか「既存ファイル」なのか、あるいは「GitHubへの保存」なのか「ローカルテスト」なのかを知る必要がありません。
