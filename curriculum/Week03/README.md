# Week03 ｜ ユーザー管理・プロセス管理

## 🎯 今週の目標

## 🔗 前回（Week02）からの続き
ログ解析レポートで `10.0.99.5` からの不審なアクセスを特定できました。
佐藤さんから「いい仕事でした！Week04 でファイアウォール設定をやる前に、
まずサーバーのユーザー管理とプロセス管理を押さえておこう」と指示が来ました。

- ユーザーとグループを作成・管理できる
- sudo権限を適切に制限できる
- 異常なプロセスを発見して対処できる

## 🚀 まず最初にやること（環境セットアップ）

今週のハンズオンは「すでに問題が起きているサーバー」に対応する形式です。
**以下のセットアップスクリプトを先に実行して、障害状態を再現してから演習を始めてください。**

```bash
# 障害環境を作る（先にこれを実行！）
chmod +x hands-on/03_setup.sh
bash hands-on/03_setup.sh
```

実行すると **高負荷プロセスが動いている・鈴木さんのアカウントが未設定の状態** になります。
その状態から原因を特定・復旧するのが今週のミッションです。

---
## 📖 今週のミッション（佐藤さんからのSlack）

```
佐藤 Sato  10:30
田中さん、2つお願いがあります。

【依頼①】来週から開発の鈴木さんが dev01 を使います。
以下の設定をしてください：
  - ユーザー名: suzuki
  - dev_team グループに追加
  - sudo は「apache2 の再起動」だけ許可

【依頼②】さっき監視アラートで「CPU 90%超」が来ました。
原因プロセスを特定して止めてください。
今朝から誰かがテストスクリプトを動かしっぱなしかも…

よろしくお願いします！🙏
```

**あなたのミッション：** アカウント設定と高負荷プロセスの調査・停止を完了し、報告する。

---

## 📚 学習内容

### 1. ユーザー管理

#### 💡 Linuxのユーザー管理の仕組み

**プログラムを「会社のビルの入館システム」に例えると分かりやすい。**

会社のビルには社員証（ユーザーアカウント）が必要で、
「誰がいつ入館したか」がすべて記録される。
Linuxも同じで、すべての操作に「誰がやったか」が紐付いて記録される。

**「誰がやったか」が記録される具体例：**
```bash
# 例1：深夜3時に誰かが重要ファイルを削除した
# → auth.log を見ると「suzuki が sudo で rm を実行」と記録されている
sudo grep "sudo" /var/log/auth.log
# May 3 03:12:45 server01 sudo: suzuki : COMMAND=/bin/rm -rf /var/www/html

# 例2：本番サーバーに見知らぬIPからログインがあった
# → auth.log にログイン記録が残る
sudo grep "Accepted" /var/log/auth.log
# May 3 02:55:10 server01 sshd: Accepted publickey for ubuntu from 203.0.113.99
```

これが「ユーザー管理をちゃんとしないといけない理由」。
全員が `root` で作業していたら「誰がやったか」が追えなくなる。

> **実務補足：** 現場では `sudo su -` でrootに昇格して作業することもある。
> ただしその場合も「**誰が** `sudo su -` したか」はauth.logに記録される。
> 重要なのは「rootで直接ログインしない」こと。
> 個人アカウント → `sudo su -` → root という経路を踏むことで、
> 「いつ・誰が・rootになったか」のトレーサビリティが保たれる。
>
> ```bash
> # auth.logの記録例
> May 3 14:05:10 server01 sudo: tanaka : COMMAND=/bin/su -
> # → 田中さんが sudo su - でrootになったことが記録される
> ```

**ユーザーの種類（ビルの入館権限に例えると）：**

| ユーザー種別 | UID | 例え | 具体例 |
|------------|-----|------|--------|
| **一般ユーザー** | 1000以上 | 一般社員証 | `ubuntu`, `田中`, `suzuki` |
| **システムユーザー** | 1〜999 | 機械室専用カード（人間は使わない） | `www-data`（Apache用）, `mysql`（DB用） |
| **rootユーザー** | 0 | マスターキー（全室入れる） | 現場では直接使わないのが鉄則 |

ユーザー情報は `/etc/passwd` に、パスワードハッシュは `/etc/shadow` に、
グループは `/etc/group` に格納されている。

```bash
# ユーザー作成
sudo useradd -m -s /bin/bash developer01
# -m: ホームディレクトリ(/home/developer01)を作成
# -s: デフォルトシェルをbashに設定（指定しないとログインできないシェルになることがある）

sudo passwd developer01  # パスワードを設定

# ユーザー情報確認
id developer01           # UID, GID, 所属グループを表示
cat /etc/passwd | grep developer01
# 書式: ユーザー名:x:UID:GID:コメント:ホームディレクトリ:シェル

# グループ管理
sudo groupadd developers
sudo usermod -aG developers developer01  # -a: 追加（-aなしだと他のグループから外れる！）

# ユーザー削除
sudo userdel -r developer01  # -r: ホームディレクトリも一緒に削除
```

---

### 2. sudo権限の管理

#### 💡 sudoとは
`sudo`（Super User Do）は「一時的にroot権限でコマンドを実行する」仕組み。
「rootでログインしてすべての操作をrootでやる」のは危険すぎるため、
「必要なときだけ・必要なコマンドだけ」root権限を使うのが現代の常識。

sudoの設定は `/etc/sudoers` に書くが、**直接編集してはいけない**。
文法ミスがあると `sudo` が使えなくなり詰む。必ず `visudo` を使う（保存時に文法チェックしてくれる）。

```bash
sudo visudo  # 必ずこれを使う

# /etc/sudoers の書式：
# ユーザー名 ホスト=(実行ユーザー) [NOPASSWD:] コマンド
developer01 ALL=(ALL) NOPASSWD: /bin/systemctl restart apache2
# → developer01 は どのホストでも root として パスワードなしで
#   /bin/systemctl restart apache2 だけ実行できる

# グループ単位で設定（% がグループを意味する）
%developers ALL=(ALL) /usr/bin/tail, /usr/bin/grep
```

---

### 3. プロセス管理

#### 💡 プロセスとは

**「プログラム」と「プロセス」の違いを料理に例えると：**
- **プログラム** = レシピ（ハードディスクに保存されているファイル）
- **プロセス** = 実際に調理している状態（メモリ上で動いている実体）

レシピは1つでも、同時に3人が調理すれば「プロセス」は3つ。
Apacheも1つのプログラムだが、大量のリクエストをさばくために複数のプロセスが並行して動く。

プロセスにはそれぞれ固有のID（PID）が振られる。
`systemd`（PID 1）がすべてのプロセスの親祖先で、OSが起動すると最初に動き出し、
他のすべてのサービスを子プロセスとして起動する。

**HanaMallでの実例：**
```bash
# Apacheが複数プロセスで動いていることを確認
ps aux | grep apache2
# root      1234  apache2 (親プロセス：設定を読んで子を管理)
# www-data  1235  apache2 (子プロセス：実際にリクエストを処理)
# www-data  1236  apache2 (子プロセス：別のリクエストを同時処理)
```

```bash
# プロセス確認
ps aux         # a: 全ユーザー, u: ユーザー形式, x: 端末なしも表示
# 出力例：
# USER   PID  %CPU %MEM VSZ    RSS   TTY STAT START   TIME COMMAND
# root     1   0.0  0.1 169120  13000 ?   Ss   May01   0:05 /sbin/init

ps aux | grep apache2   # Apacheのプロセスだけ確認

top              # リアルタイム監視（1秒ごと更新）
# q: 終了, k: プロセスkill, M: メモリ順ソート, P: CPU順ソート

# シグナルとkill
# kill はプロセスに「シグナル」を送る仕組み
kill 1234         # デフォルトはSIGTERM（15）：「終了してください」というお願い
kill -9 1234      # SIGKILL：問答無用の強制終了（プロセスはブロックできない）
kill -15 1234     # SIGTERM：明示的に（-9は最終手段）
pkill apache2     # プロセス名で一括kill

# systemctl：サービス（デーモン）管理
sudo systemctl status apache2    # 状態確認
sudo systemctl start apache2     # 起動
sudo systemctl stop apache2      # 停止
sudo systemctl restart apache2   # 再起動（stop→start）
sudo systemctl reload apache2    # 設定再読み込み（プロセスは止めない）
sudo systemctl enable apache2    # OS起動時に自動起動するよう登録
sudo systemctl disable apache2   # 自動起動を解除
```

#### 💡 restart と reload の違い
- **restart**：プロセスを一度完全に止めてから再起動する。接続中のユーザーが切断される。
- **reload**：プロセスを止めずに設定ファイルを再読み込みする。無停止でOK。
  ただし設定に文法エラーがあるとApache/Nginxはreloadを拒否する。

---

### 4. ログ確認

#### 💡 systemdとジャーナル
現代のLinuxはほとんどのサービスをsystemdが管理しており、
ログは`journald`（systemdのログ管理デーモン）が一元管理している。
`journalctl` コマンドでサービス別・時間別に絞り込んで確認できる。

```bash
# systemdのログ（journalctl）
journalctl -u apache2                          # apacheのログだけ
journalctl -u apache2 --since "1 hour ago"    # 直近1時間
journalctl -u apache2 --since "2025-05-01"    # 特定日以降
journalctl -f                                  # tail -f と同様のリアルタイム表示

# 認証ログ（誰がいつsudoしたか・SSHログイン）
sudo tail -f /var/log/auth.log
sudo grep "sudo" /var/log/auth.log        # sudo実行履歴
sudo grep "Failed password" /var/log/auth.log  # ログイン失敗
```

---

## 🛠️ ハンズオン演習

### 演習1：開発者ユーザーを作って権限を制限する
```bash
sudo useradd -m -s /bin/bash devuser
sudo passwd devuser
sudo groupadd developers
sudo usermod -aG developers devuser
sudo visudo
# 末尾に追加: devuser ALL=(ALL) NOPASSWD: /bin/systemctl restart apache2
```

### 演習2：CPUを100%使うプロセスをkillする
```bash
# ターミナル1：わざとCPUを使い切る（yes は無限に "y" を出力する）
yes > /dev/null &

# ターミナル2：top でPIDを確認してkill
top  # → yes が上位に来るのを確認
kill [PID]
```

→ 詳細手順は `hands-on/03_user_process.sh` を参照

---

## 📝 今週の課題

### 大問1. ユーザー作成・グループ追加

`devuser` を作成し `developers` グループに追加する

### 大問2. sudo権限の限定設定

`devuser` は `systemctl restart apache2` だけ sudo できるように設定する

### 大問3. プロセス管理

`yes > /dev/null &` でCPUを100%にしてから `top` で見つけて `kill` する

### 大問4. 認証ログ調査

`auth.log` からsudoの実行履歴を抽出する

### 大問5. 思考問題

「全員が同じ `deploy` ユーザーでサーバーにログインして作業する」運用をしているチームがあったとする。どんなリスクがあるか？具体的なトラブルシナリオを1つ挙げて説明せよ
