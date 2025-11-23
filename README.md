# Staticms

GitHub上のコンテンツを管理するための、モダンなDenoベースのCMSです。

## セットアップ

1. **環境変数**: ルートディレクトリに `.env`
   ファイルを作成し、以下の内容を記述してください：

   ```env
   GITHUB_TOKEN=your_github_personal_access_token
   STATICMS_PORT=3030
   PUBLIC_URL=https://your-public-url.com
   ```

   - `GITHUB_TOKEN`: `repo` スコープを持つGitHub Personal Access Token。
   - `STATICMS_PORT`: サーバーのポート番号（デフォルト: 3030）。
   - `PUBLIC_URL`: サーバーの公開URL（WebHookに必要）。

2. **ローカルでの実行**:

   ```bash
   deno task serve
   ```

   `http://localhost:3030` でダッシュボードにアクセスできます。

## Ngrokを使用したWebHookのセットアップ（ローカル開発用）

ローカル開発中にGitHubからのリアルタイム更新を有効にするには、`ngrok`
を使用してローカルサーバーをインターネットに公開する必要があります。

1. **Ngrokのインストール**: [ngrok.com](https://ngrok.com/)
   からngrokをダウンロードしてインストールしてください。

2. **Ngrokの起動**:
   以下のコマンドを実行して、ローカルポート（3030）を公開します：

   ```bash
   ngrok http 3030
   ```

3. **.envの更新**: ngrokが表示するHTTPSのURL（例:
   `https://a1b2-c3d4.ngrok-free.app`）をコピーし、`.env`
   ファイルを更新してください：

   ```env
   PUBLIC_URL=https://a1b2-c3d4.ngrok-free.app
   ```

4. **サーバーの再起動**: Staticmsサーバーを再起動します：

   ```bash
   deno task serve
   ```

5. **コンテンツの設定**:
   Staticmsのダッシュボードに移動し、コンテンツ設定を再度保存してください。これにより、新しいngrokのURLを使用して、GitHubリポジトリにWebHookが自動的に設定されます。

これで、GitHub上のファイルを変更すると、エディタが自動的にリフレッシュされるようになります！
