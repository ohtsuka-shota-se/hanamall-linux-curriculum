# Week05 ｜ Webサーバー構築（Apache HTTP Server）

## 🎯 今週の目標

## 🔗 前回（Week04）からの続き
prod-web02 の「繋がらない」障害を解決できました。
原因はファイアウォールの80番未開放でした。
今週はそのサーバーに Apache を入れて、実際に Web サービスを公開します。

- Apacheを一から設定してWebサービスを公開できる
- バーチャルホストで複数サイトを1台で運用できる
- エラーログを読んでトラブルシューティングできる
- Nginxとの役割の違いを理解する

---

## 📖 今週のミッション（佐藤さんからのSlack）

```
佐藤 Sato  11:00
田中さん、開発チームから要望が来ました。

今まで商品ページ（shop.hanamall.local）しかなかったけど、
管理画面（admin.hanamall.local）を同じサーバーに追加したい。

要件：
  ・shop.hanamall.local  → /var/www/shop/
  ・admin.hanamall.local → /var/www/admin/
  ・両方 80 番ポートで受け付ける（バーチャルホスト）
  ・ログはそれぞれ別ファイルに分ける
  ・admin のアクセスログは特に厳重に管理

設定後に両方 curl で疎通確認して報告をください！
```

**あなたのミッション：** Apacheのバーチャルホストを設定して、2サイトを同居させる。

---

## 📚 学習内容

### 1. ApacheとNginxの違い

#### 💡 なぜ今もApacheが使われるのか
Apache HTTP Server（httpd）は1995年から続く老舗Webサーバーで、
世界中のWebサーバーの最大シェアを長年持ち続けている。

| 比較項目 | Apache | Nginx |
|---------|--------|-------|
| 登場 | 1995年 | 2004年 |
| 処理モデル | プロセス/スレッド型 | イベント駆動型 |
| 得意 | 動的コンテンツ（PHP等）、.htaccess | 静的コンテンツの大量配信 |
| 設定の容易さ | ディレクトリ単位で`.htaccess`が使える | グローバル設定のみ（高速） |
| PHP連携 | mod_phpで直接実行できる | php-fpmを経由する必要がある |
| 現場での用途 | PHPアプリ、WordPress、社内システム | リバースプロキシ、CDN、高トラフィックサイト |

**実務では両方使われる。** ApacheでPHPアプリを動かしつつ、その前段にNginxをリバースプロキシとして置く構成も一般的。

---

### 2. Apacheのディレクトリ構造

#### 💡 設定ファイルの読み方
Apacheの設定は `httpd.conf`（CentOS系）または `apache2.conf`（Ubuntu系）がエントリーポイント。
大量のディレクティブがあるが、最初は「どこに何があるか」だけ把握すれば十分。

```
# Ubuntu/Debian系
/etc/apache2/
├── apache2.conf          # メイン設定（includeで他を読み込む）
├── ports.conf            # 待ち受けポートの設定（Listen 80 など）
├── sites-available/      # バーチャルホスト設定の置き場（有効/無効に関わらず）
├── sites-enabled/        # 有効化したバーチャルホストへのシンボリックリンク
├── mods-available/       # 使えるモジュール一覧
└── mods-enabled/         # 有効化したモジュールへのシンボリックリンク

# ログ
/var/log/apache2/
├── access.log            # すべてのリクエストのログ
└── error.log             # エラーのログ（まずここを見る）

# Webコンテンツのデフォルト置き場
/var/www/html/
```

---

### 3. 基本的なVirtualHost設定

#### 💡 バーチャルホストとは
1台のサーバーで複数のドメイン・サイトを同時に動かす仕組み。
HTTPリクエストの `Host:` ヘッダを見てApacheが振り分ける。
本番環境では1台のサーバーで複数のサービスを動かすことが多く、必須の知識。

```apache
# /etc/apache2/sites-available/mysite.conf

<VirtualHost *:80>
    # どのドメイン名で来たリクエストを処理するか
    ServerName mysite.local
    ServerAlias www.mysite.local   # エイリアス（別名）も受け付ける

    # Webコンテンツの置き場
    DocumentRoot /var/www/mysite

    # アクセスログとエラーログの場所
    CustomLog /var/log/apache2/mysite_access.log combined
    ErrorLog  /var/log/apache2/mysite_error.log

    # DocumentRootへのアクセス許可設定
    <Directory /var/www/mysite>
        Options Indexes FollowSymLinks
        AllowOverride All       # .htaccess を有効にする
        Require all granted     # 全員からのアクセスを許可
    </Directory>
</VirtualHost>
```

```bash
# サイトの有効化・無効化（シンボリックリンクを張る/外す）
sudo a2ensite mysite.conf    # sites-available → sites-enabled にリンクを作成
sudo a2dissite mysite.conf   # リンクを削除

# モジュールの有効化
sudo a2enmod rewrite         # mod_rewrite（URLリライト）を有効化
sudo a2enmod ssl             # SSL/TLSを有効化

# 設定の文法チェック（必ずreloadの前に実行する）
sudo apache2ctl configtest
# または
sudo apachectl -t

# 設定を反映
sudo systemctl reload apache2
```

---

### 4. よくあるエラーと対処

#### 💡 エラーが出たらまずerror.logを見る
Apache のトラブルシューティングは `error.log` が起点。
エラーコードと `error.log` の内容を合わせて読めると素早く解決できる。

| エラー | よくある原因 | 確認コマンド |
|--------|------------|-------------|
| 403 Forbidden | ①ディレクトリに `Require all granted` がない ②ファイルのパーミッション不足 | `ls -la /var/www/mysite` |
| 404 Not Found | ①DocumentRootのパスが間違い ②ファイルが存在しない | `ls -la /var/www/mysite/` |
| 500 Internal Server Error | PHP/CGIスクリプトのエラー、設定ミス | `tail /var/log/apache2/error.log` |
| 503 Service Unavailable | バックエンドサービスが落ちている | `sudo systemctl status php8.1-fpm` |

```bash
# エラーログをリアルタイムで監視しながら確認
sudo tail -f /var/log/apache2/error.log

# 設定ファイルの文法チェック（これが通らないとreloadが失敗する）
sudo apache2ctl configtest
# → Syntax OK が出ればOK
```

---

### 5. NginxをリバースプロキシとしてApache前段に置く（参考）

#### 💡 リバースプロキシとは
クライアントからのリクエストをいったん受け取り、バックエンドのサーバーに転送する仕組み。
「Nginx（80番で受け付け）→ Apache（8080番で動作）」という構成にすることで、
NginxのSSL処理・キャッシュ・ロードバランシングの恩恵を受けながら、
Apacheの.htaccess・PHP連携の利便性も保てる。

```nginx
# Nginx の設定例（リバースプロキシ）
server {
    listen 80;
    server_name example.com;

    location / {
        proxy_pass http://127.0.0.1:8080;   # Apacheに転送
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## 🛠️ ハンズオン演習：バーチャルホストで2サイトを同居させる

```bash
# 1. Apacheをインストール
sudo apt install -y apache2

# 2. ドキュメントルートを作成
sudo mkdir -p /var/www/site-a /var/www/site-b
echo "<h1>Site A</h1>" | sudo tee /var/www/site-a/index.html
echo "<h1>Site B</h1>" | sudo tee /var/www/site-b/index.html
sudo chown -R www-data:www-data /var/www/site-a /var/www/site-b

# 3. /etc/hosts に追加して名前解決できるようにする
echo "127.0.0.1 site-a.local" | sudo tee -a /etc/hosts
echo "127.0.0.1 site-b.local" | sudo tee -a /etc/hosts

# 4. VirtualHost 設定を配置（hands-on/site-a.conf を /etc/apache2/sites-available/ にコピー）
sudo cp hands-on/site-a.conf /etc/apache2/sites-available/
sudo cp hands-on/site-b.conf /etc/apache2/sites-available/

# 5. サイトを有効化
sudo a2ensite site-a.conf site-b.conf

# 6. 文法チェックして反映
sudo apache2ctl configtest && sudo systemctl reload apache2

# 7. 確認
curl http://site-a.local   # → <h1>Site A</h1>
curl http://site-b.local   # → <h1>Site B</h1>
```

→ 詳細手順は `hands-on/05_apache_setup.sh`、設定ファイル例は `hands-on/site-a.conf` を参照

---

## 📝 今週の課題

ハンズオンで設定した環境を使って、自力でトラブルシューティングできるか確認します。

### 大問1. shop.hanamall.local の設定ファイルを一度 a2dissite で無効化し、再度 a2ensite で有効化する手順を完全に自力でやってみよ。各ステップで curl して状態変化を確認すること

`shop.hanamall.local` の設定ファイルを一度 `a2dissite` で無効化し、再度 `a2ensite` で有効化する手順を完全に自力でやってみよ。各ステップで `curl` して状態変化を確認すること

### 大問2. 以下の障害を意図的に発生させ、error.log だけを手がかりに復旧させよ（answers/ は見ない）

以下の障害を意図的に発生させ、`error.log` だけを手がかりに復旧させよ（answers/ は見ない）
   - `DocumentRoot` を存在しないパスに変更して 403/404 を発生させる
   - `<Directory>` ブロックから `Require all granted` を削除して 403 を発生させる

### 大問3. 新規バーチャルホスト追加: api.hanamall.local を自力で追加し、{"status":"ok"} を返すようにせよ

**新規バーチャルホスト追加:** `api.hanamall.local` を自力で追加し、`{"status":"ok"}` を返すようにせよ
   - `/etc/hosts` への追加
   - `sites-available/` への設定ファイル作成
   - `a2ensite` で有効化
   - `curl http://api.hanamall.local` で確認

### 大問4. Apache のアクセスログから以下を調べよ

Apache のアクセスログから以下を調べよ
   ```bash
   # 直近100件のアクセスのうち、エラー（4xx/5xx）が何件あるか
   sudo tail -100 /var/log/apache2/shop_access.log | grep -E ' [45][0-9]{2} ' | wc -l
   ```

### 大問5. apache2ctl -S を実行し、現在有効なバーチャルホストの一覧を確認せよ。どのドメインがどの設定ファイルで管理されているかを表形式でまとめよ

`apache2ctl -S` を実行し、現在有効なバーチャルホストの一覧を確認せよ。どのドメインがどの設定ファイルで管理されているかを表形式でまとめよ

### 大問6. 設定ファイルに意図的に文法エラーを入れて systemctl reload apache2 を実行し、以下を確認してから復旧させよ

設定ファイルに意図的に文法エラーを入れて `systemctl reload apache2` を実行し、以下を確認してから復旧させよ
   - Apache は落ちたか？（`systemctl is-active apache2` で確認）
   - エラーの行番号はどこで分かるか？
   - 復旧手順を順番通りに記録せよ

### 大問7. 思考問題: 本番の Apache に新しいバーチャルホストを追加するとき、ダウンタイムなしで設定を反映するには restart と reload のどちらを使うべきか。また、その前に必ず実行すべきコマンドは何か答えよ

**思考問題:** 本番の Apache に新しいバーチャルホストを追加するとき、ダウンタイムなしで設定を反映するには `restart` と `reload` のどちらを使うべきか。また、その前に必ず実行すべきコマンドは何か答えよ

---

## 🎁 発展演習（Additional）

課題が終わったら、Week05 で構築した Apache を使って**自分だけのWebサイト**を作ってみよう。

HTML・CSS で `/var/www/html/` のデフォルトページを書き換え、ポートフォリオサイトとして公開する手順をまとめています。

**→ ビューアの「📦 サーバー構築シナリオ」から「🌐 オリジナルWebサイト作成」を選択してください。**
