# Week03 課題 回答例・解説

## 課題1：devuserの作成とグループ追加

```bash
sudo useradd -m -s /bin/bash devuser
sudo passwd devuser
sudo groupadd developers
sudo usermod -aG developers devuser

# 確認
id devuser
# uid=1001(devuser) gid=1001(devuser) groups=1001(devuser),1002(developers)
```

**ポイント：** `-aG` の `-a`（append）を忘れると既存グループから外れてしまう。
`usermod -G developers devuser` だと devuser が developers だけのメンバーになってしまう。

---

## 課題2：sudoersでコマンド制限

```bash
sudo visudo
# 末尾に追加：
devuser ALL=(ALL) NOPASSWD: /bin/systemctl restart apache2
```

**確認方法：**
```bash
su - devuser
sudo systemctl restart apache2   # → 通る
sudo reboot                       # → Permission denied になる
```

**なぜフルパスで書くのか：**
sudoers にはコマンドをフルパスで書く必要がある。
`/bin/systemctl` と `/usr/bin/systemctl` は環境によって異なるため、
`which systemctl` で確認してから書くのが確実。

---

## 課題3：CPUを100%にしてkill

```bash
# 負荷をかける
yes > /dev/null &
# [1] 12345 と表示される（PIDをメモ）

# topで確認（Pキーを押すとCPU順ソート）
top

# kill
kill 12345

# 確認
ps aux | grep yes   # → 消えていればOK
```

**`kill` と `kill -9` の使い分け：**

| コマンド | シグナル | 動作 |
|---------|---------|------|
| `kill PID` | SIGTERM(15) | 「終了してください」というお願い。プロセスは後処理してから終了できる |
| `kill -9 PID` | SIGKILL(9) | 強制終了。プロセスはブロックできない |

まず通常の `kill` を試し、それでも終わらないときだけ `-9` を使う。
`-9` は後処理なしで強制終了するためデータが壊れることがある。

---

## 課題4：sudo履歴の抽出

```bash
sudo grep "COMMAND" /var/log/auth.log

# 出力例：
# May 3 14:05:01 server01 sudo: tanaka : TTY=pts/0 ; PWD=/home/tanaka ; USER=root ; COMMAND=/bin/systemctl restart apache2
```

**「誰が・いつ・何をしたか」が全部記録されている。**
これがユーザーを個人アカウントで管理する理由。

---

## 課題5：思考問題 — 全員が同じ `deploy` ユーザーで作業する運用のリスク

**具体的なトラブルシナリオ：**

深夜にサービス障害が発生し、翌朝調査したところ本番DBのテーブルが一部消えていた。
auth.log を確認すると「deploy ユーザーがログインして作業していた」ことは分かるが、
そのとき deploy ユーザーを使っていたのが誰なのかが追えない。
4人のチームで全員が「自分ではない」と言い、犯人不明のまま。

**リスクのまとめ：**
- 誰の操作ミスか特定できないため、再発防止策を打てない
- 「deploy のパスワードを知っている全員」が容疑者になる
- 退職者がパスワードを知っていた場合、不正アクセスの検知が困難

**解決策：** 全員に個人アカウントを作り、必要なコマンドだけ sudo 許可する。

---

## よくある躓きポイント

**Q: visudo で保存しようとしたら警告が出た**
A: sudoers に文法エラーがある。`e` を押して修正する。
絶対に `:q!` で保存せずに終了しないこと（sudo が使えなくなる）。

**Q: kill しても終わらない**
A: `kill -9 PID` を試す。それでも終わらない場合は D状態（I/O待ち）の可能性があり、
再起動しか手段がないことも。
