# Staticms v2

いきあたりばったりに、機能を考えながら作っていたら、どうも見通しの悪い作りになってしまったように思う。
よって「Staticms (v1)」の現時点の成果物を総点検して仕様を練り直し、 「Staticms
v2」を作ることにした。
活かせるものは活かし、一方で新しく計画的に作りあげることで、今後に機能を積み上げる土台としてしっかりさせる。

## 実装戦略

以下のステップに従い、堅実かつ効率的に Staticms2 への移行を進める。
原則として、各ステージでテストによる検証を行い、動く状態を維持しながら機能を追加していく。

### Phase 1: 仕様分析とドキュメント化 (完了)

**[Staticms V2 Documents](./v2/README.md)**

新しいドキュメント体系は `architecture/v2/` 以下に集約されています。

- **[Project Definition](./v2/PROJECT.md)**: 製品ビジョンとコアコンセプト。
- **[User Stories](./v2/USER_STORIES.md)**: 要件定義とE2Eテストシナリオ。
- **[UI Design](./v2/UI_DESIGN.md)**: 画面遷移図とUI仕様。
- **[Test Plan](./v2/TEST_PLAN.md)**: Astral/HappyDOMを用いたテスト戦略。
- **[Project Structure](./v2/PROJECT_STRUCTURE.md)**:
  ディレクトリ構成とモジュール設計。
- **[Build Strategy](./v2/BUILD_STRATEGY.md)**: ビルドパイプライン。

### Phase 2: Staticms2 アーキテクチャ設計 (完了)

新プロジェクト `Staticms V2` の土台設計は完了し、実装フェーズへ移行済みです。

- **技術選定**:
  - **Bundler**: `esbuild` (Deno bundle廃止に伴う変更)。
  - **CSS**: **Semantic-UI**。
  - **E2E Test**: **Astral**。
  - **Unit Test**: `deno test` + `testing-library` + `HappyDOM`。

- **ディレクトリ構造**: `src/` 以下を Clean Architecture と Feature-based Folder
  Structure を組み合わせた構成に刷新。

### Phase 3: 基盤構築とE2Eテスト作成

1. **プロジェクト初期化**: 新しいディレクトリ構造で Deno プロジェクトを作成。
2. **ビルド環境整備**: `deno.json` に新 `bundle` コマンドや `dev` タスクを定義。
3. **テスト基盤セットアップ**:
   - `src/testing` のユーティリティ（`setup_dom.ts`,
     `mock_local_storage.ts`等）を配置。
   - **Astral** のセットアップと、簡単なブラウザ操作テストの動作確認。
4. **E2Eテストケース実装**: `USER_STORIES.md`
   に基づいたメインシナリオのE2Eテストを **失敗するテスト（Red）**
   として実装する。
   - 例: ログイン -> リポジトリ選択 -> エディタ表示 -> 保存。

### Phase 4: TDDによる実装サイクル

各機能を以下のサイクルで実装し、Phase 3
で作成したE2Eテストをパス（Green）させることを目指す。

1. **機能単位の設計**: `SERVER_API.md` や `FRONTEND_SPEC.md`
   から実装対象を切り出す。
2. **ユニットテスト作成**:
   - `/src/testing/README.md`
     の指針に従い、コンポーネントテストやフックテストを作成する。
   - DIパターンを活用し、深い階層でもテストしやすい構造にする。
3. **実装**: テストを通すための最小限の実装を行う。
4. **リファクタリング**: コードを整理する。

**実装順序（案）**:

1. **Server Core**: 認証、KV接続、GitHub APIプロキシ。
2. **Client Core**: React Router 設定、Auth Hook。
3. **Draft System**: LocalStorage との同期ロジック。
4. **Editor UI**:
   Markdownエディタ、サイドバー、画像アップロード（Semantic-UIベースで構築）。
5. **Sync Logic**: PR作成フロー、Webhook/SSE。

### Phase 5: 総仕上げ

- E2Eテスト (Astral) の完全パス確認。
- パフォーマンスチューニング。
- ドキュメント整備（README, 利用ガイド）。
