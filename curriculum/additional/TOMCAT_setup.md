# ☕ Tomcat インストール・WAR デプロイ

## このサーバーの役割

Nginx（リバースプロキシ）の後ろで Java Servlet / JSP を実行するアプリケーションサーバー。
HanaMall のバックエンド API をここで動かす。

---

## 構成イメージ

```
ブラウザ → Nginx(:80) → Tomcat(:8080) → MySQL(:3306)
```

Tomcat は外部に直接公開しない。8080 ポートはファイアウォールで閉じて Nginx 経由のみ許可する。

---

## 1. Java（OpenJDK）インストール

```bash
sudo apt update
sudo apt install -y openjdk-17-jdk
java -version
# openjdk version "17.x.x" ...
```

## 2. Tomcat インストール

```bash
# Tomcat 用ユーザー作成（専用ユーザーで動かすのがセキュリティ上の基本）
sudo useradd -m -d /opt/tomcat -U -s /bin/false tomcat

# Tomcat ダウンロード（バージョンは適宜確認）
cd /tmp
wget https://dlcdn.apache.org/tomcat/tomcat-10/v10.1.20/bin/apache-tomcat-10.1.20.tar.gz

sudo tar -xzf apache-tomcat-10.1.20.tar.gz -C /opt/tomcat --strip-components=1
sudo chown -R tomcat:tomcat /opt/tomcat
sudo chmod -R u+x /opt/tomcat/bin
```

## 3. systemd サービス登録

```bash
sudo nano /etc/systemd/system/tomcat.service
```

```ini
[Unit]
Description=Apache Tomcat
After=network.target

[Service]
Type=forking
User=tomcat
Group=tomcat
Environment="JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64"
Environment="CATALINA_PID=/opt/tomcat/temp/tomcat.pid"
Environment="CATALINA_HOME=/opt/tomcat"
Environment="CATALINA_OPTS=-Xms512M -Xmx1024M -server -XX:+UseParallelGC"
ExecStart=/opt/tomcat/bin/startup.sh
ExecStop=/opt/tomcat/bin/shutdown.sh
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl start tomcat
sudo systemctl enable tomcat
sudo systemctl status tomcat
```

## 4. 動作確認

```bash
# Tomcat はデフォルトで 8080 ポートで起動
curl http://localhost:8080
# Tomcat のデフォルトページが返ってくればOK

# ログ確認
tail -f /opt/tomcat/logs/catalina.out
```

## 5. サンプル WAR デプロイ

```bash
# Tomcat に付属のサンプルアプリを確認
ls /opt/tomcat/webapps/
# ROOT  docs  examples  host-manager  manager

# 独自 WAR ファイルをデプロイする場合
sudo cp myapp.war /opt/tomcat/webapps/
# Tomcat が自動展開する（logs/catalina.out を監視）

# デプロイ確認
curl http://localhost:8080/myapp/
```

## 6. 重要ファイルの場所

| ファイル | 説明 |
|---------|------|
| `/opt/tomcat/conf/server.xml` | ポート・コネクタ設定 |
| `/opt/tomcat/conf/context.xml` | DB接続プール設定 |
| `/opt/tomcat/webapps/` | WAR デプロイ先 |
| `/opt/tomcat/logs/catalina.out` | メインログ |
| `/opt/tomcat/logs/localhost_access_log.*.txt` | アクセスログ |

---

## 📝 今週の課題

### 大問1. Java と Tomcat のインストール

OpenJDK 17 と Tomcat 10 をインストールし、`systemctl status tomcat` が `active (running)` になることを確認せよ

### 大問2. WAR デプロイの確認

Tomcat 付属のサンプルアプリ（`/opt/tomcat/webapps/examples/`）に `curl http://localhost:8080/examples/` でアクセスできることを確認せよ

### 大問3. ポートとプロセスの確認

`ss -tnlp` で 8080 ポートが Tomcat プロセスで LISTEN していることを確認し、`ps aux | grep tomcat` でプロセスが `tomcat` ユーザーで動いていることを確認せよ

### 大問4. 思考問題

Tomcat を `root` ユーザーで動かすことの危険性を説明せよ。専用ユーザー（`tomcat`）で動かす理由は何か？