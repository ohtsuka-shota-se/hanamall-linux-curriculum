#!/bin/bash
# ============================================================
# 【HanaMall インフラ業務】Week08 ハンズオン
# ミッション: 深夜の「ディスクフル」障害を再現して復旧手順を確立せよ
# ============================================================
#
# --- Slack（佐藤さん、深夜2:14）---
# 田中さん、起きてますか？
# prod-web01 のディスクがフルになって Apache が落ちました！
# 監視アラートが大量に来てます。
#
# 急ぎで以下を確認してください：
# 1. どこがディスクを使っているか特定
# 2. 不要なファイルを削除してサービスを復旧
# 3. 今後同じことが起きないよう対策も考えてください
#
# よろしくお願いします！（自分は今出先で対応できません…）
# ============================================================

echo "================================================"
echo " HanaMall ディスクフル障害 対応手順"
echo " 対応開始: $(date)"
echo "================================================"

echo ""
echo "【Step1】ディスク使用状況の全体把握（まず状況確認）"
echo "--- df -h: マウント済みファイルシステムの使用量 ---"
df -h

echo ""
echo "【Step2】どのディレクトリが容量を使っているか特定"
echo "--- ルート直下のサイズランキング ---"
sudo du -sh /* 2>/dev/null | sort -rh | head -10

echo ""
echo "--- /var 配下を掘り下げ ---"
sudo du -sh /var/* 2>/dev/null | sort -rh | head -10

echo ""
echo "--- /var/log 配下（ログが膨らんでいることが多い）---"
sudo du -sh /var/log/* 2>/dev/null | sort -rh | head -10

echo ""
echo "【Step3】ディスクフル状況を再現する（演習）"
echo "⚠️  以下は演習用です。本番では絶対やらないこと！"
echo ""
echo "500MBのダミーファイルを /tmp に作成..."
dd if=/dev/zero of=/tmp/dummy_large_file bs=1M count=500 status=progress 2>&1 || true

echo ""
echo "作成後のディスク状況:"
df -h /tmp

echo ""
echo "【Step4】不要ファイルの削除と復旧"
echo ""
echo "--- 削除候補の確認（古いログ・一時ファイル）---"
echo "7日以上前のログファイル:"
find /var/log -name "*.gz" -mtime +7 2>/dev/null | head -10 \
  || echo "（対象なし）"

echo ""
echo "--- 演習用ダミーファイルを削除 ---"
rm -f /tmp/dummy_large_file
echo "✅ 削除完了"

echo ""
echo "削除後のディスク状況:"
df -h /tmp

echo ""
echo "【Step5】Apache の状態確認と再起動"
echo "--- Apache 状態 ---"
systemctl is-active apache2 2>/dev/null && echo "✅ Apache: 起動中" \
  || { echo "❌ Apache: 停止中 → 再起動します"; sudo systemctl start apache2 2>/dev/null || echo "（Apache未インストール）"; }

echo ""
echo "【Step6】今後の対策（佐藤さんへの提案）"
cat << 'PROPOSAL'
================================================
  再発防止策の提案

  1. logrotate の設定を強化する
     → /etc/logrotate.d/apache2 で daily・7日保持に設定

  2. Week07 の監視スクリプトで「ディスク80%超」を検知する
     → アラートをより早く出せるようにする

  3. /var/log を別パーティション・LVMに切り出す
     → ログがフルになってもルートパーティションに影響しない
================================================
PROPOSAL

echo ""
echo "================================================"
echo "【佐藤さんへの障害対応報告（テンプレ）】"
echo ""
echo "  障害対応完了しました。"
echo "  原因: /var/log 配下のログが肥大化"
echo "  対応: 古いログファイルを削除し Apache を再起動"
echo "  現在のディスク使用率: $(df / | tail -1 | awk '{print $5}')"
echo "  再発防止: logrotate 強化・監視スクリプトの閾値調整を実施します"
echo "================================================"
