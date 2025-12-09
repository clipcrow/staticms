# コンテンツステータスラベル (Content Status Labels) 仕様書

## 概要

本仕様書は、Staticms
におけるコンテンツ（記事）の状態を示す一貫したステータスラベル、バッジ、およびアイコンの定義です。
これらの視覚的インジケータにより、操作ユーザーは各コンテンツが現在どのようなライフサイクルにあるか（ドラフト、PR中、公開済みなど）を即座に認識できます。

## ステータス定義一覧

### 1. ローカルドラフト (Draft)

操作ユーザーがブラウザ上で編集中の状態で、まだサーバー（GitHub）に保存されていない変更が存在することを示します。

- **Label**: `Draft`, `Draft (N)`
- **Color**: **Orange** / **Yellow**
- **Icon**: `pencil alternate` (Semantic UI)
- **Description**:
  - `localStorage` に保存された未送信の変更がある状態。
  - Collection の場合、内包するドラフト記事数を集計し、複数ある場合は
    `Draft (3)` のように件数を接尾表示します。
  - 最も優先順位が高く、ユーザーに「保存忘れ」を気付かせるために目立たせる必要があります。

### 2. PR オープン中 (PR Open)

サーバー（GitHub）上に Pull Request
が作成され、レビューまたはマージ待ちの状態です。

- **Label**: `PR Open` / `In Review`
- **Color**: **Green** (GitHub の PR色に準拠)
- **Icon**: `code branch` または `github`
- **Description**:
  - 関連する Open な PR が存在する状態。
  - 原則として「ロック中」であることを示唆します。
  - PR 番号（例: `#123`）を併記することを推奨します。

### 3. PR マージ済み (PR Merged)

PRがメインブランチにマージされた直後の状態です。

- **Label**: `PR Merged`
- **Color**: **Purple** (GitHub Merged color)
- **Icon**: `check circle`
- **Description**:
  - PR がクローズされ、マージされた直後の状態。
  - **表示条件**: コンテンツ一覧やエディタを閲覧中に、リアルタイム更新 (SSE)
    によって `merged` イベントを受信した場合のみ一時的に表示します。
  - **挙動**:
    ページのリロードや画面遷移を行うと、通常の「変更なし」状態に戻ります（永続的な状態ではありません）。

### 4. PR クローズ済み (PR Closed)

PRがマージされずにクローズされた状態です。変更が拒否されたか、不要になったことを示します。

- **Label**: `PR Closed`
- **Color**: **Grey** / **Red**
- **Icon**: `times circle`
- **Description**:
  - PR がマージされずにクローズされた直後の状態。
  - **表示条件**: コンテンツ一覧やエディタを閲覧中に、リアルタイム更新 (SSE)
    によって `closed` イベントを受信した場合のみ一時的に表示します。
  - **挙動**:
    ページのリロードや画面遷移を行うと、通常のステータス（ローカル変更があればDraft、なければClean）に戻ります。

### 5. 変更なし (Clean / Published)

最新のメインブランチと同期しており、未保存の変更も PR も存在しない状態です。

- **Label**: 表示なし（または `Published`）
- **Color**: **Grey** / **Basic**
- **Icon**: なし
- **Description**:
  - デフォルトの状態です。特別な強調は行いません。

## UI 表現ガイドライン

### A. リスト表示時 (`ContentList` / `ArticleList`)

スペースが限られているため、コンパクトな「バッジ」または「アイコン」を使用します。

- **Draft**:
  - コンテンツ名の右側、またはステータスカラムに `Orange Label (Mini)` で表示。
  - Collection 行の場合、ドラフト数を集計し `Draft (3)` のように表示する。
- **PR Open**: ステータスカラムに `Green Label (Mini)` で `PR #123`
  と表示。クリックで PR へのリンク。

### B. エディタ画面ヘッダー (`ContentEditor`)

操作中のコンテキストを強調するため、より大きなラベルやメッセージバーを使用します。

- **Draft Restored**:
  - ヘッダー右側に `Orange Label` で `Draft Restored` を表示。
  - 「ローカルのバックアップから復元されました」というツールチップまたはトーストを表示。
- **Locked by PR**:
  - ヘッダーに `Warning Message` または `Lock Icon` を表示。
  - "Locked by PR #123" というリンク付きテキストを配置。

## 優先順位 (Priority)

一つのコンテンツが複数の状態を持つ場合（例：PRが出ているが、さらにローカルで編集してドラフトがある）、以下の優先順位で表示します。

1. **Draft** (最優先: ユーザーの未保存作業があるため)
2. **PR Open**
3. **Merged**
4. **Clean**

## 実装イメージ

```tsx
// StatusBadge Component Example
import React from "react";

type ContentStatus = "draft" | "pr_open" | "merged" | "clean";

export const StatusBadge = ({
  status,
  prNumber,
  count, // Added for aggregation
}: {
  status: ContentStatus;
  prNumber?: number;
  count?: number;
}) => {
  switch (status) {
    case "draft":
      return (
        <span className="ui label orange tiny basic">
          <i className="pencil alternate icon" /> Draft
          {count && count > 1 ? ` (${count})` : ""}
        </span>
      );
    case "pr_open":
      return (
        <span className="ui label green tiny basic">
          <i className="code branch icon" />
          {prNumber ? ` #${prNumber}` : " PR Open"}
        </span>
      );
    case "merged":
      return (
        <span className="ui label purple tiny basic">
          <i className="check circle icon" /> Merged
        </span>
      );
    default:
      return null;
  }
};
```
