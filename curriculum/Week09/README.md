# Week09 ｜ パッケージ管理・systemd

## 🎯 今週の目標

## 🔗 前回（Week08）からの続き
深夜の障害を乗り越え、再発防止策の提案まで完了しました。
今週はその提案を実行に移します。「Apache のバージョン固定」と
「Week07 で作ったスクリプトを systemd サービスとして本番稼働させる」がミッションです。

- パッケージを安全に管理できる（バージョン指定・ロールバック）
- systemd の Unit ファイルを自分で書けるようになる
- 自作スクリプトをサービス化して自動起動させられる

---

## 📖 今週のミッション（佐藤さんからのSlack）

```
佐藤 Sato  10:00
田中さん、今週 2 つ依頼があります。

【依頼①】先週 Apache が勝手にアップデートされて
設定が飛んだ事故がありました（自分のときです…恥）。
本番サーバーの Apache バージョンを固定してください。

【依頼②】Week07 で作った healthcheck スクリプト、
毎回 cron から呼ぶより systemd サービスにしたほうが
管理しやすいです。
サービス化して「障害時に自動再起動」もつけてください。

よろしくお願いします！
```

**あなたのミッション：** パッケージのバージョン固定と、スクリプトのサービス化を行う。

---

## 📚 学習内容

### 1. パッケージ管理の仕組み

#### 💡 パッケージマネージャとは
Linuxのソフトウェアは「パッケージ」という形式で配布される。
パッケージマネージャ（apt/yum/dnf）は：
- インターネット上のリポジトリからパッケージをダウンロード・インストールする
- 依存関係（このソフトには他のソフトが必要）を自動解決する
- インストール済みパッケージの一覧管理・アップデートを行う

ディストリビューション別の使い分け：
| ディストリビューション | パッケージ形式 | コマンド |
|---------------------|-------------|---------|
| Ubuntu, Debian | .deb | `apt` |
| RHEL, Rocky Linux, AlmaLinux | .rpm | `dnf` (旧: `yum`) |
| CentOS 7 | .rpm | `yum` |

```bash
# apt（Ubuntu/Debian系）
sudo apt update                   # リポジトリの情報を最新化（インストール前に必ず実行）
sudo apt install apache2          # インストール
sudo apt install apache2=2.4.52-1ubuntu4  # バージョン指定でインストール
sudo apt remove apache2           # アンインストール（設定ファイルは残る）
sudo apt purge apache2            # アンインストール＋設定ファイルも削除
sudo apt autoremove               # 不要になった依存パッケージを削除

# バージョン固定（本番で特定バージョンを維持したいとき）
sudo apt-mark hold apache2        # バージョンを固定（apt upgrade で更新されなくなる）
sudo apt-mark unhold apache2      # 固定を解除
apt-mark showhold                 # 固定されているパッケージ一覧

# インストール可能なバージョン一覧
apt-cache policy apache2
```

---

### 2. systemdの仕組みとUnit ファイル

#### 💡 systemdとは
`systemd` は現代のLinuxの「PID 1」プロセスで、OSが起動すると最初に動き出す。
サービスの起動順序管理・依存関係解決・ログ収集（journald）などをすべて担う。
従来の `init.d` スクリプトに代わる現代的なサービス管理の仕組み。

サービスを定義する設定ファイルを「Unit ファイル」と呼ぶ。
`/etc/systemd/system/` に置いた `.service` ファイルがサービスとして登録される。

```ini
# /etc/systemd/system/myapp.service

[Unit]
# サービスの説明
Description=My Application Server
# このサービスを起動する前提条件（networkが起動済みであること）
After=network.target

[Service]
# simple: ExecStartのプロセスがメインプロセス
Type=simple
# このユーザーでプロセスを実行（rootでなく専用ユーザーを使うのがベストプラクティス）
User=www-data
WorkingDirectory=/opt/myapp
# 起動コマンド
ExecStart=/opt/myapp/start.sh
# 異常終了した場合に自動再起動（on-failure: 失敗時のみ）
Restart=on-failure
RestartSec=5
# ログをjournaldに送る
StandardOutput=journal
StandardError=journal

[Install]
# このサービスをどのターゲット（起動レベル）に紐付けるか
# multi-user.target = 通常のマルチユーザーモード（GUIなし）
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload      # Unit ファイルを再読み込み（必須）
sudo systemctl enable myapp       # 自動起動を有効化
sudo systemctl start myapp        # 起動
sudo systemctl status myapp       # 状態確認（動いているか、ログの直近も見える）
journalctl -u myapp -f            # リアルタイムでログ確認
```

---

### 3. systemd タイマー（cronの代替）

#### 💡 systemd タイマーとcronの違い
| 比較 | cron | systemd timer |
|------|------|---------------|
| 設定方法 | `crontab -e` | `.timer` + `.service` ファイル |
| ログ | cron自体のログに混在 | `journalctl -u xxx.timer` で分離確認 |
| 起動確認 | 難しい | `systemctl list-timers` で一覧・次回実行時刻を確認 |
| 依存関係 | なし | systemdの依存関係が使える |

実務ではまだcronも多く使われているが、新しい構成ではsystemd timerの採用が増えている。

```ini
# /etc/systemd/system/backup.timer
[Unit]
Description=Daily Backup Timer

[Timer]
# 毎日02:00に実行
OnCalendar=*-*-* 02:00:00
# サーバーが停止していて実行されなかった場合、起動後に実行する
Persistent=true

[Install]
WantedBy=timers.target
```

```bash
sudo systemctl enable backup.timer
sudo systemctl start backup.timer
systemctl list-timers              # タイマー一覧と次回実行時刻を確認
```

---


## 🛠️ ハンズオン演習

`hands-on/09_systemd_service.sh` を実行して以下を体験する：

### 演習1：パッケージのバージョンを固定・解除する
```bash
# 現在のApacheバージョンを確認
apache2 -v

# バージョンを固定（apt upgrade で更新されなくなる）
sudo apt-mark hold apache2
apt-mark showhold   # → apache2 が表示される

# 固定を解除
sudo apt-mark unhold apache2
```

### 演習2：簡単なスクリプトをsystemdサービス化する
```bash
# Step1: サービス用スクリプトを作成
sudo tee /usr/local/bin/hello_service.sh << 'EOF'
#!/bin/bash
while true; do
  echo "[$(date)] hello from systemd service" >> /var/log/hello_service.log
  sleep 30
done
EOF
sudo chmod +x /usr/local/bin/hello_service.sh

# Step2: Unit ファイルを作成
sudo tee /etc/systemd/system/hello.service << 'EOF'
[Unit]
Description=Hello Service (Week09 練習)
After=network.target

[Service]
ExecStart=/usr/local/bin/hello_service.sh
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

# Step3: 有効化・起動・確認
sudo systemctl daemon-reload
sudo systemctl start hello
sudo systemctl status hello        # → active (running)
journalctl -u hello -f             # → ログが流れることを確認
sudo systemctl stop hello          # 停止
```

### 演習3：Week07のhealthcheckスクリプトをサービス化する
```bash
# Week07で作ったスクリプトがあるか確認
ls /usr/local/bin/hanamall_healthcheck.sh

# → あればそのままサービス化（09_systemd_service.sh を参照）
# → なければ Week07の hands-on/07_healthcheck.sh を先に実行
```

→ 詳細手順は `hands-on/09_systemd_service.sh` を参照

---

### 補足：logrotate によるログ管理

#### 💡 logrotate とは
サーバーを運用し続けるとログファイルが膨らみ続け、やがてディスクフルになる。
（Week08 の深夜障害はまさにこれが原因だった）

`logrotate` はログファイルを自動で「ローテーション（世代交代）」するツール。
- 毎日 or 毎週、古いログを圧縮・リネームして新しいファイルに切り替える
- 指定した世代数より古いものは自動削除する

Apache をインストールすると `/etc/logrotate.d/apache2` が自動で作られており、
デフォルトで毎日ローテーションされるようになっている。

```bash
# 設定ファイルの確認
cat /etc/logrotate.d/apache2

# HanaMall 独自のログにも設定する例
sudo tee /etc/logrotate.d/hanamall << 'EOF'
/var/log/hanamall_*.log {
    daily           # 毎日ローテーション
    rotate 14       # 14世代分保持
    compress        # 古いログをgzip圧縮
    missingok       # ファイルがなくてもエラーにしない
    notifempty      # 空ファイルはローテーションしない
    dateext         # ファイル名に日付を付ける（access.log-20250503.gz）
    sharedscripts
    postrotate
        # ローテーション後にApacheにシグナルを送ってログファイルを開き直させる
        systemctl reload apache2 > /dev/null 2>&1 || true
    endscript
}
EOF

# 設定のテスト（実際には何もしない）
sudo logrotate --debug /etc/logrotate.d/hanamall

# 強制実行（テスト用）
sudo logrotate --force /etc/logrotate.d/hanamall
```

Week12 の総仕上げでこの設定が必要になるので、仕組みを押さえておくこと。

## 📝 今週の課題

### 大問1. Apache のバージョンを確認し、apt-mark hold で固定せよ。以下もあわせて確認すること

Apache のバージョンを確認し、`apt-mark hold` で固定せよ。以下もあわせて確認すること
   - `sudo apt upgrade --dry-run` で apache2 が更新対象から外れていることを確認
   - `apt-mark showhold` で固定されていることを確認
   - 関連パッケージ（`apache2-bin`, `apache2-data`）も一緒に固定する理由を説明せよ

### 大問2. Week07 で作った hanamall_backup.sh を systemd サービスとして登録せよ

Week07 で作った `hanamall_backup.sh` を systemd サービスとして登録せよ
   - `/etc/systemd/system/hanamall-backup.service` を作成
   - `Type=oneshot` を使う理由を説明せよ
   - `sudo systemctl start hanamall-backup` で実行・ログ確認

### 大問3. systemd タイマーで毎日深夜2時に自動実行するよう設定せよ

systemd タイマーで毎日深夜2時に自動実行するよう設定せよ
   - `systemctl list-timers` で次回実行時刻を確認
   - `Persistent=true` の意味と、これが必要なケースを説明せよ

### 大問4. journalctl で以下の調査を実施せよ

`journalctl` で以下の調査を実施せよ
   - 今日の apache2 のエラーログを確認（`-p err`）
   - 直近1時間で failed になったサービスを確認
   - 特定の時間帯（例: 昨日の2時台）のログだけ抽出する方法を試せ

### 大問5. Week09 で追加した logrotate 設定を確認し、以下を実施せよ

Week09 で追加した `logrotate` 設定を確認し、以下を実施せよ
   - `sudo logrotate --debug /etc/logrotate.d/hanamall` で設定を確認
   - `sudo logrotate --force /etc/logrotate.d/hanamall` で強制実行
   - ローテーション後にログファイルがどう変化したか記録せよ

### 大問6. systemctl list-units --type=service --state=failed を実行し、failed なサービスがあれば原因を調査して報告せよ（ない場合は「なし」と報告）

`systemctl list-units --type=service --state=failed` を実行し、failed なサービスがあれば原因を調査して報告せよ（ない場合は「なし」と報告）

### 大問7. 思考問題: Restart=on-failure を設定したサービスが「クラッシュ → 即再起動 → クラッシュ」を高速で繰り返した場合、サーバーにどんな影響があるか。RestartSec と StartLimitBurst を使ってどう設計すべきか答えよ

**思考問題:** `Restart=on-failure` を設定したサービスが「クラッシュ → 即再起動 → クラッシュ」を高速で繰り返した場合、サーバーにどんな影響があるか。`RestartSec` と `StartLimitBurst` を使ってどう設計すべきか答えよ