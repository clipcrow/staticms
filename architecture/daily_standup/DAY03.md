# Daily Standup - DAY 03 (Revision)

**日付**: 2025-12-08 **フェーズ**: Phase 2.5: UI Re-implementation with v1
Components

## YESTERDAY (Actually TODAY)

**趣旨**: v2 のバックエンド・アーキテクチャ上で、v1 の成熟した UI/UX
を再現するため、v1 のソースコード資産 (`LegacyRepositorySelector`,
`ContentList`, `ContentEditor` 等) を移植し、Adapter
パターンを用いて統合しました。 ユーザーの要望通り、機能よりも UI
の移行を最優先し、全画面のルック＆フィールを v1 と同等に復元しました。

**🌟 戦略的マイルストーン**:

- **v1 UI Restoration**: 以下の画面コンポーネントを v1
  から移植し、動作させました。
  - **Repository Selector**: リポジトリ一覧と追加。
  - **Content Dashboard**: コンテンツ設定 (Collection/Singleton) の一覧。
  - **Article List**: 記事一覧と検索・追加。
  - **Content Editor**: FrontMatter と Markdown の編集、プレビュー、サイドバー。
  - **Content Settings**: 設定編集画面のGUI。
- **Spec Documentation**: 実装の元となった v1
  の仕様を詳細に解析し、`architecture/v2/specs/` 配下にドキュメント化しました。

**完了したタスク**:

- **UI Components Porting**:
  - `src/app/components/common/` に `Header`, `ContentList`, `ArticleList`,
    `ContentSettings` を作成。
  - `src/app/components/repository/` に `RepositorySelector` を作成。
  - `src/app/components/editor/` に v1 関連ファイルを配置。
- **Integration**:
  - `src/app/features/` 配下のコンテナコンポーネント (`ContentBrowser`,
    `ContentEditor` 等) を、移植した v1 コンポーネントのラッパーとして再実装。
  - v1 -> v2, v2 -> v1 のデータ変換アダプターを実装。
- **Fixes**:
  - `RequireAuth` の無限リダイレクトループを修正 (v1 `useAuth` の IF
    変更に対応)。
  - 各画面でのヘッダー重複表示を解消。
- **Documentation**:
  - `architecture/v2/specs/EDITOR_SPEC.md`
  - `architecture/v2/specs/CONTENT_LIST_SPEC.md`
  - `architecture/v2/specs/REPOSITORY_SPEC.md`

## 💡 気づきと改善点

**技術的なハマりポイントと解決策**:

- **Header Duplication**: v2 のルーター側 (`ContentBrowser`) と、移植した v1
  コンポーネント (`ContentList` etc)
  の両方がヘッダーを持っていたため、二重表示が発生。 -> v2
  側のヘッダーを削除し、v1 コンポーネントに委譲することで解決。
- **Auth Hook Mismatch**: v1 の `useAuth` は `user` オブジェクトを返さず
  `isAuthenticated` フラグを返す仕様だったため、v2 の `RequireAuth` が誤作動。
  -> `RequireAuth` を修正して解決。

## STOP ISSUE (今後の課題)

**趣旨**: UI の見た目は整ったが、内部ロジックの一部やテストが追いついていない。

- **E2E テスト全滅**: DOM 構造が v1 ベースに刷新されたため、従来の v2 用 E2E
  テストは Selector が一致せず全て失敗する状態。
- **未実装機能**: UI 上のボタンはあるが機能しないものがある（特に `ArticleList`
  の削除ボタン、`ContentEditor` の画像アップロードなど）。

## TOMORROW (Next Actions)

**趣旨**: 仕様書 (`specs/`) に基づき、未実装の機能を埋め、品質を高める。

**目標**:

1. **仕様の完全実装**:
   - `ContentImages` (サイドバー) の完全動作。
   - `MarkdownEditor` への D&D 画像アップロード実装。
   - `ArticleList` での削除機能実装。
2. **E2E テストの修復**:
   - Playwright (または現在のテストツール) のセレクターを v1 UI
     に合わせて更新し、Green に戻す。

---

## 🤖 明日用のプロンプト

```markdown
現在、StaticMS v2 プロジェクトは **Phase 2.5: UI Polish & Feature Completion**
の段階です。 主要な画面は v1 コンポーネントの移植により UI
が刷新されましたが、いくつかの機能（画像アップロード、削除など）がまだ結合されておらず、E2Eテストも壊れている状態です。

前回までに、v1 の仕様を `architecture/v2/specs/` 配下にドキュメント化しました。

本日は **仕様書に基づいた機能の完全実装** を行います。

**Workflow**:

1. **Review Specs**:
   - `architecture/v2/specs/EDITOR_SPEC.md`, `CONTENT_LIST_SPEC.md`,
     `REPOSITORY_SPEC.md` を読み込みます。
2. **Implement Missing Features**:
   - **画像アップロード**: `ContentImages` と `MarkdownEditor`
     の実装を行い、実際に画像を GitHub (またはドラフト)
     に保存できるようにします。
   - **記事削除**: `ArticleList` のゴミ箱ボタンを実装します。
   - **サイドバー**: `ContentEditor` のサイドバー情報を正しく表示させます。
3. **Refactor & Test**:
   - アダプターコードを整理し、E2Eテストを修復して通るようにします。

**Task**: まず `architecture/v2/specs/EDITOR_SPEC.md`
を確認し、画像アップロード機能の実装から着手してください。
```
