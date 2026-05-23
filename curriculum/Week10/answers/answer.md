# Week10 課題 回答例・解説

## 課題1：vmstatの読み方

```bash
vmstat 1 10
```

**主要カラムの意味：**

| カラム | 意味 | 「高い」ときに疑うべきこと |
|--------|------|--------------------------|
| `us` | ユーザープロセスのCPU使用率 | アプリの処理が重い・無限ループ |
| `sy` | カーネルのCPU使用率 | システムコールが多い・ドライバ問題 |
| `wa` | I/O待ちの割合 | ディスクがボトルネック |
| `si/so` | スワップイン/アウト | メモリ不足でスワップが多発 |
| `b` | I/O待ちのプロセス数 | ディスクが詰まっている |

**`wa` が常時30%を超えていたら次に確認すること：**
```bash
# 1. どのプロセスがI/Oを発生させているか
sudo iotop -o      # I/Oが発生しているプロセスだけ表示

# 2. どのディスクがボトルネックか
iostat -x 1 5      # %util が高いディスクを特定

# 3. 何を読み書きしているか
sudo lsof -p [PID]   # そのプロセスが開いているファイルを確認
```

---

## 課題2：ディスクフルでApacheが落ちるシナリオ・復旧

```bash
# 壊す（ディスクを埋める）
dd if=/dev/zero of=/tmp/fillup bs=1M count=2048   # 2GB作成

# 確認：Apacheがログを書けなくなって落ちる
df -h   # → 100%近くになっている
sudo systemctl status apache2   # → failedになっている
sudo tail /var/log/apache2/error.log
# → "No space left on device" が出る

# 復旧
rm /tmp/fillup
df -h   # → 空きが戻った

sudo systemctl start apache2
curl http://localhost   # → 200 が返ればOK

# 確認と報告
sudo systemctl status apache2   # → active (running)
```

**全手順をコマンド付きで記録するのはなぜ重要か：**
同じ障害が再発したとき、記録があれば「前回5分で直した」が「今回も5分で直せる」になる。
記録がないと毎回ゼロから考えることになり、深夜の障害対応で30分かかることも。

---

## 課題3：Apache設定ミスからの復旧

```bash
# 壊す
sudo bash -c 'echo "syntax_error_here;" >> /etc/apache2/apache2.conf'
sudo systemctl reload apache2
# → Job for apache2.service failed... と表示される
# ただしApacheは落ちていない（古い設定で動き続ける）

# 原因特定
sudo apache2ctl configtest
# → AH00526: Syntax error on line XXX: Invalid command 'syntax_error_here;'

# 修正
sudo vim /etc/apache2/apache2.conf
# → 追加した行を削除する

# 確認してリロード
sudo apache2ctl configtest   # → Syntax OK
sudo systemctl reload apache2
curl http://localhost   # → 200
```

**`reload` と `restart` の挙動の違い（重要）：**

| 操作 | 設定エラーがあった場合 | 設定が正常な場合 |
|------|---------------------|----------------|
| `reload` | 失敗するがApacheは落ちない | 無停止で設定反映 |
| `restart` | 失敗してApacheが落ちる | サービス停止→再起動 |

本番では必ず `apache2ctl configtest` → `reload` の順番で。
`restart` を使うのはどうしても必要な場合だけ。

---

## 課題4：リソース監視スクリプト（自力実装例）

```bash
#!/bin/bash
CSV_FILE="/var/log/hanamall_resource.csv"

[ ! -f "$CSV_FILE" ] && \
  echo "timestamp,cpu_pct,mem_pct,disk_pct,load_avg,apache" > "$CSV_FILE"

TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
CPU=$(top -bn2 | grep "Cpu(s)" | tail -1 | awk '{print 100-$8}' | tr -d '%id,')
MEM=$(free | awk '/^Mem:/{printf "%.1f", $3/$2*100}')
DISK=$(df / | tail -1 | awk '{print $5}' | tr -d '%')
LOAD=$(awk '{print $1}' /proc/loadavg)
APACHE=$(systemctl is-active apache2 2>/dev/null || echo "unknown")

echo "${TIMESTAMP},${CPU},${MEM},${DISK},${LOAD},${APACHE}" >> "$CSV_FILE"

# アラート判定
[ "${DISK}" -gt 80 ] && \
  echo "[$(date)] ALERT: ディスク使用率 ${DISK}%" >> /var/log/hanamall_alert.log
```

---

## 課題5：思考問題 — 深夜に一時的にメモリが90%を超えた

**確認する手順（3つ）：**

**① いつ発生したか・どのプロセスが原因かをログで確認**
```bash
# OOMKillerが動いたか確認（メモリ不足でプロセスが強制終了された痕跡）
sudo grep -i "out of memory\|oom" /var/log/syslog | grep "$(date +%b %d)"
dmesg | grep -i "oom" | tail -20
```

**② その時間帯にcronやバッチが動いていたか確認**
```bash
# cronの実行履歴
sudo grep "CRON" /var/log/syslog | grep "02:"   # 深夜2時台を確認
# systemdタイマーの実行履歴
journalctl --since "yesterday" | grep "Started\|hanamall"
```

**③ リソース記録CSVで時系列を確認**
```bash
grep "2025-05-03 02:" /var/log/hanamall_resource.csv
# → メモリが急増した時刻を特定
# → その前後のcronと照合
```

**今後の対策：**
週次レポートや画像リサイズなど重いバッチは、
アクセスの少ない時間帯（深夜3〜4時）に分散してスケジュールする。

---

## よくある躓きポイント

**Q: top のCPU表示が「0.0」ばかりで負荷が分からない**
A: `top -bn2` の `-n2` は「2回サンプリング」の意味。
1回目は起動直後で値が不安定なので2回目の値を使う。
インタラクティブモードで `top` を起動したほうが見やすい。
