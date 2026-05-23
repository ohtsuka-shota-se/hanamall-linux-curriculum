#!/bin/bash
# ============================================================
# 【HanaMall インフラ業務】Week06 ハンズオン
# ミッション: SSH を安全に設定し、毎朝の手動作業を自動化せよ
# ============================================================
#
# --- Slack（佐藤さんより）---
# 田中さん、2つお願いがあります。
#
# 【依頼①】セキュリティ監査から指摘が来ました。
#  prod-web01 の SSH がパスワード認証のままです。
#  公開鍵認証のみに変更してください。
#  ※ 必ず鍵でログインできることを確認してから変更すること！
#
# 【依頼②】毎朝 9:00 に手動で /var/log/apache2/access.log の
#  行数を数えてSlackに報告している作業、自動化してください。
#  結果を /var/log/hanamall_daily.log に追記する形で。
#
# よろしくです！
# ============================================================

echo "================================================"
echo " HanaMall SSH セキュリティ強化 & cron 設定"
echo " 日時: $(date)"
echo "================================================"

echo ""
echo "【依頼①】SSH 公開鍵認証の設定手順"
echo ""
echo "--- Step1: 鍵ペアの生成 ---"
if [ ! -f ~/.ssh/id_ed25519 ]; then
  ssh-keygen -t ed25519 -C "hanamall-prod-$(date +%Y%m%d)" -N "" -f ~/.ssh/id_ed25519
  echo "✅ 鍵ペアを生成しました"
else
  echo "ℹ️  既存の鍵が見つかりました: ~/.ssh/id_ed25519"
fi
echo ""
echo "公開鍵（サーバーの ~/.ssh/authorized_keys に登録する内容）:"
cat ~/.ssh/id_ed25519.pub

echo ""
echo "--- Step2: ~/.ssh/config の設定例 ---"
cat << 'CONFIG'
# ~/.ssh/config に以下を追記する

Host prod-web01
    HostName 203.0.113.10
    User ubuntu
    IdentityFile ~/.ssh/id_ed25519
    Port 22

Host prod-db01
    HostName 10.0.0.20
    User ubuntu
    IdentityFile ~/.ssh/id_ed25519
    ProxyJump prod-web01   # prod-web01を経由してDBに接続（多段SSH）

CONFIG

echo "--- Step3: sshd_config のセキュア化 ---"
echo "以下の設定を /etc/ssh/sshd_config に適用してください:"
echo ""
cat << 'SSHD'
# 変更前に必ず別ターミナルで公開鍵ログインができることを確認！

PermitRootLogin no           # root への直接SSHを禁止
PasswordAuthentication no    # パスワード認証を無効化
MaxAuthTries 3               # 3回ミスで切断
ClientAliveInterval 300      # 5分無操作で切断

SSHD
echo "変更後: sudo systemctl restart sshd"

echo ""
echo "================================================"
echo "【依頼②】毎朝9時の自動レポートを cron に登録"
echo ""

# 自動レポートスクリプトを作成
REPORT_SCRIPT="/usr/local/bin/hanamall_daily_report.sh"
sudo tee "$REPORT_SCRIPT" > /dev/null << 'SCRIPT'
#!/bin/bash
# HanaMall 日次ログレポート（毎朝9時にcronで実行）

LOG_FILE="/var/log/hanamall_daily.log"
ACCESS_LOG="/var/log/apache2/access.log"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] === 日次レポート ===" >> "$LOG_FILE"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] アクセスログ行数: $(wc -l < "$ACCESS_LOG" 2>/dev/null || echo 0)" >> "$LOG_FILE"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] 5xxエラー件数: $(grep -c ' 5[0-9][0-9] ' "$ACCESS_LOG" 2>/dev/null || echo 0)" >> "$LOG_FILE"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] ディスク使用率: $(df / | tail -1 | awk '{print $5}')" >> "$LOG_FILE"
SCRIPT

sudo chmod +x "$REPORT_SCRIPT"
echo "✅ レポートスクリプトを作成: $REPORT_SCRIPT"

echo ""
echo "--- crontab への登録 ---"
echo "以下のコマンドで crontab を編集してください："
echo "  crontab -e"
echo ""
echo "追記する内容:"
echo "  # HanaMall 日次レポート（毎朝9時）"
echo "  0 9 * * * $REPORT_SCRIPT"
echo ""
echo "登録確認:"
echo "  crontab -l"
echo ""
echo "テスト実行:"
echo "  $REPORT_SCRIPT && cat /var/log/hanamall_daily.log"

echo ""
echo "--- テスト実行 ---"
bash "$REPORT_SCRIPT" 2>/dev/null || echo "（Apache がない環境では一部スキップ）"
echo "出力先確認:"
cat /var/log/hanamall_daily.log 2>/dev/null || echo "（/var/log/hanamall_daily.log に書き込まれます）"

echo ""
echo "================================================"
echo "【佐藤さんへの報告テンプレート】"
echo ""
echo "  ① SSH公開鍵認証の設定完了。authorized_keysに登録し"
echo "    PasswordAuthentication no を適用しました。"
echo "  ② 日次レポートを cron に登録しました（毎朝9時実行）。"
echo "    出力先: /var/log/hanamall_daily.log"
echo "================================================"
