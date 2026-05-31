# Week10 課題 回答例・解説

---

### 大問1. vmstat 1 10 を実行し、以下を答えよ

```bash
vmstat 1 10
```

**出力の読み方：**

| 列 | 意味 |
|----|------|
| `r` | 実行待ちプロセス数（2以上が続くと CPU ボトルネック） |
| `b` | ブロック中プロセス数（I/O 待ち） |
| `swpd` | swap 使用量（0 が理想） |
| `free` | 空きメモリ（KB） |
| `si/so` | swap in/out（0 以外は swap 多用中） |
| `bi/bo` | ディスク I/O（高いと I/O ボトルネック） |
| `us/sy` | ユーザー/カーネルのCPU使用率 |
| `wa` | I/O 待ちの CPU 割合（10%超は要注意） |

---

### 大問2. hands-on/10_setup.sh を実行して高負荷状態を作り出し、以下を実施せよ

```bash
# 高負荷状態を作る
bash hands-on/10_setup.sh

# CPU・メモリ・ディスクの使用率を確認
top
vmstat 1 5
free -h
df -h

# 高負荷プロセスを特定
ps aux --sort=-%cpu | head -10
ps aux --sort=-%mem | head -10

# 原因プロセスを停止
kill -9 PID
```

---

### 大問3. ディスクフルを意図的に起こし、Apache が落ちることを確認してから復旧させよ

```bash
# Step1: ディスクを埋める
sudo dd if=/dev/zero of=/var/log/dummy bs=1M

# Step2: Apache の状態確認
sudo systemctl status apache2
curl http://localhost

# Step3: 原因ファイルを削除
sudo rm /var/log/dummy
df -h

# Step4: Apache を再起動
sudo systemctl restart apache2
sudo systemctl status apache2
curl -o /dev/null -s -w "%{http_code}" http://localhost
```

---

### 大問4. Apache 設定ファイルに構文エラーを入れて systemctl reload した挙動を確認し、以下に答えよ

```bash
# 意図的にエラーを入れる
sudo bash -c 'echo "InvalidDirective on" >> /etc/apache2/apache2.conf'

# reload を試みる
sudo systemctl reload apache2

# Apache は落ちたか
systemctl is-active apache2
# → active（reload 失敗でも既存プロセスは継続）

# エラー箇所を特定
sudo apache2ctl configtest
# → 無効なディレクティブ名と行番号が表示される

# 復旧
sudo sed -i '/InvalidDirective/d' /etc/apache2/apache2.conf
sudo apache2ctl configtest  # → Syntax OK
sudo systemctl reload apache2
```

---

### 大問5. hands-on/10_monitoring.sh を参考に、以下の要件を追加した監視スクリプトを自力で書け

```bash
#!/bin/bash
set -euo pipefail

LOG="/var/log/hanamall_monitor.log"
DISK_THRESHOLD=80
MEM_THRESHOLD=80
LOAD_THRESHOLD=2.0

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG"; }

# ディスク監視
disk=$(df / | awk 'NR==2 {print $5}' | tr -d '%')
[ "$disk" -ge "$DISK_THRESHOLD" ] && log "WARN ディスク使用率: ${disk}%"

# メモリ監視
mem=$(free | awk '/Mem:/ {printf "%.0f", $3/$2*100}')
[ "$mem" -ge "$MEM_THRESHOLD" ] && log "WARN メモリ使用率: ${mem}%"

# ロードアベレージ監視
load=$(uptime | awk -F'load average:' '{print $2}' | awk -F',' '{print $1}' | tr -d ' ')
awk "BEGIN{exit !($load > $LOAD_THRESHOLD)}" && log "WARN ロードアベレージ: $load"

# Apache 死活監視
if ! systemctl is-active apache2 > /dev/null; then
    log "ERROR Apache が停止しています"
    sudo systemctl restart apache2
    log "INFO Apache を再起動しました"
fi

log "INFO チェック完了 (disk=${disk}% mem=${mem}% load=${load})"
```

---

### 大問6. sudo grep -E "error|warn|crit" /var/log/apache2/error.log | tail -20 を実行し、エラーの種類と原因を分類して報告せよ

```bash
sudo grep -E "error|warn|crit" /var/log/apache2/error.log | tail -20
```

**エラー分類例：**

| レベル | メッセージ例 | 原因 |
|-------|------------|------|
| `error` | `Permission denied: /var/www/html/...` | ファイルのパーミッション不足 |
| `warn` | `VirtualHost overlap on port 80` | バーチャルホスト設定の重複 |
| `crit` | `unable to open logs` | ログディレクトリがない・権限なし |

---

### 大問7. 思考問題: 深夜2時に突然メモリ使用率が90%超のアラート。翌朝何を確認するか、手順を3つ答えよ

**Step1：その時間帯のシステムログを確認する**
```bash
journalctl --since "2025-05-01 01:50" --until "2025-05-01 02:30" | grep -E "error|warn|oom"
# OOM Killer が発動していないか確認
dmesg | grep -i "out of memory"
```

**Step2：その時間帯に実行されていたプロセスを確認する**
```bash
# cron ジョブの確認（深夜2時に何かが動いていないか）
grep "02:0" /var/log/syslog | grep CRON

# 大量メモリを使ったプロセスの痕跡
journalctl --since "01:50" --until "02:30" | grep -i "killed process"
```

**Step3：再発防止策を検討する**
```bash
# 現在のメモリ状況と swap 設定を確認
free -h
swapon --show

# 改善策の検討
# - 問題プロセスのメモリ上限設定（ulimit, systemd の MemoryLimit）
# - バッチ処理の時間帯変更
# - サーバーのメモリ増設
```
