# ✅ Zabbix 動作確認・トラブルシューティング

## zabbix_get — サーバー側からエージェントに問い合わせ

Zabbix Server 側から Agent に直接メトリクスを取得するデバッグツール。

```bash
# zabbix_get のインストール（サーバー側）
sudo apt install -y zabbix-get

# エージェントからメトリクス取得
zabbix_get -s 192.168.1.20 -p 10050 -k system.hostname
zabbix_get -s 192.168.1.20 -p 10050 -k system.uname
zabbix_get -s 192.168.1.20 -p 10050 -k vm.memory.size[available]
zabbix_get -s 192.168.1.20 -p 10050 -k system.cpu.load[all,avg1]
zabbix_get -s 192.168.1.20 -p 10050 -k vfs.fs.size[/,pfree]
```

## ログ確認

```bash
# Zabbix Server ログ
sudo tail -f /var/log/zabbix/zabbix_server.log

# Zabbix Agent ログ（監視対象ホスト側）
sudo tail -f /var/log/zabbix/zabbix_agentd.log

# systemd ジャーナル
sudo journalctl -u zabbix-server -n 30
sudo journalctl -u zabbix-agent -n 30
```

## よくあるエラーと対処

### Get value from agent failed: ZBX_TCP_READ() failed

```bash
# Agent が起動していない → 起動する
sudo systemctl start zabbix-agent

# ファイアウォールで Port 10050 がブロックされている
sudo ufw allow 10050/tcp
sudo ufw status
```

### Cannot connect to the database

```bash
# MariaDB が起動していない
sudo systemctl status mariadb
sudo systemctl start mariadb

# DB 接続情報を確認
grep DBPassword /etc/zabbix/zabbix_server.conf
```

### DB 使用量の確認

```bash
sudo mysql -uzabbix -p -e "SELECT COUNT(*) FROM zabbix.history;" 2>/dev/null
sudo mysql -uzabbix -p -e "SELECT COUNT(*) FROM zabbix.trends;" 2>/dev/null
```

## サービス状態まとめ確認

```bash
for svc in zabbix-server zabbix-agent apache2 mariadb; do
  echo "--- $svc ---"
  systemctl is-active $svc
done
```

## 今週の課題

1. `zabbix_get` で監視対象ホストのメトリクスが取得できることを確認する
2. Zabbix Web UI でグラフが更新されていることを確認する
3. CPU 使用率が高い状態を意図的に作り（`stress` コマンドなど）、トリガーが発火することを確認する
4. アラートメール送信を設定する（メディアタイプ → ユーザーのメディア → アクション）
