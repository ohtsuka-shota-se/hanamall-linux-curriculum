# 🔁 セカンダリDNS構築（ゾーン転送）

## 概要

プライマリDNSからゾーン情報を自動転送するセカンダリDNSを構築します。
プライマリが落ちても名前解決を継続できる冗長構成にします。

| 項目 | 内容 |
|---|---|
| ソフトウェア | BIND9（スレーブ） |
| IPアドレス | 192.168.1.11 |
| ゾーン転送元 | 192.168.1.10（プライマリ） |

## 1. BINDインストール（セカンダリ側）

```bash
sudo apt update
sudo apt install -y bind9 bind9utils
sudo systemctl enable named
```

## 2. スレーブゾーン設定（/etc/bind/named.conf.local）

```bash
sudo nano /etc/bind/named.conf.local
```

```
zone "hanamall.internal" {
    type slave;
    file "/var/cache/bind/hanamall.internal.zone";
    masters { 192.168.1.10; };
};

zone "1.168.192.in-addr.arpa" {
    type slave;
    file "/var/cache/bind/1.168.192.rev";
    masters { 192.168.1.10; };
};
```

## 3. ゾーン転送の確認

```bash
sudo systemctl restart named

# 転送ログを確認
sudo journalctl -u named -n 20

# ゾーンファイルが作成されたか確認
ls -la /var/cache/bind/
```

## 4. レコード追加時のシリアル番号更新

ゾーンファイルを更新する際は **シリアル番号を必ずインクリメント** すること。セカンダリへの自動反映はこの値を比較して行われる。

```bash
# プライマリ側でゾーンファイルを編集
sudo nano /etc/bind/zones/hanamall.internal.zone
# → Serial を 2024010101 → 2024010102 に変更
# → 新しいAレコードを追加

sudo named-checkzone hanamall.internal /etc/bind/zones/hanamall.internal.zone
sudo rndc reload hanamall.internal
```

## 今週の課題

1. セカンダリDNSにBIND9をインストールし、スレーブゾーンを設定する
2. プライマリからゾーン転送が成功することを確認する（`ls /var/cache/bind/`）
3. セカンダリDNSへの問い合わせで同じ結果が返ることを確認する
4. プライマリでレコードを追加・シリアル番号更新後、セカンダリに反映されることを確認する
