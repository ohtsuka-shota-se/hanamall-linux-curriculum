# Week08 課題 回答例・解説

## 課題1：ディスク使用量トップ10

```bash
du -sh /* 2>/dev/null | sort -rh | head -10
```

**出力例と「なぜそこが大きいか」の説明：**
```
4.5G  /var    ← ログ・パッケージキャッシュ・スプールが蓄積する
2.1G  /usr    ← インストール済みパッケージの実体
512M  /opt    ← サードパーティ製ソフトウェア
128M  /home   ← ユーザーのホームディレクトリ
```

**絞り込みの流れ：**
```bash
du -sh /var/* 2>/dev/null | sort -rh | head -10
# → /var/log が大きければ
du -sh /var/log/* 2>/dev/null | sort -rh | head -10
# → 原因ファイルを特定
```

---

## 課題2：ddでテストファイルを作成・削除してdfを確認

```bash
# 500MB のテストファイルを作成
dd if=/dev/zero of=/tmp/testfile bs=1M count=500 status=progress

# df で変化を確認
df -h /tmp   # → 500MB 増えている

# 削除
rm /tmp/testfile

# df で確認
df -h /tmp   # → 戻る（はず）
```

**「削除してもdfの数値が変わらない」場合の対処：**

`rm` でファイルを削除しても、そのファイルを **開いているプロセスがいる場合** は
ディスクの実体が解放されない（Linux の設計上の仕様）。

```bash
# 原因プロセスを特定する
sudo lsof | grep deleted
# 出力例：
# apache2  1234  www-data  5w  REG  ... /var/log/apache2/access.log (deleted)
# → apache2 (PID:1234) がまだ開いている

# 解決方法1：プロセスを再起動して閉じさせる
sudo systemctl restart apache2
df -h   # → 今度は減る

# 解決方法2：ファイルを空にする（プロセスを止めずに容量を解放）
> /var/log/apache2/access.log   # 中身だけ空にする（ファイルは残る）
```

**覚えておくべき原則：**
> `rm` はファイル名（参照）を削除するだけ。
> 実体（データブロック）はそのファイルへの参照がゼロになったとき初めて解放される。

---

## 課題3：LVMでボリューム拡張（手順）

VirtualBox に仮想ディスク（/dev/sdb）を追加した後：

```bash
# 1. 現状確認
lsblk
df -h /

# 2. 新ディスクを PV として登録
sudo pvcreate /dev/sdb
pvs   # → /dev/sdb が追加されている

# 3. VG に追加
sudo vgextend ubuntu-vg /dev/sdb
vgs   # → VFree が増えている

# 4. LV を拡張（空き全部を使う）
sudo lvextend -l +100%FREE /dev/ubuntu-vg/ubuntu-lv

# 5. ファイルシステムをリサイズ
sudo resize2fs /dev/ubuntu-vg/ubuntu-lv

# 6. 確認
df -h /   # → ルートの容量が増えている
```

**再起動後もマウントされているか確認：**
```bash
sudo reboot
df -h /mnt/data   # → マウントされていればOK
```

---

## 課題4：rsyncでバックアップ + `--delete` の注意点

```bash
# dry-run で確認してから実行
rsync -av --dry-run --delete /var/www/ /backup/www/
# → 問題なければ --dry-run を外す
rsync -av --delete /var/www/ /backup/www/
```

**`--delete` の意味と本番での注意点：**

`--delete` は「転送元にないファイルをバックアップ先でも削除する」オプション。
誤って本番ファイルを削除してしまったとき、
`--delete` 付きの rsync が動くとバックアップからも消えてしまう。

**本番環境での安全策：**
```bash
# 世代バックアップ（日付ディレクトリに分けて保存）
BACKUP_DIR="/backup/$(date +%Y%m%d)"
rsync -av /var/www/ "$BACKUP_DIR/"
# → --delete を使わず日次で別ディレクトリに保存する
```

---

## 課題5：思考問題 — バックアップ先がいっぱいになったら

**何が起きるか：**
バックアップスクリプトが `tar czf` を実行した瞬間に
「No space left on device」エラーが発生してスクリプトが終了する。
`set -e` を付けていれば途中でアーカイブが壊れた状態で終了し、
ロックファイルは `trap` で解放される。

**対策：**
```bash
# バックアップ実行前にディスク空き確認を入れる
AVAILABLE=$(df /backup | tail -1 | awk '{print $4}')   # KB単位
REQUIRED=524288   # 500MB = 500 * 1024 KB

if [ "$AVAILABLE" -lt "$REQUIRED" ]; then
  log "ERROR" "ディスク空き不足: ${AVAILABLE}KB < ${REQUIRED}KB"
  exit 1
fi
```

---

## よくある躓きポイント

**Q: `/etc/fstab` に追記したら再起動してもマウントされない**
A: UUID の確認と fstab の書式を確認する。
```bash
sudo blkid /dev/sdb1   # UUID を確認
sudo mount -a          # fstab を再読み込みしてエラーを確認
```

**Q: `resize2fs` でエラーが出る**
A: `lvextend` の後、ファイルシステムの種類を確認する。
xfs の場合は `resize2fs` ではなく `xfs_growfs /mnt/data` を使う。
