# Week08 ｜ ストレージ・ディスク管理

## 🎯 今週の目標

## 🔗 前回（Week07）からの続き
バックアップスクリプトと healthcheck スクリプトが完成しました。
ただ、healthcheck が動き出す前に早速障害が来てしまいました…。
深夜のディスクフルを乗り越えてこそ、インフラエンジニアの真価が問われます。

- ディスク使用量を確認し、容量を圧迫している原因を特定できる
- パーティション追加・マウントができる
- LVMでボリュームを拡張できる

---

## 📖 今週のミッション（佐藤さんからのSlack）

```
佐藤 Sato  02:14  🌙
田中さん、起きてますか？

prod-web01 のディスクがフルになって
Apache が落ちました！監視アラートが大量に来てます 🚨

急ぎで以下を確認してください：
1. どこがディスクを使っているか特定
2. 不要なファイルを削除してサービスを復旧
3. 今後同じことが起きないよう対策も考えてください

自分は今出先で対応できません…よろしくお願いします 🙏
```

**あなたのミッション：** 深夜の「ディスクフル」障害に1人で対応し、復旧＋再発防止策を報告する。

---

## 📚 学習内容

### 1. ディスク容量確認

#### 💡 `df` と `du` の違い
- **`df`（disk free）**：ファイルシステム単位の使用量。マウントポイントごとの全体像が分かる。
- **`du`（disk usage）**：ディレクトリ・ファイル単位の使用量。「どこが使っているか」の特定に使う。

ディスクフルのトラブル対応は「`df` で全体確認 → `du` で原因ディレクトリ特定」の流れ。

```bash
df -h                           # マウント済みファイルシステムの使用量（-h = human readable）
df -h /var                      # 特定パスだけ確認

# ディスクを食っているディレクトリを特定するパターン
du -sh /* 2>/dev/null | sort -rh | head -10
# -s: サブディレクトリを再帰せず合計だけ表示
# -h: 人が読みやすい単位（MB, GB）
# sort -rh: サイズの大きい順

du -sh /var/* 2>/dev/null | sort -rh | head -10  # /varの中を調べる
du -sh /var/log/* 2>/dev/null | sort -rh          # /var/logの中を調べる
```

---

### 2. パーティションとマウント

#### 💡 パーティション・マウントとは
- **パーティション**：物理ディスクを論理的に分割したもの。`/dev/sda1`, `/dev/sda2` など。
- **ファイルシステム**：パーティションをフォーマットしたもの（ext4, xfs, etc）。OSが読み書きできる形式。
- **マウント**：ファイルシステムをディレクトリツリーの特定の場所（マウントポイント）に接続すること。

Linuxではすべてのストレージはマウントすることでアクセスできるようになる。
USBメモリを挿しても自動でマウントされるのはこの仕組みのおかげ。

```bash
lsblk                          # ブロックデバイス（ディスク）一覧と構造を表示
fdisk -l                       # パーティション詳細

# 新しいディスクにパーティションを作成
sudo fdisk /dev/sdb
# → n（新規）→ p（プライマリ）→ 1（番号）→ Enter（デフォルト）→ w（書き込み）

# フォーマット（ext4が最も一般的）
sudo mkfs.ext4 /dev/sdb1

# マウント（一時的）
sudo mkdir -p /mnt/data
sudo mount /dev/sdb1 /mnt/data

# 永続化：/etc/fstab に追記（再起動後も自動マウントされる）
# UUID で指定するのが推奨（デバイス名は変わることがある）
sudo blkid /dev/sdb1           # UUIDを確認
echo "UUID=xxxx  /mnt/data  ext4  defaults  0  2" | sudo tee -a /etc/fstab
sudo mount -a                  # fstabを再読み込みしてマウント確認
```

---

### 3. LVM（論理ボリューム管理）

#### 💡 LVMとは何か、なぜ使うのか
従来のパーティション管理では、「ディスクがいっぱいになったら物理的にディスクを交換する」しかなく、
サービスを止める必要があった。LVM（Logical Volume Manager）を使うと：
- 複数の物理ディスクを1つの仮想ディスクとして扱える
- サービスを止めずにオンラインでディスクを拡張できる
- スナップショット（瞬間バックアップ）が取れる

```
物理ディスク構成：
[物理ディスク /dev/sdb] + [物理ディスク /dev/sdc]
         ↓ pvcreate
[PV（Physical Volume）: /dev/sdb] [PV: /dev/sdc]
         ↓ vgcreate / vgextend
[VG（Volume Group）: ubuntu-vg ← PVをまとめた大きな池]
         ↓ lvcreate / lvextend
[LV（Logical Volume）: ubuntu-lv ← アプリが使うボリューム]
         ↓ mkfs / resize2fs
[ファイルシステム（ext4など）]
```

```bash
# LVM構成確認
pvs   # Physical Volume（物理ディスクの登録状況）
vgs   # Volume Group（VGの空き容量）
lvs   # Logical Volume（実際に使うボリューム一覧）

# 容量拡張の手順
sudo pvcreate /dev/sdc                            # 新ディスクをPVに登録
sudo vgextend ubuntu-vg /dev/sdc                  # VGに追加
sudo lvextend -l +100%FREE /dev/ubuntu-vg/ubuntu-lv  # LVを拡張
sudo resize2fs /dev/ubuntu-vg/ubuntu-lv           # ファイルシステムをリサイズ

# 確認
df -h /    # ルートの容量が増えたことを確認
```

---

### 4. rsync によるバックアップ

#### 💡 rsyncとcpの違い
`cp` は毎回すべてをコピーするが、`rsync` は「差分だけ同期する」ため高速。
`--delete` を付けると転送元で削除したファイルを転送先でも削除できる。
SSHを経由してリモートサーバーへのバックアップにも使える。

```bash
rsync -av --delete /var/www/ /backup/www/
# -a: アーカイブモード（パーミッション・タイムスタンプを保持）
# -v: 詳細表示
# --delete: 転送元にないファイルを転送先でも削除

# dry-run：実際には何もしない（実行前の確認に必須）
rsync -av --dry-run --delete /var/www/ /backup/www/

# SSH経由でリモートサーバーへ
rsync -avz -e ssh /var/www/ ubuntu@backup-server:/backup/www/
# -z: 転送時に圧縮（ネットワークが遅い環境で有効）
```

---

### 5. 削除してもディスクが空かない問題と lsof

#### 💡 「削除したのに df が変わらない」とき
ファイルを `rm` で削除しても `df` の使用量が減らないことがある。
これは **「プロセスがファイルを開いたまま（オープン中）」** のとき。

Linuxはファイルを開いているプロセスがいる限り、
`rm` しても実際のデータは消さない（ディスク上に残り続ける）。
プロセスが終了またはファイルを閉じたときに初めて領域が解放される。

```bash
# lsof（list open files）：どのプロセスがどのファイルを開いているか確認
sudo lsof | grep deleted          # 削除済みだがまだ開かれているファイルを探す

# 具体例：Apache がログを開いたまま、ログファイルを rm してしまった場合
sudo rm /var/log/apache2/access.log
df -h /var/log    # → 容量が減らない！

sudo lsof | grep "access.log"
# apache2  1234  www-data  5w  REG  ... /var/log/apache2/access.log (deleted)
# → apache2 (PID:1234) がまだ開いている

# 解決方法1：Apache を再起動してファイルを閉じさせる
sudo systemctl restart apache2
df -h /var/log    # → 今度は減る

# 解決方法2：ファイルを削除せず中身だけ空にする（ログローテーションの考え方）
> /var/log/apache2/access.log   # ファイルは残したまま中身を空にする
```

---

## 📝 今週の課題

### 大問1. df -h と du -sh /* 2>/dev/null | sort -rh | head -10 を実行し、「最もディスクを使っているディレクトリとその原因」を特定して報告せよ。さらに /var/log 配下を掘り下げて「最も大きいログファイル」を特定せよ

`df -h` と `du -sh /* 2>/dev/null | sort -rh | head -10` を実行し、「最もディスクを使っているディレクトリとその原因」を特定して報告せよ。さらに `/var/log` 配下を掘り下げて「最も大きいログファイル」を特定せよ

### 大問2. dd で 500MB のテストファイルを作成・削除して df の変化を確認せよ。「削除したのに df の数値が変わらない」場合 を再現して原因（lsof | grep deleted）を特定し、解決方法を記録せよ

`dd` で 500MB のテストファイルを作成・削除して `df` の変化を確認せよ。**「削除したのに df の数値が変わらない」場合** を再現して原因（`lsof | grep deleted`）を特定し、解決方法を記録せよ

### 大問3. 以下の手順でディスクフル障害を再現して復旧させ、全手順をコマンド付きで記録せよ

以下の手順でディスクフル障害を再現して復旧させ、全手順をコマンド付きで記録せよ
   ```
   手順1: dd でディスクをほぼ埋める（残り 50MB 程度に）
   手順2: Apache がエラーになることを確認
   手順3: 原因のファイルを特定して削除
   手順4: Apache を復旧
   手順5: df で空き確認
   ```

### 大問4. VirtualBox に仮想ディスクを追加して以下を実施せよ

VirtualBox に仮想ディスクを追加して以下を実施せよ
   - `fdisk` でパーティション作成
   - `mkfs.ext4` でフォーマット
   - `/mnt/data` にマウント
   - `/etc/fstab` に追記して永続化（UUID 指定）
   - `sudo mount -a` でエラーがないことを確認

### 大問5. rsync -av --dry-run --delete /var/www/ /backup/www/ を実行して内容を確認し、問題なければ --dry-run を外して実行せよ。--delete の意味と「本番で使うときの注意点」を答えよ

`rsync -av --dry-run --delete /var/www/ /backup/www/` を実行して内容を確認し、問題なければ `--dry-run` を外して実行せよ。`--delete` の意味と「本番で使うときの注意点」を答えよ

### 大問6. 現在のディスク使用率が何%になったらアラートを出すべきか考え、Week07 で作った healthcheck.sh のディスク閾値を調整せよ。閾値の根拠も説明すること

現在のディスク使用率が何%になったらアラートを出すべきか考え、Week07 で作った `healthcheck.sh` のディスク閾値を調整せよ。閾値の根拠も説明すること

### 大問7. 思考問題: /var/log を別パーティションに切り出す（独立したマウントポイントにする）メリットを2つ答えよ。また、Week08 の深夜の障害がなぜ起きたのか・どう防ぐべきだったかを答えよ

**思考問題:** `/var/log` を別パーティションに切り出す（独立したマウントポイントにする）メリットを2つ答えよ。また、Week08 の深夜の障害がなぜ起きたのか・どう防ぐべきだったかを答えよ