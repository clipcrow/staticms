# Staticms V2 Architecture

Staticms V2
のアーキテクチャ、設計指針、および運用ルールに関するドキュメントインデックスです。

## 設計と実装 (Design & Implementation)

- [**PROJECT_STRUCTURE.md**](./PROJECT_STRUCTURE.md)
  - ディレクトリ構造、モジュール境界、Clean Architecture 設計。
  - `src/` 内部インポートにおける Path Alias (`@/`) の強制について。

- [**BUILD_STRATEGY.md**](./BUILD_STRATEGY.md)
  - `esbuild` を中心としたビルドパイプラインと開発環境。
  - Deno バンドルからの移行理由。

- [**COMPONENT_DESIGN.md**](./COMPONENT_DESIGN.md)
  - React コンポーネント設計（Container/Presenter）。
  - Semantic-UI を利用した UI 戦略。

- [**TEST_PLAN.md**](./TEST_PLAN.md)
  - Astral (E2E) と HappyDOM/RTL (Unit) によるテスト戦略。
  - Deno 特有のテスト設定（リーク検出回避など）のノウハウ。

## プロジェクト運用 (Operations)

- [**DAILY_REPORT_FORMAT.md**](./DAILY_REPORT_FORMAT.md) 🌟 **Important**
  - **YESTERDAY-TODAY-STOP ISSUE** 形式の日報フォーマット。
  - プロジェクトの戦略的成果を可視化し、リスクを管理するための必須運用ルール。
  - **YESTERDAY**: 単なる作業ログではなく、戦略的マイルストーンを記述。
  - **STOP ISSUE**: 開発を阻害する要因を明確化。
  - **TODAY**: 具体的な TDD ステップの計画。
  - 開発者は一日の終わりに必ずこのフォーマットで `architecture/daily_standup/`
    にレポートを作成すること。
