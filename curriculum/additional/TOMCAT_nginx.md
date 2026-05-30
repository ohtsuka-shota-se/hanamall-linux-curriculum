# 🔀 Nginx リバースプロキシ設定

## なぜ Nginx を前に置くのか

| 役割 | Nginx | Tomcat |
|------|-------|--------|
| 静的ファイル配信 | ✅ 得意（高速） | △ 苦手 |
| SSL終端 | ✅ ここで処理 | 設定が複雑 |
| ポート80公開 | ✅ | ❌ 8080は非公開 |
| Java実行 | ❌ できない | ✅ ここで処理 |

Tomcat を直接 80 番で外に出さず、Nginx 経由にすることでセキュリティと役割分担を両立する。

---

## 1. Nginx インストール

```bash
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

## 2. リバースプロキシ設定

```bash
sudo nano /etc/nginx/sites-available/hanamall
```

```nginx
server {
    listen 80;
    server_name hanamall.local;

    # 静的ファイルは Nginx が直接返す
    location /static/ {
        root /var/www/hanamall;
        expires 30d;
    }

    # それ以外は Tomcat に転送
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # タイムアウト設定（Java アプリは起動が遅いことがある）
        proxy_connect_timeout 10s;
        proxy_send_timeout    60s;
        proxy_read_timeout    60s;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/hanamall /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 3. /etc/hosts に追記（ローカル確認用）

```bash
echo "127.0.0.1 hanamall.local" | sudo tee -a /etc/hosts
curl http://hanamall.local
# Tomcat のレスポンスが返ってくればOK
```

## 4. Tomcat の 8080 を外部から遮断

```bash
# 8080 は localhost からのみ許可（Nginx からの接続だけ通す）
sudo ufw deny 8080
sudo ufw allow 80
sudo ufw status

# 外部から 8080 に直接アクセスできないことを確認
curl http://localhost:8080   # → 通る（localhost からはOK）
# ブラウザから http://サーバーIP:8080 → 拒否される
```

## 5. アクセスログの確認

```bash
# Nginx のアクセスログで Tomcat への転送を確認
tail -f /var/log/nginx/access.log

# Tomcat のアクセスログも確認
tail -f /opt/tomcat/logs/localhost_access_log.*.txt
```

## 6. X-Forwarded-For の確認

```bash
# Tomcat 側でクライアントの実際の IP を取得できているか確認
# Tomcat の RemoteIpValve を server.xml に追加する
sudo nano /opt/tomcat/conf/server.xml
```

```xml
<!-- Host タグの中に追加 -->
<Valve className="org.apache.catalina.valves.RemoteIpValve"
       remoteIpHeader="x-forwarded-for"
       protocolHeader="x-forwarded-proto"/>
```

---

## 📝 今週の課題

### 大問1. Nginx のインストールとリバースプロキシ設定

`/etc/nginx/sites-available/hanamall` を作成し、`curl http://hanamall.local` で Tomcat のレスポンスが返ることを確認せよ。`nginx -t` でシンタックスエラーがないことも確認すること

### 大問2. ポートのセキュリティ確認

`sudo ufw deny 8080` を設定し、`ss -tnlp` と `ufw status` の出力を提出せよ。「Nginx 経由では繋がるが 8080 への直接アクセスは拒否される」状態を作ること

### 大問3. X-Forwarded-For の確認

`RemoteIpValve` を設定した後、Tomcat のアクセスログに記録されるクライアント IP が `127.0.0.1` ではなく実際の IP になることを確認せよ

### 大問4. 思考問題

`proxy_read_timeout 60s` を `5s` に変えて、レスポンスに5秒以上かかるリクエストを送ったときに何が起きるか確認せよ。本番でタイムアウト値を設定するときの考え方を説明せよ