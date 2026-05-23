#!/bin/bash
# ============================================================
# 【HanaMall インフラ業務】Week07 ハンズオン（提出課題）
# ミッション: 本番Webサーバーの自動バックアップスクリプトを作れ
# ============================================================
#
# --- Slack（佐藤さんより）---
# 田中さん、実は今まで本番サーバーのバックアップを
# 手動でやってたんですよね（恥ずかしながら）。
#
# 以下の要件でバックアップスクリプトを作ってください。
# これで深夜に作業しなくて済みます！
#
# 【要件】
# ① /var/www/ 配下を毎晩2時にバックアップ
# ② バックアップ先: /backup/hanamall/
# ③ 7日分の世代管理（古いものは自動削除）
# ④ 実行ログを /var/log/hanamall_backup.log に記録
# ⑤ 二重起動しないようロックファイルを使う
# ⑥ 失敗したら異常終了コード(1)を返す
#
# これが実際に動いたら cron に登録しましょう！
# ============================================================

set -euo pipefail

# ===== 設定 =====
readonly BACKUP_SRC="/var/www"
readonly BACKUP_DEST="/backup/hanamall"
readonly LOG_FILE="/var/log/hanamall_backup.log"
readonly RETENTION_DAYS=7
readonly LOCK_FILE="/tmp/hanamall_backup.lock"

# ===== ユーティリティ =====
log() {
  local level="$1"; shift
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$level] $*" | tee -a "$LOG_FILE"
}

# ===== エラーハンドリング =====
trap 'log "ERROR" "スクリプトが異常終了しました (line: $LINENO)"; rm -f "$LOCK_FILE"; exit 1' ERR
trap 'rm -f "$LOCK_FILE"' EXIT

# ===== 二重起動防止 =====
if [ -f "$LOCK_FILE" ]; then
  log "WARN" "すでにバックアップが実行中です（$LOCK_FILE が存在）。スキップします。"
  exit 0
fi
touch "$LOCK_FILE"

# ===== メイン処理 =====
log "INFO" "===== HanaMall バックアップ開始 ====="
log "INFO" "バックアップ元: $BACKUP_SRC"
log "INFO" "バックアップ先: $BACKUP_DEST"

# バックアップ先ディレクトリ確保
mkdir -p "$BACKUP_DEST"

# バックアップ元の存在確認
if [ ! -d "$BACKUP_SRC" ]; then
  log "ERROR" "バックアップ元が存在しません: $BACKUP_SRC"
  exit 1
fi

# バックアップ実行（タイムスタンプ付きディレクトリ名）
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
ARCHIVE_FILE="${BACKUP_DEST}/hanamall_www_${TIMESTAMP}.tar.gz"

log "INFO" "アーカイブ作成中: $ARCHIVE_FILE"
tar czf "$ARCHIVE_FILE" -C "$(dirname "$BACKUP_SRC")" "$(basename "$BACKUP_SRC")" 2>/dev/null \
  || { log "ERROR" "アーカイブ作成に失敗しました"; exit 1; }

FILESIZE=$(du -sh "$ARCHIVE_FILE" | cut -f1)
log "INFO" "アーカイブ作成完了: $ARCHIVE_FILE ($FILESIZE)"

# 世代管理（7日以上前のファイルを削除）
log "INFO" "${RETENTION_DAYS}日以上前のバックアップを削除..."
OLD_COUNT=$(find "$BACKUP_DEST" -name "hanamall_www_*.tar.gz" -mtime +$RETENTION_DAYS | wc -l)
find "$BACKUP_DEST" -name "hanamall_www_*.tar.gz" -mtime +$RETENTION_DAYS -delete
log "INFO" "削除済み: ${OLD_COUNT}件"

# 残存バックアップ一覧
REMAIN_COUNT=$(find "$BACKUP_DEST" -name "hanamall_www_*.tar.gz" | wc -l)
log "INFO" "残存バックアップ: ${REMAIN_COUNT}件"
find "$BACKUP_DEST" -name "hanamall_www_*.tar.gz" | sort | while read -r f; do
  log "INFO" "  $(basename "$f") ($(du -sh "$f" | cut -f1))"
done

log "INFO" "===== HanaMall バックアップ完了 ====="

echo ""
echo "✅ バックアップ完了！cron に登録する場合："
echo "   crontab -e"
echo "   0 2 * * * /usr/local/bin/hanamall_backup.sh"
