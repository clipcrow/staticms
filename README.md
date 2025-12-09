# Staticms

**Staticms** は、GitHubの自分のリポジトリをストレージとするヘッドレスCMSです。
[Deno](https://deno.land/)と[React](https://react.dev/)で構築されており、GitHub
Appとして動作することで、リポジトリ内のMarkdownやYAMLファイルを直感的なUIで編集・管理できます。

## 📖 ドキュメント

エンドユーザー（執筆者）向けの詳しい使い方は以下のガイドをご覧ください。

- **[ユーザーガイド (User Guide)](./project_docs/USER_GUIDE.md)**:
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
- `e2e/`: E2E テスト (Astral)
- `architecture/`: 設計仕様書 (v1, v2)
- `project_docs/`: プロジェクト文書・マニュアル
- `public/`: 静的アセット

## はじめ方

### 前提条件

- Deno v2.0以上

### 開発

開発サーバーを起動し、ファイルの変更を監視します。

```bash
deno task dev
```

### テスト

```bash
# ユニットテスト (src/ 以下のテストを実行)
deno task test:unit

# E2Eテスト (e2e/ 以下のブラウザ操作テストを実行)
deno task test:e2e

# E2Eテスト (デモモード: ブラウザ表示あり、スローモーション実行)
deno task test:e2e:demo

# 全テスト実行
deno task test
```
