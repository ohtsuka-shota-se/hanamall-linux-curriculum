#!/bin/bash
# ============================================================
# 【HanaMall インフラ業務】Week10 ハンズオン
# ミッション: 「セール中に急にサイトが重くなった」障害を再現・解析せよ
# ============================================================
#
# --- Slack（佐藤さんより）---
# 田中さん！先週末のゴールデンウィークセール中に
# サイトが重くなる障害がありました。
# 原因は「画像リサイズのバッチ処理がセール中に動いてたから」
# だったんですが、今後のために：
#
# ① CPU/メモリ/ディスクを5分ごとにCSVに記録するスクリプトを作ってください
# ② 過去のログから「いつ重くなったか」を特定する練習をしてください
#
# リソース記録があれば次回は原因特定が早くなります！
# ============================================================

echo "================================================"
echo " HanaMall リソース監視スクリプト"
echo " 実行日時: $(date)"
echo "================================================"

CSV_FILE="/var/log/hanamall_resource.csv"
LOG_FILE="/var/log/hanamall_resource.log"

# CSVヘッダー（初回のみ）
if [ ! -f "$CSV_FILE" ]; then
  echo "timestamp,cpu_usage_pct,mem_usage_pct,disk_usage_pct,load_avg_1m,apache_status" > "$CSV_FILE"
  echo "✅ CSVファイルを作成: $CSV_FILE"
fi

echo ""
echo "【現在のリソース状況を取得・記録】"

TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# CPU使用率
CPU_IDLE=$(top -bn2 | grep "Cpu(s)" | tail -1 | awk '{print $8}' | tr -d '%id,' 2>/dev/null || echo "0")
CPU_USAGE=$(echo "100 - ${CPU_IDLE:-0}" | bc 2>/dev/null || echo "N/A")

# メモリ使用率
MEM_USAGE=$(free | awk '/^Mem:/{printf "%.1f", $3/$2*100}')

# ディスク使用率
DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | tr -d '%')

# ロードアベレージ（1分）
LOAD_AVG=$(awk '{print $1}' /proc/loadavg)

# Apache 状態
APACHE_STATUS=$(systemctl is-active apache2 2>/dev/null || echo "unknown")

# CSV に記録
echo "${TIMESTAMP},${CPU_USAGE},${MEM_USAGE},${DISK_USAGE},${LOAD_AVG},${APACHE_STATUS}" >> "$CSV_FILE"

echo "  CPU使用率    : ${CPU_USAGE}%"
echo "  メモリ使用率 : ${MEM_USAGE}%"
echo "  ディスク使用率: ${DISK_USAGE}%"
echo "  ロードアベレージ(1m): ${LOAD_AVG}"
echo "  Apache状態   : ${APACHE_STATUS}"
echo ""
echo "✅ CSVに記録しました: $CSV_FILE"

echo ""
echo "【障害シミュレーション: CPUを意図的に上げて観察する】"
echo "バックグラウンドで重い処理を起動（5秒後に自動停止）..."
# 複数のCPU負荷プロセスを短時間起動
for i in 1 2 3; do
  (for j in $(seq 1 100000); do echo $j > /dev/null; done) &
done
PIDS="$!"

sleep 2
echo "--- 負荷中のCPU状況 ---"
top -bn1 | head -5

sleep 3
kill $(jobs -p) 2>/dev/null || true
echo "✅ テストプロセスを停止しました"

echo ""
echo "【過去のリソース記録を確認】"
echo "--- 直近の記録（CSV）---"
tail -5 "$CSV_FILE"

echo ""
echo "================================================"
echo "【cron への登録（5分ごと）】"
echo ""
echo "  crontab -e"
echo "  追記: */5 * * * * /path/to/10_monitoring.sh >> /var/log/hanamall_monitor_cron.log 2>&1"
echo ""
echo "【グラフ確認のヒント】"
echo "  CSVをそのままExcelやGoogleスプレッドシートで開くとグラフが作れます。"
echo "  次のセールの前にベースラインを取っておきましょう！"
echo "================================================"
