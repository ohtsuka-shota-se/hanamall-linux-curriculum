# Week01 課題 回答例・解説

---

### 大問1. ls -la /etc の出力を確認し、以下を答えよ。

```bash
ls -la /etc | head -20
```

**読み方のポイント：**

| フィールド | 例 | 意味 |
|-----------|-----|------|
| `d` / `-` | `drwxr-xr-x` | d=ディレクトリ、-=ファイル |
| `rwx` (1〜3文字目) | `rw-` | 所有者の権限（読み・書き・実行） |
| `r-x` (4〜6文字目) | `r-x` | グループの権限 |
| `r--` (7〜9文字目) | `r--` | その他ユーザーの権限 |
| 数値 | `2` | ハードリンク数 |
| ユーザー/グループ | `root root` | 所有者・グループ |
| サイズ | `4096` | バイト数 |

**例：`-rw-r--r-- 1 root root 1234 /etc/hostname`**
- ファイル（`-`）
- 所有者(root)：読み書き可、実行不可（`rw-`）
- グループ・その他：読み取りのみ（`r--`）

---

### 大問2. find /var/log -name "*.log" -mtime -1 2>/dev/null を実行し、「24時間以内に更新されたログ」を一覧表示する。何件あったか報告せよ

```bash
find /var/log -name "*.log" -mtime -1 2>/dev/null
```

件数を数えるには：

```bash
find /var/log -name "*.log" -mtime -1 2>/dev/null | wc -l
```

**解説：**
- `-mtime -1`：更新時刻が「1日以内」のファイル
- `2>/dev/null`：権限エラーを無視（Permission deniedを捨てる）
- 環境によって件数は異なるが、通常 `/var/log/syslog`、`/var/log/auth.log`、`/var/log/apache2/access.log` などが含まれる

---

### 大問3. tail -f /var/log/syslog でログを監視しながら、別ターミナルで sudo systemctl restart ssh を実行する。どんなログが流れたか3行以上記録せよ

```bash
# ターミナル1
sudo tail -f /var/log/syslog

# ターミナル2（別ウィンドウ）
sudo systemctl restart ssh
```

**出力例（実際の内容は環境により異なる）：**

```
May  1 10:00:01 server01 systemd[1]: Stopping OpenBSD Secure Shell server...
May  1 10:00:01 server01 systemd[1]: ssh.service: Deactivated successfully.
May  1 10:00:01 server01 systemd[1]: Stopped OpenBSD Secure Shell server.
May  1 10:00:01 server01 systemd[1]: Starting OpenBSD Secure Shell server...
May  1 10:00:01 server01 sshd[12345]: Server listening on 0.0.0.0 port 22.
May  1 10:00:01 server01 systemd[1]: Started OpenBSD Secure Shell server.
```

**読み取れること：**
- SSHサービスが一旦停止し、再起動されたことが記録されている
- プロセスIDが変わっていることで「再起動」されたと分かる

---

### 大問4. /tmp/hanamall_test/ ディレクトリを作成し、その中に config.txt を作成して以下のパーミッションを設定せよ。

```bash
# ディレクトリ作成
mkdir -p /tmp/hanamall_test

# ファイル作成
touch /tmp/hanamall_test/config.txt

# パーミッション設定
chmod 755 /tmp/hanamall_test
chmod 644 /tmp/hanamall_test/config.txt

# 確認
ls -la /tmp/hanamall_test/
```

**出力例：**

```
drwxr-xr-x 2 ubuntu ubuntu 4096 May  1 10:05 .
drwxrwxrwt 9 root   root   4096 May  1 10:05 ..
-rw-r--r-- 1 ubuntu ubuntu    0 May  1 10:05 config.txt
```

**755・644 の意味：**

| 数値 | 2進数 | 権限 |
|------|-------|------|
| `7` | 111 | rwx（読み・書き・実行） |
| `5` | 101 | r-x（読み・実行のみ） |
| `4` | 100 | r--（読み取りのみ） |

---

### 大問5. df -h と free -h を実行し、現在のディスク・メモリ使用率を確認する。「このサーバーはリソース的に問題ないか」を1〜2行で判断して書け

```bash
df -h
free -h
```

**出力例：**

```
Filesystem      Size  Used Avail Use% Mounted on
/dev/sda1        20G  3.2G   16G  17% /

              total        used        free      shared  buff/cache   available
Mem:           3.8G        512M        2.1G         12M        1.2G        3.0G
```

**判断基準：**

| リソース | 目安 | 問題あり |
|---------|------|---------|
| ディスク使用率 | 80%未満が望ましい | 90%超は要注意 |
| メモリ使用率 | available が全体の20%以上 | swap使用が多ければ要注意 |

**回答例：**
「ディスク使用率17%、メモリの available が3.0GBあり、現時点ではリソース的に問題はない。」

---

### 大問6. /etc/shadow のパーミッションが rw-r--r--（644）になっていたとする。何が問題か、なぜ危険かを説明せよ

**何が問題か：**
`/etc/shadow` にはシステム上の全ユーザーのパスワードハッシュが格納されている。
644 だとグループ・その他のユーザーが**読み取り可能**になる。

**なぜ危険か：**

1. ハッシュ値が流出すると、オフラインでのブルートフォース攻撃（辞書攻撃）によりパスワードが解読される可能性がある
2. `john`（John the Ripper）や `hashcat` などのツールを使えば短時間で解読できるケースがある

**正しいパーミッション：**
```bash
ls -la /etc/shadow
# -rw-r----- 1 root shadow 1234 ...  （640が標準）

# 修正コマンド
sudo chmod 640 /etc/shadow
sudo chown root:shadow /etc/shadow
```

**まとめ：**
`/etc/shadow` は `root` と `shadow` グループのみが読めるべきで、644 は重大なセキュリティリスク。
