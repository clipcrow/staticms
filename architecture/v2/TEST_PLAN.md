# Test Plan

Staticms v2 における品質保証の全体像です。
「動く状態を維持する」ために、どのようなテストを、いつ、どのように実行するかを定義します。

## 1. Testing Pyramid Strategy

テストピラミッドの原則に従い、コストと実行速度のバランスを取ります。

| Layer           | Tool                            | Scope                                                   | 実行頻度                  | 目的                                         |
| :-------------- | :------------------------------ | :------------------------------------------------------ | :------------------------ | :------------------------------------------- |
| **E2E**         | Astral                          | 主要ユーザーストーリー (`USER_STORIES.md`)              | デプロイ前 / PRマージ時   | ユーザー体験の保証、機能間連携の検証         |
| **Integration** | `deno test` + `testing-library` | Feature (Container) コンポーネント                      | 随時 (関連ファイル変更時) | 状態管理、データフロー、ルーター制御の正しさ |
| **Unit**        | `deno test`                     | Primitive Component, Hooks, Utilities, Helper Functions | 常に (TDDサイクル内)      | 個別機能の正しさ、境界値・エラー処理の検証   |

## 2. Test Execution Workflow

開発者の作業フローにテストを組み込みます。

### 2.1 Development (TDD Cycle)

1. **Red**: 実装対象に対して、失敗する Unit Test または Integration Test
   を書く。
   - `deno task test:unit --watch src/app/feature/target.test.ts`
2. **Green**: 実装を行い、テストをパスさせる。
3. **Refactor**: コードを整理する。

### 2.2 Feature Completion Check

機能実装がひと段落したタイミングで、手元の環境で E2E テストを実行する。

```bash
deno task test:e2e
```

### 2.3 CI/CD (GitHub Actions)

Pull Request 作成時および `main` ブランチへのマージ時に自動実行される。

1. **Lint / Format Check**: `deno lint`, `deno fmt --check`
2. **Unit Tests**: `deno task test:unit`
3. **Build Check**: `deno task build` (ビルドエラーがないか)
4. **E2E Tests**: `deno task test:e2e`
   (必要に応じてヘッドレスブラウザ環境をセットアップ)

## 3. Test Case Definition Guidelines

### 3.1 E2E Scenarios (Astral)

`architecture/v1/USER_STORIES.md`
の各シナリオをそのままテストケースとして実装します。 外部サービス (GitHub API)
への依存については、以下のいずれかの戦略を採ります：

- **Mocking Strategy**: サーバー側で外部HTTPリクエストをモックする（`fetch`
  のインターセプト）。これにより、GitHubのレート制限やネットワーク不安定性の影響を受けずにテスト可能。
- **Sandbox Strategy**: 実際の GitHub Sandbox
  リポジトリを使用する（より現実に近いが、遅くて不安定になりがち）。

**Staticms v2 では原則として「Mocking Strategy」を採用します。**
Astralで操作するブラウザからリクエストを受けるサーバー（テスト用インスタンス）内部で、GitHub
APIへのリクエストをモックします。

### 3.2 Integration / Unit Tests

- **UI Components**:
  - `render` した結果、正しいロール (`button`, `heading` 等)
    とテキストが含まれているか。
  - イベント (`click`, `change`) に対して、正しいコールバックが呼ばれたか。
  - 見た目（CSS）の詳細すぎるテストは避ける（変更に弱くなるため）。
- **Hooks / Logic**:
  - `renderHook` を使用して、ステート遷移が正しいか検証する。
  - 非同期処理を含む場合、`waitFor` 等で完了を待機する。

## 4. Test Data Management

- **Fixtures**: テストデータ（擬似的な `config` json、GitHub API のレスポンス
  JSON など）は `src/testing/fixtures/` に配置し、ハードコードを避けます。
- **Isolation**: 各テストケースは独立している必要があります。`localStorage` や
  `Deno.KV`
  はテストケース毎にクリーンアップまたは分離（一意なキープレフィックス使用など）を行います。

## 5. Metrics

初期段階ではカバレッジ率（Coverage）の数値目標は設定しません。 代わりに
**「ユーザーストーリーの網羅率」** を重視します。すべての重要機能が E2E
テストまたは結合テストでカバーされている状態を目指します。
