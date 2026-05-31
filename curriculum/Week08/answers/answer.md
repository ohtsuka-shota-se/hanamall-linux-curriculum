# Week08 課題 回答例・解説

---

### 大問1. df -h と du -sh /* で「最もディスクを使っているディレクトリ」を特定して報告せよ

```bash
# 全体確認
df -h

# ディレクトリ別使用量 Top10
du -sh /* 2>/dev/null | sort -rh | head -10

# /var/log を掘り下げる
du -sh /var/log/* 2>/dev/null | sort -rh | head -10

# 最大ファイルを特定
find /var/log -type f -printf '%s %p\n' 2>/dev/null | sort -rn | head -5
```

**解説：** `sort -rh` は `-h`（human-readable: 1G > 100M を正しく比較）+ `-r`（降順）の組み合わせ。

---

### 大問2. dd で 500MB のテストファイルを作成・削除して df の変化を確認せよ

```bash
# 500MB ファイルを作成
dd if=/dev/zero of=/tmp/testfile bs=1M count=500

# df で変化確認
df -h /tmp

# 削除
rm /tmp/testfile

# df で確認（通常は即時反映される）
df -h /tmp

# 「削除したのに df が変わらない」現象の再現
# 別ターミナルでファイルを開いたまま削除
tail -f /tmp/testfile &
rm /tmp/testfile

# lsof で確認
lsof | grep deleted
# → tail プロセスがファイルを掴んでいることで inode が解放されない

# 解決方法
kill %1   # tail プロセスを終了 → df の数値が回復する
```

---

### 大問3. ディスクフル障害を再現して復旧させ、全手順をコマンド付きで記録せよ

```bash
# Step1: ディスクをフルにする
dd if=/dev/zero of=/var/log/filltest bs=1M
# → No space left on device

# Step2: Apache が落ちることを確認
sudo systemctl status apache2
# → ログが書けず起動失敗

# Step3: どこが圧迫しているか特定
df -h
du -sh /var/log/* 2>/dev/null | sort -rh | head -5

# Step4: 原因ファイルを削除
sudo rm /var/log/filltest

# Step5: Apache を再起動
sudo systemctl restart apache2
sudo systemctl status apache2
```

---

### 大問4. VirtualBox に仮想ディスクを追加して以下を実施せよ

```bash
# 追加ディスクの確認
lsblk
# → sdb が追加されているはず

# パーティション作成
sudo fdisk /dev/sdb
# → n (new) → p (primary) → 1 → Enter → Enter → w (write)

# フォーマット
sudo mkfs.ext4 /dev/sdb1

# マウント
sudo mkdir -p /mnt/data
sudo mount /dev/sdb1 /mnt/data
df -h /mnt/data

# 永続化（再起動後も自動マウント）
echo "$(sudo blkid /dev/sdb1 | awk '{print $2}') /mnt/data ext4 defaults 0 2" | sudo tee -a /etc/fstab
sudo mount -a  # fstab を即時反映
```

---

### 大問5. rsync -av --dry-run --delete /var/www/ /backup/www/ を実行して内容を確認し、問題なければ --dry-run を外して実行せよ

```bash
# まず dry-run で確認（実際には何もしない）
sudo rsync -av --dry-run --delete /var/www/ /backup/www/

# 問題なければ実行
sudo rsync -av --delete /var/www/ /backup/www/
```

**`--delete` の意味と注意点：**
- 意味：送信元（`/var/www/`）に存在しないファイルを、送信先（`/backup/www/`）から削除する
- 注意点：誤って逆方向に実行すると本番ファイルが消える恐れがある。方向（送信元 → 送信先）を必ず確認してから `--dry-run` なしで実行すること

---

### 大問6. ディスク使用率の閾値を考え、healthcheck.sh のディスク閾値を調整せよ

```bash
# 現在の使用率確認
df -h /

# healthcheck.sh の閾値を変更（例: 80%をアラート閾値に設定）
nano ~/healthcheck.sh
```

```bash
DISK_THRESHOLD=80
disk_usage=$(df / | awk 'NR==2 {print $5}' | tr -d '%')
if [ "$disk_usage" -ge "$DISK_THRESHOLD" ]; then
    echo "[WARN] ディスク使用率が ${DISK_THRESHOLD}% を超えました: ${disk_usage}%"
fi
```

**閾値の根拠：**
- 80%：アラート発報（調査・対応を開始）
- 90%：緊急対応（ログ削除・増設の判断）
- 100%：サービス停止。絶対に到達させてはいけない水準

---

### 大問7. 思考問題: /var/log を別パーティションに切り出すメリットを2つ、および Week08 の障害がなぜ起きたか・どう防ぐべきだったかを答えよ

**メリット：**

1. **ルートパーティションのディスクフルを防ぐ**  
   ログが肥大化してもルート（`/`）には影響せず、OS・アプリが継続稼働できる。

2. **障害の影響範囲を局所化できる**  
   `/var/log` のディスクフルはログが書けなくなるだけで、アプリのデータ領域（`/var/www` など）は影響を受けない。

**Week08 の障害がなぜ起きたか：**  
`/var/log` がルートパーティションと同じ領域にあったため、ログの肥大化がルートのディスクフルを引き起こし、Apache がログを書けなくなって停止した。

**どう防ぐべきだったか：**
- `logrotate` でログを定期的に圧縮・削除する設定を入れておく
- `cron` でディスク使用率を監視し、80% で Slack/メールアラートを送る
- `/var/log` を独立したパーティションに切り出す
