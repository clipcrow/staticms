# Daily Standup - DAY 04

**日付**: 2025-12-08 **フェーズ**: Phase 2.6: State Management & UI Polish

## YESTERDAY (Actually TODAY)

**趣旨**: UI
の見た目（v1移植）が整った後、コアとなる「編集・ドラフト機能」の信頼性を高めるための修正を行いました。特に「Clean/Dirty」の状態遷移を厳格化し、ユーザーが誤ってドラフトを作成したり、保存ステータスを誤認したりしないように改善しました。また、React
Router を最新の v7 にアップグレードしました。

**🌟 戦略的マイルストーン**:

- **Draft Lifecycle Refinement**:
  - `ContentEditor` における Clean (同期済み) / Dirty (未保存)
    の状態管理を厳密化。
  - リモートと同じ内容の場合はドラフトを `localStorage`
    から自動削除し、意図せぬ「Unsaved」表示を防ぐロジックを実装。
- **Status Visibility**:
  - `ContentList` (Collection), `ArticleList`, `RepositorySelector`
    の全階層において、ドラフト数やPR数を集計して表示 (`Draft (N)` /
    `PR Open (N)`)。
  - ユーザーはどのリポジトリ・コレクションに作業中の項目があるか一目で分かるようになった。
- **Tech Stack Update**:
  - `react-router-dom` を v7 (7.0.2)
    にアップグレードし、将来の技術的負債を解消。

**完了したタスク**:

- **State Management**:
  - `useDraft` フックに `isSynced` フラグを追加し、保存ロジックを最適化。
  - エディタの「Reset」「Save/Create PR」ボタンの活性化条件を修正。
- **UI Enhancements**:
  - `StatusBadge` コンポーネントの拡張（件数表示対応）。
  - `RepositorySelector` へのステータス集計ロジック（`getRepoStatus`）の適用。
- **Documentation**:
  - `STATUS_LABELS_SPEC.md` 更新（集計表示仕様）。
  - `CONTENT_LIST_SPEC.md`, `REPOSITORY_SPEC.md` 更新。
- **Infrastructure**:
  - `deno.json` 依存関係更新 (React Router v7)。

## 💡 気づきと改善点

**技術的なハマりポイントと解決策**:

- **Draft Key Consistency**:
  コンテンツエディタと一覧画面でドラフトキーの生成ロジックを統一する必要があった。`utils.ts`
  の `getContentStatus` や `getRepoStatus`
  が強力で、これを利用することで解決した。
- **Version Pinning**: Deno 環境下の npm
  パッケージ読み込みにおいて、バージョンを `^` 指定ではなく固定 (`7.0.2`)
  にすることで安定性を確保した。

## STOP ISSUE (今後の課題)

**趣旨**:
編集機能のコアは安定したが、ドラフトにおける「メディア（画像）」の扱いと、PR作成後のフローがまだ完全ではない。

- **Image Handling**: まだ画像アップロード機能がエディタUIとバックエンド（GitHub
  API/Draft）に完全に統合されていない（ボタンは効かない可能性がある）。
- **Real GitHub Interaction**: PR作成は実装されているが、その後の Webhook
  によるロック解除などの E2E フロー検証が必要。
- **E2E Tests**: UI刷新に伴い壊れたテストの修復が手つかず。

## TODAY (Next Actions)

**趣旨**: 編集体験の最後のピースである「画像管理」の実装と、品質保証（テスト）。

**目標**:

1. **画像アップロード実装**:
   - エディタへのD&D、サイドバーでの画像管理の実装。
2. **E2E テストの修復**:
   - Phase 2.5 で壊れたテストを直し、リグレッションを防ぐ。
3. **Real-time Updates (SSE)**:
   - リポジトリ権限変更やPRマージを検知する仕組みの検討/実装。

---

## 🤖 明日用のプロンプト

```markdown
現在、StaticMS v2 プロジェクトは **Phase 2.7: Feature Completion (Image Handling
& E2E)** の段階です。
主要なUIコンポーネントの移植と、コンテンツ編集のコアとなる「Clean/Dirty管理」「ステータス表示」の実装が完了しました。
しかし、**画像アップロード機能**（エディタへのD&D、サイドバー管理）が未実装であり、またUI刷新に伴い
**E2Eテスト** が多数失敗している状態です。

本日は、これらの残課題を解消し、編集機能を完成させます。

**Workflow**:

1. **Documentation Loading**:
   - 以下のドキュメントを**全て**読み込み、仕様と現状を完全に把握してください。
     - `architecture/v2/PROJECT.md`
     - `architecture/v2/USER_STORIES.md`
     - `architecture/v2/DATA_MODEL.md`
     - `architecture/v2/COMPONENT_DESIGN.md`
     - `architecture/v2/PROJECT_STRUCTURE.md`
     - `architecture/v2/specs/EDITOR_SPEC.md` (特に Image Handling セクション)
     - `architecture/v2/specs/CONTENT_LIST_SPEC.md`
     - `architecture/v2/specs/REPOSITORY_SPEC.md`
     - `src/app/features/editor/ContentEditor.tsx` (現状の実装)
     - `src/app/features/editor/ContentImages.tsx` (現状の実装)
     - `src/app/components/editor/MarkdownEditor.tsx` (現状の実装)

2. **Implement Image Handling**:
   - **D&D Upload**: `MarkdownEditor`
     に画像をドラッグ＆ドロップした際、`ContentEditor` 側のステータス (Draft)
     に画像データを追加するロジックを統合します。
   - **Draft Storage**: 画像データ（Base64等）も `localStorage`
     のドラフト情報の一部として保存・復元されるようにします。
   - **Sidebar Preview**: `ContentImages`
     コンポーネントで、アップロードされた（または記事に含まれる）画像一覧を確認できるようにします。

3. **Fix E2E Tests**:
   - `e2e/test_editor.ts` (仮) などの主要なE2Eテストを実行し、セレクタ更新などで
     Pass するように修正します。

**Work Context**:

- 特に重要なドキュメント: `architecture/v2/specs/EDITOR_SPEC.md`
- 最初に修正するファイル: `src/app/features/editor/ContentEditor.tsx`

**Task**: `architecture/v2/specs/EDITOR_SPEC.md` に基づき、`ContentEditor.tsx`
および `MarkdownEditor.tsx`
に画像アップロード機能を実装し、ドラフト保存まで動作するようにしてください。その後、関連するE2Eテストを修復してください。
```
