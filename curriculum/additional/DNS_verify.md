# ✅ DNS動作確認・トラブルシューティング

## dig コマンドの基本

DNSの動作確認には `dig` が最も重要なツールです。

```bash
# 正引き（Aレコード）
dig web01.hanamall.internal

# 特定のDNSサーバーに問い合わせ
dig @192.168.1.10 web01.hanamall.internal

# IPアドレスのみ表示（+short）
dig +short web01.hanamall.internal

# 逆引き（PTRレコード）
dig -x 192.168.1.20

# NSレコード確認
dig hanamall.internal NS

# 全レコード表示
dig hanamall.internal ANY
```

## nslookup / host

```bash
nslookup web01.hanamall.internal 192.168.1.10
nslookup 192.168.1.20

host web01.hanamall.internal
host 192.168.1.20
```

## よくあるエラーと対処

### SERVFAIL — ゾーンファイル構文エラー

```bash
sudo named-checkzone hanamall.internal /etc/bind/zones/hanamall.internal.zone
sudo journalctl -u named -n 30
sudo systemctl restart named
```

### ゾーン転送が失敗 — ファイアウォール確認

```bash
sudo ufw allow 53/tcp
sudo ufw allow 53/udp
sudo ufw status
```

### クライアントのDNS設定

```bash
cat /etc/resolv.conf
# 以下を追加
# nameserver 192.168.1.10
# nameserver 192.168.1.11
# search hanamall.internal
```

## 今週の課題

1. `dig` で正引き・逆引きの両方が成功することを確認する
2. セカンダリDNSへの問い合わせでも同じ結果が返ることを確認する
3. クライアントの `/etc/resolv.conf` を設定し、名前でpingが通ることを確認する
4. 意図的にゾーンファイルにエラーを入れ、`named-checkzone` でエラーを検出する
