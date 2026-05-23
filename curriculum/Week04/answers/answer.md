# Week04 課題 回答例・解説

## 課題1：ip a と ip r の読み方

```bash
ip a
# 出力例：
# 2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP>
#     inet 192.168.1.10/24 brd 192.168.1.255 scope global eth0

ip r
# 出力例：
# default via 192.168.1.1 dev eth0
# 192.168.1.0/24 dev eth0 proto kernel
```

**読み方：**
- `inet 192.168.1.10/24` → このサーバーのIPアドレスは `192.168.1.10`
- `default via 192.168.1.1` → デフォルトゲートウェイは `192.168.1.1`

## 課題2：dig で A レコードを確認

```bash
dig google.com A

# 重要な部分：
# ;; ANSWER SECTION:
# google.com.  300  IN  A  142.250.196.46
```

**TTL=300** の意味：このDNSレコードは300秒（5分）キャッシュされる。

## 課題3：ss -tnlp で待ち受けポート確認

```bash
ss -tnlp

# 例：
# LISTEN  0  128  0.0.0.0:22   0.0.0.0:*  users:(("sshd",pid=1234,fd=3))
# LISTEN  0  128  0.0.0.0:80   0.0.0.0:*  users:(("apache2",pid=5678,fd=6))
```

**各ポートの読み方：**
- `0.0.0.0:22` → 全IPからの接続を22番で待ち受け（SSH）
- `127.0.0.1:3306` → ローカルのみ3306番を待ち受け（MySQL。外部からは接続不可）

## 課題4：firewalld でポート制御

```bash
# 開放
sudo firewall-cmd --add-port=8080/tcp --permanent
sudo firewall-cmd --reload

# 確認
sudo firewall-cmd --list-ports

# 閉じる
sudo firewall-cmd --remove-port=8080/tcp --permanent
sudo firewall-cmd --reload
```

---

## 課題5：思考問題 — 見慣れないポートへの対処（3ステップ）

**問い：** `ss -tnlp` に見慣れないポート（例：`0.0.0.0:4444`）が表示されていたらどう対処するか？

**回答：**

**Step1：何のプロセスが使っているか特定する**
```bash
ss -tnlp | grep 4444
# LISTEN  0  128  0.0.0.0:4444  users:(("python3",pid=9999,fd=4))
# → python3 (PID:9999) が使っている

# プロセスの詳細を確認
ps aux | grep 9999
# → 誰がいつ起動したスクリプトか確認

# そのプロセスが開いているファイルを確認
sudo lsof -p 9999
```

**Step2：正規のプロセスかどうか判断する**
```bash
# 起動コマンド・ユーザー・起動時刻を確認
ps aux | grep 9999

# インストール済みパッケージか確認
dpkg -S /path/to/binary 2>/dev/null || echo "パッケージ管理外のバイナリ"

# ネットワーク通信の宛先を確認
sudo ss -tnp | grep 9999
```

**Step3：不審なら停止してファイアウォールでブロック**
```bash
# プロセスを停止
sudo kill 9999

# ファイアウォールで念のためブロック
sudo firewall-cmd --add-rich-rule='rule port port=4444 protocol=tcp reject' --permanent
sudo firewall-cmd --reload

# 再起動後も出てこないか確認
sudo systemctl list-units | grep python
crontab -l
```

**現場での判断基準：**
- 自分（またはチーム）が意図して起動したものか
- `/usr/bin/` や `/usr/local/bin/` など正規のパスから起動しているか
- rootや www-data など想定外のユーザーで動いていないか

「知らないポートは全部疑う」が原則。

---

## よくある躓きポイント

**Q: curl は通るのに外部から繋がらない**
A: ファイアウォールが閉じている可能性が高い。`ss -tnlp` でポートがLISTENしているか確認し、その後 `firewall-cmd --list-all` でファイアウォールを確認する。

**Q: TTLの意味が分からない**
A: TTL（Time To Live）はキャッシュの有効期限（秒）。
`dig google.com` で TTL=300 なら、DNSサーバーの回答を300秒間キャッシュしてよいという意味。
頻繁にIPが変わるサービスは TTL を短く設定し、安定したサービスは長く設定する。
