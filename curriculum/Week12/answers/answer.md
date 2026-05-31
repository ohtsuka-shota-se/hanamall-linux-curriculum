# Week12 総合演習 解説・参考実装

---

## Week12 の位置づけ

Week01〜Week11 で学んだ全スキルを統合して「本番投入OKレポート」を作成する総仕上げ週。
以下は各確認項目の参考コマンドと判断基準。

---

## 本番投入OKレポート 参考チェックリスト

### ✅ セキュリティ

```bash
# SSHのパスワード認証が無効か
grep "PasswordAuthentication" /etc/ssh/sshd_config
# → PasswordAuthentication no

# rootログインが無効か
grep "PermitRootLogin" /etc/ssh/sshd_config
# → PermitRootLogin no

# ファイアウォールが有効か
sudo firewall-cmd --state
sudo firewall-cmd --list-all
# → 不要なポートが開いていないこと

# /etc/shadow のパーミッションが正しいか
ls -la /etc/shadow
# → -rw-r----- root shadow

# 不審なプロセスがいないか
ss -tnlp | grep -v "22\|80\|443"
```

### ✅ Apache の設定

```bash
# バーチャルホストの確認
sudo apache2ctl -S

# 設定の構文確認
sudo apache2ctl configtest
# → Syntax OK

# 各ドメインへのアクセス確認
curl -o /dev/null -s -w "%{http_code}" -H "Host: shop.hanamall.local" http://localhost
curl -o /dev/null -s -w "%{http_code}" -H "Host: admin.hanamall.local" http://localhost
```

### ✅ 監視・ログ

```bash
# systemd タイマーの稼働確認
systemctl list-timers | grep hanamall

# logrotate の設定確認
sudo logrotate -d /etc/logrotate.d/apache2

# 監視スクリプトの動作確認
bash ~/healthcheck.sh

# 直近のエラーログ確認
sudo tail -20 /var/log/apache2/error.log
sudo grep -i "error\|warn" /var/log/syslog | tail -10
```

### ✅ バックアップ

```bash
# バックアップスクリプトの動作確認
sudo bash ~/hanamall_backup.sh

# バックアップファイルの存在確認
ls -lh /backup/

# systemd サービスの確認
systemctl status hanamall-backup.service
systemctl status hanamall-backup.timer
```

### ✅ リソース状況

```bash
# ディスク使用率（80%未満であること）
df -h

# メモリ（swap を多用していないこと）
free -h

# ロードアベレージ（CPUコア数以下であること）
uptime
```

---

## レポートのまとめ方（提出例）

```
## HanaMall 本番投入OKレポート
作成日: 2025-06-01
作成者: 田中 太郎

### 実施した設定一覧

| カテゴリ | 設定内容 | 状態 |
|---------|---------|------|
| SSH | パスワード認証無効・公開鍵のみ | ✅ |
| ファイアウォール | 22・80のみ開放 | ✅ |
| Apache | shop・admin バーチャルホスト設定済み | ✅ |
| バックアップ | 毎日深夜2時に自動実行 | ✅ |
| 監視 | CPU・メモリ・ディスクの閾値アラート | ✅ |
| logrotate | Apache ログを30日で自動ローテーション | ✅ |

### 懸念事項・今後の対応

- MySQL の定期バックアップは未実装 → Week12 後に対応予定
- Zabbix による外形監視は次フェーズで導入予定

### 結論

上記設定が全て完了し、本番投入可能な状態と判断する。
```

---

## 振り返り：12週間で習得したスキル

| Phase | Week | 主なスキル |
|-------|------|-----------|
| Phase1 | Week01〜03 | Linux基本操作、ユーザー管理、プロセス管理 |
| Phase2 | Week04〜08 | ネットワーク、Apache、SSH/cron、シェルスクリプト、ストレージ |
| Phase3 | Week09〜11 | systemd、監視、クラウド、Docker |
| Phase4 | Week12 | 総合演習・本番運用の観点 |
