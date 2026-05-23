# Week11 課題 回答例・解説

## 課題1：EC2にApacheをインストール

```bash
# EC2にSSHログイン（Week06で学んだ公開鍵認証を使う）
chmod 400 mykey.pem
ssh -i mykey.pem ubuntu@<EC2のパブリックIP>

# ~/.ssh/config に登録しておくとシンプルになる
# Host myec2
#     HostName <EC2のパブリックIP>
#     User ubuntu
#     IdentityFile ~/.ssh/mykey.pem

# Apache インストール
sudo apt update
sudo apt install -y apache2
sudo systemctl enable apache2
sudo systemctl status apache2   # → active (running)
```

**ブラウザから確認する前にセキュリティグループを確認：**
```
AWS コンソール → EC2 → セキュリティグループ → インバウンドルール
→ HTTP (80) を 0.0.0.0/0 で許可する
```
Week04 で学んだ `firewalld` の「ポート開放」と同じ概念。
AWS ではこれをセキュリティグループで管理する。

---

## 課題2：Docker で Apache コンテナを起動

```bash
# httpd:2.4 はApacheの公式Docker イメージ
docker run -d -p 8080:80 --name myapache httpd:2.4

# 確認
docker ps
curl http://localhost:8080   # → "It works!" が返る

# コンテナの中に入って確認（本番サーバーにSSHするのと同じ感覚）
docker exec -it myapache bash
# コンテナ内で
apache2 -v
cat /usr/local/apache2/htdocs/index.html
exit

# ログ確認
docker logs myapache
docker logs -f myapache   # リアルタイム

# 停止・削除
docker stop myapache && docker rm myapache
```

---

## 課題3：Dockerfile でオリジナルサイトをビルド

```bash
# hands-on/ に移動
cd hands-on/

# Dockerfile の中身を確認してからビルド
cat Dockerfile

docker build -t hanamall-web:v1 .
# → Successfully built xxxx と出ればOK

docker run -d -p 8080:80 hanamall-web:v1
curl http://localhost:8080   # → HanaMall のページが返る

# イメージを確認
docker images | grep hanamall
```

**バージョン管理のベストプラクティス：**
```bash
docker build -t hanamall-web:v1.0.0 .   # バージョンタグを付ける
docker build -t hanamall-web:latest .   # latest も更新する
```
`latest` だけだと「どのバージョンが動いているか」が分からなくなるため
バージョンタグとlatestの両方を付けるのが慣習。

---

## 課題4：docker-compose で Apache + MySQL を起動

```bash
cd hands-on/
docker-compose up -d

# 確認
docker-compose ps
# Name              Command               State   Ports
# hanamall-db    docker-entrypoint.sh ...   Up    3306/tcp
# hanamall-web   apache2ctl -D FOREGROUND   Up    0.0.0.0:8080->80/tcp

curl http://localhost:8080   # → サイトが表示される

# ログ確認
docker-compose logs -f web   # web サービスのログ
docker-compose logs db       # db サービスのログ

# 停止
docker-compose down
docker-compose down -v   # ボリューム（DBデータ）も削除する場合
```

**`depends_on` の注意点：**
`depends_on: db` は「dbコンテナが起動してからwebを起動する」だが、
「dbが接続受付可能になるまで待つ」ではない。
MySQLの初期化が完了する前にWebアプリが接続しに行くと失敗することがある。
本番では `healthcheck` と組み合わせて使う。

---

## 課題5：思考問題 — 本番をDockerに移行すべきか

**メリット：**
1. **環境の再現性** — 「自分のPCでは動くのに本番で動かない」問題が解消される。
   Dockerfile があれば誰でも同じ環境を再現できる。
2. **デプロイの速さ** — コンテナイメージを差し替えるだけで更新できる。
   新バージョンと旧バージョンを瞬時に切り替えられる。

**デメリット：**
1. **運用の複雑さが増す** — コンテナ・イメージ・ネットワーク・ボリュームと
   管理対象が増える。トラブル時の切り分けが複雑になる。
2. **学習コスト** — チーム全員がDockerを理解している必要がある。
   Docker を知らないメンバーが深夜障害に対応するのは難しい。

**判断の観点：**
- 小規模・安定運用 → 現状維持でも問題ない
- 複数環境（開発・ステージング・本番）がある → Docker の恩恵が大きい
- デプロイ頻度が高い → Docker + CI/CD の組み合わせが効果的

---

## コンテナ vs VM の違い（まとめ）

| 比較 | VM | コンテナ |
|------|----|---------| 
| 起動時間 | 数分 | 数秒 |
| サイズ | GB単位 | MB単位 |
| カーネル | 独立（セキュリティ強い） | 共有（軽量だが分離は弱い） |
| 永続データ | ディスクに保存 | volume マウントが必要 |
| 適した用途 | 長期稼働・DB・ステートフル | アプリ配布・スケールアウト |

---

## よくある躓きポイント

**Q: `docker-compose up` でMySQLが起動しない**
A: ポート3306が別のMySQLに使われていることが多い。
```bash
ss -tnlp | grep 3306   # すでに使われているか確認
# → 使われていれば docker-compose.yml のポートを変更する
```

**Q: コンテナを削除したらDBのデータが消えた**
A: `volumes` の設定がないとコンテナ削除でデータも消える。
`docker-compose.yml` に named volume を設定してデータを永続化する。
