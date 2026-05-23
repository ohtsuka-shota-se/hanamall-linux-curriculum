#!/bin/bash
# ============================================================
# 【HanaMall インフラ業務】Week07 ハンズオン
# ミッション: HanaMall の死活監視スクリプトを作れ
# ============================================================
#
# --- Slack（佐藤さんより）---
# 先週末に Apache が落ちてたのに誰も気づかなくて、
# 2時間売上が止まってました…。
#
# 5分ごとに監視して、異常があれば /var/log/hanamall_alert.log に
# 記録するスクリプトを作ってください。
# チェック項目：
# - Apache が起動しているか
# - http://localhost が 200 を返すか
# - ディスク使用率が 80% 未満か
# - メモリ使用率が 90% 未満か
# ============================================================

set -euo pipefail

readonly LOG_FILE="/var/log/hanamall_healthcheck.log"
readonly ALERT_FILE="/var/log/hanamall_alert.log"
readonly DISK_THRESHOLD=80
readonly MEM_THRESHOLD=90

log()   { echo "[$(date '+%Y-%m-%d %H:%M:%S')] [INFO]  $*" >> "$LOG_FILE"; }
alert() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] [ALERT] $*" | tee -a "$ALERT_FILE" >> "$LOG_FILE"; }
ok()    { echo "[$(date '+%Y-%m-%d %H:%M:%S')] [OK]    $*" >> "$LOG_FILE"; }

log "--- HanaMall ヘルスチェック開始 ---"
ALERT_COUNT=0

# ① Apache 死活確認
if systemctl is-active --quiet apache2 2>/dev/null; then
  ok "Apache: 起動中"
else
  alert "Apache が停止しています！ → sudo systemctl start apache2"
  ALERT_COUNT=$((ALERT_COUNT + 1))
fi

# ② HTTP レスポンス確認
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
  ok "HTTP レスポンス: $HTTP_CODE"
else
  alert "HTTP レスポンス異常: $HTTP_CODE (期待値: 200)"
  ALERT_COUNT=$((ALERT_COUNT + 1))
fi

# ③ ディスク使用率チェック
DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | tr -d '%')
if [ "$DISK_USAGE" -lt "$DISK_THRESHOLD" ]; then
  ok "ディスク使用率: ${DISK_USAGE}% (閾値: ${DISK_THRESHOLD}%)"
else
  alert "ディスク使用率が高すぎます: ${DISK_USAGE}% >= ${DISK_THRESHOLD}%"
  ALERT_COUNT=$((ALERT_COUNT + 1))
fi

# ④ メモリ使用率チェック
MEM_USAGE=$(free | awk '/^Mem:/{printf "%.0f", $3/$2*100}')
if [ "$MEM_USAGE" -lt "$MEM_THRESHOLD" ]; then
  ok "メモリ使用率: ${MEM_USAGE}% (閾値: ${MEM_THRESHOLD}%)"
else
  alert "メモリ使用率が高すぎます: ${MEM_USAGE}% >= ${MEM_THRESHOLD}%"
  ALERT_COUNT=$((ALERT_COUNT + 1))
fi

# サマリ
if [ "$ALERT_COUNT" -eq 0 ]; then
  log "--- 全チェック正常 (0件のアラート) ---"
else
  alert "--- $ALERT_COUNT 件のアラートが発生しています！ ---"
fi

# 画面にも出力
cat "$LOG_FILE" | grep "$(date '+%Y-%m-%d')" | tail -10
