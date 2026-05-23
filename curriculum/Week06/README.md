# Week06 ｜ SSH・cron・自動化基盤

## 🎯 今週の目標

## 🔗 前回（Week05）からの続き
shop / admin のバーチャルホストが無事に動き始めました。
ただし佐藤さんから「SSH の設定が甘い」「毎朝の手作業が多すぎる」と2点指摘が来ました。
今週でセキュリティと自動化を一気に整えます。

- 公開鍵認証を設定してセキュアなSSH環境を作れる
- `~/.ssh/config` で複数サーバーを管理できる
- cronで定期タスクを自動化できる

---

## 📖 今週のミッション（佐藤さんからのSlack）

```
佐藤 Sato  10:15
田中さん、2つお願いがあります。

【依頼①】セキュリティ監査から指摘が来ました 😰
prod-web01 の SSH がパスワード認証のままです。
公開鍵認証のみに変更してください。
※ 鍵でログインできることを確認してから変更！

【依頼②】毎朝9時に手動で access.log の行数を
数えてSlackに貼ってる作業、さすがに自動化しましょう。
結果を /var/log/hanamall_daily.log に追記する形で。

よろしくです！
```

**あなたのミッション：** SSHセキュリティ強化と、毎朝の手動作業をcronで自動化する。

---

## 📚 学習内容

### 1. SSHの仕組みと公開鍵認証

#### 💡 パスワード認証と公開鍵認証の違い
**パスワード認証**：パスワードをネットワーク越しに送る。
ブルートフォース攻撃（総当たり）に弱く、現代の本番サーバーでは無効化するのが常識。

**公開鍵認証**：数学的に対になる「公開鍵」と「秘密鍵」のペアを使う。
- 公開鍵 → サーバーに登録しておく（流出しても問題ない）
- 秘密鍵 → 自分のPCに厳重保管（絶対に外に出さない）

接続時にサーバーが「この公開鍵に対応する秘密鍵を持っているか？」を検証する。
秘密鍵なしにはログインできないため、パスワード漏えいリスクがゼロになる。

```bash
# 鍵ペアを生成（ed25519は現代的で安全なアルゴリズム）
ssh-keygen -t ed25519 -C "myserver-key"
# ~/.ssh/id_ed25519     ← 秘密鍵（パーミッション 600 必須）
# ~/.ssh/id_ed25519.pub ← 公開鍵（サーバーに登録する）

# サーバーに公開鍵を登録（最も簡単な方法）
ssh-copy-id user@server
# 手動で登録する場合
cat ~/.ssh/id_ed25519.pub | ssh user@server "cat >> ~/.ssh/authorized_keys"
chmod 600 ~/.ssh/authorized_keys  # このパーミッションでないとSSHが鍵を無視する
```

#### 💡 `~/.ssh/` のパーミッションが重要な理由
SSHは「パーミッションが緩すぎる鍵ファイルは危険とみなして無視する」という安全設計になっている。
`~/.ssh/` は 700、`authorized_keys` と秘密鍵は 600 でなければ動作しない。

---

### 2. `~/.ssh/config` で接続先を管理

#### 💡 ssh configの効果
`ssh -i ~/.ssh/mykey.pem -p 2222 ubuntu@203.0.113.1` のような長いコマンドを毎回打つのは辛い。
`~/.ssh/config` に設定を書いておくと `ssh myserver` だけで接続できるようになる。

```
# ~/.ssh/config

Host myserver
    HostName 192.168.1.100
    User ubuntu
    IdentityFile ~/.ssh/id_ed25519
    Port 22

Host bastion
    HostName 203.0.113.1
    User ec2-user
    IdentityFile ~/.ssh/aws-key.pem

# 多段SSH：bastionを踏み台にしてprivate-serverに接続
Host private-server
    HostName 10.0.0.10
    User ubuntu
    IdentityFile ~/.ssh/id_ed25519
    ProxyJump bastion   # bastionを経由して自動的に接続
```

```bash
ssh myserver          # → 設定どおりに接続
ssh private-server    # → bastion を自動で踏み台にして接続
scp file.txt myserver:~/  # scpでもconfig が使われる
rsync -av ./dir myserver:~/  # rsyncでも使われる
```

---

### 3. sshd_config のセキュア化

#### 💡 SSHサーバーのセキュリティ設定
サーバーを公開したら数分以内にSSHへのブルートフォース攻撃が来る（世界中からbotが走っている）。
最低限以下の設定をしておかないと、rootアカウントへの侵入リスクがある。

```bash
sudo vim /etc/ssh/sshd_config

# 変更箇所（デフォルト値をコメントアウトして変更する）
PermitRootLogin no           # root への直接SSHログインを禁止
PasswordAuthentication no    # パスワード認証を完全に無効化（公開鍵のみ許可）
MaxAuthTries 3               # 3回失敗でセッションを切る
ClientAliveInterval 300      # 5分間操作がなければ切断
AllowUsers ubuntu deploy     # このユーザーだけSSHログインを許可

# 設定変更後は必ず再起動
sudo systemctl restart sshd

# ⚠️ 注意：PasswordAuthentication no にする前に、
# 必ず別ターミナルで公開鍵認証でのログインが通ることを確認すること！
# 確認せずに設定すると、サーバーに入れなくなる。
```

---

### 4. cron によるジョブスケジューリング

#### 💡 cron の仕組み
`crond`（cron デーモン）がバックグラウンドで常時動いており、
`crontab` で設定したスケジュールに従ってコマンドを自動実行する。
ユーザーごとに crontab があり、`crontab -e` で編集する。

```bash
crontab -e    # 現在のユーザーのcrontabを編集
crontab -l    # 現在の設定を確認
crontab -r    # crontabを削除（注意！）

# 書式：分 時 日 月 曜日 コマンド
# 各フィールドに * を指定すると「毎〇〇」の意味になる
# 分(0-59) 時(0-23) 日(1-31) 月(1-12) 曜日(0-7, 0と7は日曜)

0 2 * * * /usr/local/bin/backup.sh >> /var/log/backup.log 2>&1
# 毎日 午前2時 に backup.sh を実行、ログを backup.log に追記

*/5 * * * * /usr/local/bin/healthcheck.sh
# 5分ごと に healthcheck.sh を実行

0 9 * * 1 /usr/local/bin/weekly_report.sh
# 毎週月曜日（1） の 9時0分 に実行

# >> /var/log/xxx.log 2>&1 の意味：
# >> : 標準出力をファイルに追記
# 2>&1 : 標準エラー出力も同じファイルへ（エラーも記録するために重要）
```

---


## 🛠️ ハンズオン演習

`hands-on/06_ssh_cron.sh` を実行して以下を体験する：

### 演習1：鍵ペアを生成してローカルで公開鍵認証を試す
```bash
ssh-keygen -t ed25519 -C "hanamall-dev"
# 生成された公開鍵をauthorized_keysに追加
cat ~/.ssh/id_ed25519.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
# ローカルにSSHして鍵認証が通ることを確認
ssh -i ~/.ssh/id_ed25519 $(whoami)@localhost
```

### 演習2：~/.ssh/config を書いて短縮接続を確認する
```bash
# ~/.ssh/config に以下を追記
# Host dev01
#     HostName localhost
#     User $(whoami)
#     IdentityFile ~/.ssh/id_ed25519

ssh dev01   # → config が使われてログインできる
```

### 演習3：cronジョブを登録して実際に動作を確認する
```bash
# 毎分ログに記録するジョブを登録して動作確認
crontab -e
# 追記: * * * * * echo "$(date): alive" >> /tmp/cron_test.log

# 2〜3分待ってから確認
cat /tmp/cron_test.log   # → タイムスタンプ付きで行が増えている

# 確認できたら削除
crontab -e  # 追加した行を消す
```

→ 詳細手順は `hands-on/06_ssh_cron.sh` を参照

## 📝 今週の課題

1. 公開鍵認証を設定し、`ssh -o PasswordAuthentication=no localhost` でパスワードなしでログインできることを確認する
2. `~/.ssh/config` に接続先を登録して `ssh dev01` だけで繋がるようにする（`ssh -v dev01` でconfig が使われていることを確認）
3. `sshd_config` でrootログインとパスワード認証を無効化する。**必ず別ターミナルで公開鍵ログインが通ることを確認してから変更すること**
4. 「毎日23時に `/tmp/test_backup/` をtarで固める」cronジョブを設定し、`crontab -l` でジョブが登録されていることを確認する
5. **思考問題:** 設定した後に `sudo grep "Failed password" /var/log/auth.log` を実行したとき、どんなIPアドレスが出てくるか予想してみよ。なぜそうなるのか説明せよ
