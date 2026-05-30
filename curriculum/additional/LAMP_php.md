# ⚙️ PHP インストール・Apache 連携

## このモジュールの役割
Apache 上で PHP スクリプトを実行します。Apache の mod_php として動作し、PHP から MySQL へのクエリ発行を可能にします。

---

## 1. インストール

```bash
sudo apt update
sudo apt install -y php libapache2-mod-php php-mysql
```

## 2. Apache 再起動

```bash
sudo systemctl restart apache2
```

## 3. PHP 動作確認

```bash
sudo nano /var/www/html/info.php
```

以下の内容を記述：

```php
<?php phpinfo(); ?>
```

ブラウザで `http://サーバーIP/info.php` にアクセスして PHP 情報が表示されることを確認。

> 確認後は削除してください: `sudo rm /var/www/html/info.php`

## 4. MySQL 接続テスト

```php
<?php
$conn = new mysqli('localhost', 'hanamall', 'password', 'hanamall_db');
if ($conn->connect_error) {
    die('接続失敗: ' . $conn->connect_error);
}
echo '接続成功！';
$conn->close();
?>
```

## 5. モジュール確認

```bash
php --version
php -m | grep -E "mysql|pdo"
```

---

## 📝 コマンド練習
