# 🖥️ Zabbix Agent 設定（監視対象ホスト）

## 概要

監視対象サーバー（web01, db01 など）に Zabbix Agent をインストールします。
Agent が Zabbix Server からのポーリングに応答して、メトリクスを収集・送信します。

## 1. Zabbix リポジトリ追加 + Agent インストール

```bash
# リポジトリ追加（Zabbixサーバーと同じ手順）
wget https://repo.zabbix.com/zabbix/6.4/ubuntu/pool/main/z/zabbix-release/zabbix-release_6.4-1+ubuntu22.04_all.deb
sudo dpkg -i zabbix-release_6.4-1+ubuntu22.04_all.deb
sudo apt update
sudo apt install -y zabbix-agent
```

## 2. zabbix_agentd.conf の設定

```bash
sudo nano /etc/zabbix/zabbix_agentd.conf
```

```
# Zabbix Server の IP アドレス（ポーリング許可元）
Server=192.168.1.100

# アクティブチェック送信先
ServerActive=192.168.1.100

# このホストの識別名（Zabbix Web UI に表示される名前と一致させる）
Hostname=web01
```

## 3. Agent 起動

```bash
sudo systemctl enable zabbix-agent
sudo systemctl start zabbix-agent
sudo systemctl status zabbix-agent
```

## 4. ファイアウォール設定

```bash
# Zabbix Server からのポーリング用ポートを開放
sudo ufw allow from 192.168.1.100 to any port 10050
sudo ufw status
```

## 5. Agent の動作確認（Agent ホスト側）

```bash
# Agent デーモンが起動しているか確認
sudo zabbix_agentd -t system.hostname
sudo zabbix_agentd -t system.uname
sudo zabbix_agentd -t vm.memory.size[available]
```

## 6. Zabbix Web UI でホスト登録

1. Web UI → **設定 → ホスト → ホストの作成**
2. ホスト名: `web01`（zabbix_agentd.conf の Hostname と一致させる）
3. グループ: `Linux servers`
4. インターフェース: エージェント、IPアドレス `192.168.1.20`、ポート `10050`
5. テンプレート: `Linux by Zabbix agent` を適用

## 今週の課題

1. 監視対象ホストに Zabbix Agent をインストールする
2. `zabbix_agentd.conf` の Server/Hostname を正しく設定する
3. `sudo systemctl status zabbix-agent` で active を確認する
4. Zabbix Web UI でホストを登録し、監視が開始されることを確認する
5. ホストのステータスが「緑（正常）」になることを確認する
