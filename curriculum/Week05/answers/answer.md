# Week05 課題 回答例・解説

## 課題2：オリジナルHTMLをVirtualHostで表示

```bash
# 1. ドキュメントルートとHTMLを作成
sudo mkdir -p /var/www/mysite
cat << 'HTML' | sudo tee /var/www/mysite/index.html
<h1>My HanaMall Site</h1>
HTML
sudo chown -R www-data:www-data /var/www/mysite

# 2. VirtualHost設定を作成
sudo tee /etc/apache2/sites-available/mysite.conf << 'CONF'
<VirtualHost *:80>
    ServerName mysite.local
    DocumentRoot /var/www/mysite
    <Directory /var/www/mysite>
        Require all granted
    </Directory>
</VirtualHost>
CONF

# 3. 有効化・反映
sudo a2ensite mysite.conf
sudo apache2ctl configtest   # → Syntax OK を確認
sudo systemctl reload apache2

# 4. /etc/hosts に追加して確認
echo "127.0.0.1 mysite.local" | sudo tee -a /etc/hosts
curl http://mysite.local   # → <h1>My HanaMall Site</h1>
```

## 課題3：shop / admin バーチャルホスト設定

```bash
# 1. ドキュメントルート作成
sudo mkdir -p /var/www/shop /var/www/admin
echo "<h1>Shop</h1>" | sudo tee /var/www/shop/index.html
echo "<h1>Admin</h1>" | sudo tee /var/www/admin/index.html
sudo chown -R www-data:www-data /var/www/shop /var/www/admin

# 2. Apache設定を配置・有効化
sudo cp hands-on/site-a.conf /etc/apache2/sites-available/
sudo cp hands-on/site-b.conf /etc/apache2/sites-available/
sudo a2ensite site-a.conf site-b.conf

# 3. 構文チェックと反映
sudo apache2ctl configtest   # → Syntax OK
sudo systemctl reload apache2

# 4. 確認
curl http://site-a.local   # → <h1>Site A</h1>
curl http://site-b.local   # → <h1>Site B</h1>
```

## 課題4：DocumentRootミスによる404のトラブルシューティング

```bash
# 意図的にDocumentRootを間違える
sudo vim /etc/apache2/sites-available/site-a.conf
# DocumentRoot /var/www/wrong-path  ← 存在しないパスに変更

sudo apache2ctl configtest && sudo systemctl reload apache2
curl http://site-a.local   # → 403 or 404

# エラーログで原因を確認
sudo tail /var/log/apache2/site-a_error.log
# [error] [client ...] DocumentRoot must be a directory

# 正しいパスに戻す
sudo vim /etc/apache2/sites-available/site-a.conf
sudo apache2ctl configtest && sudo systemctl reload apache2
curl http://site-a.local   # → 200
```

---

## 課題4（思考問題）：reload 時に文法エラーがあるとどうなるか

**問い：** 本番サービス中に `sudo systemctl reload apache2` を実行したとき、設定ファイルに文法エラーがあるとどうなるか？

**実際に試す手順：**
```bash
# 1. わざと文法エラーを入れる
sudo bash -c 'echo "invalid_directive;" >> /etc/apache2/apache2.conf'

# 2. reload を実行
sudo systemctl reload apache2
```

**出力結果：**
```
Job for apache2.service failed.
See "journalctl -xe" for details.
```

**この時点でのApacheの状態を確認：**
```bash
sudo systemctl status apache2
# → active (running) ← 落ちていない！

curl http://localhost
# → 200 ← サービスは継続して動いている
```

**答え：Apache は落ちない。古い設定で動き続ける。**

`reload` は「新しい設定で差し替える」操作だが、
新しい設定の読み込みに失敗したとき Apache はそれを拒否して現在の設定を維持する。
つまり **reload が失敗してもサービスは止まらない**。

これが `reload` が `restart` より安全な理由でもある。

| 操作 | 文法エラーがあった場合 | 文法エラーがない場合 |
|------|---------------------|----------------|
| `reload` | 失敗するが Apache は落ちない（旧設定で継続） | 無停止で設定反映 |
| `restart` | 失敗して Apache が落ちる（サービス停止） | 再起動して設定反映 |

**本番での鉄則：**
```bash
# 必ずこの順番で
sudo apache2ctl configtest   # 1. 文法チェック（Syntax OK を確認）
sudo systemctl reload apache2  # 2. 問題なければ reload
```

**後始末：**
```bash
# エラーを入れた行を削除
sudo sed -i '/invalid_directive;/d' /etc/apache2/apache2.conf
sudo apache2ctl configtest   # → Syntax OK
sudo systemctl reload apache2
```

---

## よくある躓きポイント

**Q: `sudo systemctl reload apache2` で設定が反映されない**
A: `apache2ctl configtest` で文法エラーがないか先に確認する。エラーがあるとリロードに失敗してもApacheは古い設定で動き続ける（サービスは落ちない）。

**Q: 403 Forbidden が出る**
A: 2つ確認する。①`<Directory>` ブロックに `Require all granted` があるか。②ドキュメントルートのパーミッションが `755` 以上か（`sudo chmod -R 755 /var/www/site-a`）。

**Q: a2ensite したのに反映されない**
A: `sudo systemctl reload apache2` を忘れている。`a2ensite` はシンボリックリンクを作るだけで、Apacheへの反映は reload が必要。
