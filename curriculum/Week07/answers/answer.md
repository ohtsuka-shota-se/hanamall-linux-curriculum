# Week07 課題 回答例・解説（スクリプト参考実装）

Week07 の課題は「cleanup.sh を自力で書く」こと。以下は参考実装例。
**必ず自分でゼロから書いてから**参照すること。

---

## 参考実装: cleanup.sh

```bash
#!/bin/bash
# ============================================================
# cleanup.sh - 古いログファイルを圧縮してアーカイブする
# 使い方: bash cleanup.sh <対象ディレクトリ>
# ============================================================
set -euo pipefail

# ===== 設定 =====
TARGET_DIR="${1:-/var/log/myapp}"
ARCHIVE_DIR="${TARGET_DIR}/archive"
LOG_FILE="/var/log/cleanup.log"
LOCK_FILE="/tmp/cleanup.lock"
DAYS=7
ARCHIVE_WARN_GB=1

# ===== ログ関数 =====
log() {
    local level="$1"
    shift
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$level] $*" | tee -a "$LOG_FILE"
}

# ===== 引数チェック =====
if [ $# -eq 0 ]; then
    echo "Usage: cleanup.sh <target_dir>" >&2
    exit 1
fi

# ===== ディレクトリ存在チェック =====
if [ ! -d "$TARGET_DIR" ]; then
    echo "Error: ディレクトリが存在しません: $TARGET_DIR" >&2
    exit 1
fi

# ===== 二重起動防止 =====
if [ -f "$LOCK_FILE" ]; then
    echo "ERROR: すでに実行中です (lock: $LOCK_FILE)" >&2
    exit 1
fi
touch "$LOCK_FILE"
trap 'rm -f "$LOCK_FILE"' EXIT

# ===== メイン処理 =====
log "INFO" "=== クリーンアップ開始: $TARGET_DIR ==="

mkdir -p "$ARCHIVE_DIR"

count=0
while IFS= read -r -d '' file; do
    log "INFO" "圧縮中: $(basename "$file")"
    gzip -c "$file" > "${ARCHIVE_DIR}/$(basename "$file").gz"
    rm -f "$file"
    ((count++))
done < <(find "$TARGET_DIR" -maxdepth 1 -name "*.log" -mtime +${DAYS} -print0)

log "INFO" "アーカイブ完了: ${count}ファイル"

# ===== アーカイブサイズ警告（挑戦要件） =====
archive_bytes=$(du -sb "$ARCHIVE_DIR" | awk '{print $1}')
warn_bytes=$(( ARCHIVE_WARN_GB * 1024 * 1024 * 1024 ))
if [ "$archive_bytes" -gt "$warn_bytes" ]; then
    log "WARN" "archive/ のサイズが ${ARCHIVE_WARN_GB}GB を超えています"
fi

log "INFO" "=== クリーンアップ完了 ==="
```

---

## 必須要件の達成確認

| 要件 | 対応箇所 |
|------|---------|
| 7日以上前のファイルを圧縮・移動 | `find -mtime +7` + `gzip` |
| タイムスタンプ付きログ記録 | `log()` 関数 |
| エラー時に終了コード1で終了 | `exit 1` |
| 二重起動防止 | `LOCK_FILE` + `trap` |
| 引数でディレクトリ指定 | `${1:-デフォルト値}` |
| アーカイブ1GB超で警告 | `du -sb` で比較 |

---

## セルフチェックの確認方法

```bash
# set -euo pipefail があるか
head -3 cleanup.sh

# ロックファイルが trap で解放されるか（スクリプト内で確認）
grep "trap" cleanup.sh

# 存在しないディレクトリを渡したとき
bash cleanup.sh /not/exist
# → Error: ディレクトリが存在しません

# 引数なしで実行
bash cleanup.sh
# → Usage: cleanup.sh <target_dir>
```
