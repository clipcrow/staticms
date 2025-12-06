# Staticms v2

いきあたりばったりに、機能を考えながら作っていたら、どうも見通しの悪い作りになってしまったように思う。
よって「Staticms (v1)」の現時点の成果物を総点検して仕様を練り直し、 「Staticms
v2」を作ることにした。
活かせるものは活かし、一方で新しく計画的に作りあげることで、今後に機能を積み上げる土台としてしっかりさせる。

## 実装戦略

以下のステップに従い、堅実かつ効率的に Staticms2 への移行を進める。
原則として、各ステージでテストによる検証を行い、動く状態を維持しながら機能を追加していく。

### Phase 1: 仕様分析とドキュメント化 (完了)

既存コードの振る舞いを分析し、詳細な仕様書として `architecture/v1/`
以下に集約した。 これにより、何を作るべきか（What）が明確になった。

**成果物一覧 (v1)**:

- [**System Overview**](./v1/SYSTEM_OVERVIEW.md):
  システム全体構成図とデータフロー概要。
- [**GitHub Integration Spec**](./v1/GITHUB_SPEC.md): 認証戦略とPR作成フロー。
- [**Server API Spec**](./v1/SERVER_API.md): エンドポイント定義。
- [**Data Model**](./v1/DATA_MODEL.md): KV, LocalStorage, Config スキーマ。
- [**Frontend Spec**](./v1/FRONTEND_SPEC.md): コンポーネント構造とルーティング。
- [**User Stories**](./v1/USER_STORIES.md):
  E2Eテストのシナリオの元となるユーザーストーリー。

### Phase 2: Staticms2 アーキテクチャ設計

新プロジェクト `Staticms2` の土台を設計する。

- **技術選定**:
  - **Bundler**: `deno bundle` (Runtime API or CLI) の活用。Deno v2.4+
    の新機能を積極的に採用する。
  - **CSS**: **Semantic-UI** を継続採用。`ui icon button`
    のような言語的記述の強みを活かし、独自スタイル追加時もこの思想（Semantic
    CSS）を踏襲する。必要に応じてSCSS等のプリプロセッサ導入を検討。
  - **E2E Test**: Deno向け次世代ヘッドレスブラウザツール
    **[Astral](https://jsr.io/@astral/astral)** を採用。
  - **Unit Test**: `deno test` + `testing-library` + `HappyDOM` (既存資産
    `/src/testing` を全面的に活用)。

- **ディレクトリ構造刷新**:
  - `src/` 以下の再構成。Container/Presenter
    パターンを意識したコンポーネント配置。
  - テスト容易性を高めるDI（依存性注入）パターンの標準化。

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
