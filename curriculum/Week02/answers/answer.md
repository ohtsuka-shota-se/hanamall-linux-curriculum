# Week02 課題 回答例・解説

## 課題1：500エラーのIPアドレスを一覧表示

```bash
grep " 500 " data/access.log | awk '{print $1}' | sort -u
```

**出力例：**
```
10.0.0.6
192.168.1.11
```

**解説：**
- `grep " 500 "` でステータスコード500の行を抽出
- `awk '{print $1}'` で1列目（IPアドレス）だけ取り出す
- `sort -u` で重複を除いて並べ替え（`-u` = unique）

---

## 課題2：IPアドレスごとのアクセス数ランキング

```bash
awk '{print $1}' data/access.log | sort | uniq -c | sort -rn
```

**出力例：**
```
      7 192.168.1.10
      3 10.0.0.5
      3 192.168.1.11
      2 192.168.1.12
      2 192.168.1.13
      1 10.0.0.6
      1 10.0.0.7
      1 192.168.1.14
      1 192.168.1.15
```

**解説：**
- `awk '{print $1}'` → IP抽出
- `sort` → uniq の前にソートが必要（同じ値を隣接させる）
- `uniq -c` → 連続する同じ値を数える（`-c` = count）
- `sort -rn` → 数値で降順ソート（`-r` = reverse, `-n` = numeric）

> ⚡ この4コマンドの組み合わせは現場で毎日使う黄金パターン

---

## 課題3：SSHログイン失敗を抽出

```bash
grep "Failed password" data/syslog.sample
```

**出力例：**
```
May  1 09:12:45 server01 sshd[5700]: Failed password for root from 10.0.0.99 port 12345 ssh2
May  1 09:12:46 server01 sshd[5700]: Failed password for root from 10.0.0.99 port 12346 ssh2
May  1 09:12:47 server01 sshd[5700]: Failed password for root from 10.0.0.99 port 12347 ssh2
```

**解説：**
1秒に1回、同じIPから3回連続でrootへのパスワード試行がある。
これはブルートフォース攻撃の典型的なパターン。
実際の現場では fail2ban などのツールで自動ブロックする。

---

## 課題4：カウントアップのループスクリプト

```bash
#!/bin/bash
for i in 1 2 3 4 5; do
  echo "チェック完了: ${i}台"
done
```

**出力：**
```
チェック完了: 1台
チェック完了: 2台
チェック完了: 3台
チェック完了: 4台
チェック完了: 5台
```

**応用（seq を使う書き方）：**
```bash
for i in $(seq 1 5); do
  echo "チェック完了: ${i}台"
done
```

---

## よくある躓きポイント

**Q: `awk '{print $1}'` の `$1` って何？**
A: スペース区切りの1番目の列。`$2` は2番目、`$NF` は最後の列を意味する。

**Q: `sort | uniq -c` の前になぜ `sort` が必要？**
A: `uniq` は隣接する行の重複しか検出しない。事前にソートしないとカウントが正確にならない。

**Q: `2>/dev/null` の意味は？**
A: 標準エラー出力（fd=2）を `/dev/null`（ゴミ箱）に捨てる。エラーメッセージを表示したくないときに使う。
