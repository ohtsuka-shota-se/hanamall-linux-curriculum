# Week11 課題 回答例・解説

---

### 大問1. AWS EC2（無料枠）にUbuntuを立て、以下をすべて実施せよ

```bash
# EC2 作成後、SSH 接続
ssh -i ~/.ssh/aws-key.pem ubuntu@EC2のパブリックIP

# OS確認
cat /etc/os-release
uname -r

# セキュリティグループの確認（マネジメントコンソールで）
# インバウンド: 22(SSH), 80(HTTP) を自分のIPから許可

# ホスト名設定
sudo hostnamectl set-hostname hanamall-ec2
```

**無料枠の注意点：**
- `t2.micro` または `t3.micro`（月750時間まで無料）
- ストレージ：30GB まで無料
- データ転送：送信 15GB/月まで無料

---

### 大問2. Docker で httpd:2.4 コンテナを起動し、以下を確認せよ

```bash
# Docker のインストール
sudo apt update
sudo apt install -y docker.io
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker ubuntu
newgrp docker

# httpd コンテナ起動
docker run -d -p 80:80 --name web httpd:2.4

# 確認
docker ps
curl http://localhost
# → <html><body><h1>It works!</h1></body></html>

# コンテナのログ
docker logs web

# コンテナ内に入る
docker exec -it web bash
```

---

### 大問3. hands-on/Dockerfile を読んで内容を理解した上で、以下を変更したイメージを自力でビルドせよ

```dockerfile
FROM httpd:2.4

# 独自のindex.htmlを追加
COPY ./html/ /usr/local/apache2/htdocs/

# カスタム設定（任意）
COPY ./httpd.conf /usr/local/apache2/conf/httpd.conf
```

```bash
# イメージのビルド
docker build -t hanamall-web:v1 .

# 起動して確認
docker run -d -p 8080:80 --name hanamall hanamall-web:v1
curl http://localhost:8080
```

**Dockerfile の命令：**
| 命令 | 意味 |
|------|------|
| `FROM` | ベースイメージ |
| `COPY` | ファイルをコンテナにコピー |
| `RUN` | ビルド時にコマンドを実行 |
| `CMD` | コンテナ起動時のデフォルトコマンド |
| `EXPOSE` | 公開するポート（ドキュメント的な意味） |

---

### 大問4. hands-on/docker-compose.yml を使って Apache + MySQL を起動し、以下を確認せよ

```bash
# 起動
docker compose up -d

# 確認
docker compose ps
docker compose logs apache
docker compose logs mysql

# Apache への接続
curl http://localhost

# MySQL への接続
docker compose exec mysql mysql -u root -p

# 停止
docker compose down
```

---

### 大問5. コンテナ内の Apache に対して以下の調査を実施せよ

```bash
# コンテナ内でプロセス確認
docker exec web ps aux

# コンテナ内のディスク使用量
docker exec web df -h

# コンテナのリソース使用状況
docker stats web --no-stream

# コンテナのIPアドレス
docker inspect web | grep IPAddress
```

---

### 大問6. EC2 上に Docker をインストールし、docker compose up -d でHanaMall環境を立ち上げて外部からアクセスできることを確認せよ

```bash
# EC2 上でDocker インストール
sudo apt update
sudo apt install -y docker.io docker-compose-v2
sudo usermod -aG docker ubuntu

# リポジトリをクローン
git clone https://github.com/ohtsuka-shota-se/hanamall-linux-curriculum.git
cd hanamall-linux-curriculum

# 起動
docker compose up -d

# セキュリティグループで80番を許可（マネジメントコンソール）

# ブラウザで確認
# http://EC2のパブリックIP/
```

---

### 大問7. 思考問題: 「本番をDockerに移行すべきか」。メリット・デメリットを各2つ挙げ、「どんな条件が揃ったら移行を推奨するか」を答えよ

**メリット：**

1. **環境の再現性が高い**  
   「開発では動くが本番では動かない」問題を防げる。Dockerfile があれば同じ環境を何度でも作れる。

2. **デプロイ・ロールバックが容易**  
   イメージのバージョンを切り替えるだけで新バージョンへの切替・旧バージョンへの戻しができる。

**デメリット：**

1. **運用・監視の複雑性が増す**  
   コンテナのライフサイクル管理、ネットワーク設定、ログの収集方法など学習コストが高い。

2. **ステートフルなデータの扱いが難しい**  
   DBなど永続データを持つシステムはボリューム管理が必要で、データ消失リスクに注意が必要。

**移行を推奨できる条件：**
- CI/CD パイプラインが整備されており、イメージのビルド・テスト・デプロイが自動化できる
- アプリがステートレス（セッションをDB等の外部に持つ）で、コンテナ化に適した設計になっている
- チームに Docker の運用経験者がいる、または学習リソースが確保できる
