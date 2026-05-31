# Week09 課題 回答例・解説

---

### 大問1. Apache のバージョンを確認し、apt-mark hold で固定せよ

```bash
# バージョン確認
apache2 -v
dpkg -l apache2 | grep apache2

# バージョン固定
sudo apt-mark hold apache2

# 固定の確認
apt-mark showhold

# 固定を解除する場合（参考）
sudo apt-mark unhold apache2
```

**解説：** `apt-mark hold` で `apt upgrade` の対象から除外できる。本番環境では動作確認済みのバージョンを固定し、意図しないアップデートを防ぐ。

---

### 大問2. Week07 で作った hanamall_backup.sh を systemd サービスとして登録せよ

```bash
sudo nano /etc/systemd/system/hanamall-backup.service
```

```ini
[Unit]
Description=HanaMall Backup Service
After=network.target

[Service]
Type=oneshot
ExecStart=/home/ubuntu/hanamall_backup.sh
User=ubuntu
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable hanamall-backup.service
sudo systemctl start hanamall-backup.service
sudo systemctl status hanamall-backup.service
```

---

### 大問3. systemd タイマーで毎日深夜2時に自動実行するよう設定せよ

```bash
sudo nano /etc/systemd/system/hanamall-backup.timer
```

```ini
[Unit]
Description=Run HanaMall Backup daily at 2:00

[Timer]
OnCalendar=*-*-* 02:00:00
Persistent=true

[Install]
WantedBy=timers.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable hanamall-backup.timer
sudo systemctl start hanamall-backup.timer

# 確認
systemctl list-timers | grep hanamall
```

---

### 大問4. journalctl で以下の調査を実施せよ

```bash
# 本日のログ
journalctl --since today

# apache2 の直近50件
journalctl -u apache2 -n 50 --no-pager

# エラー・警告のみ
journalctl -p err -n 30 --no-pager

# 特定時間帯
journalctl --since "2025-05-01 09:00" --until "2025-05-01 10:00"
```

---

### 大問5. logrotate 設定を確認し、以下を実施せよ

```bash
# Apache の logrotate 設定確認
cat /etc/logrotate.d/apache2

# 手動で logrotate を実行（dry-run）
sudo logrotate -d /etc/logrotate.d/apache2

# 実際に実行
sudo logrotate -f /etc/logrotate.d/apache2

# 結果確認
ls -lh /var/log/apache2/
```

**設定の追加例：**

```
/var/log/hanamall/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 644 www-data www-data
}
```

---

### 大問6. systemctl list-units --type=service --state=failed を実行し、failed なサービスがあれば原因を調査して報告せよ

```bash
systemctl list-units --type=service --state=failed
```

**failed がある場合の調査手順：**

```bash
# ログを確認
journalctl -u サービス名.service -n 30 --no-pager

# ステータス詳細
systemctl status サービス名.service

# 設定ファイルの構文確認（Apache の場合）
sudo apache2ctl configtest
```

---

### 大問7. 思考問題: Restart=on-failure でクラッシュ→即再起動を繰り返した場合の影響と、RestartSec・StartLimitBurst を使った設計を答えよ

**サーバーへの影響：**
- CPU・メモリを高速で消費し続け、サーバー全体のリソースが枯渇する
- 他のサービスへの影響（メモリ不足、ロードアベレージ上昇）
- ログが大量に生成され、ディスクフルになる可能性がある

**適切な設計例：**

```ini
[Service]
Restart=on-failure
RestartSec=5s          # 再起動前に5秒待つ
StartLimitBurst=3      # 30秒以内に3回失敗したら
StartLimitIntervalSec=30s  # 起動を諦める（手動介入を要求）
```

**設計の考え方：**
- `RestartSec` で再起動間隔を空けてリソース浪費を防ぐ
- `StartLimitBurst` で連続失敗時は自動復旧を諦め、アラート→人間が調査するフローに切り替える
