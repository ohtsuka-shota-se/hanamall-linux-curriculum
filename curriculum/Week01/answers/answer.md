# Week01 課題 回答例・解説

## 課題1：パーミッションを読んで説明する

```bash
ls -la /etc | head -10
```

**出力例：**
```
drwxr-xr-x  2 root root 4096 May  1 10:00 apt
-rw-r--r--  1 root root  367 Jan 10 09:00 hostname
-rwxr-xr-x  1 root root 1234 Feb 20 12:00 init.d
```

**読み方：**
| 表示 | 意味 |
|------|------|
| `d` | ディレクトリ（`-` はファイル） |
| `rwx` | 所有者（root）は読み・書き・実行できる |
| `r-x` | グループは読み・実行はできるが書き込み不可 |
| `r--` | その他ユーザーは読み込みのみ |

---

## 課題2：/var以下の .log ファイルを一覧表示

```bash
find /var -name "*.log" 2>/dev/null
```

**ポイント：** `2>/dev/null` は「権限がなくてエラーになるディレクトリを無視する」ための書き方。現場でよく使う。

---

## 課題3：tail -f でログ監視

```bash
# ターミナル1で実行
tail -f /var/log/syslog

# ターミナル2で実行（これがターミナル1のログに流れてくる）
sudo apt update
```

**ポイント：** `-f` は `--follow` の略。本番環境でのエラー追跡や、デプロイ中のログ確認で毎日使う。

---

## 課題4：chmod でパーミッション変更

```bash
touch testfile.txt
ls -la testfile.txt
# -rw-r--r-- （デフォルト：644）

chmod 755 testfile.txt
ls -la testfile.txt
# -rwxr-xr-x （755）

chmod 600 testfile.txt
ls -la testfile.txt
# -rw------- （600：秘密鍵などに使う）
```

**よく使うパーミッション早見表：**

| 数値 | 記号 | 用途 |
|------|------|------|
| 755 | rwxr-xr-x | スクリプト・実行ファイル |
| 644 | rw-r--r-- | 設定ファイル・テキスト |
| 600 | rw------- | SSH秘密鍵（~/.ssh/id_rsa）|
| 700 | rwx------ | 秘密ディレクトリ（~/.ssh/）|

---

## よくある躓きポイント

**Q: `./script.sh` を実行すると `Permission denied` になる**
A: 実行権限がない。`chmod +x script.sh` してから再実行。

**Q: `find` を実行すると大量に `Permission denied` が出る**
A: 権限のないディレクトリに入ろうとしているため。`2>/dev/null` でエラーを捨てる。

**Q: vimで抜け出せなくなった**
A: `Esc` キーを押してから `:q!` と入力してEnter。
