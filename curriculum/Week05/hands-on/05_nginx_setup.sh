#!/bin/bash
# Week05 ハンズオン：Nginxバーチャルホスト設定

set -e
echo "===== Week05 Nginx セットアップ ====="

echo "[1] Nginx インストール確認"
which nginx || sudo apt install -y nginx

echo ""
echo "[2] ドキュメントルート作成"
sudo mkdir -p /var/www/site-a
sudo mkdir -p /var/www/site-b

echo "<h1>Site A - Hello from site-a.local</h1>" | sudo tee /var/www/site-a/index.html
echo "<h1>Site B - Hello from site-b.local</h1>" | sudo tee /var/www/site-b/index.html

echo ""
echo "[3] /etc/hosts に追加（手動確認）"
echo "以下を /etc/hosts に追記してください："
echo "127.0.0.1  site-a.local"
echo "127.0.0.1  site-b.local"

echo ""
echo "[4] Nginx 設定ファイルを配置（要確認）"
echo "hands-on/site-a.conf と site-b.conf を /etc/nginx/conf.d/ にコピーしてください"
echo "sudo cp hands-on/site-a.conf /etc/nginx/conf.d/"
echo "sudo cp hands-on/site-b.conf /etc/nginx/conf.d/"

echo ""
echo "[5] 設定チェックとリロード"
echo "sudo nginx -t && sudo systemctl reload nginx"

echo ""
echo "[6] 確認"
echo "curl http://site-a.local"
echo "curl http://site-b.local"
