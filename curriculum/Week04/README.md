# Week04 ｜ ネットワーク設定・管理

## 🎯 今週の目標

## 🔗 前回（Week03）からの続き
鈴木さんのアカウント設定と高負荷プロセスの停止が完了しました。
ここまでで「サーバーの中」の操作に慣れてきました。
今週は「サーバーとネットワークの関係」に踏み込みます。
CCNAの知識をLinuxのコマンドと結びつけていきましょう。

- Linuxのネットワーク設定をコマンドラインで確認・変更できる
- 「繋がらない」を段階的に切り分けるトラブルシューティング手順を身につける
- ファイアウォール設定でポートを制御できる

## 🚀 まず最初にやること（環境セットアップ）

今週のハンズオンは「すでに問題が起きているサーバー」に対応する形式です。
**以下のセットアップスクリプトを先に実行して、障害状態を再現してから演習を始めてください。**

```bash
# 障害環境を作る（先にこれを実行！）
chmod +x hands-on/04_setup.sh
bash hands-on/04_setup.sh
```

実行すると **Apacheは起動済みだがファイアウォールで80番がブロックされた状態** になります。
その状態から原因を特定・復旧するのが今週のミッションです。

> **⚠️ WSL2 をお使いの場合**  
> WSL2 環境ではファイアウォール（iptables/ufw/firewalld）が正常に機能しないため、ブロックが再現できない場合があります。  
> この課題は **VirtualBox または AWS EC2** などの独立した Linux 環境で実施することを推奨します。  
> セットアップスクリプトがブロック未適用の旨を表示した場合は、環境を切り替えてください。

> **⚠️ AWS EC2 をお使いの場合**  
> EC2 では Security Group（SG）でポートを制御できますが、**この課題では SG は使わないこと**。  
> SG はAWSのネットワーク層での制御であり、Linux OS のファイアウォール（iptables/ufw/firewalld）とは別物です。  
> セットアップスクリプトが OS 側でブロックするので、SG の80番は**開けたまま**にしておいてください。そうすることで「外からは繋がるはずなのにOSのファイアウォールで止まっている」という本来の障害状況が再現できます。

---
## 📖 今週のミッション（佐藤さんからのSlack）

```
佐藤 Sato  14:02
田中さん、急ぎです！🚨

今日立てた新サーバー（prod-web02）に
外部から全然アクセスできないと開発チームから連絡が来ました。
サーバー自体は起動してるはずなので、ネットワーク周りを見てください。

切り分けの順番：
1. サーバーのIPとルーティングを確認
2. Apache は起動してる？ポートは待ち受けてる？
3. ローカルから繋がるか？
4. ファイアウォールで 80 番が開いてるか？
5. 開いてなければ開放して再確認

各ステップの結果をメモしながら進めてください！
```

**あなたのミッション：** 「繋がらない」を段階的に切り分けて原因を特定し、復旧する。

---

## 📚 学習内容

### 1. ネットワーク設定の確認・変更

#### 💡 `ip` コマンドと `ifconfig` の違い
かつては `ifconfig`（net-tools）が標準だったが、現在は `ip`（iproute2）が標準。
`ifconfig` はディストリビューションによってはデフォルトでインストールされていない。
新しく覚えるなら `ip` コマンドだけ覚えれば十分。

```bash
ip a               # IPアドレス一覧（a = address）
ip r               # ルーティングテーブル（r = route）
ip link show       # NIC（ネットワークインターフェース）一覧

# 出力例：
# 2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500
#     inet 192.168.1.10/24 brd 192.168.1.255 scope global eth0
#
# eth0 = NICの名前
# 192.168.1.10/24 = IPアドレス/サブネットマスク（/24 = 255.255.255.0）

# 一時的なIPアドレス追加（再起動で消える）
sudo ip addr add 192.168.1.20/24 dev eth0
```

---

### 2. DNS確認・疎通確認

#### 💡 名前解決の仕組み
ブラウザで `google.com` にアクセスするとき、裏では以下が起きている：
1. `/etc/hosts` を確認（ローカルのDNSテーブル）
2. `/etc/resolv.conf` に書かれたDNSサーバーに問い合わせ
3. IPアドレスを取得してTCP接続

`dig` コマンドはこのDNS問い合わせを手動で実行して結果を確認できる。

```bash
# DNS確認
cat /etc/resolv.conf           # 使用中のDNSサーバーを確認
dig google.com A               # Aレコード（IPアドレス）を問い合わせ
dig google.com MX              # MXレコード（メールサーバー）を問い合わせ
dig @8.8.8.8 google.com        # 特定のDNSサーバーに直接問い合わせ
nslookup google.com            # シンプルな名前解決確認

# 疎通確認
ping -c 4 8.8.8.8              # ICMP疎通（-c: 回数指定）
traceroute google.com          # パケットが通る経路を表示
mtr google.com                 # tracerouteのリアルタイム版（m = my traceroute）

# HTTP疎通確認
curl -I http://localhost        # HTTPレスポンスヘッダだけを取得（-I = HEAD）
curl -v http://localhost        # 詳細な通信ログ付き（-v = verbose）
wget -q -O - http://localhost  # レスポンスボディを標準出力に出す
```

---

### 3. ポート・コネクション確認

#### 💡 ポートとは
TCPでは1台のサーバーが複数のサービスを同時に動かすために「ポート番号」を使う。
CCNA既習者にはおなじみだが、Linuxでのコマンド的な確認方法を習得する。

主要なポート番号：
| ポート | サービス | 備考 |
|--------|---------|------|
| 22 | SSH | リモートログイン |
| 80 | HTTP | Web（非暗号化） |
| 443 | HTTPS | Web（SSL） |
| 3306 | MySQL | データベース |
| 25 / 587 | SMTP | メール送信 |

```bash
# ss：待ち受けポートとコネクションの確認（netstatの現代版）
ss -tnlp
# -t: TCP, -n: 数値表示（名前解決しない）, -l: LISTEN状態, -p: プロセス表示

# 出力例：
# LISTEN  0  128  0.0.0.0:22   0.0.0.0:*  users:(("sshd",pid=1234,fd=3))
# → sshd が 22番ポートで全IPからの接続を待ち受けている

ss -tnp     # -l を外す → 確立済みのコネクション（ESTABLISHED）も見える
```

---

### 4. ファイアウォール（firewalld）

#### 💡 ファイアウォールの必要性
サーバーはインターネットに公開すると、世界中からスキャンやアクセスが来る。
「開けているポートは最小限に」が原則（最小権限の原則）。
Linuxのファイアウォールは内部的には `netfilter`（カーネル機能）で動いており、
`firewalld` や `iptables` はそのフロントエンド。

```bash
sudo systemctl status firewalld    # ファイアウォールの状態確認
sudo firewall-cmd --list-all       # 現在のルールをすべて表示

# ポート開放
sudo firewall-cmd --add-port=80/tcp --permanent    # 80番ポートを開放
sudo firewall-cmd --add-service=http --permanent   # サービス名でも指定できる
sudo firewall-cmd --reload                          # 設定を反映（必須）

# ポートを閉じる
sudo firewall-cmd --remove-port=80/tcp --permanent
sudo firewall-cmd --reload

# 現在開いているポートの確認
sudo firewall-cmd --list-ports
```

#### 💡 `--permanent` を付けないとどうなるか
`--permanent` なしで設定変更すると「現在のセッションだけ有効」になる。
サーバー再起動すると設定が消えてしまう。
設定変更は必ず `--permanent` を付け、その後 `--reload` で反映させる。

---

## 🛠️ ハンズオン演習：「繋がらない」を段階的に切り分ける

```bash
# Step1: そもそもApacheが起動しているか？
sudo systemctl status apache2

# Step2: ポートで待ち受けているか？
ss -tnlp | grep 80

# Step3: ローカルからHTTPで繋がるか？
curl http://localhost

# Step4: ファイアウォールで80番が開いているか？（環境に合わせて使う）
sudo firewall-cmd --list-all   # firewalld の場合
sudo ufw status                # ufw の場合
sudo iptables -L INPUT -n      # iptables の場合

# Step5: 外部から繋がらない場合はポートを開放
```

**firewalld の場合（CentOS / Rocky Linux など）：**
```bash
sudo firewall-cmd --add-port=80/tcp --permanent
sudo firewall-cmd --reload

# 確認
sudo firewall-cmd --list-ports
```

**ufw の場合（Ubuntu など）：**
```bash
sudo ufw allow 80/tcp
sudo ufw reload

# 確認
sudo ufw status
```

**iptables の場合（上記が使えない環境）：**
```bash
# DROPルールを削除して開放
sudo iptables -D INPUT -p tcp --dport 80 -j DROP

# 確認
sudo iptables -L INPUT -n | grep 80
```

---

**意図的に壊して復旧練習：**

```bash
# ===== firewalld で壊す =====
sudo firewall-cmd --remove-port=80/tcp --permanent
sudo firewall-cmd --reload
curl http://localhost    # ローカルは通る
# 外部から繋がらないことを確認 → 上記の開放手順で復旧

# ===== ufw で壊す =====
sudo ufw deny 80/tcp
sudo ufw reload
# 外部から繋がらないことを確認 → ufw allow 80/tcp で復旧

# ===== iptables で壊す =====
sudo iptables -I INPUT -p tcp --dport 80 -j DROP
# 外部から繋がらないことを確認 → iptables -D INPUT で復旧
```

→ 詳細手順は `hands-on/04_network.sh` を参照

---

## 📝 今週の課題

ハンズオンで手を動かした内容を、今度は自力で再現してみましょう。

### 大問1. ip a と ip r の出力から以下を答えよ

`ip a` と `ip r` の出力から以下を答えよ
   - このサーバーのIPアドレスとサブネットマスク（CIDR表記）
   - デフォルトゲートウェイ
   - 同じサブネット内で通信できるIPアドレスの範囲

### 大問2. DNS設定と疎通確認を行い、以下を答えよ

`cat /etc/resolv.conf` と `ping` / `curl` を使って以下を答えよ
   - このサーバーが使用している DNS サーバーの IP アドレス
   - `ping -c 4 8.8.8.8` の結果（疎通できるか、パケットロスはあるか）
   - `curl -I http://localhost` の結果（ステータスコードと何が返ってきたか）

### 大問3. ss -tnlp の出力から以下を答えよ

`ss -tnlp` の出力から以下を答えよ
   - 全ての待ち受けポートとそのサービス名
   - `0.0.0.0:ポート` と `127.0.0.1:ポート` の違いを説明せよ
   - 外部に公開する必要がないのに `0.0.0.0` で待ち受けているポートがあれば指摘せよ

### 大問4. curl で HTTP 接続を確認し、以下を答えよ

`curl` コマンドで以下を確認して結果を記録せよ
   - `curl http://localhost` を実行し、返ってきた HTML の内容を答えよ
   - `curl -I http://localhost` と `curl -v http://localhost` の出力の違いを説明せよ
   - セットアップ後にローカルからは繋がるのに外部から繋がらない理由を答えよ

### 大問5. ファイアウォールで 80/tcp を開放し、外部から繋がることを確認せよ

手順を1ステップずつ実行し、各ステップのコマンドと結果を記録せよ
   1. `sudo firewall-cmd --list-all` で現在のルールを確認（80/tcp が未開放か確認）
   2. `sudo firewall-cmd --add-port=80/tcp --permanent` で開放
   3. `sudo firewall-cmd --reload` で設定を反映
   4. `sudo firewall-cmd --list-ports` で開放されたことを確認
   5. `curl http://localhost` が `200` を返すことを確認
   6. `--permanent` を付けずに設定変更した場合、再起動後にどうなるかを説明せよ

### 大問6. 障害シナリオ: curl http://localhost が繋がらない。以下の順番で切り分けを行い、どのステップで何が分かるかを記録せよ

**障害シナリオ:** `curl http://localhost` が繋がらない。以下の順番で切り分けを行い、どのステップで何が分かるかを記録せよ
   ```
   Step1: systemctl is-active apache2
   Step2: ss -tnlp | grep 80
   Step3: sudo firewall-cmd --list-ports
   Step4: sudo tail /var/log/apache2/error.log
   ```

### 大問7. 佐藤さんへの報告を完成させよ

調査結果をもとに、以下の報告テンプレートを自分の環境の実測値で埋めて提出せよ

```
prod-web02 ネットワーク診断完了しました。

IP アドレス    : （ip a の出力から記入）
Apache 状態    : （systemctl is-active apache2 の結果）
80番ポート     : （ss -tnlp | grep :80 の結果：待ち受け中 / 未開放）
firewalld 80/tcp : （firewall-cmd --list-ports の結果：開放済み / 未開放）
ローカル curl  : （curl http://localhost のステータスコード）

原因           : （何が問題だったか）
対処           : （実行したコマンドと結果）
```