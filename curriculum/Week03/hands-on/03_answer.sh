#!/bin/bash
# ============================================================
# 【Week03 答え合わせ用スクリプト】
# ⚠️  課題を自力で終えてから実行すること！
#
# 大問1・大問2 の参考実装を自動実行して結果を確認できる。
# ミッション: 新メンバーのサーバーアクセス権を設定し
#             不審なプロセスを調査・停止せよ
# ============================================================
#
# --- Slack（佐藤さんより）---
# 田中さん、2つお願いがあります。
#
# 【依頼①】来週から開発チームの鈴木さんがdev01を使います。
#  以下の設定をしてください：
#  - ユーザー名: suzuki
#  - dev_teamグループに追加
#  - sudo は「apache2の再起動」だけ許可
#
# 【依頼②】さっきアラートで「CPUが90%超え」と出ました。
#  原因プロセスを特定して止めてください。
#  （今朝から誰かがテストスクリプトを動かしっぱなしかも）
#
# よろしくお願いします！
# ============================================================

echo "================================================"
echo " HanaMall インフラ作業ログ"
echo " 作業者: 田中（自分）"
echo " 日時: $(date)"
echo "================================================"

echo ""
echo "【依頼①】鈴木さんのアカウント設定"
echo ""

# グループ作成（既存の場合はエラーを無視）
sudo groupadd dev_team 2>/dev/null && echo "✅ dev_team グループを作成しました" \
  || echo "ℹ️  dev_team グループは既に存在します"

# ユーザー作成
if id suzuki &>/dev/null; then
  echo "ℹ️  ユーザー suzuki は既に存在します"
else
  sudo useradd -m -s /bin/bash suzuki
  echo "✅ ユーザー suzuki を作成しました"
  echo "   ⚠️  パスワードは別途 'sudo passwd suzuki' で設定してください"
fi

# グループに追加
sudo usermod -aG dev_team suzuki
echo "✅ suzuki を dev_team グループに追加しました"

echo ""
echo "現在の suzuki のグループ:"
id suzuki

echo ""
echo "--- sudo 設定の確認 ---"
echo "以下を 'sudo visudo' で /etc/sudoers に追記してください："
echo ""
echo "  suzuki ALL=(ALL) NOPASSWD: /bin/systemctl restart apache2"
echo ""
echo "設定後、以下で確認できます："
echo "  su - suzuki"
echo "  sudo systemctl restart apache2   # → 通る"
echo "  sudo reboot                       # → Permission denied"

echo ""
echo "================================================"
echo "【依頼②】高CPU使用率プロセスの調査・停止"
echo ""

echo "--- 現在のCPU使用率 Top10 ---"
ps aux --sort=-%cpu | head -11

echo ""
echo "--- 疑わしいプロセスを探す（バックグラウンドで動き続けているもの）---"
ps aux --sort=-%cpu | awk 'NR>1 && $3>10 {print "⚠️  CPU "$3"% : PID="$2" コマンド="$11}'

echo ""
echo "--- テスト用：わざと重いプロセスを起動して kill する練習 ---"
echo "バックグラウンドで yes コマンドを起動..."
yes > /dev/null &
YES_PID=$!
echo "✅ PID $YES_PID を起動しました（CPU使用率が上がるはず）"

sleep 2
echo ""
echo "top コマンドで確認してください（q で終了）:"
echo "  top -bn1 | head -15"
top -bn1 | head -15

echo ""
echo "PID $YES_PID を停止します..."
kill "$YES_PID"
sleep 1
if ! ps -p "$YES_PID" > /dev/null 2>&1; then
  echo "✅ プロセス停止完了"
  echo ""
  echo "佐藤さんへの報告文（例）："
  echo "---"
  echo "  依頼①：suzuki アカウントの設定完了しました。"
  echo "  依頼②：高CPU使用率プロセス（PID: $YES_PID）を停止しました。"
  echo "  原因はテスト用スクリプトの動かしっぱなしでした。"
  echo "---"
fi
echo "================================================"
