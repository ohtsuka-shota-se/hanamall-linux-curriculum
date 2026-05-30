# 🌐 Apache Webサーバー構築

## このサーバーの役割
クライアント（ブラウザ）からの HTTP リクエストを受け取り、PHP を介して動的コンテンツを生成し、MySQL のデータを返します。

---

## 1. インストール

```bash
sudo apt update
sudo apt install -y apache2
```

## 2. 起動・自動起動設定

```bash
sudo systemctl start apache2
sudo systemctl enable apache2
sudo systemctl status apache2
```

## 3. ファイアウォール設定

```bash
sudo ufw allow 'Apache'
sudo ufw status
```

## 4. 動作確認

ブラウザで `http://サーバーIP` にアクセスして Apache のデフォルトページを確認。

```bash
curl http://localhost
```

## 5. 設定ファイルの場所

| ファイル | 説明 |
|---|---|
| `/etc/apache2/apache2.conf` | メイン設定 |
| `/etc/apache2/sites-available/` | バーチャルホスト設定 |
| `/var/www/html/` | ドキュメントルート |
| `/var/log/apache2/` | ログファイル |

## 6. バーチャルホスト設定（オプション）

```bash
sudo nano /etc/apache2/sites-available/mysite.conf
```

```apache
<VirtualHost *:80>
    ServerName mysite.local
    DocumentRoot /var/www/mysite
    ErrorLog ${APACHE_LOG_DIR}/error.log
    CustomLog ${APACHE_LOG_DIR}/access.log combined
</VirtualHost>
```

```bash
sudo a2ensite mysite.conf
sudo systemctl reload apache2
```

---

## 📝 コマンド練習
