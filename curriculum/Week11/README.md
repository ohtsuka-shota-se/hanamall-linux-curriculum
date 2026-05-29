# Week11 ｜ クラウド連携・Docker入門

## 🎯 今週の目標

## 🔗 前回（Week10）からの続き
リソース監視の仕組みが整い、CSV でデータが溜まり始めました。
「本番でやってきたことと同じ構成を、開発チームがローカルで再現したい」
という要望が来ました。Week01〜10 で積み上げた構成を Docker でパッケージングします。

- AWS EC2 をSSHで操作できる
- Dockerコンテナを起動・管理できる
- docker-composeで複数コンテナを構成できる

---

## 📖 今週のミッション（佐藤さんからのSlack）

```
佐藤 Sato  11:30
田中さん、開発チームから要望が来ました。

「本番と同じ Apache 環境をローカルで動かしたい。
 Vagrant は重いので Docker にしてほしい」とのことです。

以下を作ってください：
① HanaMall の Apache 環境を Docker イメージ化
② docker-compose で Apache + MySQL を一発起動できる構成
③ ソースコードの変更が即反映されるよう volume マウント

AWS EC2 で動いているのと同じ設定にしてください！
```

**あなたのミッション：** HanaMallのステージング環境をDockerで再現し、開発チームに提供する。

---

## 📚 学習内容

### 1. AWS EC2 の基礎

#### 💡 EC2とオンプレサーバーの違い
EC2（Elastic Compute Cloud）はAWSが提供する仮想サーバー（VM）サービス。
物理サーバーを用意する必要がなく、数分でLinuxサーバーを起動できる。

| 比較 | オンプレ | AWS EC2 |
|------|---------|---------|
| サーバー調達 | 数週間〜数ヶ月 | 数分 |
| スペック変更 | 物理作業が必要 | コンソールで数クリック |
| ファイアウォール | iptables/firewalld | セキュリティグループ |
| ストレージ | HDD/SSD直付け | EBS（ネットワーク越しのディスク） |
| 課金 | 初期投資＋運用費 | 使った分だけ（秒単位） |

**セキュリティグループは「Linuxのファイアウォール」のAWS版。**
Week04 で学んだ `firewalld` のルールをAWSのコンソールで設定するイメージ。

```bash
# EC2 にSSHログイン（キーペア認証）
chmod 400 mykey.pem           # 秘密鍵のパーミッションを400にしないとSSHが拒否する
ssh -i mykey.pem ubuntu@<EC2のパブリックIP>

# ~/.ssh/config に登録
Host myec2
    HostName <EC2のパブリックIP>
    User ubuntu
    IdentityFile ~/.ssh/mykey.pem
```

---

### 2. Docker 基礎

#### 💡 コンテナとVMの違い
**VM（仮想マシン）**：ハイパーバイザーが物理マシンをエミュレートし、
その上でゲストOSが動く。OSカーネルが独立している。起動に数分かかる。

**コンテナ**：ホストOSのカーネルを共有しつつ、プロセス・ファイルシステム・ネットワークを
「名前空間（namespace）」で分離する仕組み。カーネルは1つなので起動は数秒。

```
VM:
  [ホストOS] → [ハイパーバイザー] → [ゲストOS①] [ゲストOS②]

コンテナ:
  [ホストOS（カーネル共有）] → [コンテナ①] [コンテナ②]
```

Dockerはコンテナの作成・実行・管理を簡単にするツール。
アプリとその依存ライブラリを「イメージ」としてパッケージングし、
どこでも同じ環境で動かせる（「自分のPCでは動くのに本番で動かない」問題を解消）。

```bash
# イメージの取得と確認
docker pull ubuntu:22.04        # Docker Hub からイメージをダウンロード
docker images                   # ローカルのイメージ一覧

# コンテナの起動
docker run -d -p 80:80 --name myapache httpd:2.4
# -d: バックグラウンドで起動（detached mode）
# -p 80:80: ホストの80番ポートをコンテナの80番ポートに繋ぐ（ポートフォワーディング）
# --name: コンテナに名前をつける

# コンテナの確認・操作
docker ps                       # 起動中のコンテナ一覧
docker ps -a                    # 停止中も含めた全コンテナ
docker logs myapache            # コンテナのログを確認
docker logs -f myapache         # リアルタイムでログを追跡
docker exec -it myapache bash   # コンテナの中に入る（-i: 対話, -t: 端末）

# コンテナの停止・削除
docker stop myapache
docker rm myapache
```

---

### 3. Dockerfile を書く

#### 💡 Dockerfileとは
コンテナイメージを「どう作るか」の手順書。
`FROM`（ベースイメージ）から始まり、コマンドを積み上げてイメージを構築する。

```dockerfile
FROM ubuntu:22.04

# 環境変数でインタラクティブ入力を回避
ENV DEBIAN_FRONTEND=noninteractive

# Apache をインストール
RUN apt-get update && \
    apt-get install -y apache2 && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# ローカルのhtmlディレクトリをコンテナにコピー
COPY html/ /var/www/html/

# 80番ポートを公開（ドキュメント的な意味）
EXPOSE 80

# コンテナ起動時に実行するコマンド（フォアグラウンドで実行する必要がある）
CMD ["apache2ctl", "-D", "FOREGROUND"]
```

```bash
docker build -t myapache:v1 .   # カレントディレクトリの Dockerfile からビルド
docker run -d -p 80:80 myapache:v1
curl http://localhost
```

---

### 4. docker-compose

#### 💡 docker-composeとは
複数コンテナを組み合わせる構成（WebサーバーとDB など）を YAML ファイルで定義し、
`docker-compose up` 一発で全部起動できる仕組み。

```yaml
# docker-compose.yml
version: '3'
services:
  web:
    build: .                    # カレントディレクトリのDockerfileを使う
    ports:
      - "80:80"
    volumes:
      - ./html:/var/www/html    # ホストのhtmlディレクトリをマウント
    depends_on:
      - db                      # db が起動してから web を起動する

  db:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: secret
      MYSQL_DATABASE: myapp
    volumes:
      - db_data:/var/lib/mysql  # データを永続化

volumes:
  db_data:
```

```bash
docker-compose up -d            # バックグラウンドで全サービス起動
docker-compose ps               # サービスの状態確認
docker-compose logs -f web      # web サービスのログをリアルタイム確認
docker-compose down             # 全サービス停止・コンテナ削除
docker-compose down -v          # ボリュームも削除
```

---

## 📝 今週の課題

### 大問1. EC2へのApacheインストール

AWS EC2（無料枠）にUbuntuを立て、SSHでログインしてApacheをインストールする（Week06で学んだ公開鍵認証を使うこと）

### 大問2. Dockerコンテナの起動

Dockerで `httpd:2.4`（Apache）コンテナを起動してブラウザからアクセスする

### 大問3. Dockerfileによるイメージビルド

`hands-on/Dockerfile` を参考に、HanaMallのHTMLを乗せたイメージを自力でビルドする

### 大問4. docker-compose による複数コンテナ構成

docker-compose で Apache + MySQL を2コンテナ構成で起動し、`docker-compose ps` で両方が `Up` になることを確認する

### 大問5. 思考問題

「本番をDockerに移行すべきか」という議論が社内で起きた。あなたならどんな観点で判断するか。メリット・デメリットを各2つずつ挙げよ
