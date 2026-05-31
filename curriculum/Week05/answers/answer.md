# Week05 課題 回答例・解説

---

### 大問1. shop.hanamall.local の設定ファイルを a2dissite で無効化し、再度 a2ensite で有効化する手順を完全に自力でやってみよ

```bash
# 無効化
sudo a2dissite shop.hanamall.local.conf
sudo systemctl reload apache2

# 無効化の確認（404 または接続不可になるはず）
curl -H "Host: shop.hanamall.local" http://localhost

# 再度有効化
sudo a2ensite shop.hanamall.local.conf
sudo systemctl reload apache2

# 確認（200 が返ってくるはず）
curl -o /dev/null -s -w "%{http_code}" -H "Host: shop.hanamall.local" http://localhost
```

**ポイント：**
- `a2dissite`：`/etc/apache2/sites-enabled/` のシンボリックリンクを削除
- `a2ensite`：シンボリックリンクを再作成
- 設定変更後は必ず `reload` または `restart`

---

### 大問2. 以下の障害を意図的に発生させ、error.log だけを手がかりに復旧させよ

**DocumentRoot を存在しないディレクトリに変更した場合の復旧例：**

```bash
# エラーログ確認
sudo tail -20 /var/log/apache2/error.log
# → [error] ... DocumentRoot '/var/www/shop_broken' does not exist

# 設定ファイルで誤りを特定して修正
sudo nano /etc/apache2/sites-available/shop.hanamall.local.conf

# 構文確認
sudo apache2ctl configtest

# 復旧
sudo systemctl reload apache2
```

**error.log の読み方：**
- `[error]`：エラーレベル
- ファイルパス・行番号が書かれているので設定ファイルの該当箇所を直接確認できる

---

### 大問3. 新規バーチャルホスト追加: api.hanamall.local を自力で追加し、{"status":"ok"} を返すようにせよ

```bash
# ドキュメントルート作成
sudo mkdir -p /var/www/api
echo '{"status":"ok"}' | sudo tee /var/www/api/index.html

# 設定ファイル作成
sudo nano /etc/apache2/sites-available/api.hanamall.local.conf
```

```apache
<VirtualHost *:80>
    ServerName api.hanamall.local
    DocumentRoot /var/www/api
    ErrorLog ${APACHE_LOG_DIR}/api_error.log
    CustomLog ${APACHE_LOG_DIR}/api_access.log combined
</VirtualHost>
```

```bash
# 有効化して反映
sudo a2ensite api.hanamall.local.conf
sudo apache2ctl configtest
sudo systemctl reload apache2

# 確認
curl -H "Host: api.hanamall.local" http://localhost
# → {"status":"ok"}
```

---

### 大問4. Apache のアクセスログから以下を調べよ

```bash
# 直近100件のエラー件数
sudo tail -100 /var/log/apache2/shop_access.log | grep -E ' [45][0-9]{2} ' | wc -l

# ステータスコード別の件数
sudo awk '{print $9}' /var/log/apache2/shop_access.log | sort | uniq -c | sort -rn

# 最もアクセスの多いURL Top5
sudo awk '{print $7}' /var/log/apache2/shop_access.log | sort | uniq -c | sort -rn | head -5
```

---

### 大問5. apache2ctl -S を実行し、現在有効なバーチャルホストの一覧を確認せよ

```bash
sudo apache2ctl -S
```

**出力例：**
```
VirtualHost configuration:
*:80                   shop.hanamall.local (/etc/apache2/sites-enabled/shop.hanamall.local.conf:1)
*:80                   admin.hanamall.local (/etc/apache2/sites-enabled/admin.hanamall.local.conf:1)
*:80                   api.hanamall.local (/etc/apache2/sites-enabled/api.hanamall.local.conf:1)
```

| ドメイン | 設定ファイル |
|---------|------------|
| shop.hanamall.local | shop.hanamall.local.conf |
| admin.hanamall.local | admin.hanamall.local.conf |
| api.hanamall.local | api.hanamall.local.conf |

---

### 大問6. 設定ファイルに意図的に文法エラーを入れて systemctl reload apache2 を実行し、以下を確認してから復旧させよ

```bash
# 意図的にエラーを入れる（ServerNaem はミスタイプ）
sudo sed -i 's/ServerName/ServerNaem/' /etc/apache2/sites-available/shop.hanamall.local.conf

# reload を試みる
sudo systemctl reload apache2

# Apacheは落ちたか確認
systemctl is-active apache2
# → active（reload は失敗するが既存プロセスは継続して動く）

# エラーの確認
sudo apache2ctl configtest
# → AH00526: Syntax error ... Invalid command 'ServerNaem'

# 復旧
sudo sed -i 's/ServerNaem/ServerName/' /etc/apache2/sites-available/shop.hanamall.local.conf
sudo apache2ctl configtest  # → Syntax OK
sudo systemctl reload apache2
```

---

### 大問7. 思考問題: ダウンタイムなしで設定を反映するには restart と reload のどちらを使うべきか。また、その前に必ず実行すべきコマンドは何か答えよ

**`reload` を使うべき**

| | restart | reload |
|-|---------|--------|
| 動作 | プロセスを完全停止→再起動 | 設定ファイルのみ再読み込み |
| 既存接続 | 切断される | 維持される |
| ダウンタイム | 発生する | 発生しない |

**その前に必ず実行すべきコマンド：**

```bash
sudo apache2ctl configtest
```

理由：構文エラーがある状態で `reload` すると設定が反映されず、最悪の場合サービスが停止する。`configtest` で「Syntax OK」を確認してから `reload` するのが本番での鉄則。
