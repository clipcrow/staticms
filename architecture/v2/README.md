# Staticms V2 Architecture

Staticms V2
のアーキテクチャ、設計指針、および運用ルールに関するドキュメントインデックスです。

## プロジェクト定義 (Product Definition)

- [**PROJECT.md**](./PROJECT.md)
  - Staticms V2 の企画書。
  - 製品ビジョン、コアコンセプト（GitHub App + Headless CMS）、主要機能の概要。

- [**USER_STORIES.md**](./USER_STORIES.md)
  - ユーザー要件定義書。
  - 開発のベースとなるユーザーストーリー（US）とシナリオ。検証（自動・手動）の仕様はこのドキュメントに準拠します。

## 設計と実装 (Design & Implementation)

- [**PROJECT_STRUCTURE.md**](./PROJECT_STRUCTURE.md)
  - ディレクトリ構造、モジュール境界、Clean Architecture 設計。
  - `src/` 内部インポートにおける Path Alias (`@/`) の強制について。

- [**UI_DESIGN.md**](./UI_DESIGN.md)
  - 画面遷移図 (Sitemap) と各画面の詳細定義。
  - Semantic UI をベースとしたレイアウト戦略。

- [**BUILD_STRATEGY.md**](./BUILD_STRATEGY.md)
  - `esbuild` を中心としたビルドパイプラインと開発環境。
  - Deno バンドルからの移行理由。

- [**COMPONENT_DESIGN.md**](./COMPONENT_DESIGN.md)
  - React コンポーネント設計（Container/Presenter）。
  - Semantic-UI を利用した UI 戦略。

- [**TEST_PLAN.md**](./TEST_PLAN.md)
  - HappyDOM/RTL (Unit & Integration) によるテスト戦略。
  - Deno 特有のテスト設定のノウハウ。
  - [**E2E.md**](./E2E.md) : E2E廃止の経緯と知見のアーカイブ。

## プロジェクト運用 (Operations)

- [**DAILY_REPORT_FORMAT.md**](./DAILY_REPORT_FORMAT.md) 🌟 **Important**
  - **YESTERDAY-TODAY-STOP ISSUE** 形式の日報フォーマット。
  - プロジェクトの戦略的成果を可視化し、リスクを管理するための必須運用ルール。
  - **YESTERDAY**: 単なる作業ログではなく、戦略的マイルストーンを記述。
  - **STOP ISSUE**: 開発を阻害する要因を明確化。
  - **TODAY**: 具体的な TDD ステップの計画。
  - 開発者は一日の終わりに必ずこのフォーマットで `architecture/daily_standup/`
    にレポートを作成すること。
