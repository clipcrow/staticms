# Staticms

**Staticms** は、GitHubの自分のリポジトリをストレージとするヘッドレスCMSです。
[Deno](https://deno.land/)と[React](https://react.dev/)で構築されており、GitHub
Appとして動作することで、リポジトリ内のMarkdownやYAMLファイルを直感的なUIで編集・管理できます。

## Staticms v2

Staticms v2
は、堅牢なアーキテクチャ、テスト容易性、および標準技術への回帰を重視して開発された、次世代の
Staticms
プロジェクトです。これまでの成果を活かしながら、より堅牢で柔軟なシステムを構築する
ことを目指しています。

## プロジェクト構造

- `src/`: ソースコード
  - `app/`: フロントエンド (React)
  - `server/`: バックエンド (Deno / Oak)
  - `testing/`: ユニットテスト用ユーティリティ
  - `shared/`: 共有コード（型定義など）
- `tests/`: E2E テスト (Astral)
- `architecture/`: 設計仕様書 (v1, v2)
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
