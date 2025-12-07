# User Stories (v2)

Staticms v2 の主要なユーザー体験（UX）と機能要件を定義します。 これらは `tests/`
ディレクトリ配下の E2E テストシナリオのベースとなります。

## US-01: Authentication (認証)

**As a** ユーザー **I want to** GitHub アカウントを使って安全にログインする **So
that** 自分のリポジトリへのアクセス権限をアプリケーションに許可できる

### Scenarios

1. **OAuth Login Flow**:
   - 未認証状態でトップページ (`/`) にアクセスすると、GitHub OAuth
     認証画面へリダイレクトされる。
   - 認可後、トップページ（リポジトリ選択画面）に戻る。
   - アプリケーションはセッションを維持し、再訪時にはログイン状態となる。

## US-02: Repository Selection (リポジトリ選択)

**As a** ユーザー **I want to**
編集対象のリポジトリを選択するか、新しいリポジトリに App をインストールする **So
that** コンテンツ管理を開始できる

### Scenarios

1. **List Installed Repositories**:
   - ログイン後、ユーザーがアクセス権を持ち、かつ **Statcms GitHub App**
     がインストールされているリポジトリ一覧が表示される。
2. **App Installation Guide**:
   - リポジトリ一覧のそばに、GitHub App
     のインストール（または設定）ページへのリンクが常に表示される。
   - 目的のリポジトリが表示されていない場合、ユーザーはこのリンクから権限を追加できる。

## US-03: Content Browsing (コンテンツ閲覧)

**As a** ユーザー **I want to**
リポジリに関連付けられたコンテンツ定義（Singleton /
Collection）を選び、編集作業に進む **So that**
サイト構成に応じた適切な編集フローに入れる

### Scenarios

1. **Config Loading (from Deno KV)**:
   - リポジリを選択すると、Staticms のデータベース (Deno KV)
     から、そのリポジリ用の設定（コンテンツ定義）が読み込まれる。
2. **Content Definition List**:
   - 設定に基づき、利用可能なコンテンツ定義の一覧が表示される。
   - 各アイテムは **Collection (記事集合)** または **Singleton (単一ページ)**
     のいずれかである。
3. **Branching Navigation**:
   - **Collection** を選択した場合: そのコレクションの記事一覧画面（Article
     List）へ遷移する。
   - **Singleton** を選択した場合:
     記事一覧を経ずに、直接そのコンテンツの編集画面（Editor）へ遷移する。

## US-04: Content Configuration Management (コンテンツ設定管理)

**As a** 管理者ユーザー **I want to**
リポジリのコンテンツ構造を自由に定義・変更・削除する **So that**
サイトの要件変更に合わせてCMSの管理項目を柔軟に調整できる

### Scenarios

1. **Add Content Definition**:
   - ダッシュボード（リポジトリ内）から「Add
     Content」を選択し、新しいコンテンツ定義を作成できる。
   - Type (Collection/Singleton), Name, Folder/File path, Fields
     などをフォーム形式で入力し、保存する。
   - 保存された設定は Deno KV に永続化される。
2. **Edit Content Definition**:
   - 既存のコンテンツ定義を選択し、設定内容（ラベルやフィールド定義など）を変更できる。
3. **Delete Content Definition**:
   - 不要になったコンテンツ定義を削除できる。
   - ※ 実際のGitHub上のファイルは削除されない（設定のみの削除）。

## US-05: Content Editing & Draft (編集とドラフト)

**As a** コンテンツ作成者 **I want to**
「保存」を意識せずに執筆に集中でき、かつ画像なども自由に追加できる **So that**
ブラウザのトラブルや操作ミスによるデータ消失を防げる

### Scenarios

1. **Auto-Saving Draft**:
   - 記事（新規・既存）を開いて編集を開始すると、変更内容は即座にブラウザの
     **LocalStorage** に「ドラフト」として保存される。
   - サーバー（GitHub）へはまだ送信されない。
2. **Image Handling in Draft**:
   - エディタに画像をドラック＆ドロップ（または選択）すると、画像データもドラフトの一部としてローカルに保存される。
   - マークダウンプレビューおよびエディタ内では、このローカル画像が即座に表示される。
3. **Session Resumption**:
   - ブラウザを閉じたりリロードしたりしても、次回アクセス時にドラフトが復元され、続きから編集できる。

## US-06: Save as Pull Request (保存とPR作成)

**As a** コンテンツ作成者 **I want to**
編集内容をレビュー可能な形で提出し、以後の変更をロックする **So that**
チーム開発における競合や意図しない上書きを防ぐ

### Scenarios

1. **Create PR**:
   - 「Save」ボタンを押すと、ドラフト（記事本文 + 画像）が GitHub
     にアップロード（Commit）され、新しいブランチと **Pull Request (PR)**
     が作成される。
2. **Locking (Read Only Mode)**:
   - PR が作成されると、その記事のエディタ画面は即座に **ロック状態（Read
     Only）** に移行する。
   - 画面には「PR Open: #123」へのリンクが表示され、ユーザーは GitHub
     上でレビュー状況を確認できる。
   - ロック中は、Staticms 上での編集操作は一切できない。

## US-07: Unlock by Webhook (ロック解除)

**As a** ユーザー **I want to** PR
がマージまたはクローズされたら、自動的に編集可能状態に戻る **So that**
次の記事執筆や修正をスムーズに再開できる

### Scenarios

1. **Unlock on Merge/Close**:
   - GitHub 上で PR がマージまたはクローズされると、Webhook
     イベントによりシステムがそれを検知する。
   - 該当記事の **ロック状態が解除** され、ローカルのドラフトが破棄される。
   - エディタ（または一覧）は最新の `main`
     ブランチの内容を表示するようになり、再び編集が可能になる。
