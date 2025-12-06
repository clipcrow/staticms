# GitHub Integration Specification

Staticms は GitHub App および OAuth App の両方の機能を利用して、GitHub
と深く統合します。 このドキュメントでは、GitHub API
との連携における技術的詳細、認証戦略、およびワークフローの実装ロジックについて記述します。

## 1. 認証戦略

Staticms は状況に応じて 2 種類のトークンを使い分けます。

### 1.1 User Access Token (OAuth)

ユーザー操作に直接紐付くアクションに使用されます。これにより、コミット履歴や操作ログが「Staticms
Bot」ではなく、**操作したユーザー本人**のものとして記録されます。

- **取得方法**: OAuth 2.0 Web Flow (`/api/auth/login`)
- **スコープ**: `repo`, `user`, `read:org`
- **保存場所**: Deno KV (`sessions/<session_id>`)
- **使用箇所**:
  - ファイルの読み取り (`GET /repos/.../contents`)
  - ファイルの書き込み/編集 (`PUT /repos/.../contents`)
  - プルリクエストの作成 (`POST /repos/.../pulls`)
  - ユーザー情報の取得 (`GET /user`)
  - リポジトリ一覧の取得

### 1.2 App Installation Token

アプリケーションとしての管理操作に使用されます。特定のユーザーに紐付かない、システムレベルの設定変更を行います。

- **取得方法**:
  1. GitHub App の Private Key (`.pem`) を読み込み
  2. JWT (JSON Web Token) を生成 (期限付き)
  3. `GET /repos/:owner/:repo/installation` で Installation ID を取得
  4. `POST /app/installations/:id/access_tokens` でトークンを取得
- **使用箇所**:
  - Webhook の設定 (`POST /repos/.../hooks`)
  - (将来的に) CI/CD 連携など、システム権限が必要な操作

## 2. API 使用詳細

すべての GitHub API リクエストは `githubRequest` ラッパー関数等を経由し、適切な
`Accept: application/vnd.github.v3+json` ヘッダーと認証トークンが付与されます。

### 主要なAPIエンドポイント

Staticms が依存している主要な GitHub API です。

| Purpose            | Method | Endpoint                                | Token Type |
| :----------------- | :----- | :-------------------------------------- | :--------- |
| **User Profile**   | `GET`  | `/user`                                 | User       |
| **Installations**  | `GET`  | `/user/installations`                   | User       |
| **Repos in Inst.** | `GET`  | `/user/installations/{id}/repositories` | User       |
| **Get Content**    | `GET`  | `/repos/{owner}/{repo}/contents/{path}` | User       |
| **Update Content** | `PUT`  | `/repos/{owner}/{repo}/contents/{path}` | User       |
| **Create Ref**     | `POST` | `/repos/{owner}/{repo}/git/refs`        | User       |
| **Create PR**      | `POST` | `/repos/{owner}/{repo}/pulls`           | User       |
| **Manage Hooks**   | `POST` | `/repos/{owner}/{repo}/hooks`           | **App**    |

## 3. コンテンツ保存フロー (PR作成)

`POST /api/content` エンドポイントにおけるロジックの詳細です。Staticms
は直接メインブランチにコミットせず、常に **「Feature Branch + Pull Request」**
のフローを強制します。

### ステップ詳細

1. **ベースブランチの決定**:
   - リクエストに `branch` が指定されている場合はそれをベースにします。
   - 指定がない場合、`GET /repos/:owner/:repo` から `default_branch` (例:
     `main`) を取得してベースにします。

2. **ベースブランチの検証と作成 (Fail-safe)**:
   - 指定されたベースブランチが実際に存在するか確認します。
   - **存在しない場合**:
     デフォルトブランチから派生させて、その名前のブランチを自動作成します。これは新規作成ワークフローなどで有用です。

3. **作業用ブランチの作成**:
   - 一意なブランチ名を生成します: `staticms-update-<timestamp>`
   - GitHub API `POST /git/refs` を使用し、ベースブランチの最新 SHA
     から分岐させます。

4. **ファイルのコミット**:
   - GitHub API `PUT /contents/:path` を使用します。
   - **`sha` パラメータ**:
     競合を防ぐため、クライアントが取得していた元ファイルの SHA
     を送信します。もしサーバー上のファイルが更新されていれば API
     はエラーを返します。
   - **コミットメッセージ**: ユーザー入力、またはデフォルト値を使用します。

5. **プルリクエスト (PR) の作成**:
   - GitHub API `POST /pulls` を使用します。
   - `head`: 作成した作業用ブランチ (`staticms-update-...`)
   - `base`: ベースブランチ
   - レスポンスに含まれる `html_url` をクライアントに返却し、ユーザーを PR
     ページへ誘導可能にします。

## 4. Webhook イベント処理

リアルタイム性を担保するため、Webhook を積極的に活用します。

- **自動設定**:
  - `POST /api/config`
    が呼ばれるたびに、構成ファイルに含まれる全リポジトリに対して Webhook
    の存在確認を行います。
  - URL が一致する Webhook がなければ新規作成
    (`POST`)、イベント設定が不足していれば更新 (`PATCH`) します。

- **ハンドリング**:
  - 受信したイベント (`push`, `pull_request`, `installation`)
    は、接続されている全ての Server-Sent Events (SSE)
    クライアントへブロードキャストされます。
  - これにより、ブラウザ側はポーリングすることなく、他者の変更や PR
    のステータス変化を（ほぼ）リアルタイムに検知できます。
