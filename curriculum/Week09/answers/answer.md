# Week09 課題 回答例・解説

## 課題1：Apacheをバージョン固定

```bash
# 現在のバージョン確認
apache2 -v
# Server version: Apache/2.4.52

# インストール可能なバージョン一覧
apt-cache policy apache2

# バージョンを固定（関連パッケージも一緒に固定する）
sudo apt-mark hold apache2 apache2-bin apache2-data
apt-mark showhold
# → apache2, apache2-bin, apache2-data が表示される

# 固定されていることを確認（更新対象に出てこないこと）
sudo apt upgrade --dry-run | grep apache2
# → 何も表示されなければOK
```

**なぜ関連パッケージも固定するのか：**
`apache2` だけ固定しても `apache2-bin` が更新されると実質的にApacheが更新されてしまう。
`apt-cache showpkg apache2` で依存関係を確認して関連パッケージもまとめて固定する。

---

## 課題2：バックアップスクリプトをsystemdサービスに登録

```bash
# Week07のスクリプトを所定の場所に配置
sudo cp hands-on/07_backup.sh /usr/local/bin/hanamall_backup.sh
sudo chmod +x /usr/local/bin/hanamall_backup.sh
```

**Unit ファイルを作成：**
```ini
# /etc/systemd/system/hanamall-backup.service
[Unit]
Description=HanaMall Backup Service
After=network.target

[Service]
Type=oneshot
ExecStart=/usr/local/bin/hanamall_backup.sh
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable hanamall-backup.service

# 手動で1回実行して動作確認
sudo systemctl start hanamall-backup.service
sudo systemctl status hanamall-backup.service   # → active (exited)
journalctl -u hanamall-backup -n 20             # → ログを確認
```

**Type=oneshot とは：**
バックアップのように「実行して終了する」スクリプトには `oneshot` を使う。
`simple` は「常駐するプロセス」向けで、終了するとsystemdがエラーと判断してしまう。

---

## 課題3：systemdタイマーで深夜2時に実行

```ini
# /etc/systemd/system/hanamall-backup.timer
[Unit]
Description=HanaMall Daily Backup Timer

[Timer]
OnCalendar=*-*-* 02:00:00
Persistent=true

[Install]
WantedBy=timers.target
```

```bash
sudo systemctl enable hanamall-backup.timer
sudo systemctl start hanamall-backup.timer

# 次回実行時刻を確認
systemctl list-timers | grep hanamall
# NEXT                         LEFT     LAST  PASSED  UNIT
# Sat 2025-05-04 02:00:00 JST  8h left  n/a   n/a    hanamall-backup.timer
```

**`Persistent=true` の意味：**
サーバーが停止していてタイマーが発火できなかった場合、
次回起動時に遅れて実行する。夜間メンテナンスで停止するサーバーに有効。

---

## 課題4：ログ確認

```bash
# 今日のログだけ確認
journalctl -u hanamall-healthcheck --since today

# 直近50行
journalctl -u hanamall-healthcheck -n 50

# リアルタイム追跡
journalctl -u hanamall-healthcheck -f

# エラーだけ確認
journalctl -u hanamall-healthcheck -p err
```

---

## 課題5：思考問題 — `Restart=on-failure` と無限ループスクリプト

**何が起きるか：**
無限ループスクリプトが異常終了するたびに systemd が再起動を繰り返す。
`RestartSec` を設定していないと、クラッシュ→即再起動→クラッシュを高速で繰り返し
CPUを食い続ける「再起動ストーム」が発生する。

**適切な設計：**
```ini
[Service]
Restart=on-failure
RestartSec=30           # 30秒待ってから再起動（連続クラッシュを抑止）
StartLimitIntervalSec=300   # 5分間で
StartLimitBurst=3           # 3回以上クラッシュしたら再起動を諦める
```

`StartLimitBurst` を超えると systemd はサービスを `failed` 状態にして再起動を停止する。
その後は `sudo systemctl reset-failed hanamall-healthcheck` で手動リセットが必要になる。

---

## よくある躓きポイント

**Q: `systemctl daemon-reload` を忘れてサービスが古いUnit ファイルで動く**
A: Unit ファイルを変更したら必ず `daemon-reload` が必要。
忘れると「設定を変えたのに反映されない」という混乱が起きる。

**Q: タイマーを有効化したのに `systemctl list-timers` に表示されない**
A: `systemctl start hanamall-backup.timer` でタイマーを起動していないことが多い。
`enable` は「自動起動の登録」で、実際の起動は `start` が必要。
