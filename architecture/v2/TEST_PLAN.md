# Test Plan

Staticms v2 における品質保証の全体像です。
「動く状態を維持する」ために、どのようなテストを、いつ、どのように実行するかを定義します。

## 1. Testing Strategy

E2Eテストの維持コスト高騰に伴い、品質保証の中心を**ユニットテスト (Unit Tests)
と結合テスト (Integration Tests)** に置きます。 ユーザー体験 (UX)
の検証は開発者の手動テストによって担保します。

| Layer           | Tool                            | Scope                                                   | 実行頻度                  | 目的                                         |
| :-------------- | :------------------------------ | :------------------------------------------------------ | :------------------------ | :------------------------------------------- |
| **Integration** | `deno test` + `testing-library` | Feature (Container) コンポーネント                      | 随時 (関連ファイル変更時) | 状態管理、データフロー、ルーター制御の正しさ |
| **Unit**        | `deno test`                     | Primitive Component, Hooks, Utilities, Helper Functions | 常に (TDDサイクル内)      | 個別機能の正しさ、境界値・エラー処理の検証   |

## 2. Test Execution Workflow

開発者の作業フローにテストを組み込みます。

### 2.1 Development (TDD Cycle)

1. **Red**: 実装対象に対して、失敗する Unit Test または Integration Test
   を書く。
   - `deno task test --watch src/app/features/target.test.ts`
2. **Green**: 実装を行い、テストをパスさせる。
3. **Refactor**: コードを整理する。

### 2.2 Feature Completion Check

機能実装がひと段落したタイミングで、すべてのユニットテストを実行し、回帰バグがないことを確認する。

```bash
deno task test
```

### 2.3 CI/CD (GitHub Actions)

Pull Request 作成時および `main` ブランチへのマージ時に自動実行される。

1. **Lint / Format Check**: `deno lint`, `deno fmt --check`
2. **Unit / Integration Tests**: `deno task test`
3. **Build Check**: `deno task build` (ビルドエラーがないか)

## 3. Test Case Definition Guidelines

### 3.1 Unit / Integration Tests (徹底)

E2Eテスト廃止の代替として、ユニットテストでのロジック検証を徹底します。

- **UI Components**:
  - `render` した結果、正しいロール (`button`, `heading` 等)
    とテキストが含まれているか。
  - ユーザー操作 (`click`, `change`, `input`)
    に対して、正しいコールバックが呼ばれ、ステートが期待通り遷移するか。
  - エッジケース（空データ、エラー状態、ローディング状態）を網羅的にテストする。
- **Hooks / Logic**:
  - `renderHook` を使用して、複雑な状態遷移や副作用 (`useEffect`)
    が正しく動作するか検証する。
  - API呼び出し等は `globalThis.fetch`
    のスタブを用いてモックし、ネットワーク依存を排除する。

### 3.2 Manual Verification (User Stories)

`architecture/v2/USER_STORIES.md`
の各シナリオは、開発者がブラウザを用いて手動で検証します。
E2Eテストの知見については `architecture/v2/E2E.md` を参照してください。

## 4. Test Data Management

- **Fixtures**: テストデータ（擬似的な `config` json、GitHub API のレスポンス
  JSON など）は `src/testing/fixtures/` に配置し、ハードコードを避けます。
- **Isolation**: 各テストケースは独立している必要があります。`localStorage` や
  `Deno.KV`
  はテストケース毎にクリーンアップまたは分離（一意なキープレフィックス使用など）を行います。

## 5. Metrics

カバレッジ率の数値目標は設定しませんが、**ロジックを含む全てのコードパス**
がユニットテストで保護されていることを目指します。
