# Week06 課題 回答例・解説

---

### 大問1. 公開鍵認証を設定し、以下をすべて確認せよ

```bash
# 鍵ペアを生成（クライアント側）
ssh-keygen -t ed25519 -C "hanamall-deploy"

# 公開鍵をサーバーに登録
ssh-copy-id -i ~/.ssh/id_ed25519.pub ubuntu@サーバーIP

# または手動で
cat ~/.ssh/id_ed25519.pub >> ~/.ssh/authorized_keys
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys

# 接続確認
ssh -i ~/.ssh/id_ed25519 ubuntu@サーバーIP
```

**`authorized_keys` のパーミッションが重要：**
- `~/.ssh/` → 700（自分のみアクセス可）
- `~/.ssh/authorized_keys` → 600（自分のみ読み書き可）

---

### 大問2. ~/.ssh/config に以下を設定し、動作確認せよ

```bash
nano ~/.ssh/config
```

```
Host hanamall-dev
    HostName 192.168.1.10
    User ubuntu
    IdentityFile ~/.ssh/id_ed25519
    Port 22
```

```bash
chmod 600 ~/.ssh/config

# 設定した名前で接続できることを確認
ssh hanamall-dev
```

**メリット：** 長いオプションを毎回打たずに `ssh hanamall-dev` だけで接続できる。

---

### 大問3. sshd_config で以下を設定し、それぞれ意図通りに動くことを確認せよ

```bash
sudo nano /etc/ssh/sshd_config
```

```
PasswordAuthentication no    # パスワード認証を禁止
PermitRootLogin no           # root 直接ログインを禁止
```

```bash
# 設定反映
sudo systemctl reload ssh

# パスワード認証が拒否されることを確認
ssh -o PubkeyAuthentication=no ubuntu@localhost
# → Permission denied (publickey)

# root ログインが拒否されることを確認
ssh root@localhost
# → Permission denied
```

---

### 大問4. 以下のcronジョブを設定し、crontab -l で登録を確認せよ

```bash
crontab -e
```

```cron
# 毎日深夜2時にバックアップ
0 2 * * * /home/ubuntu/backup.sh >> /var/log/backup.log 2>&1

# 5分ごとにディスク使用率をログに記録
*/5 * * * * df -h >> /var/log/disk_usage.log 2>&1
```

```bash
# 確認
crontab -l
```

**cron の書式：** `分 時 日 月 曜日 コマンド`

---

### 大問5. sudo grep "Accepted\|Failed" /var/log/auth.log | tail -20 を実行し、以下をまとめよ

```bash
sudo grep -E "Accepted|Failed" /var/log/auth.log | tail -20
```

**出力例：**
```
May  1 09:01:15 server01 sshd: Accepted publickey for ubuntu from 192.168.1.100
May  1 09:12:45 server01 sshd: Failed password for root from 10.0.0.99
```

| 種別 | 件数 | 概要 |
|------|------|------|
| Accepted | 2件 | 正常ログイン（公開鍵） |
| Failed | 3件 | root への失敗試行 |

---

### 大問6. rsync で安全なファイル転送を体験せよ

```bash
# ローカル → ローカルのコピー（dry-run で確認）
rsync -av --dry-run /var/www/ /backup/www/

# 問題なければ実行
rsync -av /var/www/ /backup/www/

# リモートへの転送
rsync -av -e ssh /var/www/ ubuntu@192.168.1.11:/backup/www/

# 削除フラグ付き（送信元にないファイルを削除）
rsync -av --delete /var/www/ /backup/www/
```

**オプションまとめ：**
| オプション | 意味 |
|-----------|------|
| `-a` | アーカイブモード（パーミッション・タイムスタンプ等を保持） |
| `-v` | 詳細表示 |
| `--dry-run` | 実際には実行しない（確認用） |
| `--delete` | 送信元にないファイルを送信先から削除 |

---

### 大問7. 思考問題: 秘密鍵（id_ed25519）を誤って外部に公開してしまった。直ちに取るべき対応を手順付きで答えよ

**Step1：流出した公開鍵をサーバーから即座に削除する**
```bash
# authorized_keys から該当の公開鍵を削除
nano ~/.ssh/authorized_keys
# 該当行を削除して保存
```

**Step2：新しい鍵ペアを生成して登録する**
```bash
ssh-keygen -t ed25519 -C "hanamall-deploy-new"
ssh-copy-id -i ~/.ssh/id_ed25519.pub ubuntu@サーバーIP
```

**Step3：流出した秘密鍵を使ったアクセスがなかったか確認する**
```bash
sudo grep "Accepted" /var/log/auth.log | grep -v "192.168.1."
# 不審なIPからのログインがないか確認
```

**Step4：流出した鍵ファイルを削除する**
```bash
rm ~/.ssh/id_ed25519 ~/.ssh/id_ed25519.pub
```

**ポイント：** 秘密鍵の流出は「パスワードの流出」と同等。発覚したら即座に無効化することが最優先。
