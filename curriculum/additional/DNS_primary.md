# 🔍 プライマリDNSサーバー構築

## シナリオ

> HanaMallの社内サーバーが増え、IPアドレス管理が煩雑になってきた。`web01.hanamall.internal` のような名前でアクセスできる内部DNSを構築してほしい。— 佐藤

## 構成

| 項目 | 内容 |
|---|---|
| ソフトウェア | BIND9 |
| 役割 | hanamall.internal の権威DNS（プライマリ） |
| IPアドレス | 192.168.1.10 |

## 1. BINDインストール

```bash
sudo apt update
sudo apt install -y bind9 bind9utils bind9-doc
sudo systemctl enable named
sudo systemctl start named
```

## 2. フォワーダー設定（/etc/bind/named.conf.options）

```bash
sudo nano /etc/bind/named.conf.options
```

```
options {
    directory "/var/cache/bind";
    forwarders { 8.8.8.8; 8.8.4.4; };
    dnssec-validation auto;
    listen-on { any; };
    allow-query { any; };
};
```

## 3. ゾーン定義（/etc/bind/named.conf.local）

```bash
sudo nano /etc/bind/named.conf.local
```

```
zone "hanamall.internal" {
    type master;
    file "/etc/bind/zones/hanamall.internal.zone";
    allow-transfer { 192.168.1.11; };
};

zone "1.168.192.in-addr.arpa" {
    type master;
    file "/etc/bind/zones/1.168.192.rev";
    allow-transfer { 192.168.1.11; };
};
```

## 4. 正引きゾーンファイル

```bash
sudo mkdir -p /etc/bind/zones
sudo nano /etc/bind/zones/hanamall.internal.zone
```

```
$TTL 86400
@   IN  SOA ns1.hanamall.internal. admin.hanamall.internal. (
        2024010101  ; Serial
        3600        ; Refresh
        900         ; Retry
        604800      ; Expire
        86400 )     ; Minimum TTL

@       IN  NS  ns1.hanamall.internal.
@       IN  NS  ns2.hanamall.internal.

ns1     IN  A   192.168.1.10
ns2     IN  A   192.168.1.11
web01   IN  A   192.168.1.20
db01    IN  A   192.168.1.30
```

## 5. 逆引きゾーンファイル

```bash
sudo nano /etc/bind/zones/1.168.192.rev
```

```
$TTL 86400
@   IN  SOA ns1.hanamall.internal. admin.hanamall.internal. (
        2024010101 3600 900 604800 86400 )

@   IN  NS  ns1.hanamall.internal.
10  IN  PTR ns1.hanamall.internal.
11  IN  PTR ns2.hanamall.internal.
20  IN  PTR web01.hanamall.internal.
30  IN  PTR db01.hanamall.internal.
```

## 6. 検証・起動

```bash
sudo named-checkconf
sudo named-checkzone hanamall.internal /etc/bind/zones/hanamall.internal.zone
sudo named-checkzone 1.168.192.in-addr.arpa /etc/bind/zones/1.168.192.rev
sudo systemctl restart named
sudo systemctl status named
```

## 今週の課題

1. BIND9をインストールしてプライマリDNSを起動する
2. `hanamall.internal` の正引きゾーンを作成する（Aレコード 4件以上）
3. 逆引きゾーン（PTRレコード）を設定する
4. `named-checkconf` / `named-checkzone` でエラーがないことを確認する
5. `dig @192.168.1.10 web01.hanamall.internal` で正引きが成功することを確認する
