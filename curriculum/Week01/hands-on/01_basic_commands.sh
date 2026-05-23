#!/bin/bash
# ============================================================
# 【HanaMall インフラ業務】Week01 ハンズオン
# ミッション: 入社初日 - 検証サーバーの環境確認レポートを作れ
# ============================================================
#
# --- Slack（佐藤さんより）---
# 田中さん、入社おめでとうございます！
# まず検証サーバー（dev01）に入って環境確認をお願いします。
# 以下の情報をまとめてレポートしてください。
#
# ✅ チェックリスト
# 1. OSのバージョン
# 2. ディスク/メモリの空き状況
# 3. /etc 以下にある設定ファイルの数
# 4. /var/log 以下のログファイル一覧
# 5. 直近のシステムログ 20行
#
# まずは壊しても大丈夫な検証環境で練習してください！
# ============================================================

REPORT_FILE="$HOME/dev01_report_$(date +%Y%m%d).txt"
echo "環境確認レポートを $REPORT_FILE に出力します..."
echo ""

{
  echo "=============================="
  echo " HanaMall dev01 環境確認レポート"
  echo " 作成日時: $(date)"
  echo "=============================="

  echo ""
  echo "## 1. OS バージョン"
  cat /etc/os-release | grep -E "^(NAME|VERSION)="

  echo ""
  echo "## 2. ハードウェアリソース"
  echo "--- CPU ---"
  nproc
  echo "コア"
  echo "--- メモリ ---"
  free -h | grep Mem
  echo "--- ディスク ---"
  df -h / | tail -1

  echo ""
  echo "## 3. /etc 以下の設定ファイル数"
  COUNT=$(find /etc -name "*.conf" 2>/dev/null | wc -l)
  echo "${COUNT} 件の .conf ファイルが存在します"
  echo "（主要なもの）"
  find /etc -name "*.conf" 2>/dev/null | head -10

  echo ""
  echo "## 4. /var/log 以下のログファイル"
  find /var/log -name "*.log" 2>/dev/null | head -20

  echo ""
  echo "## 5. 直近のシステムログ（20行）"
  sudo tail -20 /var/log/syslog 2>/dev/null \
    || journalctl -n 20 --no-pager 2>/dev/null \
    || echo "（ログ取得権限なし。sudo が必要です）"

} | tee "$REPORT_FILE"

echo ""
echo "✅ レポート作成完了: $REPORT_FILE"
echo "佐藤さんへ: このファイルの内容を Slack に貼り付けて報告しましょう！"
