# Week04 課題 回答例・解説

---

### 大問1. ip a と ip r の出力から以下を答えよ

```bash
ip a    # インターフェース・IPアドレス一覧
ip r    # ルーティングテーブル
```

**読み方の例：**

```
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> ...
    inet 192.168.1.10/24 brd 192.168.1.255 scope global eth0
```

| 項目 | 値 | 意味 |
|------|-----|------|
| インターフェース名 | eth0 | 有効なNIC |
| IPアドレス | 192.168.1.10 | このサーバーのアドレス |
| サブネット | /24 | 192.168.1.0/24 のネットワーク |

```bash
ip r
# default via 192.168.1.1 dev eth0  ← デフォルトゲートウェイ
```

---

### 大問2. dig で以下を調べて結果を報告せよ

```bash
# Aレコード（IPアドレス）
dig google.com A

# MXレコード（メールサーバー）
dig google.com MX

# 逆引き
dig -x 8.8.8.8
```

**出力の読み方：**
- `ANSWER SECTION`：実際の回答
- `Query time`：応答速度（ms）
- `SERVER`：問い合わせ先DNSサーバー

---

### 大問3. ss -tnlp の出力から以下を答えよ

```bash
ss -tnlp
```

**出力例：**
```
State   Recv-Q Send-Q Local Address:Port  Peer Address:Port Process
LISTEN  0      128    0.0.0.0:22          0.0.0.0:*         sshd
LISTEN  0      128    0.0.0.0:80          0.0.0.0:*         apache2
```

| オプション | 意味 |
|-----------|------|
| `-t` | TCP のみ表示 |
| `-n` | ポート番号を名前解決しない |
| `-l` | LISTEN 状態のみ |
| `-p` | プロセス名・PIDを表示 |

---

### 大問4. firewalld で以下の操作を行い、各ステップの結果を記録せよ

```bash
# 現在の設定確認
sudo firewall-cmd --list-all

# HTTPを許可
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --reload

# カスタムポート8080を追加
sudo firewall-cmd --permanent --add-port=8080/tcp
sudo firewall-cmd --reload

# 確認
sudo firewall-cmd --list-all

# 8080を削除
sudo firewall-cmd --permanent --remove-port=8080/tcp
sudo firewall-cmd --reload
```

**`--permanent` と `--reload` の関係：**
- `--permanent`：再起動後も設定を保持（ファイルに書く）
- `--reload`：設定をランタイムに反映する（これをしないと再起動まで有効にならない）

---

### 大問5. 以下のネットワーク調査コマンドを実行し、それぞれ何を調べるコマンドかを説明せよ

| コマンド | 調べること |
|---------|----------|
| `ping 8.8.8.8` | 外部への疎通確認（ICMPで往復時間を測定） |
| `traceroute 8.8.8.8` | 経路上のルーターを hop ごとに表示 |
| `ss -tnlp` | 開いているポートと対応プロセスを確認 |
| `dig google.com` | DNS名前解決の結果と応答サーバーを確認 |
| `ip r` | ルーティングテーブルとデフォルトゲートウェイを確認 |

---

### 大問6. 障害シナリオ: curl http://localhost が繋がらない。以下の順番で切り分けを行い、どのステップで何が分かるかを記録せよ

```bash
# Step1: サービスが起動しているか
systemctl is-active apache2
# → active なら起動中、inactive/failed なら停止

# Step2: ポートがLISTENしているか
ss -tnlp | grep :80
# → 表示あり = 待受中、なし = バインドできていない

# Step3: ファイアウォールがブロックしていないか
sudo firewall-cmd --list-all | grep http
# → http がなければ sudo firewall-cmd --add-service=http で追加

# Step4: 設定ファイルに問題がないか
sudo apache2ctl configtest
# → Syntax OK なら問題なし
```

---

### 大問7. 思考問題: ss -tnlp に見慣れないポート（例: 0.0.0.0:4444）が表示されていたらどう対処するか？手順を3ステップで答えよ

**Step1：プロセスを特定する**
```bash
ss -tnlp | grep 4444
# PIDとプロセス名を確認

ps aux | grep PID番号
# プロセスの詳細（実行ユーザー・起動コマンド）を確認
```

**Step2：正規のサービスか確認する**
```bash
# インストール済みパッケージか確認
dpkg -S /usr/bin/プロセス名

# ファイルのハッシュを確認（改ざん検知）
md5sum /usr/bin/プロセス名
```

**Step3：不審であれば停止・ブロック・調査する**
```bash
# プロセスを停止
sudo kill -9 PID

# ポートをファイアウォールでブロック
sudo firewall-cmd --permanent --add-rich-rule='rule port port="4444" protocol="tcp" reject'
sudo firewall-cmd --reload

# 永続化（自動起動）されていないか確認
systemctl list-unit-files | grep サービス名
crontab -l
ls /etc/cron.*
```
