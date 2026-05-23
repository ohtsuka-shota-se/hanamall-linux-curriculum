#!/bin/bash
# ============================================================
# 【HanaMall インフラ業務】Week12 総合演習
# ミッション: 新規サーバーを本番投入できる状態に仕上げろ
# ============================================================
#
# --- Slack（佐藤さんより）---
# 田中さん、入社から3ヶ月経ちましたね！
# 来月から新しい商品カテゴリ「フラワーギフト」ページを
# 追加するにあたって、新規サーバー（prod-web03）を
# 本番投入する作業をお任せします。
#
# 以下のチェックリストをすべて満たして
# 「本番投入OKレポート」を出してください。
# これが通れば田中さんを正式に本番担当に任命します！
#
# ～ 12週間の集大成です。頑張ってください！ ～
# ============================================================

echo "================================================"
echo " HanaMall prod-web03 本番投入前チェック"
echo " 担当: 田中"
echo " 実施日: $(date '+%Y-%m-%d %H:%M:%S')"
echo "================================================"

PASS=0
FAIL=0
WARN=0

check_ok()   { echo "  ✅ PASS  : $1"; PASS=$((PASS+1)); }
check_fail() { echo "  ❌ FAIL  : $1"; FAIL=$((FAIL+1)); }
check_warn() { echo "  ⚠️  WARN  : $1"; WARN=$((WARN+1)); }

# ========== SSH設定 ==========
echo ""
echo "【1. SSH セキュリティ設定】"

grep -q "^PermitRootLogin no" /etc/ssh/sshd_config 2>/dev/null \
  && check_ok "rootログイン禁止 (PermitRootLogin no)" \
  || check_fail "rootログイン禁止されていません → sshd_config を確認してください"

grep -q "^PasswordAuthentication no" /etc/ssh/sshd_config 2>/dev/null \
  && check_ok "パスワード認証無効 (PasswordAuthentication no)" \
  || check_warn "パスワード認証が有効です → 公開鍵認証のみに変更推奨"

[ -f ~/.ssh/authorized_keys ] && [ -s ~/.ssh/authorized_keys ] \
  && check_ok "authorized_keys が設定されています" \
  || check_fail "authorized_keys が空または存在しません"

# ========== Webサービス ==========
echo ""
echo "【2. Webサービス（Apache）】"

systemctl is-active --quiet apache2 2>/dev/null \
  && check_ok "Apache が起動中" \
  || check_fail "Apache が停止しています → sudo systemctl start apache2"

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost 2>/dev/null || echo "000")
[ "$HTTP_CODE" = "200" ] \
  && check_ok "HTTP 200 を返しています (curl http://localhost → $HTTP_CODE)" \
  || check_fail "HTTP レスポンス異常: $HTTP_CODE"

sudo apache2ctl configtest 2>&1 | grep -q "Syntax OK" \
  && check_ok "Apache 設定ファイルの文法チェック: Syntax OK" \
  || check_fail "Apache 設定ファイルに文法エラーがあります"

# ========== ファイアウォール ==========
echo ""
echo "【3. ファイアウォール設定】"

systemctl is-active --quiet firewalld 2>/dev/null \
  && check_ok "firewalld が起動中" \
  || check_warn "firewalld が起動していません（ufw等の代替を確認）"

sudo firewall-cmd --list-ports 2>/dev/null | grep -q "80/tcp" \
  && check_ok "HTTP (80/tcp) が開放されています" \
  || check_warn "80/tcp が未開放の可能性があります（別の方法で開放されているかも）"

# ========== バックアップ ==========
echo ""
echo "【4. バックアップ設定】"

( crontab -l 2>/dev/null | grep -q "backup" ) \
  || systemctl list-units --type=timer 2>/dev/null | grep -q "backup" \
  && check_ok "バックアップの定期実行が設定されています" \
  || check_warn "バックアップのcron/timerが見つかりません → 設定してください"

[ -d /backup ] \
  && check_ok "/backup ディレクトリが存在します" \
  || check_warn "/backup ディレクトリがありません"

# ========== 監視 ==========
echo ""
echo "【5. 監視スクリプト】"

[ -f /usr/local/bin/hanamall_healthcheck.sh ] \
  && check_ok "healthcheck スクリプトが存在します" \
  || check_warn "healthcheck スクリプトが見つかりません"

systemctl is-active --quiet hanamall-healthcheck 2>/dev/null \
  && check_ok "hanamall-healthcheck サービスが起動中" \
  || check_warn "hanamall-healthcheck サービスが未起動（Week09 の設定を確認）"

[ -f /var/log/hanamall_resource.csv ] \
  && check_ok "リソース監視ログ (resource.csv) が存在します" \
  || check_warn "リソース監視ログが見つかりません（Week10 の設定を確認）"

# ========== ログ管理 ==========
echo ""
echo "【6. ログ管理】"

[ -f /etc/logrotate.d/apache2 ] \
  && check_ok "logrotate (Apache) が設定されています" \
  || check_warn "logrotate の Apache 設定が見つかりません"

# ========== 結果サマリ ==========
echo ""
echo "================================================"
echo " 本番投入前チェック 結果サマリ"
echo "================================================"
echo "  ✅ PASS : $PASS 項目"
echo "  ⚠️  WARN : $WARN 項目"
echo "  ❌ FAIL : $FAIL 項目"
echo ""

if [ "$FAIL" -eq 0 ] && [ "$WARN" -le 2 ]; then
  echo "  🎉 本番投入 OK！"
  echo "     佐藤さんへ: 全チェック通過しました。本番投入を進めます。"
elif [ "$FAIL" -eq 0 ]; then
  echo "  ⚠️  条件付きOK（WARNが $WARN 件あります）"
  echo "     WARN 項目を確認してから佐藤さんに相談しましょう。"
else
  echo "  ❌ 本番投入NG（FAIL が $FAIL 件あります）"
  echo "     FAIL 項目をすべて解消してから再チェックしてください。"
fi
echo "================================================"
