#!/bin/bash
# ============================================================
# 【HanaMall インフラ業務】Week05 ハンズオン
# ミッション: 商品ページと管理画面を同じサーバーで動かせ
# ============================================================
#
# --- Slack（佐藤さんより）---
# 田中さん、開発チームから要望が来ました。
#
# 今まで商品ページ（shop.hanamall.local）しかなかったけど、
# 管理画面（admin.hanamall.local）を同じサーバーに追加したい。
#
# 要件：
# - shop.hanamall.local  → /var/www/shop/
# - admin.hanamall.local → /var/www/admin/
# - 両方80番ポートで受け付ける（バーチャルホスト）
# - ログはそれぞれ別ファイルに分ける
# - admin のアクセスログは特に厳重に管理したい
#
# 設定後に両方 curl で疎通確認してください！
# ============================================================

set -e
echo "================================================"
echo " HanaMall バーチャルホスト構築"
echo " 作業者: 田中"
echo " 日時: $(date)"
echo "================================================"

# Apache インストール確認
echo ""
echo "【Step1】Apache インストール確認"
if ! command -v apache2 &>/dev/null; then
  echo "Apache2 をインストールします..."
  sudo apt-get update -q && sudo apt-get install -y apache2
fi
echo "✅ Apache バージョン: $(apache2 -v 2>&1 | head -1)"

# ドキュメントルート作成
echo ""
echo "【Step2】ドキュメントルート作成"
sudo mkdir -p /var/www/shop /var/www/admin

cat << 'HTML' | sudo tee /var/www/shop/index.html > /dev/null
<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8"><title>HanaMall - ショップ</title></head>
<body>
  <h1>🌸 HanaMall ショップ</h1>
  <p>商品一覧ページです。サーバー: shop.hanamall.local</p>
</body>
</html>
HTML

cat << 'HTML' | sudo tee /var/www/admin/index.html > /dev/null
<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8"><title>HanaMall - 管理画面</title></head>
<body>
  <h1>🔐 HanaMall 管理画面</h1>
  <p>管理者専用ページです。サーバー: admin.hanamall.local</p>
</body>
</html>
HTML

sudo chown -R www-data:www-data /var/www/shop /var/www/admin
sudo chmod -R 755 /var/www/shop /var/www/admin
echo "✅ ドキュメントルート作成完了"

# VirtualHost 設定ファイルを作成
echo ""
echo "【Step3】VirtualHost 設定を作成"

sudo tee /etc/apache2/sites-available/shop.hanamall.conf > /dev/null << 'APACHECONF'
<VirtualHost *:80>
    ServerName shop.hanamall.local

    DocumentRoot /var/www/shop

    CustomLog /var/log/apache2/shop_access.log combined
    ErrorLog  /var/log/apache2/shop_error.log

    <Directory /var/www/shop>
        Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>
APACHECONF

sudo tee /etc/apache2/sites-available/admin.hanamall.conf > /dev/null << 'APACHECONF'
<VirtualHost *:80>
    ServerName admin.hanamall.local

    DocumentRoot /var/www/admin

    # 管理画面のログは専用ファイルに（要件通り）
    CustomLog /var/log/apache2/admin_access.log combined
    ErrorLog  /var/log/apache2/admin_error.log

    <Directory /var/www/admin>
        Options -Indexes FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>
APACHECONF

echo "✅ VirtualHost 設定ファイル作成完了"

# /etc/hosts に追加
echo ""
echo "【Step4】/etc/hosts に追記（ローカルDNS設定）"
grep -q "shop.hanamall.local" /etc/hosts \
  || echo "127.0.0.1  shop.hanamall.local" | sudo tee -a /etc/hosts > /dev/null
grep -q "admin.hanamall.local" /etc/hosts \
  || echo "127.0.0.1  admin.hanamall.local" | sudo tee -a /etc/hosts > /dev/null
echo "✅ /etc/hosts 追記完了"

# サイト有効化
echo ""
echo "【Step5】サイトを有効化"
sudo a2ensite shop.hanamall.conf admin.hanamall.conf

# 文法チェックと反映
echo ""
echo "【Step6】設定の文法チェックと反映"
echo "--- apache2ctl configtest ---"
sudo apache2ctl configtest

echo "--- reload ---"
sudo systemctl reload apache2
echo "✅ 設定反映完了"

# 疎通確認
echo ""
echo "【Step7】疎通確認（佐藤さんへの報告前チェック）"
echo ""
SHOP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://shop.hanamall.local)
ADMIN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://admin.hanamall.local)

echo "shop.hanamall.local  → HTTP $SHOP_STATUS $([ "$SHOP_STATUS" = "200" ] && echo '✅' || echo '❌')"
echo "admin.hanamall.local → HTTP $ADMIN_STATUS $([ "$ADMIN_STATUS" = "200" ] && echo '✅' || echo '❌')"

echo ""
echo "================================================"
echo "【佐藤さんへの完了報告（テンプレ）】"
echo ""
echo "  バーチャルホスト設定完了しました。"
echo "  ・shop.hanamall.local  → HTTP $SHOP_STATUS"
echo "  ・admin.hanamall.local → HTTP $ADMIN_STATUS"
echo "  ・アクセスログはそれぞれ別ファイルに出力しています"
echo "  ・/etc/apache2/sites-available/ に設定ファイルを置いています"
echo "================================================"
