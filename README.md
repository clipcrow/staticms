# Staticms

**Staticms** は、GitHub上のコンテンツを管理するためのモダンなヘッドレスCMSです。
DenoとReactで構築されており、GitHub
Appとして動作することで、リポジトリ内のMarkdownやYAMLファイルを直感的なUIで編集・管理できます。

## 特徴

- **GitHub完全統合**:
  データはすべてGitHubリポジトリに保存されます。データベースは不要です。
- **リアルタイム更新**:
  Webhookを利用し、GitHub上での変更が即座にエディタに反映されます。
- **Pull Requestベース**: 変更はPull
  Requestとして作成されるため、レビュープロセスに自然に組み込めます。
- **柔軟な設定**:
  フロントマターのスキーマを自由に定義でき、様々な静的サイトジェネレーター（Hugo,
  Jekyll, Next.jsなど。そしてLume！）に対応可能です。
- **GitHub App認証**: セキュアな認証と、細かい権限管理が可能です。

## インストールと利用開始

Staticmsを利用するには、対象のGitHubリポジトリにStaticms GitHub
Appをインストールする必要があります。

### 1. GitHub Appのインストール

1. StaticmsのGitHub App公開ページ（管理者が提供するURL）にアクセスします。
2. **Install** ボタンをクリックします。
3. インストール先のアカウントまたはOrganizationを選択します。
4. **Only select repositories**
   を選択し、Staticmsで管理したいリポジトリを選択して **Install**
   をクリックします。

### 2. アプリケーションへのアクセス

1. StaticmsのURL（管理者が提供するURL）にアクセスします。
2. **Login with GitHub** ボタンをクリックしてログインします。
3. **Select Repository**
   画面で、先ほどAppをインストールしたリポジトリを選択します。

### 3. コンテンツの管理

- **コンテンツ一覧**: リポジトリ内のファイルが一覧表示されます。
- **編集**:
  ファイルを選択するとエディタが開きます。Markdown本文とフロントマターをGUIで編集できます。
- **保存**: 変更を保存すると、自動的に新しいブランチが作成され、Pull
  Requestがオープンされます。

## 開発者向け情報

Staticms自体の開発や、自前のサーバーでのホスティングに興味がある方は、[DEVELOPMENT.md](./DEVELOPMENT.md)
を参照してください。 ローカル環境でのセットアップ方法や、独自のGitHub
Appの作成方法について詳しく解説しています。

## ライセンス

MIT License
