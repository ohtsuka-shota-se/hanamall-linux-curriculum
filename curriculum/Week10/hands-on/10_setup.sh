#!/bin/bash
# ============================================================
# 【HanaMall インフラ業務】Week10 環境セットアップ
# 「GWセール中に画像リサイズバッチが動いてサイトが重い」状態を再現する
# ============================================================
# ============================================================

set -e
echo "================================================"
echo " Week10 障害環境セットアップ"
echo " 「GWセール中：サイトが急に重くなった」"
echo "================================================"

# Apache が起動していなければ起動
echo ""
echo "【1】Apache の状態を確認..."
if ! systemctl is-active --quiet apache2 2>/dev/null; then
  sudo apt-get install -y apache2 -q 2>/dev/null || true
  sudo systemctl start apache2 2>/dev/null || true
  echo "✅ Apache を起動しました"
else
  echo "✅ Apache は起動済みです"
fi

# 【状況】画像リサイズバッチを模したCPU負荷プロセスを起動
echo ""
echo "【2】「画像リサイズバッチ」を模した高負荷プロセスを起動します..."

# バッチスクリプトを作成（CPU を消費し続ける）
sudo tee /usr/local/bin/hanamall_image_resize_batch.sh > /dev/null << 'BATCH'
#!/bin/bash
# HanaMall 画像リサイズバッチ（模擬）
# セール用バナー画像を大量処理しているつもり
echo "[$(date)] 画像リサイズバッチ開始" >> /var/log/hanamall_batch.log
while true; do
  # CPU を消費する処理（実際の画像変換の代わり）
  for i in $(seq 1 10000); do echo $i > /dev/null; done
done
BATCH
sudo chmod +x /usr/local/bin/hanamall_image_resize_batch.sh

# バックグラウンドで起動
nohup /usr/local/bin/hanamall_image_resize_batch.sh > /dev/null 2>&1 &
BATCH_PID=$!
echo $BATCH_PID > /tmp/week10_batch_pid.txt
echo "✅ バッチプロセス起動（PID: $BATCH_PID）"

# ディスク使用率の記録を開始（監視スクリプトの動作確認用）
echo ""
echo "【3】リソース記録の初期状態を作成..."
mkdir -p /var/log
echo "timestamp,cpu_usage_pct,mem_usage_pct,disk_usage_pct,load_avg_1m,apache_status" \
  > /var/log/hanamall_resource.csv
echo "✅ リソースCSV初期化完了"

# 少し待ってから状態表示
sleep 2

echo ""
echo "================================================"
echo " セットアップ完了！以下の状態になっています："
echo ""
echo "  ❌ CPU使用率  : 高負荷（画像リサイズバッチが動いています）"
echo "  ✅ Apache     : 起動中（ただし重い）"
echo "  ✅ ディスク   : 通常状態"
echo ""
echo " 佐藤さんからSlackが来ています："
echo " 「GWセール中なのにサイトが重いと苦情が来てます！」"
echo " 「何が起きてるか調べて原因を特定してください！」"
echo ""
echo " 現在のCPU状況（top 上位）:"
ps aux --sort=-%cpu | head -5
echo ""
echo " ※ バッチを手動停止する場合: kill \$(cat /tmp/week10_batch_pid.txt)"
echo "================================================"
