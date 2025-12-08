# NotFound / AuthError 画面仕様書

## 概要

操作ユーザーが存在しない URL
にアクセスした場合や、**アクセス権限がない（認証エラー）**
場合に表示されるエラー画面です。
適切なフィードバックと、操作ユーザーを正しい状態（ログインやホーム）へ誘導する機能を提供します。

## UI 構成

### レイアウト

画面中央に要素を配置する `Centered Box Layout` を採用。

- **Illustration**: 404
  や「鍵（Lock）」を連想させる親しみやすいイラストまたは大型アイコン。
- **Error Code**: `404` または `401` (Heading 1)。
- **Message**: "Page not found" または "Please sign in to access this resource."
- **Actions**:
  - **Signin with GitHub**: **認証エラー（未ログイン）時のみ表示** (Primary
    Button)。
  - **Go Back**: ブラウザ履歴の一つ前に戻る（Secondary Button）。
  - **Go Home**: トップページへ戻る（Secondary Button, ログイン時のみ推奨）。

## ロジックと挙動

### 1. エラー種別の判定

コンテキスト（認証状態 `isAuthenticated`
や発生したエラー）に基づいて表示を切り替えます。

- **Unauthorized (401/403 or Unauthenticated)**:
  - 操作ユーザーがログインしていない、またはセッション切れの場合。
  - メッセージを認証要求のものに変更し、`Signin with GitHub` ボタンを表示する。
  - ヘッダー等のレイアウトは、非ログイン状態用のもの（または最小限のもの）を表示する。

- **Not Found (404)**:
  - ログイン済みだがリソースが存在しない場合。
  - 通常の 404 メッセージと、Home/Back ボタンを表示する。
  - `Signin` ボタンは表示しない。
