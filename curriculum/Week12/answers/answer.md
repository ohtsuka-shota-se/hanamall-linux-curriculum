# Week12 総合演習 解説・参考実装

## 全要件を満たすための構築手順まとめ

### 1. SSH セキュア化
```bash
sudo vim /etc/ssh/sshd_config
# PermitRootLogin no
# PasswordAuthentication no
# MaxAuthTries 3

# 必ず別ターミナルで公開鍵ログインが通ることを確認してから実行
sudo systemctl restart sshd
```

### 2. 作業用ユーザー作成
```bash
sudo useradd -m -s /bin/bash deploy
sudo visudo
# deploy ALL=(ALL) NOPASSWD: /bin/systemctl restart apache2
```

### 3. Apache 構築
```bash
sudo apt install -y apache2
sudo systemctl enable apache2
sudo apache2ctl configtest
sudo systemctl reload apache2
curl http://localhost
```

### 4. ファイアウォール
```bash
sudo firewall-cmd --add-service=ssh --permanent
sudo firewall-cmd --add-service=http --permanent
sudo firewall-cmd --reload
sudo firewall-cmd --list-all
```

### 5. バックアップ
```bash
sudo cp hanamall_backup.sh /usr/local/bin/
sudo chmod +x /usr/local/bin/hanamall_backup.sh
crontab -e
# 0 2 * * * /usr/local/bin/hanamall_backup.sh >> /var/log/hanamall_backup.log 2>&1
```

### 6. 監視スクリプト
```bash
sudo systemctl enable hanamall-healthcheck
sudo systemctl start hanamall-healthcheck
crontab -e
# */5 * * * * /usr/local/bin/hanamall_monitor.sh
```

### 7. logrotate 設定
```bash
sudo vim /etc/logrotate.d/hanamall
```

設定内容：
```
/var/log/hanamall_*.log {
    daily
    rotate 14
    compress
    missingok
    notifempty
    dateext
    sharedscripts
    postrotate
        systemctl reload apache2 > /dev/null 2>&1 || true
    endscript
}
```

```bash
sudo logrotate --debug /etc/logrotate.d/hanamall
```

### 8. README.md に構築手順を記録
「自分が1ヶ月後に見ても再現できるレベル」を目安に記録する。

---

## 振り返りチェックポイント

**知識面**
- [ ] 「なぜ root で直接ログインしないのか」を説明できる
- [ ] `reload` と `restart` の違いを説明できる
- [ ] ディスクフルになったとき、最初に打つコマンドを言える
- [ ] `journalctl` でサービスのエラーを絞り込む方法を知っている

**実技面**
- [ ] 一から構築する手順を見ずに書けるか
- [ ] 障害が起きたとき、どのログを見るか答えられるか
- [ ] 「繋がらない」をステップ分けて切り分けられるか

**設計面**
- [ ] バックアップは「取るだけ」でなく「復元できるか」まで確認したか
- [ ] 監視は「記録するだけ」でなく「異常に気づける」設計になっているか

---

## 12週間で積み上げたもの

```
深夜2時にアラート
 ↓
SSH でサーバーに入る（Week06）
 ↓
df -h でディスク確認 / top でCPU確認（Week10）
 ↓
journalctl でエラーログを確認（Week03・Week09）
 ↓
原因特定：古いログが溜まってディスクフル（Week08）
 ↓
不要ファイルを削除して Apache を再起動（Week05）
 ↓
復旧確認 → 佐藤さんに報告
 ↓
翌日：logrotate を設定して再発防止（Week09）
```

これが「インフラエンジニアとして1人で本番を任せられる」状態。
