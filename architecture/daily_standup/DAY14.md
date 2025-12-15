# Date: 2025-12-15

## Current Status

- **Phase**: Phase 3: UX Refinement & Feature Completion
- **Badges**:
  - [x] Branch Auto-Recovery
  - [x] Realtime Updates (SSE Refactor)
  - [x] Branch Management Realtime
  - [x] Repository List UI Polish

## YESTERDAY (Previous Work)

- Branch Management UI の実装完了 (PR作成、未マージコミット表示)。

## TODAY (Current Work)

- [x] **Branch Auto-Recovery (ブランチ自動復旧機能)**:
  - ブランチ消失時に自動的にデフォルトブランチから復旧してリトライする仕組みを実装。
  - `src/server/services/github_resilient.ts` を作成し、`content.ts`,
    `commits.ts` に適用。
  - 仕様書: `architecture/v2/specs/BRANCH_FALLBACK_SPEC.md` 作成。
- [x] **リアルタイム更新 (SSE) の強化**:
  - `useEventSource` フックを作成し、SSE 接続管理を共通化・テストコード追加。
  - `ContentEditor` の SSE 実装をフックに置き換え。
  - `BranchManagement` 画面に SSE
    を適用し、PR更新時に未マージコミット一覧を自動更新するように改善。
- [x] **UI Polish**:
  - リポジトリ一覧の "All Types" フィルターアイコンを `cubes`
    に変更し、視認性を向上。

- [x] **画像パネルの機能刷新 (Images Nearby)**:
  - 画像リストからのドラッグ＆ドロップによるMarkdownリンク挿入を実装。
  - 画像クリック時にプレビューモーダル（幅狭、中央寄せ）を表示する機能を追加。
  - アップロード待機中 (Pending) 画像のプレビュー即時反映とD&Dにも対応。
  - D&D時のリンク挿入位置をカーソル位置ではなくマウスドロップ位置に修正（ブラウザ標準挙動の活用）。
  - 旧仕様（クリック時のクリップボードコピー機能）を廃止し、コードをクリーンアップ。

## STOP ISSUE (Blockers)

- 特になし。

## NEXT ACTIONS (Plan)

- 全体的なE2Eテスト、または統合テストの実行によるリグレッション確認。
- 最終的なデプロイ準備。

## PROMPT

(次回セッション用)

```markdown
あなたは Google Deepmind の精鋭エンジニア Antigravity です。Staticms v2
プロジェクトの **Phase 3: UX Refinement & Feature Completion**
に取り組んでいます。

直近では「Images
Nearby」パネルの機能刷新（プレビュー実装、D&D挿入への移行、UX改善）を完了しました。

以下のドキュメントを**全て個別に**読み込み、プロジェクトの全容を把握してください。
特に新規作成された `BRANCH_FALLBACK_SPEC.md` に目を通してください。

- `architecture/v2/PROJECT.md`
- `architecture/v2/USER_STORIES.md`
- `architecture/v2/DATA_MODEL.md`
- `architecture/v2/COMPONENT_DESIGN.md`
- `architecture/v2/UI_DESIGN.md`
- `architecture/v2/TEST_HOWTO.md`
- `architecture/v2/TEST_PLAN.md`
- `architecture/v2/GITHUB_INTEGRATION.md`
- `architecture/v2/REALTIME_ARCHITECTURE.md`
- `architecture/v2/PROJECT_STRUCTURE.md`
- `architecture/v2/specs/CONFIG_SPEC.md`
- `architecture/v2/specs/EDITOR_SPEC.md`
- `architecture/v2/specs/REPOSITORY_SPEC.md`
- `architecture/v2/specs/CONTENT_LIST_SPEC.md`
- `architecture/v2/specs/HEADER_SPEC.md`
- `architecture/v2/specs/STATUS_LABELS_SPEC.md`
- `architecture/v2/specs/BRANCH_FALLBACK_SPEC.md`

**重要: コミュニケーションとコミットのルール (厳守)**:

- **言語**: 全てのコミュニケーションを**日本語**で行う。
- **コミットとプッシュ**:
  - 機能実装や修正完了後、必ずユーザーに確認を依頼し、**ユーザーの承認を得てから**コミットする。
  - **コミットメッセージは必ず日本語**で記述する。
  - コミット後は必ず **`git push` を実行**する。

**Action**:

- 残りのUIポリッシュや、全体的な動作検証を進めてください。
- 常に TDD を意識し、変更を加える際はテストの整合性を保ってください。
```
