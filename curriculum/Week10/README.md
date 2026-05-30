# Week10 ｜ 監視・障害対応

## 🎯 今週の目標

## 🔗 前回（Week09）からの続き
hanamall-healthcheck サービスが systemd で動き始めました。
ただ先週のGWセールで「サービスは落ちていないが重くなった」障害が発生しました。
healthcheck だけでは「生きているか死んでいるか」しかわかりません。
今週は「どのくらい元気か」を継続的に記録する仕組みを作ります。

- リソース状況を素早く把握できる
- ログから障害の原因を特定できる
- 意図的に障害を起こして復旧する手順を体験する

## 🚀 まず最初にやること（環境セットアップ）

今週のハンズオンは「すでに問題が起きているサーバー」に対応する形式です。
**以下のセットアップスクリプトを先に実行して、障害状態を再現してから演習を始めてください。**

```bash
# 障害環境を作る（先にこれを実行！）
chmod +x hands-on/10_setup.sh
bash hands-on/10_setup.sh
```

実行すると **画像リサイズバッチが動いてCPUが高負荷な状態** になります。
その状態から原因を特定・復旧するのが今週のミッションです。

---
## 📖 今週のミッション（佐藤さんからのSlack）

```
佐藤 Sato  09:00
田中さん、先週末のGWセール中に
サイトが急に重くなる障害がありました。

原因は「画像リサイズのバッチ処理がセール中に動いてたから」
でしたが、それに気づくのに 1 時間かかりました…

今後のために：
① CPU/メモリ/ディスクを5分ごとにCSVに記録するスクリプトを
② 過去ログから「いつ重くなったか」を特定する練習を

リソース記録があれば次回は原因特定が早くなります！
```

**あなたのミッション：** リソース監視の仕組みを作り、障害シナリオで原因特定の流れを体験する。

---

## 📚 学習内容

### 1. リソース監視コマンド

#### 💡 「重い」の原因を絞り込む考え方
サーバーが「重い」「遅い」と報告が来たとき、原因は大きく4つに分類できる。
まず何のリソースが逼迫しているかを確認することが出発点。

| 症状 | 確認すべきリソース | コマンド |
|------|-----------------|---------|
| レスポンスが遅い | CPU使用率が高い？ | `top`, `vmstat` |
| OOMエラーが出ている | メモリが足りない？ | `free -h`, `journalctl` |
| ディスクへの書き込みが遅い | I/O待ちが多い？ | `iostat`, `iotop` |
| Webにアクセスできない | プロセスが死んでいる？ | `systemctl status apache2` |

```bash
# CPU・プロセス監視
top                   # リアルタイム監視（1秒ごと更新）
                      # キー操作: q=終了, k=kill, M=メモリ順, P=CPU順, 1=コア別表示
htop                  # top の見やすい版（要インストール: apt install htop）

# CPU・メモリ・IO の統計（vmstat）
vmstat 1 10           # 1秒間隔で10回サンプリング
# 重要カラム：
# us: ユーザープロセスのCPU使用率
# sy: カーネルのCPU使用率（高いとシステムコールが多い）
# wa: I/O待ち（高いとディスクがボトルネック）
# si/so: スワップイン/スワップアウト（0でないとメモリ不足のサイン）

# ディスクIO統計
iostat -x 1 5         # 1秒ごとに5回（-x: 詳細表示）
# %util が高い → ディスクがほぼ100%使われている → I/Oがボトルネック

# メモリ詳細
free -h               # 物理メモリ・スワップの使用量
# "buff/cache" が大きいのは正常（Linuxはメモリを積極的にキャッシュに使う）
# 重要なのは "available" が0に近づいていないか

cat /proc/meminfo     # カーネルが認識しているメモリの詳細
```

---

### 2. ログを使った原因特定フロー

#### 💡 journalctlの使いこなし
`journalctl` はsystemdが収集したすべてのログを検索できる。
「いつから」「どのサービスで」「何が起きたか」を絞り込むことで、障害原因を素早く特定できる。

```bash
# 時間を絞り込む
journalctl --since "2025-05-01 09:00" --until "2025-05-01 10:00"
journalctl --since "1 hour ago"
journalctl -b          # 今回の起動以降のログ（-b = boot）

# サービスを絞り込む
journalctl -u apache2 -n 50    # apache2 の直近50行
journalctl -u apache2 -f       # リアルタイム追跡

# 重要度で絞り込む
journalctl -p err              # エラー以上だけ（err, crit, alert, emerg）

# よくある障害のログパターン
grep -i "out of memory" /var/log/syslog    # OOMKiller（メモリ不足でプロセスが強制終了）
grep "No space left" /var/log/syslog       # ディスクフル
grep "segfault" /var/log/syslog            # セグメンテーション違反（プログラムのバグ）

# Apache のエラーログ確認
sudo tail -100 /var/log/apache2/error.log
sudo tail -f /var/log/apache2/error.log    # リアルタイム監視
```

---

### 3. 障害対応シミュレーション

#### 💡 「壊す練習」の重要性
本番で障害が起きてから初めて復旧手順を考えるのでは遅い。
仮想環境で意図的に障害を起こして復旧手順を体で覚えておくことが、
深夜の障害対応時に冷静に動ける唯一の準備になる。

**障害1：ディスクフル**
```bash
# 壊す: dd で大きなファイルを作ってディスクを埋める
dd if=/dev/zero of=/tmp/fillup bs=1M count=4096   # 4GB作成

# 確認: Apacheがログを書けなくなって落ちることを確認
curl http://localhost   # → 繋がらなくなる
sudo systemctl status apache2
sudo tail /var/log/apache2/error.log   # "No space left on device" が出る

# 復旧
rm /tmp/fillup
df -h           # 空きが戻ったことを確認
sudo systemctl start apache2
```

**障害2：Apache設定ミスによるサービスダウン**
```bash
# 壊す: apache2.conf に構文エラーを入れる
sudo bash -c 'echo "syntax_error_line" >> /etc/apache2/apache2.conf'
sudo systemctl reload apache2   # → エラーになる（Apacheは落ちない）

# 確認・修正
sudo apache2ctl configtest    # → 文法エラーの行番号が表示される
sudo vim /etc/apache2/apache2.conf   # 追加した行を削除

# 復旧
sudo apache2ctl configtest    # → Syntax OK
sudo systemctl reload apache2
```

**障害3：メモリ不足（OOMKiller）**
```bash
# 確認: OOMKillerが動いた痕跡を探す
dmesg | grep -i "oom"
grep -i "killed process" /var/log/syslog

# 対策: 不要なプロセスを止める・スワップを確認
free -h
sudo swapoff -a && sudo swapon -a   # スワップリセット
```

---

## 🛠️ ハンズオン演習

`hands-on/10_monitoring.sh` を完成させる（CPU・メモリ・ディスクを定期記録するスクリプト）。

---

## 📝 今週の課題

操作 + 思考の両方で答えること。

### 大問1. vmstat 1 10 を実行し、以下を答えよ

`vmstat 1 10` を実行し、以下を答えよ
   - `us`, `sy`, `wa`, `si`, `so` の意味をそれぞれ説明する
   - 「`wa` が常時30%を超えている」場合、次に何を確認するか（コマンド付きで答えよ）
   - 「`si`/`so` が0でない」場合、何を意味するか

### 大問2. hands-on/10_setup.sh を実行して高負荷状態を作り出し、以下を実施せよ

`hands-on/10_setup.sh` を実行して高負荷状態を作り出し、以下を実施せよ
   - `top` / `ps aux --sort=-%cpu` で原因プロセスを特定
   - プロセスを停止して負荷が下がることを `vmstat` で確認
   - 一連の手順を「障害対応レポート」として記録せよ（原因・対処・結果の3点）

### 大問3. ディスクフルを意図的に起こし、Apache が落ちることを確認してから復旧させよ。全手順をコマンド付きで記録せよ

ディスクフルを意図的に起こし、Apache が落ちることを確認してから復旧させよ。全手順をコマンド付きで記録せよ

### 大問4. Apache 設定ファイルに構文エラーを入れて systemctl reload した挙動を確認し、以下に答えよ

Apache 設定ファイルに構文エラーを入れて `systemctl reload` した挙動を確認し、以下に答えよ
   - Apache は落ちたか？
   - エラーの行番号をどのコマンドで特定したか
   - 復旧手順を順番通りに記録せよ

### 大問5. hands-on/10_monitoring.sh を参考に、以下の要件を追加した監視スクリプトを自力で書け

`hands-on/10_monitoring.sh` を参考に、以下の要件を追加した監視スクリプトを自力で書け
   - CPU・メモリ・ディスクを5分ごとに CSV に記録
   - ディスク使用率が 80% を超えたらアラートログにも記録
   - Apache が落ちていたらアラートログに記録

### 大問6. sudo grep -E "error|warn|crit" /var/log/apache2/error.log | tail -20 を実行し、エラーの種類と原因を分類して報告せよ

`sudo grep -E "error|warn|crit" /var/log/apache2/error.log | tail -20` を実行し、エラーの種類と原因を分類して報告せよ

### 大問7. 思考問題: 本番で「深夜2時に突然メモリ使用率が90%を超えたが、朝には正常に戻っていた」というアラートが来た。翌朝何を確認するか、手順を3つ答えよ

**思考問題:** 本番で「深夜2時に突然メモリ使用率が90%を超えたが、朝には正常に戻っていた」というアラートが来た。翌朝何を確認するか、手順を3つ答えよ