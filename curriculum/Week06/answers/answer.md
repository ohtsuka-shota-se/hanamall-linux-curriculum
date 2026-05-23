# Week06 課題 回答例・解説

## 課題1：公開鍵認証の設定

```bash
# 鍵ペアを生成（既にある場合はスキップ）
ssh-keygen -t ed25519 -C "hanamall-$(date +%Y%m%d)"

# サーバーに公開鍵を登録
ssh-copy-id ubuntu@192.168.1.100

# パスワードなしでログインできることを確認
ssh -o PasswordAuthentication=no ubuntu@192.168.1.100
# → パスワードを聞かれずにログインできればOK
```

**手動で登録する場合：**
```bash
cat ~/.ssh/id_ed25519.pub | ssh ubuntu@192.168.1.100 \
  "mkdir -p ~/.ssh && chmod 700 ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
```

**パーミッションが正しくないと動かない：**
```bash
# サーバー側で確認
ls -la ~/.ssh/
# drwx------  .ssh/            → 700 必須
# -rw-------  authorized_keys  → 600 必須
```

---

## 課題2：~/.ssh/config の設定

```
Host dev01
    HostName localhost
    User ubuntu
    IdentityFile ~/.ssh/id_ed25519
    Port 22
```

**設定後の確認：**
```bash
ssh dev01           # → シンプルに接続できる
ssh -v dev01        # → "Reading configuration data ~/.ssh/config" が表示される
```

**`-v`（verbose）は設定のデバッグに必須。**
「接続できないけど何が起きているか分からない」ときはまず `-v` で確認する。

---

## 課題3：sshd_config のセキュア化

```bash
# ⚠️ 必ず先に公開鍵認証でログインできることを確認！
ssh dev01   # → 通ることを確認してから設定変更する

sudo vim /etc/ssh/sshd_config
```

**変更箇所：**
```
PermitRootLogin no           # root への直接ログインを禁止
PasswordAuthentication no    # パスワード認証を無効化
MaxAuthTries 3               # 3回失敗で切断
```

```bash
# 設定の文法チェック（再起動前に必ず確認）
sudo sshd -t
# → エラーがなければ再起動

sudo systemctl restart sshd

# 別ターミナルで引き続きログインできることを確認
ssh dev01   # → まだ繋がることを確認
```

**設定ミスでロックアウトしてしまったら：**
VirtualBox や AWS なら「シリアルコンソール」「EC2 Instance Connect」で
パスワードなしでアクセスして修正する。
本番作業では必ず別セッションを開いたまま設定変更すること。

---

## 課題4：バックアップのcronジョブ

```bash
# ディレクトリを作っておく
mkdir -p /tmp/test_backup

# crontab を編集
crontab -e
```

**追記する内容：**
```
# HanaMall テストバックアップ（毎日23時）
0 23 * * * tar czf /tmp/test_backup_$(date +\%Y\%m\%d).tar.gz /tmp/test_backup/ >> /var/log/backup_cron.log 2>&1
```

> **注意：** crontab 内では `%` を `\%` にエスケープする必要がある。
> `date +%Y%m%d` → `date +\%Y\%m\%d`

**登録確認：**
```bash
crontab -l   # → 登録した行が表示される
```

**すぐに動作確認したい場合：**
```bash
# cron の時刻を待たずに手動実行してテスト
tar czf /tmp/test_backup_$(date +%Y%m%d).tar.gz /tmp/test_backup/
ls /tmp/test_backup_*.tar.gz   # → ファイルができていればOK
```

---

## 課題5：思考問題 — ブルートフォース攻撃のIPとその理由

**答え：**
```bash
sudo grep "Failed password" /var/log/auth.log | awk '{print $11}' | sort | uniq -c | sort -rn
```

**出てくるIPの例：**
```
    143 185.234.x.x      ← 見知らぬ海外IP（世界中のbotが常時スキャン）
      3 127.0.0.1         ← ローカル（自分のテストかも）
```

**なぜ見知らぬIPが出るのか：**
インターネット上には常時 SSH（22番ポート）にブルートフォースをかけ続けるbotが大量に存在する。
サーバーを公開して数分〜数時間以内にほぼ必ずログイン失敗が記録される。

**だから `PasswordAuthentication no` が必要：**
パスワード認証を無効にすることで、
仮に `root/password` のような弱いパスワードを設定していても侵入を防げる。

---

## よくある躓きポイント

**Q: `ssh-copy-id` でパスワードを聞かれる**
A: これは正常。最初の一回だけパスワードで入って鍵を登録する。次回から鍵認証になる。

**Q: cron に登録したのに実行されない**
A: 以下を確認する。
1. `crontab -l` で登録されているか
2. `%` が `\%` にエスケープされているか
3. `/var/log/syslog | grep CRON` でエラーが出ていないか
4. スクリプトに実行権限があるか（`chmod +x`）
