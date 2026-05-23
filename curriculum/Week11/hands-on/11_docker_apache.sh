#!/bin/bash
# ============================================================
# 【HanaMall インフラ業務】Week11 ハンズオン
# ミッション: ステージング環境を Docker で再現し、
#             本番と同じ構成を手元で動かせるようにせよ
# ============================================================
#
# --- Slack（佐藤さんより）---
# 田中さん、開発チームから要望が来ました。
#
# 「本番と同じ Apache 環境をローカルで動かしたい。
#  Vagrant は重いので Docker にしてほしい」とのことです。
#
# 以下を作ってください：
# ① HanaMall の Apache 環境を Docker イメージ化
# ② docker-compose で Apache + MySQL（将来用）を一発起動できる構成
# ③ ソースコードの変更が即反映されるよう volume マウントする
#
# AWS EC2 で動いているのと同じ設定にしてください！
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "================================================"
echo " HanaMall Docker 環境セットアップ"
echo " 日時: $(date)"
echo "================================================"

echo ""
echo "【Step1】Docker インストール確認"
if ! command -v docker &>/dev/null; then
  echo "❌ Docker が見つかりません"
  echo "インストール手順: https://docs.docker.com/engine/install/ubuntu/"
  exit 1
fi
echo "✅ Docker バージョン: $(docker --version)"

echo ""
echo "【Step2】HanaMall Docker イメージをビルド"
echo "Dockerfile の内容:"
cat "$SCRIPT_DIR/Dockerfile"
echo ""

cd "$SCRIPT_DIR"
docker build -t hanamall-web:latest . 2>&1 | tail -5
echo "✅ イメージビルド完了"

echo ""
echo "【Step3】コンテナを起動して動作確認"
docker stop hanamall-test 2>/dev/null || true
docker rm hanamall-test 2>/dev/null || true

docker run -d \
  --name hanamall-test \
  -p 8080:80 \
  -v "$SCRIPT_DIR/html:/var/www/html" \
  hanamall-web:latest

sleep 2
echo "--- 疎通確認 ---"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080 2>/dev/null)
echo "http://localhost:8080 → HTTP $HTTP_STATUS $([ "$HTTP_STATUS" = "200" ] && echo '✅' || echo '❌')"

echo ""
echo "【Step4】docker-compose で起動する方法"
echo "docker-compose.yml の内容:"
cat "$SCRIPT_DIR/docker-compose.yml"
echo ""
echo "起動コマンド:"
echo "  docker-compose up -d"
echo "  docker-compose ps"
echo "  docker-compose logs -f web"
echo "  docker-compose down"

echo ""
echo "【Step5】コンテナの中を確認（本番サーバーと同じ感覚で）"
echo "--- コンテナ内の Apache 設定 ---"
docker exec hanamall-test apache2ctl -S 2>/dev/null || echo "（apache2ctl 未対応）"

echo ""
echo "--- コンテナのログ ---"
docker logs hanamall-test 2>/dev/null | tail -5

echo ""
echo "================================================"
echo "【佐藤さんへの報告テンプレート】"
echo ""
echo "  Docker環境の構築完了しました。"
echo "  イメージ: hanamall-web:latest"
echo "  起動確認: HTTP $HTTP_STATUS"
echo "  volume mount で html/ 配下の変更が即反映されます"
echo "  開発チームへの共有: git clone 後に 'docker-compose up -d' で起動できます"
echo "================================================"

# クリーンアップ
echo ""
read -p "テスト用コンテナを削除しますか？ [y/N]: " CLEANUP
if [ "$CLEANUP" = "y" ] || [ "$CLEANUP" = "Y" ]; then
  docker stop hanamall-test && docker rm hanamall-test
  echo "✅ テスト用コンテナを削除しました"
fi
