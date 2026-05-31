#!/bin/bash
# ============================================================
# 【HanaMall インフラ業務】Week04 環境セットアップ
# 「新しく立てたWebサーバーが外から繋がらない」状態を再現する
# ============================================================
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
BLOCK_OK=false

if systemctl is-active --quiet firewalld; then
  sudo firewall-cmd --remove-port=80/tcp --permanent 2>/dev/null || true
  sudo firewall-cmd --remove-service=http --permanent 2>/dev/null || true
  sudo firewall-cmd --reload
  echo "✅ firewalld: 80/tcp をブロックしました"
  BLOCK_OK=true
elif command -v ufw &>/dev/null && sudo ufw status | grep -q "Status: active"; then
  sudo ufw deny 80/tcp 2>/dev/null || true
  sudo ufw reload 2>/dev/null || true
  echo "✅ ufw: 80/tcp をブロックしました"
  BLOCK_OK=true
else
  sudo iptables -I INPUT -p tcp --dport 80 -j DROP 2>/dev/null || true
  echo "✅ iptables: 80/tcp をブロックしました"
  BLOCK_OK=true
fi

# ブロックが実際に効いているか確認（ルールの存在をチェック）
echo ""
echo "【3】ファイアウォールルールを確認します..."
RULE_OK=false

if systemctl is-active --quiet firewalld; then
  # firewalld: 80/tcp が許可リストにないことを確認
  if ! sudo firewall-cmd --list-ports 2>/dev/null | grep -q "80/tcp" && \
     ! sudo firewall-cmd --list-services 2>/dev/null | grep -q "http"; then
    RULE_OK=true
  fi
elif command -v ufw &>/dev/null && sudo ufw status | grep -q "Status: active"; then
  # ufw: DENY ルールが存在するか確認
  if sudo ufw status | grep -qE "80.*DENY|80/tcp.*DENY"; then
    RULE_OK=true
  fi
else
  # iptables: DROP ルールが存在するか確認
  if sudo iptables -L INPUT -n 2>/dev/null | grep -q "DROP.*tcp.*dpt:80"; then
    RULE_OK=true
  fi
fi

if $RULE_OK; then
  echo "✅ 確認OK：ファイアウォールルールが適用されています"
  echo "   （ローカルからは通りますが、外部からのアクセスはブロックされます）"
else
  echo ""
  echo "⚠️  ファイアウォールルールが確認できませんでした"
  echo "   WSL2 環境ではファイアウォールが機能しない場合があります。"
  echo "   この課題は VirtualBox / EC2 などの独立した Linux 環境で実施してください。"
  echo ""
fi

# 状態確認
echo ""
echo "================================================"
echo " セットアップ完了！以下の状態になっています："
echo ""
echo "  ✅ Apache   : 起動中（ローカルからは繋がる）"
if $BLOCK_OK; then
  echo "  ❌ 80番ポート: ファイアウォールでブロック中"
else
  echo "  ⚠️  80番ポート: ブロック未適用（環境を確認してください）"
fi
echo ""
echo " 佐藤さんからSlackが来ています："
echo " 「外部からアクセスできない！原因を調べてください！」"
echo ""
echo "================================================"
