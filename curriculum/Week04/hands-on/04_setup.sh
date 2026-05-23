#!/bin/bash
# ============================================================
# 【HanaMall インフラ業務】Week04 環境セットアップ
# 「新しく立てたWebサーバーが外から繋がらない」状態を再現する
# ============================================================
# このスクリプトを先に実行してから 04_network.sh に取り組むこと
# ============================================================

set -e
echo "================================================"
echo " Week04 障害環境セットアップ"
echo " 「prod-web02：Apacheは動いているが外から繋がらない」"
echo "================================================"

# Apache インストール・起動
echo ""
echo "【1】Apache をインストール・起動します..."
sudo apt-get update -q && sudo apt-get install -y apache2 -q
sudo systemctl enable apache2
sudo systemctl start apache2
echo "✅ Apache 起動完了"

# デフォルトページを HanaMall 用に差し替え
sudo tee /var/www/html/index.html > /dev/null << 'HTML'
<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8"><title>HanaMall - 商品ページ</title></head>
<body>
  <h1>🌸 HanaMall 商品ページ</h1>
  <p>prod-web02 は正常に動作しています。</p>
</body>
</html>
HTML
echo "✅ HanaMall ページ設置完了"

# ファイアウォールで 80 番をあえて閉じる（障害の再現）
echo ""
echo "【2】ファイアウォールで 80 番ポートをブロックします（障害再現）..."
if systemctl is-active --quiet firewalld; then
  sudo firewall-cmd --remove-port=80/tcp --permanent 2>/dev/null || true
  sudo firewall-cmd --remove-service=http --permanent 2>/dev/null || true
  sudo firewall-cmd --reload
  echo "✅ firewalld: 80/tcp をブロックしました"
else
  # ufw がある場合
  if command -v ufw &>/dev/null; then
    sudo ufw deny 80/tcp 2>/dev/null || true
    echo "✅ ufw: 80/tcp をブロックしました"
  else
    # iptables で直接ブロック
    sudo iptables -I INPUT -p tcp --dport 80 -j DROP 2>/dev/null || true
    echo "✅ iptables: 80/tcp をブロックしました"
  fi
fi

# 状態確認
echo ""
echo "================================================"
echo " セットアップ完了！以下の状態になっています："
echo ""
echo "  ✅ Apache   : 起動中（ローカルからは繋がる）"
echo "  ❌ 80番ポート: ファイアウォールでブロック中"
echo ""
echo " 佐藤さんからSlackが来ています："
echo " 「外部からアクセスできない！原因を調べてください！」"
echo ""
echo " → 次は 04_network.sh を実行して原因を特定してください"
echo "================================================"
