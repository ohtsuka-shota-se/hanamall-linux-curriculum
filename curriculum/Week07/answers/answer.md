# Week07 課題 回答例・解説

## 課題：ログクリーンアップスクリプト（必須要件）

```bash
#!/bin/bash
set -euo pipefail

# ===== 設定 =====
TARGET_DIR="${1:-/var/log/myapp}"
ARCHIVE_DIR="${TARGET_DIR}/archive"
LOG_FILE="/var/log/cleanup.log"
RETENTION_DAYS=7
LOCK_FILE="/tmp/cleanup.lock"

# ===== ログ関数 =====
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$1] $2" | tee -a "$LOG_FILE"
}

# ===== エラーハンドリング =====
trap 'log "ERROR" "異常終了しました (line: $LINENO)"; rm -f "$LOCK_FILE"; exit 1' ERR
trap 'rm -f "$LOCK_FILE"' EXIT

# ===== 引数チェック =====
if [ -z "${1:-}" ]; then
  echo "Usage: $0 <target_dir>" >&2
  exit 1
fi

if [ ! -d "$TARGET_DIR" ]; then
  echo "Error: ディレクトリが存在しません: $TARGET_DIR" >&2
  exit 1
fi

# ===== 二重起動防止 =====
if [ -f "$LOCK_FILE" ]; then
  log "ERROR" "すでに実行中です"
  exit 1
fi
touch "$LOCK_FILE"

# ===== メイン処理 =====
log "INFO" "=== クリーンアップ開始: $TARGET_DIR ==="
mkdir -p "$ARCHIVE_DIR"

ARCHIVED=0
while IFS= read -r -d '' file; do
  filename=$(basename "$file")
  log "INFO" "圧縮中: $filename"
  gzip -c "$file" > "${ARCHIVE_DIR}/${filename}.gz"
  rm -f "$file"
  ARCHIVED=$((ARCHIVED + 1))
done < <(find "$TARGET_DIR" -maxdepth 1 -name "*.log" -mtime +$RETENTION_DAYS -print0 2>/dev/null)

log "INFO" "アーカイブ完了: ${ARCHIVED}ファイル"
log "INFO" "=== クリーンアップ完了 ==="
```

---

## ポイント解説

**`while IFS= read -r -d ''` の書き方について：**
```bash
# NG：スペースを含むファイル名が壊れる
for file in $(find ...); do ...

# OK：ヌル文字区切りで安全に処理
while IFS= read -r -d '' file; do ...
done < <(find ... -print0)
```

**`trap` の2行の使い分け：**
```bash
trap 'log "ERROR" "..."; rm -f "$LOCK_FILE"; exit 1' ERR   # エラー時
trap 'rm -f "$LOCK_FILE"' EXIT                              # 正常終了時も含む
```
`EXIT` トラップは正常・異常問わず必ずロックを解放する。
`ERR` トラップはエラーログを書いてから終了させる役割。

---

## 挑戦要件の実装例

**挑戦5：引数でディレクトリ指定（デフォルト値あり）**
```bash
TARGET_DIR="${1:-/var/log/myapp}"   # 引数がなければデフォルト値を使う
```

**挑戦6：archiveが1GBを超えたら警告**
```bash
ARCHIVE_SIZE=$(du -sb "$ARCHIVE_DIR" 2>/dev/null | cut -f1 || echo 0)
if [ "$ARCHIVE_SIZE" -gt $((1024 * 1024 * 1024)) ]; then
  log "WARN" "archive ディレクトリが 1GB を超えています: $(du -sh "$ARCHIVE_DIR" | cut -f1)"
fi
```

**挑戦7：実行時間をログに記録**
```bash
START_TIME=$(date +%s)
# ...処理...
END_TIME=$(date +%s)
ELAPSED=$((END_TIME - START_TIME))
log "INFO" "実行時間: ${ELAPSED}秒"
```

---

## よくある躓きポイント

**Q: `set -e` をつけたら意図しないところで終了してしまう**
A: `grep` や `find` はマッチなしで終了コード1を返すことがある。
```bash
# NG：grepがマッチなしで終了コード1 → スクリプトが止まる
grep "error" /var/log/syslog

# OK：|| true を付けてエラーを無視する
grep "error" /var/log/syslog || true
```

**Q: ロックファイルが残ってしまい次回実行できない**
A: スクリプトが強制終了（kill -9）された場合は `trap` が動かないためロックが残る。
```bash
rm -f /tmp/cleanup.lock   # 手動で削除
```
本番ではロックファイルの作成時刻も確認して「古すぎるロックは無視する」処理を入れることもある。
