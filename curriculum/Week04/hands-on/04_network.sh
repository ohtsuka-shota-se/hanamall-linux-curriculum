#!/bin/bash
# ============================================================
# 【HanaMall インフラ業務】Week04 ハンズオン
# ミッション: 新しく立てたWebサーバーが外から繋がらない原因を特定せよ
# ============================================================
#
# --- Slack（佐藤さんより）---
# 田中さん、急ぎです！
# 今日立てた新しい商品ページ用サーバー（prod-web02）に
# 外部から全然アクセスできないと開発チームから連絡が来ました。
# サーバー自体は動いているはずなので、ネットワーク周りを確認してください。
#
# 切り分けの順番はこんな感じです：
# 1. サーバーのIPとルーティングを確認
# 2. Apacheは起動しているか？ポートは待ち受けているか？
# 3. ローカルから繋がるか？
# 4. ファイアウォールで80番が開いているか？
# 5. 開いていなければ開放して再確認
#
# 各ステップの結果をメモしながら進めてください！
# ============================================================

echo "================================================"
echo " HanaMall prod-web02 ネットワーク診断"
echo " 実行日時: $(date)"
echo "================================================"

echo ""
echo "【Step1】このサーバーのネットワーク設定を確認"
echo "--- IPアドレス ---"
ip a | grep -E "inet [0-9]" | awk '{print $2, "on", $NF}'

echo ""
echo "--- ルーティングテーブル（ゲートウェイ確認）---"
ip r | grep default

echo ""
echo "--- DNS設定 ---"
cat /etc/resolv.conf | grep nameserver

echo ""
echo "【Step2】Apacheの起動確認とポート確認"
echo "--- Apache 状態 ---"
systemctl is-active apache2 2>/dev/null && echo "✅ Apache: 起動中" \
  || echo "❌ Apache: 停止中"

echo ""
echo "--- 待ち受けポート一覧 ---"
ss -tnlp | grep -E "LISTEN|Proto"
echo ""
echo "80番ポートの状態:"
ss -tnlp | grep ":80 " && echo "✅ 80番: 待ち受け中" || echo "❌ 80番: 待ち受けなし（Apacheが起動していないかも）"

echo ""
echo "【Step3】ローカルからHTTPで繋がるか確認"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost 2>/dev/null || echo "接続失敗")
echo "curl http://localhost → ステータス: $HTTP_STATUS"
if [ "$HTTP_STATUS" = "200" ]; then
  echo "✅ ローカルからは正常にアクセスできます"
else
  echo "⚠️  ローカルからも繋がりません。Apacheを確認してください"
fi

echo ""
echo "【Step4】ファイアウォール（firewalld）の確認"
if systemctl is-active firewalld &>/dev/null; then
  echo "--- 現在のルール ---"
  sudo firewall-cmd --list-all 2>/dev/null
  echo ""
  if sudo firewall-cmd --list-ports 2>/dev/null | grep -q "80/tcp"; then
    echo "✅ 80/tcp: 開放済み"
  else
    echo "❌ 80/tcp: 未開放 ← これが原因の可能性！"
  fi
else
  echo "ℹ️  firewalld は起動していません（ufw または iptables を確認）"
  sudo ufw status 2>/dev/null || echo "ufw も見つかりません"
fi

echo ""
echo "【Step5】問題があれば80番を開放して復旧"
echo "以下のコマンドで開放できます："
echo "  sudo firewall-cmd --add-port=80/tcp --permanent"
echo "  sudo firewall-cmd --reload"
echo "  curl http://localhost  # → 200 が返るか確認"

echo ""
echo "================================================"
echo "【佐藤さんへの報告テンプレート】"
echo ""
echo "  prod-web02 ネットワーク診断完了しました。"
echo "  IP: $(ip a | grep 'inet ' | grep -v '127.0.0.1' | awk '{print $2}' | head -1)"
echo "  Apache: $(systemctl is-active apache2 2>/dev/null)"
echo "  80番ポート: $(ss -tnlp | grep -q ':80 ' && echo '待ち受け中' || echo '未開放')"
echo "  firewalld 80/tcp: $(sudo firewall-cmd --list-ports 2>/dev/null | grep -q '80/tcp' && echo '開放済み' || echo '未開放')"
echo "================================================"
