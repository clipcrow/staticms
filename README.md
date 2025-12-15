# Staticms

**Staticms** は、GitHubの自分のリポジトリをストレージとするヘッドレスCMSです。
[Deno](https://deno.land/)と[React](https://react.dev/)で構築されており、GitHub
Appとして動作することで、リポジトリ内のMarkdownやYAMLファイルを直感的なUIで編集・管理できます。

## 📖 ドキュメント

エンドユーザー（執筆者）向けの詳しい使い方は以下のガイドをご覧ください。

- **[ユーザーガイド (User Guide)](./USER_GUIDE.md)**:
  ログイン、編集、画像アップロード、設定ファイルの書き方など。

## Staticms v2 の特徴

- **GitHub ネイティブ**: データベース不要。すべてのコンテンツはあなたの GitHub
  リポジトリ（Git）に保存されます。
- **安心のドラフト機能**:
  執筆内容はブラウザに自動保存され、タブを閉じても消えません。
- **画像ドラッグ＆ドロップ**:
  エディタに画像をドロップするだけでアップロードとリンク挿入が完了します。
- **Pull Request ワークフロー**: 編集内容は直接コミットされず、まず PR
  として作成されるため、安全にレビューできます。

## プロジェクト構造

- `src/`: ソースコード
  - `app/`: フロントエンド (React)
  - `server/`: バックエンド (Deno / Oak)
  - `testing/`: ユニットテスト用ユーティリティ
  - `shared/`: 共有コード（型定義など）
- `architecture/`: 設計仕様書 (v1, v2)
- `project_docs/`: プロジェクト文書・マニュアル
- `public/`: 静的アセット

## はじめ方

### 前提条件

- Deno v2.0以上

### 環境変数

サーバーの動作には以下の環境変数を設定してください。ルートディレクトリに `.env`
ファイルを作成して記述します。

| 変数名                  | 必須 | 説明                                                                                            | デフォルト値 |
| :---------------------- | :--: | :---------------------------------------------------------------------------------------------- | :----------- |
| `GITHUB_CLIENT_ID`      |  ✅  | GitHub OAuth App の Client ID                                                                   | -            |
| `GITHUB_CLIENT_SECRET`  |  ✅  | GitHub OAuth App の Client Secret                                                               | -            |
| `GITHUB_WEBHOOK_SECRET` |  ✅  | GitHub App の Webhook Secret (署名検証用)                                                       | -            |
| `DENO_KV_PATH`          |  -   | Deno KV データの保存パス                                                                        | `./kv.db`    |
| `STATICMS_ADMIN_TOKEN`  |  -   | 管理用トークン（サーバーシャットダウン API `/_debug/shutdown` の `X-Admin-Token` ヘッダに使用） | -            |
| `ENABLE_DEBUG`          |  -   | `"true"` にするとデバッグ用エンドポイント (`/_debug/kv` 等) を有効化                            | `false`      |

### 開発

開発サーバーを起動し、ファイルの変更を監視します。

```bash
deno task dev
```

### テスト

```bash
# 全テスト実行 (Unit & Integration)
deno task test
```
