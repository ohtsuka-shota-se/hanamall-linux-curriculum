# 🗄️ MySQL DBサーバー構築

## このサーバーの役割
アプリケーションのデータ（ユーザー情報・商品情報など）を永続化します。Apache/PHP から MySQL Protocol（Port 3306）で接続されます。

---

## 1. インストール

```bash
sudo apt update
sudo apt install -y mysql-server
```

## 2. 起動・自動起動設定

```bash
sudo systemctl start mysql
sudo systemctl enable mysql
sudo systemctl status mysql
```

## 3. セキュリティ設定

```bash
sudo mysql_secure_installation
```

対話式で以下を設定します：
- root パスワードの設定
- 匿名ユーザーの削除
- リモート root ログインの禁止
- test データベースの削除

## 4. DB・ユーザー作成

```bash
sudo mysql -u root -p
```

```sql
CREATE DATABASE hanamall_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'hanamall'@'localhost' IDENTIFIED BY 'password';
GRANT ALL PRIVILEGES ON hanamall_db.* TO 'hanamall'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

## 5. 接続確認

```bash
mysql -u hanamall -p hanamall_db
```

---

## 📝 コマンド練習
