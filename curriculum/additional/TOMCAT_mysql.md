# 🗄️ MySQL 連携・JDBC コネクションプール設定

## このパートでやること

Tomcat から MySQL に接続するための設定を行う。
アプリケーションコードで毎回コネクションを張るのではなく、
Tomcat の**コネクションプール**を使って効率的に DB 接続を管理する。

```
ブラウザ → Nginx → Tomcat → [コネクションプール] → MySQL
                              （接続を使い回す）
```

---

## 1. MySQL インストール・初期設定

```bash
sudo apt install -y mysql-server
sudo systemctl start mysql
sudo systemctl enable mysql

# 初期セキュリティ設定
sudo mysql_secure_installation
```

## 2. アプリ用 DB とユーザーを作成

```bash
sudo mysql -u root -p
```

```sql
-- データベース作成
CREATE DATABASE hanamall CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- アプリ用ユーザー作成（root を使わない）
CREATE USER 'appuser'@'localhost' IDENTIFIED BY 'SecurePass123!';

-- 必要な権限だけ付与
GRANT SELECT, INSERT, UPDATE, DELETE ON hanamall.* TO 'appuser'@'localhost';
FLUSH PRIVILEGES;

-- 確認
SHOW GRANTS FOR 'appuser'@'localhost';
```

> **なぜ root を使わないのか：**
> アプリが SQL インジェクションなどで侵害されたとき、
> root だと DB 全体が被害を受ける。
> 必要な権限だけ持つ専用ユーザーで被害範囲を限定する。

## 3. テスト用テーブル作成

```sql
USE hanamall;

CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    price INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO products (name, price) VALUES
    ('バラ（赤）', 500),
    ('チューリップ', 300),
    ('ひまわり', 400);

SELECT * FROM products;
```

## 4. JDBC ドライバのインストール

```bash
# MySQL Connector/J（JDBC ドライバ）をダウンロード
wget https://dev.mysql.com/get/Downloads/Connector-J/mysql-connector-j-8.3.0.tar.gz
tar -xzf mysql-connector-j-8.3.0.tar.gz

# Tomcat の lib ディレクトリに配置
sudo cp mysql-connector-j-8.3.0/mysql-connector-j-8.3.0.jar /opt/tomcat/lib/
sudo chown tomcat:tomcat /opt/tomcat/lib/mysql-connector-j-8.3.0.jar

# 確認
ls -la /opt/tomcat/lib/ | grep mysql
```

## 5. コネクションプールの設定（context.xml）

```bash
sudo nano /opt/tomcat/conf/context.xml
```

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Context>

    <!-- MySQL コネクションプール -->
    <Resource
        name="jdbc/hanamall"
        auth="Container"
        type="javax.sql.DataSource"
        driverClassName="com.mysql.cj.jdbc.Driver"
        url="jdbc:mysql://localhost:3306/hanamall?useSSL=false&amp;serverTimezone=Asia/Tokyo"
        username="appuser"
        password="SecurePass123!"
        maxTotal="20"
        maxIdle="10"
        minIdle="5"
        maxWaitMillis="10000"
        validationQuery="SELECT 1"
        testOnBorrow="true"/>

</Context>
```

| パラメータ | 意味 |
|-----------|------|
| `maxTotal` | プール内の最大コネクション数 |
| `maxIdle` | アイドル状態で保持する最大コネクション数 |
| `minIdle` | 常に確保しておく最小コネクション数 |
| `maxWaitMillis` | コネクション取得の最大待ち時間（ms）|
| `validationQuery` | コネクションの生死確認クエリ |
| `testOnBorrow` | 使用前にコネクションを検証するか |

```bash
# Tomcat を再起動して設定を反映
sudo systemctl restart tomcat
tail -f /opt/tomcat/logs/catalina.out
# エラーがなければ設定OK
```

## 6. 接続テスト（JSP で確認）

```bash
# 簡単なテスト用 JSP を作成
sudo mkdir -p /opt/tomcat/webapps/ROOT
sudo nano /opt/tomcat/webapps/ROOT/dbtest.jsp
```

```jsp
<%@ page import="java.sql.*, javax.sql.*, javax.naming.*" %>
<%
try {
    InitialContext ctx = new InitialContext();
    DataSource ds = (DataSource) ctx.lookup("java:comp/env/jdbc/hanamall");
    Connection conn = ds.getConnection();
    Statement stmt = conn.createStatement();
    ResultSet rs = stmt.executeQuery("SELECT name, price FROM products");
    while (rs.next()) {
        out.println(rs.getString("name") + ": " + rs.getInt("price") + "円<br>");
    }
    conn.close();
    out.println("<br>DB接続成功！");
} catch (Exception e) {
    out.println("エラー: " + e.getMessage());
}
%>
```

```bash
# ブラウザまたは curl でアクセス
curl http://localhost:8080/dbtest.jsp
# バラ（赤）: 500円
# チューリップ: 300円
# ひまわり: 400円
# DB接続成功！
```

## 7. コネクションリークの確認

```bash
# コネクションプールの状態を確認（Tomcat Manager または JMX）
# catalina.out にプール枯渇のエラーが出ていないか確認
grep -i "connection" /opt/tomcat/logs/catalina.out | tail -20

# MySQL 側でも接続数を確認
mysql -u root -p -e "SHOW STATUS LIKE 'Threads_connected';"
```

---

## 📝 今週の課題

### 大問1. MySQL のセットアップ

`hanamall` データベースと `appuser` を作成し、`SHOW GRANTS FOR 'appuser'@'localhost'` の出力を提出せよ。root ユーザーではなく appuser で `mysql -u appuser -p hanamall` にログインできることも確認すること

### 大問2. JDBC ドライバの配置

MySQL Connector/J を `/opt/tomcat/lib/` に配置し、`ls -la /opt/tomcat/lib/ | grep mysql` の出力を提出せよ

### 大問3. コネクションプール設定と接続テスト

`context.xml` を設定し、`dbtest.jsp` で products テーブルのデータが表示されることを確認せよ。`curl http://localhost:8080/dbtest.jsp` の出力を提出すること

### 大問4. コネクションプールのチューニング

`maxTotal` を `3` に設定した状態で大量リクエストを送り（`for i in $(seq 1 20); do curl http://localhost:8080/dbtest.jsp & done`）、`catalina.out` に何が出るか記録せよ。その後適切な値に戻すこと

### 大問5. 思考問題

`testOnBorrow="true"` と `validationQuery="SELECT 1"` を設定する理由を説明せよ。これを設定しないと本番環境でどんな障害が起きる可能性があるか？