# GitHub Integration Specification (v2)

Staticms v2 における GitHub
連携の技術仕様です。認証、APIクライアント設計、および主要なワークフロー（PR作成、Webhook）について定義します。

## 1. 認証アーキテクチャ (Authentication)

Staticms は **GitHub App** として振る舞いながら、ユーザー操作には **OAuth User
Token** を使用するハイブリッドな戦略をとります。

### 1.1 トークンの種類と用途

| 種類                       | 用途                                                                 | 取得方法                             | 権限 (Scope)                              |
| :------------------------- | :------------------------------------------------------------------- | :----------------------------------- | :---------------------------------------- |
| **User Access Token**      | コンテンツ閲覧、編集、PR作成など、**ユーザーの代理**として行う操作。 | OAuth 2.0 Web Flow                   | `repo`, `user`                            |
| **App Installation Token** | Webhook設定など、**システム管理**として行う操作。                    | JWT (Private Key) -> Installation ID | Metadata: Read-only, Webhooks: Read-write |

### 1.2 OAuth フロー (US-01)

標準的な Authorization Code Grant を使用します。

1. **Login Request**:
   - `GET /api/auth/login`
   - Redirect to: `https://github.com/login/oauth/authorize`
   - Params: `client_id`, `redirect_uri`, `scope="repo,user"`, `state`

2. **Callback Handling**:
   - `GET /api/auth/callback?code=...`
   - Server: `POST https://github.com/login/oauth/access_token`
   - Response: Access Token

3. **Session Creation**:
   - Deno KV にトークンを暗号化(推奨)して保存。
   - Key: `["sessions", <sessionId>]`
   - Cookie: `session_id=<sessionId>; HttpOnly; SameSite=Lax; Secure`

## 2. GitHub Client 設計 (`src/server/github.ts`)

`octokit` ライブラリは **使用せず**、`fetch`
ベースの軽量なカスタムクライアントを実装します（Deno Deploy
環境でのコールドスタート対策と依存削減のため）。

### 2.1 モジュール構成

```typescript
// src/server/github.ts

/**
 * ユーザー権限でのAPI操作を行うクライアント
 */
export class GitHubUserClient {
  constructor(private token: string) {}

  async getUser(): Promise<GitHubUser>;
  async getRepo(owner: string, repo: string): Promise<GitHubRepo>;
  async getContent(
    owner: string,
    repo: string,
    path: string,
  ): Promise<FileContent>;
  async createPr(params: CreatePrParams): Promise<PrResult>;
  // ...
}

/**
 * App権限でのAPI操作を行うクライアント
 */
export class GitHubAppClient {
  constructor(private appId: string, private privateKey: string) {}

  async getInstallationToken(owner: string, repo: string): Promise<string>;
  async ensureWebhook(
    owner: string,
    repo: string,
    webhookUrl: string,
  ): Promise<void>;
}
```

### 2.2 エラーハンドリング

- **Rate Limiting**: `X-RateLimit-Remaining` を監視し、枯渇時は適切に 429
  エラーを返す。
- **Typed Errors**: `GitHubAPIError`
  クラスを定義し、ステータスコードとメッセージをラップする。

## 3. 主要ワークフロー

### 3.1 リポジトリ一覧とインストール (US-02)

ユーザーがアクセス可能なリポジトリのうち、Staticms App
がインストールされているものだけを操作対象とします。

1. `GET /user/installations` でユーザーがアクセス可能なインストール一覧を取得。
2. 各インストールIDを使って `GET /user/installations/{id}/repositories`
   を叩き、リポジトリ一覧を結合。
3. これらを `RepositorySelector` UI に表示。

### 3.2 PR作成フロー (US-06)

v1 のロジックを踏襲しつつ、堅牢性を高めます。

1. **Check Branch**: ベースブランチ（通常 `main`）の最新 SHA を取得。
2. **Create Branch**: 作業用ブランチ `staticms-draft-<uuid>` を作成。
3. **Upload Files**: `PUT /repos/:owner/:repo/contents/:path`
   をループしてファイルをアップロード。
   - **Note**: 画像などのバイナリファイルもここで Base64 エンコードして送信。
   - 並列リクエスト数を制御（例: Promise.all で 3つずつ）して API 制限を回避。
4. **Create PR**: `POST /repos/:owner/:repo/pulls`。

### 3.3 Webhook 管理 (Realtime)

1. **Auto Setup**: `Config` 保存時 (`POST /api/config`)
   に、対象リポジトリに対して `ensureWebhook` を実行。
2. **Verify Signature**: 受信した Webhook は必ず `X-Hub-Signature-256`
   を検証し、なりすましを防ぐ。
3. **Dispatch**: 検証OKなら、`src/server/sse.ts` の `broadcast` 関数を呼び出す。

## 4. 環境変数

実装に必要な環境変数です。

- `GITHUB_CLIENT_ID`: OAuth App Client ID
- `GITHUB_CLIENT_SECRET`: OAuth App Client Secret
- `GITHUB_APP_ID`: GitHub App ID
- `GITHUB_APP_PRIVATE_KEY`: Private Key (PEM format)
- `STATICMS_PUBLIC_URL`: Webhook の宛先となるパブリックURL (本番: Deno Deploy
  URL, 開発: ngrok URL)
