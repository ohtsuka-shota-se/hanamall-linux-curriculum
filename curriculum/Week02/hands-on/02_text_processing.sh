#!/bin/bash
# ============================================================
# 【HanaMall インフラ業務】Week02 ハンズオン
# ミッション: 本番アクセスログを解析して障害の痕跡を探せ
# ============================================================
#
# --- Slack（佐藤さんより）---
# 田中さん、昨夜 22:00〜23:00 ごろユーザーから
# 「ページが開かない」という問い合わせが複数来ました。
# アクセスログを調べて以下を報告してください。
#
# ① エラー（5xx系）が何件あったか
# ② どのIPから一番アクセスが来ていたか（Top5）
# ③ 22:00〜23:00の間でエラーが集中した時間帯はあるか
# ④ ブルートフォースの疑いがあるIPはないか（短時間に大量アクセス）
#
# ログ: data/access.log を使ってください
# ============================================================

LOGFILE="$(dirname "$0")/../data/access.log"

if [ ! -f "$LOGFILE" ]; then
  echo "❌ ログファイルが見つかりません: $LOGFILE"
  exit 1
fi

echo "================================================"
echo " HanaMall アクセスログ解析レポート"
echo " 対象ファイル: $LOGFILE"
echo " 実行日時: $(date)"
echo "================================================"

echo ""
echo "【① エラー件数（5xx系）】"
echo "--- 500 Internal Server Error ---"
grep " 500 " "$LOGFILE" | wc -l | xargs echo "件"
echo "--- 503 Service Unavailable ---"
grep " 503 " "$LOGFILE" | wc -l | xargs echo "件"
echo "--- 5xx 合計 ---"
grep -E " 5[0-9]{2} " "$LOGFILE" | wc -l | xargs echo "件"

echo ""
echo "【② IPアドレス別アクセス数 Top5】"
awk '{print $1}' "$LOGFILE" | sort | uniq -c | sort -rn | head -5

echo ""
echo "【③ ステータスコード別の件数集計】"
awk '{print $9}' "$LOGFILE" | sort | uniq -c | sort -rn

echo ""
echo "【④ 短時間に大量アクセスしているIP（疑わしいIP）】"
echo "10件以上アクセスしているIP:"
awk '{print $1}' "$LOGFILE" | sort | uniq -c | sort -rn | awk '$1 >= 10 {print $0}'

echo ""
echo "【⑤ エラーが出ているリクエストの詳細】"
grep -E " 5[0-9]{2} " "$LOGFILE"

echo ""
echo "================================================"
echo " 解析完了。上記を Slack に貼り付けて報告してください。"
echo " ※ ④で怪しいIPが出た場合は佐藤さんに相談！"
echo "================================================"
