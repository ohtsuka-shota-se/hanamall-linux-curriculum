# Week04 課題 回答例・解説

---

### 大問1. ip a と ip r の出力から以下を答えよ

```bash
ip a    # インターフェース・IPアドレス一覧
ip r    # ルーティングテーブル
```

**`ip a` の出力例と読み方：**

```
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN
    inet 127.0.0.1/8 scope host lo
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP
    inet 192.168.1.10/24 brd 192.168.1.255 scope global eth0
    inet6 fe80::5054:ff:fe12:3456/64 scope link
```

| 項目 | 値 | 意味 |
|------|-----|------|
| `lo` | 127.0.0.1 | ループバックインターフェース。自分自身への通信に使う |
| `eth0` | 192.168.1.10 | 実際の外部通信に使うNIC |
| `/24` | サブネットマスク | 192.168.1.0〜192.168.1.255 が同一ネットワーク |
| `brd 192.168.1.255` | ブロードキャストアドレス | ネットワーク内の全端末への一斉送信に使うアドレス |
| `UP,LOWER_UP` | リンク状態 | ネットワークケーブルが繋がっていることを示す |

**`ip r` の出力例と読み方：**

```
default via 192.168.1.1 dev eth0 proto dhcp src 192.168.1.10 metric 100
192.168.1.0/24 dev eth0 proto kernel scope link src 192.168.1.10
```

| 行 | 意味 |
|----|------|
| `default via 192.168.1.1` | デフォルトゲートウェイ。インターネットへの出口 |
| `192.168.1.0/24 dev eth0` | 同一ネットワーク内はeth0で直接通信（ルーター不要） |
| `metric 100` | 複数経路がある場合の優先度（小さいほど優先） |

**現場でよく使う場面：**
- `ip a` でサーバーのIPを確認（踏み台経由でアクセスする際など）
- `ip r` でゲートウェイが正しいか確認（繋がらないときの切り分け第一歩）

---

### 大問2. dig で以下を調べて結果を報告せよ

```bash
dig google.com A       # AレコードでIPアドレスを調べる
dig google.com MX      # MXレコードでメールサーバーを調べる
dig -x 8.8.8.8         # 逆引き（IPからドメイン名を調べる）
```

**`dig google.com A` の出力例：**

```
;; QUESTION SECTION:
;google.com.                    IN      A

;; ANSWER SECTION:
google.com.             287     IN      A       142.250.196.46

;; Query time: 12 msec
;; SERVER: 192.168.1.1#53(192.168.1.1)
```

| セクション | 意味 |
|-----------|------|
| `QUESTION SECTION` | 問い合わせた内容（何を調べたか） |
| `ANSWER SECTION` | 回答。`A 142.250.196.46` = このIPがgoogle.comの実体 |
| `287` | TTL（秒）。この回答が何秒間キャッシュされるか |
| `Query time: 12 msec` | DNS応答速度。遅い場合はDNSサーバー自体に問題がある可能性 |
| `SERVER: 192.168.1.1#53` | 問い合わせ先DNSサーバー（ここに聞いた） |

**`dig google.com MX` の出力例：**

```
;; ANSWER SECTION:
google.com.             600     IN      MX      10 smtp.google.com.
```

`10` は優先度（小さいほど優先）。複数のMXレコードがあると冗長化している。

**`dig -x 8.8.8.8` の出力例：**

```
;; ANSWER SECTION:
8.8.8.8.in-addr.arpa.  21599   IN      PTR     dns.google.
```

`PTR` レコードが逆引きの結果。`8.8.8.8` は `dns.google.` というホスト名を持つことが分かる。

**現場でよく使う場面：**
- 自社ドメインのDNS設定が反映されたか確認する
- メール届かない問題でMXレコードが正しいか調べる
- 不審なIPがどこの組織のものか逆引きで確認する

---

### 大問3. ss -tnlp の出力から以下を答えよ

```bash
ss -tnlp
```

**出力例：**

```
State   Recv-Q Send-Q  Local Address:Port   Peer Address:Port  Process
LISTEN  0      128     0.0.0.0:22            0.0.0.0:*          users:(("sshd",pid=1234,fd=3))
LISTEN  0      128     0.0.0.0:80            0.0.0.0:*          users:(("apache2",pid=5678,fd=4))
LISTEN  0      128     127.0.0.1:3306        0.0.0.0:*          users:(("mysqld",pid=9012,fd=20))
```

**各列の意味：**

| 列 | 値の例 | 意味 |
|----|--------|------|
| `State` | LISTEN | このポートで接続を待っている状態 |
| `Recv-Q` | 0 | 受信キューに溜まっているバイト数（0が正常） |
| `Local Address:Port` | 0.0.0.0:80 | どのIPの80番で待っているか |
| `Peer Address:Port` | 0.0.0.0:* | 接続元は任意（*）を意味する |
| `Process` | apache2,pid=5678 | そのポートを使っているプロセス |

**`Local Address` の読み方：**

| アドレス | 意味 |
|---------|------|
| `0.0.0.0:80` | 全インターフェースで80番を待受（外部からアクセス可能） |
| `127.0.0.1:3306` | ループバックのみで待受（**外部からアクセス不可**）|
| `:::22` | IPv6の全インターフェースで待受 |

上の出力例で `mysqld` が `127.0.0.1:3306` になっているのは正しいセキュリティ設定。DBは外部に晒さないのが原則。

**オプションの意味：**

| オプション | 意味 |
|-----------|------|
| `-t` | TCP のみ表示（`-u` でUDP） |
| `-n` | ポート番号を名前解決しない（`80` を `http` に変換しない） |
| `-l` | LISTEN 状態のみ表示 |
| `-p` | プロセス名・PIDを表示（root権限が必要な場合あり） |

---

### 大問4. firewalld で以下の操作を行い、各ステップの結果を記録せよ

```bash
# 現在の設定を確認
sudo firewall-cmd --list-all
```

**出力例：**

```
public (active)
  target: default
  interfaces: eth0
  services: dhcpv6-client ssh
  ports:
  rich rules:
```

`services` に `http` がない = 80番が閉じている状態。

```bash
# HTTPを許可（サービス名で指定）
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --reload

# カスタムポート8080を追加（ポート番号で指定）
sudo firewall-cmd --permanent --add-port=8080/tcp
sudo firewall-cmd --reload

# 確認
sudo firewall-cmd --list-all
```

**`--permanent` と `--reload` の関係：**

firewalldのルールには「ランタイム（即時有効）」と「永続（再起動後も有効）」の2層がある。

| 操作 | ランタイム | 永続ファイル |
|------|-----------|------------|
| `--permanent` なし | 即時有効 | 保存されない（再起動で消える） |
| `--permanent` あり + `--reload` | `--reload` 後に有効 | 保存される |

本番では必ず `--permanent` + `--reload` をセットで使う。

```bash
# 8080を削除
sudo firewall-cmd --permanent --remove-port=8080/tcp
sudo firewall-cmd --reload

# 削除されたことを確認
sudo firewall-cmd --list-ports
# → 8080/tcp が消えていればOK
```

**ufw の場合（Ubuntu環境）：**

```bash
# 確認
sudo ufw status verbose

# 許可
sudo ufw allow 80/tcp
sudo ufw allow 8080/tcp

# 削除
sudo ufw delete allow 8080/tcp

# 確認
sudo ufw status
```

**iptables の場合：**

```bash
# 確認
sudo iptables -L INPUT -n --line-numbers

# 許可（DROPルールを削除することで開放）
sudo iptables -D INPUT -p tcp --dport 80 -j DROP

# ブロック追加
sudo iptables -I INPUT -p tcp --dport 8080 -j DROP

# 確認
sudo iptables -L INPUT -n
```

---

### 大問5. 以下のネットワーク調査コマンドを実行し、それぞれ何を調べるコマンドかを説明せよ

| コマンド | 何を調べるか | 現場での使い場面 |
|---------|------------|----------------|
| `ping 8.8.8.8` | ICMPで疎通確認。往復時間（RTT）を測定 | インターネットに出られるか確認する第一歩 |
| `traceroute 8.8.8.8` | 経路上のルーターをhopごとに表示 | どこで詰まっているか経路を追う |
| `ss -tnlp` | 開いているTCPポートと対応プロセスを確認 | 何がどのポートを使っているか把握する |
| `dig google.com` | DNS名前解決の結果・応答サーバー・TTLを確認 | DNS設定が正しく反映されているか確認 |
| `ip r` | ルーティングテーブルとデフォルトゲートウェイを確認 | パケットがどの経路で出ていくか確認 |

**`ping` と `traceroute` の使い分け：**

```bash
ping 8.8.8.8        # 通るか通らないかの二択確認
traceroute 8.8.8.8  # どこで止まっているか経路を追う

# ping が通らないのに traceroute で途中まで到達する
# → 途中のルーターまでは届いているが先で詰まっている
```

---

### 大問6. 障害シナリオ: curl http://localhost が繋がらない。以下の順番で切り分けを行い、どのステップで何が分かるかを記録せよ

障害対応は「原因の絞り込み」が最重要。上から順に確認して、どこで問題があるかを特定する。

**Step1：サービスが起動しているか**

```bash
systemctl is-active apache2
# active   → 起動中。次のStepへ
# inactive → 停止中。sudo systemctl start apache2 で起動して再確認
# failed   → 異常終了。journalctl -u apache2 -n 30 でエラーを確認
```

**Step2：ポートがLISTENしているか**

```bash
ss -tnlp | grep :80
# 表示あり → 待受中。次のStepへ
# 表示なし → Apacheは起動しているが80番にバインドできていない
#            → 設定ファイルのポート番号が違う可能性（apache2ctl configtest で確認）
```

**Step3：ローカルからHTTPで繋がるか**

```bash
curl -v http://localhost
# 200が返る → ローカルは正常。外部からのアクセスに問題がある（Step4へ）
# 000/接続拒否 → ポートが開いていない（Step2に戻る）
# 403 Forbidden → Apacheは応答しているがDocumentRootの権限問題
```

このStepで「ローカルは通るが外部から通らない」が確定すればファイアウォールが疑い濃厚。

**Step4：ファイアウォールがブロックしていないか**

```bash
# firewalld の場合
sudo firewall-cmd --list-all
# → services に http がなければ → sudo firewall-cmd --permanent --add-service=http && sudo firewall-cmd --reload

# ufw の場合
sudo ufw status
# → 80番に ALLOW がなければ → sudo ufw allow 80/tcp

# iptables の場合
sudo iptables -L INPUT -n | grep 80
# → DROP ルールがあれば → sudo iptables -D INPUT -p tcp --dport 80 -j DROP
```

**切り分けのまとめ：**

```
[Step1] Apache 起動？
    No  → systemctl start apache2
    Yes ↓
[Step2] 80番 LISTEN？
    No  → 設定ファイルの確認（apache2ctl configtest）
    Yes ↓
[Step3] curl localhost 通る？
    No  → Apacheの設定・DocumentRootの確認
    Yes ↓
[Step4] FW で 80 開いてる？
    No  → ファイアウォールでポート開放
    Yes → EC2のSGや上流のロードバランサーを確認
```

---

### 大問7. 思考問題: ss -tnlp に見慣れないポート（例: 0.0.0.0:4444）が表示されていたらどう対処するか？手順を3ステップで答えよ

不審なポートは**バックドア・マルウェア感染の兆候**である可能性がある。落ち着いて順番に確認する。

**Step1：プロセスを特定して素性を確認する**

```bash
# どのプロセスが4444番を使っているか
ss -tnlp | grep 4444
# → users:(("nc",pid=9999,fd=3)) のように表示される

# プロセスの詳細を確認
ps aux | grep 9999
# → 実行ユーザー・起動コマンド・起動時刻を確認

# 実行ファイルの場所を確認
ls -la /proc/9999/exe
# → /usr/bin/nc など。正規のパスか確認

# どのユーザーが起動したか、いつ起動したか
cat /proc/9999/status | grep -E "Name|Uid|Pid"
```

**Step2：正規のサービスか判断する**

```bash
# インストール済みパッケージか確認（Debian系）
dpkg -S $(readlink -f /proc/9999/exe) 2>/dev/null
# → パッケージ名が出れば正規インストール品
# → 何も出なければ不審（手動で置かれたファイルの可能性）

# ファイルの更新日時を確認（最近更新されていないか）
stat $(readlink -f /proc/9999/exe)

# ネットワーク接続状況を確認（どこに繋いでいるか）
ss -tnp | grep 9999
# → 外部IPへの接続があれば C2サーバーとの通信の疑い
```

**Step3：不審であれば即座に対応する**

```bash
# ① まずプロセスを停止
sudo kill -9 9999

# ② ポートをファイアウォールでブロック（外部からのアクセスを遮断）
# firewalld
sudo firewall-cmd --permanent --add-rich-rule='rule family="ipv4" port port="4444" protocol="tcp" drop'
sudo firewall-cmd --reload
# ufw
sudo ufw deny 4444/tcp

# ③ 再起動後も動かないか確認（永続化されていないか）
systemctl list-unit-files | grep -i 怪しいサービス名
crontab -l                    # 自分のcron
sudo crontab -l               # rootのcron
ls /etc/cron.d/ /etc/cron.daily/ /etc/rc.local
# → 自動起動の仕掛けが残っていれば削除

# ④ ログで侵入経路を調べる
sudo grep "4444\|9999" /var/log/auth.log
sudo grep "4444" /var/log/apache2/access.log
last    # ログイン履歴
```

**判断の目安：**

| 状況 | 判断 |
|------|------|
| パッケージ管理で追跡できる | 正規サービスの可能性が高い。用途を確認する |
| 実行ファイルが `/tmp` や `/var/tmp` にある | ほぼ確実に不審。即停止・隔離 |
| 外部IPへの接続がある | C2通信の疑い。ネットワーク管理者に即報告 |
| rootが所有者で最近作成された | 権限昇格攻撃の痕跡の可能性 |
