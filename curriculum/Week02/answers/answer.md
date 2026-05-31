# Week02 課題 回答例・解説

---

### 大問1. access.log の総行数を確認し、その中で 5xx 系エラーが何件あるか・全体の何%かを計算して報告せよ

```bash
# 総行数
wc -l data/access.log

# 5xxエラーの件数
grep -c '" 5' data/access.log

# まとめて計算
total=$(wc -l < data/access.log)
err=$(grep -c '" 5' data/access.log)
echo "総行数: $total, 5xxエラー: $err件 ($(( err * 100 / total ))%)"
```

**出力例：**
```
総行数: 132, 5xxエラー: 7件 (5%)
```

**解説：**
- `wc -l`：行数をカウント
- `grep -c`：マッチした行数を返す（`-c` = count）
- `'" 5'`：ステータスコードが5で始まる行（500, 502, 503 など）を対象

---

### 大問2. IPアドレスごとのアクセス数ランキング Top5 を表示し、最も多くアクセスしているIPについて「正常なユーザーか、不審なアクセスか」を判断してその根拠を書け

```bash
awk '{print $1}' data/access.log | sort | uniq -c | sort -rn | head -5
```

**出力例：**
```
     26 192.168.1.10
     15 192.168.1.11
     14 192.168.1.12
     12 192.168.1.13
     11 10.0.99.5
```

**判断：`10.0.99.5` は不審なアクセス**

根拠：
```bash
grep "10.0.99.5" data/access.log
```
- `/admin/login` へのブルートフォース試行（401が連続）
- `/wp-admin`、`/.env`、`/phpmyadmin` など探索的なアクセスがある
- 正常ユーザーの `192.168.1.x` 系とは異なる外部IPからのアクセス

---

### 大問3. syslog.sample から SSH ログイン失敗を抽出し、「何時何分に・どのIPから・何回試行されたか」をまとめよ。このIPをブロックすべきか判断して理由も書け

```bash
grep "Failed password" data/syslog.sample
```

**出力例：**
```
May  1 09:12:45 server01 sshd[5700]: Failed password for root from 10.0.0.99 port 12345 ssh2
May  1 09:12:46 server01 sshd[5700]: Failed password for root from 10.0.0.99 port 12346 ssh2
May  1 09:12:47 server01 sshd[5700]: Failed password for root from 10.0.0.99 port 12347 ssh2
```

件数を数える：
```bash
grep "Failed password" data/syslog.sample | grep -oE '[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+' | sort | uniq -c
```

**まとめ：**

| 時刻 | IP | 試行回数 |
|------|-----|---------|
| 09:12:45〜47 | 10.0.0.99 | 3回（連続） |

**判断：ブロックすべき**

理由：短時間に連続してrootアカウントへのログインを試みている。ブルートフォース攻撃の典型パターンであり、`fail2ban` の導入または `firewalld` でIPをブロックすることを推奨する。

---

### 大問4. アクセスログから /admin または /wp-admin へのアクセスを抽出せよ。これらのアクセスが示す意味を説明せよ

```bash
grep -E '/admin|/wp-admin' data/access.log
```

**出力例：**
```
10.0.99.5 - - [01/May/2025:22:00:01 +0900] "GET /admin/login HTTP/1.1" 403 210
10.0.99.5 - - [01/May/2025:22:04:10 +0900] "GET /admin HTTP/1.1" 403 210
10.0.99.5 - - [01/May/2025:22:07:20 +0900] "GET /wp-admin HTTP/1.1" 404 123
```

**意味の説明：**
- `/admin`：管理画面への不正アクセス試行
- `/wp-admin`：WordPress の管理画面を探索している（このサーバーがWordPressでなくても試みる）
- 全て `10.0.99.5` からのアクセス。403・404 でブロックはされているが、継続的な探索行為と判断できる

---

### 大問5. 以下のワンライナーを完成させよ（___ を埋めること）

```bash
# 22時台（22:00〜22:59）のアクセスだけ抽出して件数を表示する
grep ":22:" data/access.log | wc -l
```

**解説：**
- Apacheのログ形式は `[01/May/2025:22:00:01 +0900]` なので `:22:` でマッチする
- `wc -l` で行数（＝アクセス件数）を表示

**出力例：**
```
61
```

---

### 大問6. awk を使って「ステータスコード別の平均レスポンスサイズ（バイト）」を集計せよ

```bash
awk '{print $9, $10}' data/access.log \
  | awk '{sum[$1]+=$2; cnt[$1]++} END{for(s in sum) printf "%s: %.0f bytes\n", s, sum[s]/cnt[s]}' \
  | sort
```

**出力例：**
```
200: 2705 bytes
401: 89 bytes
403: 210 bytes
404: 109 bytes
500: 89 bytes
```

**解説：**
- `$9`：ステータスコード（9列目）
- `$10`：レスポンスサイズ（10列目）
- `sum[$1]+=$2`：ステータスコードごとにサイズを合計
- `END{...}`：全行処理後に平均を計算して出力

---

### 大問7. 思考問題: 10.0.99.5 からのアクセスパターンを分析し、このIPを firewalld でブロックするコマンドを書け。また「ブロックする前に確認すべきこと」を1つ挙げよ

**アクセスパターンの分析：**

```bash
grep "10.0.99.5" data/access.log
```

- `/admin/login` へのブルートフォース（401連続）
- `/wp-admin`、`/.env`、`/phpmyadmin` への探索的アクセス
- 全て22時台に集中した短時間の攻撃パターン

**firewalld でブロックするコマンド：**

```bash
# ブロック
sudo firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="10.0.99.5" reject'
sudo firewall-cmd --reload

# 確認
sudo firewall-cmd --list-rich-rules
```

**ブロックする前に確認すべきこと：**

「そのIPが社内・正規のシステムや監視ツールのIPでないか確認する」

理由：会社の拠点IPや外部の正規サービスのIPをブロックすると、正常な業務に支障が出る。`whois 10.0.99.5` やネットワーク管理者への確認を行ってから実施すること。
