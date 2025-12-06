# System Overview

Staticms は、GitHub
リポジトリ上のファイルを直接管理・編集するための静的CMSアプリケーションです。
Deno と React で構築され、サーバーサイドは GitHub API
とのプロキシおよび認証・セッション管理を担い、クライアントサイドはリッチなUIによるコンテンツ編集機能を提供します。

## 1. システム構成図

Markdownファイルのためテキストベースで表現します。

```mermaid
graph TD
    User[Web Browser] -->|HTTPS| Server[Staticms Server (Deno)]
    
    subgraph "Server (Deno / Oak)"
        Auth[Auth Handler]
        API[API Proxy]
        WH[Webhook Handler]
        KV[(Deno KV)]
    end
    
    Server -->|OAuth / API Requests| GitHub[GitHub API]
    GitHub -->|Webhooks| Server
    
    Auth -->|Session Data| KV
    API -->|Config Cache| KV
    
    subgraph "Client (React SPA)"
        Router[React Router]
        AuthHook[useAuth]
        Editor[Markdown Editor]
        Drafts[LocalStorage]
    end
    
    User -- Interaction --> Client
    Client -- API Calls --> Server
```

## 2. 技術スタック

### Backend (Server)

- **Runtime**: Deno
- **Framework**: Oak (`@oak/oak`) - Middleware framework for Deno.
- **Database**: Deno KV - Simple key-value store for sessions and configuration.
- **Authentication**:
  - **User**: GitHub OAuth 2.0
  - **App**: GitHub App (JWT signed with Private Key)
- **Utilities**: `djwt` (JWT generation), `@std/dotenv`, `@std/path`.

### Frontend (Client)

- **Framework**: React 19
- **Routing**: React Router v6 (`react-router-dom`)
- **Build Tool**: Deno Bundle (Legacy) -> _To be replaced/upgraded in
  Staticms2_.
- **Styling**: Semantic UI (CSS Framework) + Custom CSS.
- **Editor**: `@uiw/react-md-editor` - Markdown editor component.
- **State Management**: React Hooks (`useContentConfig`, `useRemoteContent`,
  `useDraft`) + Context.

## 3. 主要コンポーネントと役割

### 3.1 Server (`src/server/staticms.ts`)

サーバーは単なるAPIプロキシ以上の役割を果たします。

- **認証とセッション管理**:
  - GitHub OAuth フローのハンドリング。
  - アクセストークンの安全な管理 (Deno KV)。
  - GitHub App としての認証 (JWT生成) と Installation Token の取得。
- **GitHub API プロキシ**:
  - クライアントからのリクエストを受け、適切なトークン（User Token または
    Installation Token）を付与して GitHub API を呼び出します。
  - Base64コンテンツのデコード/エンコード処理。
- **トランザクション管理**:
  - コンテンツ保存時に、自動的に新しいブランチを作成し、コミットし、プルリクエスト
    (PR) を作成する一連の流れをサーバーサイドで実行します。
- **リアルタイム更新**:
  - GitHub Webhook (`push`, `pull_request`) を受信し、Server-Sent Events (SSE)
    を通じてクライアントに即座に通知します。

### 3.2 Client (`src/app/`)

SPA (Single Page Application) として動作します。

- **`App.tsx`**:
  - アプリケーションのエントリーポイント。
  - ルーティング定義と認証ガード (`ProtectedRoute`)。
- **Hooks (`src/app/hooks/`)**:
  - **`useAuth`**: 認証状態の管理、ログイン/ログアウト処理。
  - **`useRemoteContent`**: GitHub からのコンテンツ取得、ローディング状態管理。
  - **`useDraft`**: LocalStorage
    を利用したドラフト保存、自動保存、GitHubへの保存（PR作成）トリガー。
- **Bindings (`src/app/bindings/`)**:
  - ルーティングとコンポーネントを繋ぐ接着層。URLパラメータを解析し、具体的なコンポーネントにデータを渡します。

## 4. データフロー概要

詳細なデータフローは `DATAFLOW.md` に譲りますが、ここでは主要な概念を記します。

### 認証フロー

1. ユーザーは GitHub OAuth でログイン。
2. サーバーは Access Token を取得し、Deno KV に保存。
3. セッションID (Cookie) をクライアントに発行。
4. 以降のAPIリクエストは Cookie を利用して認証。

### コンテンツ編集フロー (The "Draft" Model)

1. **Load**: GitHub から最新コンテンツを取得。
2. **Edit**: ユーザーが編集すると、即座に **LocalStorage**
   に「ドラフト」として保存。サーバーにはまだ送信しない。
3. **Save**: ユーザーが「Save」を押すと、ドラフト内容がサーバーに POST される。
4. **Process**: サーバーは作業用ブランチを作成 -> コミット -> PR作成。
5. **Sync**: 作成された PR の URL
   がクライアントに返され、ドラフト状態が「PR提出済み」に更新される。

### リアルタイム同期

1. GitHub 上で他者が変更を Push。
2. Webhook がサーバーに通知。
3. サーバーが SSE でクライアントに `push` イベントを送信。
4. クライアントは（ローカル編集がない場合）画面を自動更新。
