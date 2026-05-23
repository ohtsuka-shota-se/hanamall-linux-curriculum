#!/bin/bash
# ============================================================
# 【HanaMall インフラ業務】Week09 ハンズオン
# ミッション: Apache のバージョンを固定し、
#             監視スクリプトをサービス化せよ
# ============================================================
#
# --- Slack（佐藤さんより）---
# 田中さん、今週2つ依頼があります。
#
# 【依頼①】先週 Apache が勝手にアップデートされて
#  設定が飛んだ事故がありました（自分のときです…）。
#  本番サーバーの Apache バージョンを固定してください。
#
# 【依頼②】Week07 で作った healthcheck スクリプト、
#  毎回 cron から直接呼ぶより systemd のサービスとして
#  登録したほうが管理しやすいです。
#  サービス化して「障害時に自動再起動」もつけてください。
# ============================================================

echo "================================================"
echo " HanaMall パッケージ管理 & systemd サービス化"
echo " 日時: $(date)"
echo "================================================"

echo ""
echo "【依頼①】Apache バージョン固定"
echo ""
echo "--- 現在のApacheバージョン ---"
apache2 -v 2>/dev/null | head -1 || echo "（Apache未インストール）"

echo ""
echo "--- インストール可能なバージョン一覧 ---"
apt-cache policy apache2 2>/dev/null | head -10 || echo "（apt情報なし）"

echo ""
echo "--- バージョンを固定する ---"
if command -v apache2 &>/dev/null; then
  sudo apt-mark hold apache2 apache2-bin apache2-data
  echo "✅ Apache バージョンを固定しました"
  echo ""
  echo "固定確認:"
  apt-mark showhold
else
  echo "（演習: 実際の環境で 'sudo apt-mark hold apache2' を実行してください）"
fi

echo ""
echo "================================================"
echo "【依頼②】healthcheck スクリプトを systemd サービス化"
echo ""

HEALTHCHECK_SCRIPT="/usr/local/bin/hanamall_healthcheck.sh"

# healthcheck スクリプトが Week07 で作成済みか確認
if [ ! -f "$HEALTHCHECK_SCRIPT" ]; then
  echo "ℹ️  healthcheck スクリプトがないため、簡易版を作成します"
  sudo tee "$HEALTHCHECK_SCRIPT" > /dev/null << 'SCRIPT'
#!/bin/bash
# HanaMall ヘルスチェック（簡易版）
LOG="/var/log/hanamall_healthcheck.log"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] チェック実行中..." >> "$LOG"
systemctl is-active --quiet apache2 \
  && echo "[$(date '+%Y-%m-%d %H:%M:%S')] [OK] Apache: 起動中" >> "$LOG" \
  || echo "[$(date '+%Y-%m-%d %H:%M:%S')] [ALERT] Apache: 停止中！" >> "$LOG"
sleep 300  # 5分待機して繰り返す
SCRIPT
  sudo chmod +x "$HEALTHCHECK_SCRIPT"
fi
echo "✅ スクリプト: $HEALTHCHECK_SCRIPT"

# systemd Unit ファイルを作成
SERVICE_FILE="/etc/systemd/system/hanamall-healthcheck.service"
sudo tee "$SERVICE_FILE" > /dev/null << 'UNIT'
[Unit]
Description=HanaMall Health Check Service
# ネットワークが使えるようになってから起動する
After=network.target apache2.service

[Service]
Type=simple
User=root
ExecStart=/usr/local/bin/hanamall_healthcheck.sh
# 異常終了したら5秒後に自動再起動
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
UNIT

echo "✅ Unit ファイル作成: $SERVICE_FILE"
echo ""
echo "--- サービスの有効化と起動 ---"
sudo systemctl daemon-reload
sudo systemctl enable hanamall-healthcheck.service
echo "✅ 自動起動を有効化しました"

echo ""
echo "--- サービス状態確認 ---"
sudo systemctl status hanamall-healthcheck.service --no-pager 2>/dev/null || true

echo ""
echo "--- ログ確認コマンド ---"
echo "  journalctl -u hanamall-healthcheck -f   # リアルタイム"
echo "  journalctl -u hanamall-healthcheck -n 20  # 直近20行"

echo ""
echo "================================================"
echo "【佐藤さんへの報告テンプレート】"
echo ""
echo "  ① Apache バージョンを固定しました（apt-mark hold）"
echo "     バージョン: $(apache2 -v 2>/dev/null | grep 'Server version' | awk '{print $3}' || echo '未確認')"
echo "  ② healthcheck を systemd サービスとして登録しました"
echo "     サービス名: hanamall-healthcheck"
echo "     自動起動: 有効"
echo "     障害時自動再起動: 有効（5秒後）"
echo "================================================"
