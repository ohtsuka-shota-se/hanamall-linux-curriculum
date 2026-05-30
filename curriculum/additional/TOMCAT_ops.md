# 🔧 JVM チューニング・運用・障害対応

## JVM メモリの仕組み

```
JVM プロセス
├── Heap（ヒープ）
│   ├── Young Generation（新しいオブジェクト）
│   └── Old Generation（長期生存オブジェクト）
└── Non-Heap
    ├── Metaspace（クラス情報）
    └── Stack（スレッドごとのスタック）
```

OutOfMemoryError の多くはヒープ不足が原因。

---

## 1. JVM ヒープ設定

```bash
# /etc/systemd/system/tomcat.service の CATALINA_OPTS を編集
Environment="CATALINA_OPTS=-Xms512M -Xmx1024M -server -XX:+UseParallelGC"
```

| オプション | 意味 |
|-----------|------|
| `-Xms512M` | 起動時のヒープサイズ（最小）|
| `-Xmx1024M` | ヒープサイズの上限（最大）|
| `-server` | サーバー向け JIT 最適化を有効化 |
| `-XX:+UseParallelGC` | 並列 GC を使用 |

```bash
sudo systemctl daemon-reload
sudo systemctl restart tomcat
```

## 2. JVM の状態確認

```bash
# Tomcat プロセスの PID を確認
pgrep -f tomcat

# ヒープ使用状況を確認
jmap -heap <PID>

# スレッドダンプを取得（アプリがフリーズしたとき）
jstack <PID>

# GC の統計情報
jstat -gcutil <PID> 1000 10
# S0  S1   E    O    M     CCS   YGC  YGCT  FGC  FGCT  CGC  CGCT   GCT
# 0.0 85.1 33.3 21.2 97.5  91.7  15    0.3    2    0.5   0     0    0.8
```

## 3. OutOfMemoryError の再現と調査

```bash
# GC ログを有効化（server.xml の CATALINA_OPTS に追加）
-XX:+PrintGCDetails -Xloggc:/opt/tomcat/logs/gc.log

# OOM 発生時にヒープダンプを自動取得
-XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/opt/tomcat/logs/heap_dump.hprof
```

```bash
# OOM を意図的に発生させる（-Xmx を極端に小さくする）
Environment="CATALINA_OPTS=-Xms64M -Xmx64M"

# 大量リクエストを送る
for i in $(seq 1 100); do curl http://hanamall.local/ & done

# catalina.out で OOM を確認
tail -f /opt/tomcat/logs/catalina.out
# java.lang.OutOfMemoryError: Java heap space が出るはず
```

## 4. ログ管理

```bash
# catalina.out はローテーションしない（無制限に肥大化する）
# logrotate で管理する
sudo nano /etc/logrotate.d/tomcat
```

```
/opt/tomcat/logs/catalina.out {
    daily
    rotate 7
    compress
    missingok
    notifempty
    copytruncate
}
```

```bash
# 動作確認
sudo logrotate --debug /etc/logrotate.d/tomcat
```

## 5. Tomcat のヘルスチェック

```bash
# 死活監視スクリプト
cat << 'EOF' > /opt/hanamall_healthcheck.sh
#!/bin/bash
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/)
if [ "$RESPONSE" != "200" ]; then
    echo "$(date): Tomcat unhealthy (HTTP $RESPONSE) - restarting" >> /var/log/tomcat_healthcheck.log
    sudo systemctl restart tomcat
fi
EOF
chmod +x /opt/hanamall_healthcheck.sh

# cron で5分ごとに実行
(crontab -l; echo "*/5 * * * * /opt/hanamall_healthcheck.sh") | crontab -
```

---

## 📝 今週の課題

### 大問1. JVM ヒープ設定と確認

`CATALINA_OPTS` で `-Xms512M -Xmx1024M` を設定し、`jmap -heap <PID>` でヒープ設定が反映されていることを確認せよ

### 大問2. OutOfMemoryError の再現と調査

`-Xmx64M` に設定して意図的に OOM を発生させ、`catalina.out` のエラーログを記録せよ。その後 `-Xmx1024M` に戻して復旧させよ

### 大問3. catalina.out のログローテーション設定

`/etc/logrotate.d/tomcat` を作成し、`logrotate --debug` で設定が正しいことを確認せよ

### 大問4. ヘルスチェックスクリプト

Tomcat が落ちたとき自動で再起動するスクリプトを作り、cron に登録せよ。意図的に Tomcat を停止して自動復旧することを確認せよ

### 大問5. 思考問題

`-Xms` と `-Xmx` を同じ値にする（例: `-Xms1024M -Xmx1024M`）運用をする場合のメリット・デメリットを説明せよ