# 🗂️ Zabbixサーバー構築

## シナリオ

> Week10で手動監視に限界を感じた。CPU・メモリ・ディスク使用率を自動監視して、閾値超過でアラートを飛ばしてほしい。— 佐藤

## 構成

| 項目 | 内容 |
|---|---|
| OS | Ubuntu 22.04 |
| Zabbix | 6.4 LTS |
| DB | MariaDB 10.6 |
| Web | Apache2 + PHP 8.1 |

## 1. Zabbix リポジトリ追加

Zabbix 公式リポジトリを追加してインストールします。

```bash
# Zabbix リポジトリパッケージを取得（公式サイトのURLを使用）
wget https://repo.zabbix.com/zabbix/6.4/ubuntu/pool/main/z/zabbix-release/zabbix-release_6.4-1+ubuntu22.04_all.deb
sudo dpkg -i zabbix-release_6.4-1+ubuntu22.04_all.deb
sudo apt update
```

## 2. Zabbix インストール

```bash
sudo apt install -y zabbix-server-mysql zabbix-frontend-php zabbix-apache-conf zabbix-sql-scripts zabbix-agent
```

## 3. MariaDB セットアップ

```bash
sudo apt install -y mariadb-server
sudo systemctl enable mariadb
sudo systemctl start mariadb
sudo mysql_secure_installation
```

## 4. Zabbix 用 DB 作成

```bash
sudo mysql -uroot -p
```

```sql
CREATE DATABASE zabbix CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
CREATE USER zabbix@localhost IDENTIFIED BY 'zabbix_pass';
GRANT ALL PRIVILEGES ON zabbix.* TO zabbix@localhost;
SET GLOBAL log_bin_trust_function_creators = 1;
QUIT;
```

## 5. 初期スキーマのインポート

```bash
zcat /usr/share/zabbix-sql-scripts/mysql/server.sql.gz | sudo mysql --default-character-set=utf8mb4 -uzabbix -p zabbix
```

```bash
# インポート後、log_bin_trust を元に戻す
sudo mysql -uroot -p -e "SET GLOBAL log_bin_trust_function_creators = 0;"
```

## 6. zabbix_server.conf の設定

```bash
sudo nano /etc/zabbix/zabbix_server.conf
```

```
# 以下の行を設定
DBPassword=zabbix_pass
```

## 7. PHP タイムゾーン設定

```bash
sudo nano /etc/zabbix/apache.conf
```

```
# php_value date.timezone の行を有効化してタイムゾーンを設定
php_value date.timezone Asia/Tokyo
```

## 8. サービス起動

```bash
sudo systemctl restart zabbix-server zabbix-agent apache2
sudo systemctl enable zabbix-server zabbix-agent apache2
sudo systemctl status zabbix-server
```

## 9. Web セットアップウィザード

ブラウザで `http://<サーバーIP>/zabbix` にアクセスしてウィザードを完了する。

- デフォルト管理者: Admin / zabbix
- **初回ログイン後に必ずパスワードを変更すること**

## 今週の課題

1. Zabbix リポジトリを追加して Zabbix Server をインストールする
2. MariaDB に zabbix データベースを作成し、初期スキーマをインポートする
3. `zabbix_server.conf` に DB パスワードを設定する
4. `sudo systemctl status zabbix-server` で active (running) を確認する
5. ブラウザで Zabbix Web UI にアクセスし、セットアップウィザードを完了する
