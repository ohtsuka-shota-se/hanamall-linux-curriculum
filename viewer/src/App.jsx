import { useState, useRef, useEffect, useCallback } from "react";

import rootMd from '../../curriculum/README.md?raw';

const _weekMods = import.meta.glob('../../curriculum/Week*/README.md', { eager: true, query: '?raw', import: 'default' });
const _addMods = import.meta.glob('../../curriculum/additional/*.md', { eager: true, query: '?raw', import: 'default' });

const README_DATA = {
  ROOT: rootMd,
  ...Object.fromEntries(
    Object.entries(_weekMods).map(([path, content]) => [path.match(/Week\d+/)[0], content])
  ),
  ...Object.fromEntries(
    Object.entries(_addMods).map(([path, content]) => [path.split('/').pop().replace('.md', ''), content])
  ),
};

// ============================================================
// Week別コマンド定義
// ============================================================
const WEEK_COMMANDS = {"Week01":{"prompt":"ubuntu@dev01:~$","intro":["=== Week01 コマンド事前練習 ===","今週の課題で使うコマンドの動きを確認しよう","・ls のオプションの違いを体験する","・パーミッション表記の読み方を覚える","・find / chmod の基本動作を確認する"],"commands":{"ls /etc":"apache2  apt  bash.bashrc  cron.d  fstab  group  hosts  passwd  resolv.conf  shadow  ssh  sudoers","ls -l /etc":"合計 256\ndrwxr-xr-x  8 root root  4096 5月  1 09:00 apache2\n-rw-r--r--  1 root root  3028 5月  1 09:00 bash.bashrc\ndrwxr-xr-x  2 root root  4096 5月  1 09:00 cron.d\n-rw-r--r--  1 root root  1807 5月  1 09:00 fstab\n-rw-r-----  1 root shadow  677 5月  1 09:00 shadow\ndrwx--x--x  2 root root  4096 5月  1 09:00 ssl","ls -la /etc":"-rw-r--r--  1 root root  3028 5月  1 09:00 bash.bashrc\n-rw-r-----  1 root shadow  677 5月  1 09:00 shadow   ← root と shadow グループのみ読める\ndrwx--x--x  2 root root  4096 5月  1 09:00 ssl      ← 所有者のみ読める\n\n💡 -l と -la の違い: -a を付けると . で始まる隠しファイルも表示される","ls -la ~":"-rw-------  1 ubuntu ubuntu  220 5月  1 09:00 .bash_history  ← 600: 自分だけ読める\n-rw-r--r--  1 ubuntu ubuntu 3526 5月  1 09:00 .bashrc        ← 644: 全員読める\ndrwx------  2 ubuntu ubuntu 4096 5月  1 09:00 .ssh           ← 700: 自分だけ入れる\n\n💡 .ssh は 700 でないと SSH が鍵を無視します","find /tmp -name '*.log'":"/tmp/test.log\n/tmp/myapp/error.log","find /etc -name '*.conf' -type f":"/etc/apache2/apache2.conf\n/etc/apt/apt.conf\n/etc/ca-certificates.conf\n/etc/logrotate.conf\n/etc/resolv.conf\n💡 -type f でファイルのみ、-type d でディレクトリのみに絞れる","touch /tmp/practice.txt":"","ls -la /tmp/practice.txt":"-rw------- 1 ubuntu ubuntu 0 5月  1 10:00 /tmp/practice.txt  ← 600: 自分だけ読み書き（SSH秘密鍵に使う）","chmod 755 /tmp/practice.txt":"","chmod 600 /tmp/practice.txt":"","help":"=== 練習コマンド一覧 ===\n【ls の違いを体験】\n  ls /etc          → シンプル表示\n  ls -l /etc       → 詳細表示（パーミッション付き）\n  ls -la /etc      → 隠しファイルも含む詳細表示\n  ls -la ~         → ホームの隠しファイルを確認\n\n【find の使い方】\n  find /tmp -name '*.log'\n  find /etc -name '*.conf' -type f\n\n【chmod の動きを確認】\n  touch /tmp/practice.txt\n  ls -la /tmp/practice.txt  → 644 を確認\n  chmod 755 /tmp/practice.txt → ls で確認\n  chmod 600 /tmp/practice.txt → ls で確認"}},"Week02":{"prompt":"ubuntu@dev01:~/hanamall-linux-curriculum/Week02$","intro":["=== Week02 コマンド事前練習 ===","grep / awk / sort の動きを単独で体験しよう","・各コマンドが何をするのかを確認する","・パイプで繋いだときの流れを理解する"],"commands":{"head -3 data/access.log":"192.168.1.10 - - [01/May/2025:21:55:10 +0900] \"GET /products HTTP/1.1\" 200 4521\n192.168.1.11 - - [01/May/2025:21:58:30 +0900] \"GET /cart HTTP/1.1\" 200 1234\n10.0.99.5 - - [01/May/2025:22:00:01 +0900] \"GET /admin/login HTTP/1.1\" 403 210\n💡 ログは「IP - - [日時] \"メソッド URL\" ステータス バイト数」の形式","grep '200' data/access.log | head -3":"192.168.1.10 - - [01/May/2025:21:55:10 +0900] \"GET /products HTTP/1.1\" 200 4521\n192.168.1.11 - - [01/May/2025:21:58:30 +0900] \"GET /cart HTTP/1.1\" 200 1234\n192.168.1.12 - - [01/May/2025:22:01:15 +0900] \"GET /products/123 HTTP/1.1\" 200 3456","grep -v '200' data/access.log":"10.0.99.5 - - [01/May/2025:22:00:01 +0900] \"GET /admin/login HTTP/1.1\" 403 210\n10.0.99.5 - - [01/May/2025:22:00:02 +0900] \"POST /admin/login HTTP/1.1\" 401 89\n192.168.1.13 - - [01/May/2025:22:02:00 +0900] \"GET /checkout HTTP/1.1\" 500 89\n💡 -v は「マッチしない行」を表示（除外フィルタ）","awk '{print $1}' data/access.log | head -5":"192.168.1.10\n192.168.1.11\n10.0.99.5\n10.0.99.5\n192.168.1.12\n💡 awk '{print $1}' は「スペース区切りの1列目だけ取り出す」\n  $1=IP, $7=URL, $9=ステータスコード","awk '{print $9}' data/access.log | head -5":"200\n200\n403\n401\n200\n💡 $9 = ステータスコード列","awk '{print $1, $9}' data/access.log | head -5":"192.168.1.10 200\n192.168.1.11 200\n10.0.99.5 403\n10.0.99.5 401\n192.168.1.12 200\n💡 複数列を同時に取り出せる","awk '{print $1}' data/access.log | sort":"10.0.99.5\n10.0.99.5\n10.0.99.5\n10.0.99.5\n10.0.99.5\n192.168.1.10\n192.168.1.10\n...\n💡 sort は隣接する同じ値を並べる（uniq の前準備として必須）","awk '{print $1}' data/access.log | sort | uniq":"10.0.99.5\n192.168.1.10\n192.168.1.11\n192.168.1.12\n192.168.1.13\n192.168.1.14\n💡 uniq は「隣接する重複を除去」する。sort 前に使うと正しく動かない","awk '{print $1}' data/access.log | sort | uniq -c":"      5 10.0.99.5\n      4 192.168.1.10\n      3 192.168.1.11\n      2 192.168.1.12\n      2 192.168.1.13\n      1 192.168.1.14\n💡 -c で件数を付ける。sort -rn でランキングにできる","help":"=== 練習コマンド一覧 ===\n【ログの中身を確認】\n  head -3 data/access.log\n\n【grep の動きを体験】\n  grep '200' data/access.log | head -3     → マッチする行\n  grep -v '200' data/access.log            → マッチしない行（-v = 除外）\n\n【awk で列を取り出す】\n  awk '{print $1}' data/access.log | head -5   → IP列\n  awk '{print $9}' data/access.log | head -5   → ステータス列\n  awk '{print $1, $9}' data/access.log | head -5\n\n【sort | uniq の仕組みを理解する】\n  awk '{print $1}' data/access.log | sort        → ソート\n  awk '{print $1}' data/access.log | sort | uniq → 重複除去\n  awk '{print $1}' data/access.log | sort | uniq -c → 件数付き"}},"Week03":{"prompt":"ubuntu@dev01:~$","intro":["=== Week03 コマンド事前練習 ===","ユーザー情報の読み方・プロセスの見方を体験しよう","・/etc/passwd や id コマンドでユーザー情報を読む","・ps / top でプロセスの状態を確認する","・systemctl の各状態の意味を確認する"],"commands":{"cat /etc/passwd | head -5":"root:x:0:0:root:/root:/bin/bash\ndaemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin\nubuntu:x:1000:1000:Ubuntu:/home/ubuntu:/bin/bash\nwww-data:x:33:33:www-data:/var/www:/usr/sbin/nologin\nmysql:x:999:999::/var/lib/mysql:/bin/false\n💡 書式: ユーザー名:x:UID:GID:コメント:ホームDir:シェル\n  nologin/false = ログインできないシステムユーザー","id ubuntu":"uid=1000(ubuntu) gid=1000(ubuntu) groups=1000(ubuntu),4(adm),27(sudo)\n💡 UID=1000以上が一般ユーザー。sudo グループにいると sudo が使える","id www-data":"uid=33(www-data) gid=33(www-data) groups=33(www-data)\n💡 UID=33 はシステムユーザー。Apache がこのユーザーで動く","cat /etc/group | grep sudo":"sudo:x:27:ubuntu\n💡 sudo グループのメンバーに ubuntu がいる","ps aux | head -6":"USER       PID %CPU %MEM    VSZ   RSS TTY   STAT START   TIME COMMAND\nroot         1  0.0  0.1 169120 13000 ?     Ss   09:00   0:05 /sbin/init\nroot       456  0.0  0.2  72296 18000 ?     Ss   09:00   0:00 /usr/sbin/sshd\nwww-data  1234  0.1  0.3 123456 25000 ?     S    09:01   0:02 /usr/sbin/apache2\nubuntu    5678  0.0  0.1  21456  8000 pts/0 Ss   10:00   0:00 bash\n💡 STAT列: S=待機中, R=実行中, Ss=セッションリーダー\n  TTY列: ?=バックグラウンドサービス, pts/0=ターミナル","ps aux | grep apache2":"www-data  1234  0.1  0.3 123456 25000 ?  S  /usr/sbin/apache2\nwww-data  1235  0.0  0.2 123456 20000 ?  S  /usr/sbin/apache2\nwww-data  1236  0.0  0.2 123456 20000 ?  S  /usr/sbin/apache2\n💡 Apache は1つの親プロセス + 複数の子プロセスで動く（マルチプロセスモデル）","systemctl status apache2":"● apache2.service - The Apache HTTP Server\n   Loaded: loaded (/lib/systemd/system/apache2.service; enabled)\n   Active: active (running) since Wed 2025-05-01 09:01:00 JST\n  Main PID: 1234 (apache2)\n💡 enabled = OS起動時に自動起動する設定\n   active (running) = 今動いている","systemctl is-active apache2":"active","systemctl is-enabled apache2":"enabled\n💡 is-active=今動いているか / is-enabled=自動起動が設定されているか","journalctl -u apache2 -n 5":"May 01 09:01:00 dev01 systemd[1]: Starting The Apache HTTP Server...\nMay 01 09:01:01 dev01 apachectl[1230]: AH00558: apache2: Could not reliably determine FQDN\nMay 01 09:01:02 dev01 systemd[1]: Started The Apache HTTP Server.\n💡 journalctl -u サービス名 でそのサービスのログだけ絞れる","help":"=== 練習コマンド一覧 ===\n【ユーザー情報を読む】\n  cat /etc/passwd | head -5    → ユーザー一覧の書式を確認\n  id ubuntu                    → ubuntu の UID/グループ\n  id www-data                  → システムユーザーの UID\n  cat /etc/group | grep sudo   → sudo グループのメンバー\n\n【プロセスの見方】\n  ps aux | head -6             → 全プロセス（STAT列の意味を確認）\n  ps aux | grep apache2        → Apache のプロセス構成\n\n【systemctl の状態を確認】\n  systemctl status apache2     → 詳細な状態\n  systemctl is-active apache2  → 起動中か（active/inactive）\n  systemctl is-enabled apache2 → 自動起動か（enabled/disabled）\n  journalctl -u apache2 -n 5   → ログ確認"}},"Week04":{"prompt":"ubuntu@prod-web02:~$","intro":["=== Week04 コマンド事前練習 ===","ネットワーク確認コマンドの出力の読み方を体験しよう","・ip コマンドの出力を読む","・ss の各カラムの意味を確認する","・dig の出力から必要な情報を読み取る"],"commands":{"ip a":"1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536\n    inet 127.0.0.1/8 scope host lo\n    💡 lo = ループバック。自分自身を指す仮想NIC（127.0.0.1）\n2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500\n    inet 192.168.1.100/24 brd 192.168.1.255 scope global eth0\n    💡 /24 = サブネットマスク 255.255.255.0\n       brd = ブロードキャストアドレス","ip r":"default via 192.168.1.1 dev eth0 proto dhcp\n192.168.1.0/24 dev eth0 proto kernel scope link\n💡 default via 192.168.1.1 = デフォルトゲートウェイ\n   = このサーバーの「出口」。他のネットワークへはここを経由する","ss -tnlp":"State   Recv-Q  Send-Q  Local Address:Port  Peer Address:Port  Process\nLISTEN  0       128     0.0.0.0:22         0.0.0.0:*      users:((\"sshd\"))\nLISTEN  0       128     0.0.0.0:80         0.0.0.0:*      users:((\"apache2\"))\nLISTEN  0       128   127.0.0.1:3306       0.0.0.0:*      users:((\"mysqld\"))\n💡 0.0.0.0:22  = 全IPからの接続を受け付ける\n   127.0.0.1:3306 = ローカルのみ（外部からMySQLに直接接続できない）","ss -tnp":"State   Recv-Q  Send-Q  Local Address:Port  Peer Address:Port  Process\nESTAB   0       0       192.168.1.100:22   192.168.1.5:54321  users:((\"sshd\"))\n💡 ESTAB = 接続確立中（今SSHで繋いでいる接続が見える）","dig google.com A":";; QUESTION SECTION:\n;google.com.    IN  A\n\n;; ANSWER SECTION:\ngoogle.com.  300  IN  A  142.250.196.46\n\n;; Query time: 3 msec\n;; SERVER: 8.8.8.8#53\n💡 300 = TTL(秒)。このIPを300秒キャッシュしてよい\n   短いTTL = IPが頻繁に変わるサービス","dig google.com A +short":"142.250.196.46\n💡 +short で必要な情報だけ取り出せる","ping -c 3 8.8.8.8":"PING 8.8.8.8: 56 bytes of data.\n64 bytes from 8.8.8.8: icmp_seq=1 ttl=118 time=3.24 ms\n64 bytes from 8.8.8.8: icmp_seq=2 ttl=118 time=3.18 ms\n64 bytes from 8.8.8.8: icmp_seq=3 ttl=118 time=3.31 ms\n3 packets transmitted, 3 received, 0% packet loss\n💡 time= が応答時間(ms)。100ms超えると遅い。loss があると経路に問題あり","sudo firewall-cmd --list-all":"public (active)\n  interfaces: eth0\n  services: ssh\n  ports:\n💡 ports: が空欄 = HTTPポート(80)が開いていない！\n   外からアクセスできない原因はこれかもしれない","help":"=== 練習コマンド一覧 ===\n【IPアドレスとルーティングを読む】\n  ip a     → NICとIPアドレス（/24の意味を確認）\n  ip r     → ルーティングテーブル（デフォルトGWを確認）\n\n【ポート・コネクションを確認する】\n  ss -tnlp → 待ち受けポート一覧（0.0.0.0 vs 127.0.0.1 の違い）\n  ss -tnp  → 確立済みコネクション\n\n【DNSと疎通確認】\n  dig google.com A      → TTLの意味を確認\n  dig google.com A +short\n  ping -c 3 8.8.8.8\n\n【ファイアウォールの状態確認】\n  sudo firewall-cmd --list-all"}},"Week05":{"prompt":"ubuntu@prod-web01:~$","intro":["=== Week05 コマンド事前練習 ===","Apacheの設定ファイル構造とログの読み方を体験しよう","・設定ファイルの構造を確認する","・a2ensite/a2dissite の仕組みを理解する","・エラーログの読み方を覚える"],"commands":{"ls /etc/apache2/":"apache2.conf  conf-available  conf-enabled\nmods-available  mods-enabled\nports.conf  sites-available  sites-enabled\n💡 available = 用意されている設定\n   enabled   = 有効化された設定（available へのシンボリックリンク）","ls /etc/apache2/sites-available/":"000-default.conf  shop.hanamall.conf  admin.hanamall.conf","ls /etc/apache2/sites-enabled/":"shop.hanamall.conf -> /etc/apache2/sites-available/shop.hanamall.conf\n💡 a2ensite = sites-available → sites-enabled にシンボリックリンクを張る\n   a2dissite = そのリンクを削除する","cat /etc/apache2/sites-available/shop.hanamall.conf":"<VirtualHost *:80>\n    ServerName shop.hanamall.local\n    DocumentRoot /var/www/shop\n    CustomLog /var/log/apache2/shop_access.log combined\n    ErrorLog  /var/log/apache2/shop_error.log\n    <Directory /var/www/shop>\n        Require all granted\n    </Directory>\n</VirtualHost>\n💡 VirtualHost = 1台で複数サイトを動かす設定\n   DocumentRoot = HTMLファイルの置き場","sudo apache2ctl configtest":"Syntax OK\n💡 設定ファイルに文法エラーがないか事前チェック\n   reload の前に必ず実行する習慣をつける","sudo tail -5 /var/log/apache2/shop_error.log":"[Thu May 01 11:00:00.123456 2025] [mpm_event:notice] [pid 1] Apache/2.4.52 configured\n[Thu May 01 11:05:00.234567 2025] [core:error] [client 192.168.1.10] File does not exist: /var/www/shop/favicon.ico\n💡 [core:error] = エラーレベル\n   File does not exist = DocumentRoot のファイルが見つからない（よくある404の原因）","sudo tail -5 /var/log/apache2/shop_access.log":"192.168.1.10 - - [01/May/2025:11:05:01 +0900] \"GET / HTTP/1.1\" 200 1024\n192.168.1.11 - - [01/May/2025:11:05:30 +0900] \"GET /products HTTP/1.1\" 200 4521\n10.0.99.5 - - [01/May/2025:11:06:00 +0900] \"GET /admin HTTP/1.1\" 403 210\n💡 200=成功, 403=権限なし, 404=ファイルなし, 500=サーバーエラー","ls -la /var/www/":"drwxr-xr-x 4 root     root     4096 5月  1 11:00 .\ndrwxr-xr-x 3 root     root     4096 5月  1 09:00 html\ndrwxr-xr-x 2 www-data www-data 4096 5月  1 11:00 shop\ndrwxr-xr-x 2 www-data www-data 4096 5月  1 11:00 admin\n💡 Apache(www-data)が読めるよう所有者を www-data にする\n   755 でないと 403 Forbidden が出る","help":"=== 練習コマンド一覧 ===\n【設定ファイルの構造を理解する】\n  ls /etc/apache2/               → ディレクトリ構造\n  ls /etc/apache2/sites-available/\n  ls /etc/apache2/sites-enabled/  → シンボリックリンクの確認\n  cat /etc/apache2/sites-available/shop.hanamall.conf\n\n【設定チェックとログ】\n  sudo apache2ctl configtest\n  sudo tail -5 /var/log/apache2/shop_error.log\n  sudo tail -5 /var/log/apache2/shop_access.log\n\n【パーミッションの確認】\n  ls -la /var/www/"}},"Week06":{"prompt":"ubuntu@prod-web01:~$","intro":["=== Week06 コマンド事前練習 ===","SSH鍵の仕組みとcronの書き方を体験しよう","・鍵ファイルの種類と役割を確認する","・sshd_config の各設定の意味を読む","・cron の書式を理解する"],"commands":{"ls -la ~/.ssh/":"-rw------- 1 ubuntu ubuntu  411 5月  1 10:00 authorized_keys  ← 600必須\n-rw------- 1 ubuntu ubuntu  399 5月  1 10:00 id_ed25519       ← 秘密鍵 600必須\n-rw-r--r-- 1 ubuntu ubuntu  105 5月  1 10:00 id_ed25519.pub   ← 公開鍵 644でOK\n💡 秘密鍵は自分だけ読める(600)でないとSSHが拒否する\n   公開鍵はサーバーに登録してOK（流出してもリスクなし）","cat ~/.ssh/id_ed25519.pub":"ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIxxxxxxxxxx hanamall\n💡 これを相手サーバーの ~/.ssh/authorized_keys に追記する\n   ssh-copy-id コマンドがこの作業を自動でやってくれる","grep -v '^#' /etc/ssh/sshd_config | grep -v '^$'":"Include /etc/ssh/sshd_config.d/*.conf\nKbdInteractiveAuthentication no\nUsePAM yes\nX11Forwarding yes\nPrintMotd no\nAcceptEnv LANG LC_*\nSubsystem sftp /usr/lib/openssh/sftp-server\nPermitRootLogin no\nPasswordAuthentication no\n💡 # をコメントアウトして確認。PermitRootLogin/PasswordAuthentication を確認","echo '0 9 * * * /usr/local/bin/report.sh'":"0 9 * * * /usr/local/bin/report.sh\n💡 cron書式: 分 時 日 月 曜日 コマンド\n  0 9 * * *  = 毎日9時0分\n  */5 * * * * = 5分ごと\n  0 2 * * 1  = 毎週月曜2時","echo '*/5 * * * * /usr/local/bin/healthcheck.sh'":"*/5 * * * * /usr/local/bin/healthcheck.sh\n💡 */5 = 5の倍数の分（0,5,10,15...）= 5分ごと","echo '0 2 * * * /usr/local/bin/backup.sh >> /var/log/backup.log 2>&1'":"0 2 * * * /usr/local/bin/backup.sh >> /var/log/backup.log 2>&1\n💡 >> でログを追記\n   2>&1 でエラー出力も同じファイルへ（これがないとエラーが記録されない）","sudo grep 'Failed password' /var/log/auth.log | tail -5":"May  1 09:12:45 prod-web01 sshd[5700]: Failed password for root from 203.0.113.99 port 12345\nMay  1 09:12:46 prod-web01 sshd[5700]: Failed password for root from 203.0.113.99 port 12346\nMay  1 09:12:47 prod-web01 sshd[5700]: Failed password for root from 203.0.113.99 port 12347\n💡 1秒に1回 root へのパスワード試行 = ブルートフォース攻撃\n   PasswordAuthentication no にすればこの攻撃が無効化される","help":"=== 練習コマンド一覧 ===\n【SSH鍵ファイルの確認】\n  ls -la ~/.ssh/                          → 鍵ファイルとパーミッション\n  cat ~/.ssh/id_ed25519.pub               → 公開鍵の中身\n\n【sshd_config の読み方】\n  grep -v '^#' /etc/ssh/sshd_config | grep -v '^$'\n\n【cron 書式の練習】\n  echo '0 9 * * * /usr/local/bin/report.sh'\n  echo '*/5 * * * * /usr/local/bin/healthcheck.sh'\n  echo '0 2 * * * /usr/local/bin/backup.sh >> /var/log/backup.log 2>&1'\n\n【攻撃の実態を確認】\n  sudo grep 'Failed password' /var/log/auth.log | tail -5"}},"Week07":{"prompt":"ubuntu@prod-web01:~$","intro":["=== Week07 コマンド事前練習 ===","スクリプトの構成要素を単独で体験しよう","・set -e の効果を確認する","・trap の動きを理解する","・終了コードの仕組みを確認する"],"commands":{"echo $?":"0\n💡 直前のコマンドの終了コード。0=成功、0以外=失敗\n   スクリプトで if [ $? -eq 0 ] などで判定に使う","ls /tmp > /dev/null; echo $?":"0  ← /tmp が存在するので成功","ls /not/exist > /dev/null 2>&1; echo $?":"2  ← 存在しないので失敗（終了コード2）","date '+%Y-%m-%d %H:%M:%S'":"2025-05-01 12:00:00\n💡 ログのタイムスタンプに使う定番フォーマット\n   スクリプト内で: echo \"[$(date '+%Y-%m-%d %H:%M:%S')] 処理開始\"","ls /tmp/*.lock 2>/dev/null || echo 'ロックファイルなし'":"ロックファイルなし\n💡 || はコマンドが失敗したときだけ右を実行\n   ロックファイルがなければ処理を続け、あればスキップする仕組みに使う","touch /tmp/test.lock && echo 'ロック取得' || echo '取得失敗'":"ロック取得\n💡 && は成功したときだけ右を実行（-eと組み合わせてエラーチェックに使う）","find /var/log -name '*.log' -mtime +7 2>/dev/null | head -5":"/var/log/apache2/access.log.1\n/var/log/syslog.1\n/var/log/auth.log.1\n💡 -mtime +7 = 最終更新が7日以上前のファイル\n   これを rm や gzip に渡して古いログを整理する","find /var/log -name '*.log' -mtime +7 2>/dev/null | wc -l":"3\n💡 wc -l = 行数を数える = 対象ファイルの件数","du -sh /var/log/":"/var/log/  128M\n💡 スクリプト内でディスク使用量をチェックするときに使う\n   数値だけ取り出す: du -s /var/log/ | cut -f1","help":"=== 練習コマンド一覧 ===\n【終了コードを理解する】\n  echo $?\n  ls /tmp > /dev/null; echo $?\n  ls /not/exist > /dev/null 2>&1; echo $?\n\n【スクリプトで使う定番パターン】\n  date '+%Y-%m-%d %H:%M:%S'                → タイムスタンプ生成\n  ls /tmp/*.lock 2>/dev/null || echo '...' → ロックチェック\n  touch /tmp/test.lock && echo 'ロック取得'\n\n【古いファイルの操作】\n  find /var/log -name '*.log' -mtime +7 2>/dev/null | head -5\n  find /var/log -name '*.log' -mtime +7 2>/dev/null | wc -l\n  du -sh /var/log/"}},"Week08":{"prompt":"ubuntu@prod-web01:~$","intro":["=== Week08 コマンド事前練習 ===","ディスク管理コマンドの出力の読み方を体験しよう","・df の各カラムの意味を確認する","・du で容量の大きい場所を特定する流れを練習する","・lsblk でディスク構成を読む"],"commands":{"df -h":"Filesystem      Size  Used Avail Use% Mounted on\n/dev/sda1        20G  8.2G   11G  44% /\ntmpfs           985M     0  985M   0% /dev/shm\n/dev/sdb1        50G   12G   38G  24% /backup\n💡 Use% が 85%超えたら要注意。100%になるとサービスが止まる\n   tmpfs はメモリ上の一時ファイルシステム","df -h /var":"Filesystem      Size  Used Avail Use% Mounted on\n/dev/sda1        20G  8.2G   11G  44% /\n💡 特定ディレクトリがどのファイルシステムにあるか確認できる","du -sh /var/log":"128M    /var/log\n💡 -s で合計のみ表示（サブディレクトリを展開しない）","du -sh /var/log/*":"/var/log/apache2  96M\n/var/log/auth.log  2.1M\n/var/log/syslog    8.4M\n/var/log/dpkg.log  512K","du -sh /var/log/* | sort -rh":"/var/log/apache2  96M   ← 一番大きい\n/var/log/syslog    8.4M\n/var/log/auth.log  2.1M\n/var/log/dpkg.log  512K\n💡 sort -rh = サイズの大きい順。これが「犯人特定」の定番コマンド","lsblk":"NAME   MAJ:MIN RM  SIZE RO TYPE MOUNTPOINTS\nsda      8:0    0   20G  0 disk\n└─sda1   8:1    0   20G  0 part /\nsdb      8:16   0   50G  0 disk\n└─sdb1   8:17   0   50G  0 part /backup\n💡 ツリー形式でディスク→パーティションの構成が見える\n   MOUNTPOINTS が空 = マウントされていない","pvs 2>/dev/null || echo 'LVM未使用'":"  PV         VG        Fmt  PSize  PFree\n  /dev/sda2  ubuntu-vg lvm2  19.0g  0g\n💡 LVMが使われている場合はこの出力が見える\n   PFree が 0 = VGに空きなし → 新しいディスクを追加する必要がある","rsync -av --dry-run /var/www/ /backup/www/":"sending incremental file list\n./\nindex.html\nshop/index.html\nadmin/index.html\nsent 234 bytes  received 42 bytes\n💡 --dry-run = 実際には何もしない（確認専用）\n   本番実行前に必ずdry-runで確認する習慣をつける","help":"=== 練習コマンド一覧 ===\n【ディスク使用量を確認する】\n  df -h              → ファイルシステム全体\n  df -h /var         → 特定ディレクトリのFS\n\n【容量の大きい場所を特定する】\n  du -sh /var/log\n  du -sh /var/log/*\n  du -sh /var/log/* | sort -rh   ← 大きい順\n\n【ディスク構成を読む】\n  lsblk              → ディスクとパーティション\n  pvs 2>/dev/null || echo 'LVM未使用'\n\n【rsync の確認】\n  rsync -av --dry-run /var/www/ /backup/www/"}},"Week09":{"prompt":"ubuntu@prod-web01:~$","intro":["=== Week09 コマンド事前練習 ===","パッケージ管理とsystemdの仕組みを体験しよう","・apt の情報確認コマンドを試す","・Unit ファイルの各セクションの意味を読む","・journalctl の絞り込み方を練習する"],"commands":{"apt-cache show apache2 | head -15":"Package: apache2\nVersion: 2.4.52-1ubuntu4.7\nArchitecture: amd64\nDepends: apache2-bin (= 2.4.52-1ubuntu4.7), apache2-data (= 2.4.52-1ubuntu4.7)\nRecommends: ssl-cert\nDescription: Apache HTTP Server\n💡 Depends = 依存パッケージ。apache2 を hold すると関連パッケージも hold すべき理由","apt-cache policy apache2":"apache2:\n  Installed: 2.4.52-1ubuntu4.7\n  Candidate: 2.4.52-1ubuntu4.7\n  Version table:\n *** 2.4.52-1ubuntu4.7 500\n        500 http://archive.ubuntu.com/ubuntu jammy-updates/main\n💡 Installed = 現在のバージョン\n   Candidate = アップグレード先のバージョン\n   同じなら最新が入っている","systemctl cat apache2":"# /lib/systemd/system/apache2.service\n[Unit]\nDescription=The Apache HTTP Server\nAfter=network.target remote-fs.target nss-lookup.target\n\n[Service]\nType=forking\nExecStart=/usr/sbin/apachectl start\nExecStop=/usr/sbin/apachectl graceful-stop\nExecReload=/usr/sbin/apachectl graceful\n\n[Install]\nWantedBy=multi-user.target\n💡 systemctl cat でそのサービスのUnit ファイルを確認できる","systemctl list-units --type=service --state=running | head -10":"  UNIT                   LOAD   ACTIVE SUB     DESCRIPTION\n  apache2.service        loaded active running The Apache HTTP Server\n  cron.service           loaded active running Regular background program processing\n  sshd.service           loaded active running OpenSSH server daemon\n  systemd-journald.service loaded active running Journal Service\n💡 --state=running で現在動いているサービスだけ表示","journalctl -u apache2 --since '10 minutes ago'":"May 01 12:00:00 prod-web01 systemd[1]: Started The Apache HTTP Server.\nMay 01 12:00:01 prod-web01 apache2[1234]: AH00558: apache2: Could not reliably determine FQDN\n💡 --since で時間絞り込み。障害時間帯を指定してログを確認する","journalctl -u apache2 -p err":"May 01 11:00:00 prod-web01 apache2[1234]: (28)No space left on device: write failed\n💡 -p err でエラー以上のログだけ表示（emerg/alert/crit/err/warning/notice/info/debug）","journalctl --since today --until '1 hour ago' | grep 'Failed'":"May 01 09:12:45 prod-web01 sshd[5700]: Failed password for root from 203.0.113.99\nMay 01 09:12:46 prod-web01 sshd[5700]: Failed password for root from 203.0.113.99\n💡 --since/--until で時間範囲を指定してログを絞れる","sudo logrotate --debug /etc/logrotate.d/apache2":"reading config file /etc/logrotate.d/apache2\nHandling 2 files from /etc/logrotate.d/apache2\n  rotating pattern: /var/log/apache2/*.log after 1 days (14 rotations)\n  empty log files are not rotated, old logs are compressed\n💡 --debug で実際には何もせずに設定を確認できる","help":"=== 練習コマンド一覧 ===\n【パッケージ情報を調べる】\n  apt-cache show apache2 | head -15   → 依存関係を確認\n  apt-cache policy apache2            → バージョン確認\n\n【systemd の仕組みを読む】\n  systemctl cat apache2               → Unit ファイルの中身\n  systemctl list-units --type=service --state=running | head -10\n\n【journalctl の絞り込み方】\n  journalctl -u apache2 --since '10 minutes ago'\n  journalctl -u apache2 -p err\n  journalctl --since today --until '1 hour ago' | grep 'Failed'\n\n【logrotate の確認】\n  sudo logrotate --debug /etc/logrotate.d/apache2"}},"Week10":{"prompt":"ubuntu@prod-web01:~$","intro":["=== Week10 コマンド事前練習 ===","リソース監視コマンドの出力の読み方を体験しよう","・vmstat の各カラムの意味を確認する","・top の見方を練習する","・ログから障害の痕跡を読む方法を確認する"],"commands":{"vmstat 1 3":"procs -----------memory---------- ---swap-- -----io---- ------cpu-----\n r  b   swpd   free   buff  cache   si   so    bi    bo   us sy id wa\n 1  0      0 850000  12344 202876    0    0     0     0    2  1 97  0\n 1  0      0 849800  12344 202876    0    0     0    64    3  1 95  1\n💡 r=実行待ちプロセス数（2以上で混雑）\n   us=ユーザーCPU%, sy=システムCPU%, id=アイドル%, wa=I/O待ち%\n   si/so=スワップイン/アウト（0でないとメモリ不足）","free -h":"               total        used        free      shared  buff/cache   available\nMem:           1.9Gi       512Mi       234Mi        12Mi       1.1Gi       1.3Gi\nSwap:          2.0Gi          0B       2.0Gi\n💡 available が重要（free + 解放可能なbuff/cache）\n   Swap used が増えてきたらメモリ不足のサイン","top -bn1 | head -8":"top - 12:00:00 up 5 days, 4:05, 2 users, load average: 0.15, 0.12, 0.10\nTasks: 145 total, 1 running, 144 sleeping\n%Cpu(s): 2.1 us, 1.2 sy, 0.0 ni, 96.2 id, 0.5 wa\nMiB Mem: 1944.5 total, 234.1 free, 512.3 used, 1198.1 buff/cache\nMiB Swap: 2048.0 total, 2048.0 free, 0.0 used\n\n    PID USER    %CPU %MEM  COMMAND\n   1234 www-data  0.1  1.3  apache2\n💡 load average: 0.15 = 1分平均の実行待ちプロセス数。CPUコア数以上になると混雑","sudo dmesg | grep -i 'oom' | tail -5":"[12345.678] Out of memory: Killed process 9876 (php-fpm) total-vm:512000kB\n💡 OOM Killer = メモリ不足のとき OSが強制的にプロセスを殺す仕組み\n   これが出ていたらメモリを増やすか、不要プロセスを減らす必要がある","sudo grep 'No space left' /var/log/syslog | tail -3":"May 01 14:10:00 prod-web01 apache2: No space left on device: write failed\nMay 01 14:10:01 prod-web01 apache2: No space left on device: error log file\n💡 ディスクフルになるとサービスがログを書けなくなって落ちる\n   df -h で確認 → du で原因特定 → 削除 → 再起動の流れ","sar -u 1 3 2>/dev/null || echo 'sysstat未インストール'":"sysstat未インストール\n💡 sar は過去のリソース使用履歴を見るコマンド（sysstat パッケージが必要）\n   apt install sysstat でインストールできる","help":"=== 練習コマンド一覧 ===\n【CPU・メモリの状態を読む】\n  vmstat 1 3      → CPU使用率とI/O待ちのカラムを確認\n  free -h         → available の意味を確認\n  top -bn1 | head -8  → load average の読み方\n\n【障害の痕跡をログで確認する】\n  sudo dmesg | grep -i 'oom' | tail -5\n  sudo grep 'No space left' /var/log/syslog | tail -3\n\n【過去のリソース記録】\n  sar -u 1 3 2>/dev/null || echo 'sysstat未インストール'"}},"Week11":{"prompt":"ubuntu@prod-web01:~$","intro":["=== Week11 コマンド事前練習 ===","Dockerの基本概念とコマンドを体験しよう","・イメージとコンテナの違いを確認する","・docker コマンドの基本操作を練習する","・docker-compose の構成を読む"],"commands":{"docker --version":"Docker version 24.0.7, build afdd53b","docker images":"REPOSITORY    TAG       IMAGE ID       CREATED         SIZE\nubuntu        22.04     1234567890ab   2 weeks ago     77.8MB\nhttpd         2.4       f1e2d3c4b5a6   3 days ago      148MB\nmysql         8.0       abcdef123456   1 week ago      632MB\n💡 イメージ = コンテナの設計図（Dockerfile からビルドするか Docker Hub から取得）\n   コンテナ = イメージを実行したもの（何個でも起動できる）","docker ps":"CONTAINER ID   IMAGE      PORTS                  NAMES\na1b2c3d4e5f6   httpd:2.4  0.0.0.0:8080->80/tcp   myapache\n💡 PORTS列: 0.0.0.0:8080->80/tcp\n   = ホストの8080番 → コンテナの80番に転送\n   -p 8080:80 で指定した内容がここに表示される","docker ps -a":"CONTAINER ID   IMAGE      STATUS                    NAMES\na1b2c3d4e5f6   httpd:2.4  Up 1 hour                 myapache\nb2c3d4e5f6a1   ubuntu     Exited (0) 2 hours ago    test\n💡 -a で停止中のコンテナも表示\n   Exited = 停止中（docker start で再起動できる）","docker inspect myapache | head -20":"[\n  {\n    \"Id\": \"a1b2c3d4e5f6...\",\n    \"State\": {\n        \"Status\": \"running\",\n        \"Pid\": 1234\n    },\n    \"NetworkSettings\": {\n        \"IPAddress\": \"172.17.0.2\"\n    }\n  }\n]\n💡 docker inspect でコンテナの詳細情報（IPアドレス、マウント等）を確認できる","cat hands-on/docker-compose.yml":"version: '3'\nservices:\n  web:\n    build: .\n    ports:\n      - \"8080:80\"\n    volumes:\n      - ./html:/var/www/html\n    depends_on:\n      - db\n  db:\n    image: mysql:8.0\n    environment:\n      MYSQL_ROOT_PASSWORD: secret\n💡 volumes: ホストのディレクトリをコンテナにマウント\n   depends_on: db が起動してから web を起動する\n   environment: コンテナに環境変数を渡す","cat hands-on/Dockerfile":"FROM ubuntu:22.04\nENV DEBIAN_FRONTEND=noninteractive\nRUN apt-get update && apt-get install -y apache2\nCOPY html/ /var/www/html/\nEXPOSE 80\nCMD [\"apache2ctl\", \"-D\", \"FOREGROUND\"]\n💡 FROM: ベースイメージ\n   RUN:  ビルド時に実行するコマンド\n   COPY: ホストのファイルをコンテナにコピー\n   CMD:  コンテナ起動時に実行するコマンド\n   FOREGROUND: デーモンではなくフォアグラウンドで起動（コンテナに必須）","help":"=== 練習コマンド一覧 ===\n【基本情報を確認する】\n  docker --version\n  docker images       → ローカルにあるイメージ一覧\n  docker ps           → 起動中のコンテナ\n  docker ps -a        → 停止中も含めた全コンテナ\n  docker inspect myapache | head -20  → コンテナ詳細\n\n【設定ファイルの読み方】\n  cat hands-on/docker-compose.yml  → depends_on/volumes の意味を確認\n  cat hands-on/Dockerfile          → FROM/RUN/COPY/CMD の意味を確認"}},"Week12":{"prompt":"ubuntu@prod-web03:~$","intro":["=== Week12 コマンド事前練習 ===","本番投入前チェックで使うコマンドを確認しよう","・各設定の確認コマンドをひとつずつ体験する","・「どこを見ればわかるか」を事前に把握する"],"commands":{"sshd -T | grep -E 'permitrootlogin|passwordauthentication'":"permitrootlogin no\npasswordauthentication no\n💡 sshd -T で現在有効なsshd設定を全部確認できる（コメントアウトも含む）","sudo apache2ctl -S":"VirtualHost configuration:\n*:80    shop.hanamall.local (/etc/apache2/sites-enabled/shop.hanamall.conf:1)\n*:80    admin.hanamall.local (/etc/apache2/sites-enabled/admin.hanamall.conf:1)\nServerRoot: \"/etc/apache2\"\nMain DocumentRoot: \"/var/www/html\"\n💡 -S でバーチャルホストの一覧と設定ファイルの場所が確認できる","sudo firewall-cmd --list-all":"public (active)\n  interfaces: eth0\n  services: ssh http\n  ports:\n  rich rules:\n💡 services: に ssh と http だけがあればOK\n   不審なポートや rich rules がないことを確認する","crontab -l 2>/dev/null || echo 'cronジョブなし'":"0 2 * * * /usr/local/bin/hanamall_backup.sh >> /var/log/hanamall_backup.log 2>&1\n*/5 * * * * /usr/local/bin/hanamall_monitor.sh\n💡 >> でログを追記、2>&1 でエラーもログに記録されているか確認","systemctl list-units --type=service --state=failed":"  UNIT   LOAD   ACTIVE SUB    DESCRIPTION\n0 loaded units listed.\n💡 failed なサービスが0件 = 問題なし\n   本番投入前に必ず確認する","sudo logrotate --debug /etc/logrotate.d/hanamall 2>&1 | head -5":"reading config file /etc/logrotate.d/hanamall\nHandling 1 files from /etc/logrotate.d/hanamall\n  rotating pattern: /var/log/hanamall_*.log after 1 days (14 rotations)\n💡 --debug で設定が正しく読まれているか確認できる","sudo last | head -10":"ubuntu   pts/0  192.168.1.5  Thu May  1 10:00   still logged in\nubuntu   pts/0  192.168.1.5  Wed Apr 30 09:00 - 18:00  (09:00)\nreboot   system boot       Wed Apr 30 08:55\n💡 last コマンドでログイン履歴を確認\n   見知らぬIPからのログインがないか本番前にチェック","help":"=== 練習コマンド一覧 ===\n【SSH設定の確認】\n  sshd -T | grep -E 'permitrootlogin|passwordauthentication'\n\n【Apache設定の確認】\n  sudo apache2ctl -S   → バーチャルホスト一覧\n\n【ファイアウォールの確認】\n  sudo firewall-cmd --list-all\n\n【cron・サービスの確認】\n  crontab -l 2>/dev/null || echo 'cronジョブなし'\n  systemctl list-units --type=service --state=failed\n\n【logrotate・ログインの確認】\n  sudo logrotate --debug /etc/logrotate.d/hanamall 2>&1 | head -5\n  sudo last | head -10"}},"LAMP_apache":{"prompt":"ubuntu@web-server:~$","intro":["=== Apache Webサーバー 構築練習 ===","インストールから起動確認まで体験しよう","・apt でインストール → systemctl で起動","・curl で HTTP レスポンスを確認"],"commands":{"sudo apt update":"取得:1 http://archive.ubuntu.com jammy InRelease [270 kB]\n完了\n271 個のパッケージをアップグレードできます。","sudo apt install -y apache2":"パッケージリストを読み込んでいます... 完了\n以下が新たにインストールされます: apache2 apache2-bin apache2-data\n...\n設定中 apache2 (2.4.52-1ubuntu4) ...","sudo systemctl start apache2":"","sudo systemctl enable apache2":"Synchronizing state of apache2.service with SysV service script.\nExecuting: /lib/systemd/systemd-sysv-install enable apache2","sudo systemctl status apache2":"● apache2.service - The Apache HTTP Server\n     Loaded: loaded (/lib/systemd/system/apache2.service; enabled)\n     Active: active (running) since Wed 2026-05-27 10:00:00 JST\n   Main PID: 1235 (apache2)\n     Memory: 4.6M\n     CGroup: /system.slice/apache2.service\n             ├─1235 /usr/sbin/apache2 -k start\n             ├─1236 /usr/sbin/apache2 -k start\n             └─1237 /usr/sbin/apache2 -k start","sudo ufw allow 'Apache'":"規則を追加しました\n規則を追加しました (v6)","sudo ufw status":"状態: アクティブ\nTo                  Action  From\nOpenSSH             ALLOW   Anywhere\nApache              ALLOW   Anywhere\nOpenSSH (v6)        ALLOW   Anywhere (v6)\nApache (v6)         ALLOW   Anywhere (v6)","curl http://localhost":"<!DOCTYPE html>\n<html>\n  <head><title>Apache2 Ubuntu Default Page</title></head>\n  <body>\n    <h1>It works!</h1>\n    <p>This is the default welcome page used to test the\n    correct operation of the Apache2 server.</p>\n  </body>\n</html>","ls /etc/apache2/":"apache2.conf  conf-available  conf-enabled  envvars  magic\nmods-available  mods-enabled  ports.conf  sites-available  sites-enabled","cat /etc/apache2/ports.conf":"Listen 80\n\n<IfModule ssl_module>\n        Listen 443\n</IfModule>\n\n💡 ポート変更時はこのファイルを編集する","sudo systemctl reload apache2":"💡 reload: 設定を再読み込み（接続を切らずに反映）\n   restart: サービス再起動（一瞬ダウンタイムあり）","help":"=== Apache 練習コマンド一覧 ===\n【インストール】\n  sudo apt update\n  sudo apt install -y apache2\n\n【起動・管理】\n  sudo systemctl start apache2\n  sudo systemctl enable apache2\n  sudo systemctl status apache2\n  sudo systemctl reload apache2\n\n【ファイアウォール】\n  sudo ufw allow 'Apache'\n  sudo ufw status\n\n【動作確認】\n  curl http://localhost\n\n【設定確認】\n  ls /etc/apache2/\n  cat /etc/apache2/ports.conf"}},"LAMP_mysql":{"prompt":"ubuntu@db-server:~$","intro":["=== MySQL DBサーバー 構築練習 ===","インストールから DB・ユーザー作成まで体験しよう","・apt でインストール","・systemctl で起動管理","・mysql でDB操作"],"commands":{"sudo apt install -y mysql-server":"パッケージリストを読み込んでいます... 完了\n以下が新たにインストールされます:\n  mysql-client-8.0 mysql-server-8.0\n...\n設定中 mysql-server-8.0 (8.0.36-0ubuntu0.22.04.1) ...","sudo systemctl start mysql":"","sudo systemctl enable mysql":"Synchronizing state of mysql.service...\nExecuting: /lib/systemd/systemd-sysv-install enable mysql","sudo systemctl status mysql":"● mysql.service - MySQL Community Server\n     Loaded: loaded (/lib/systemd/system/mysql.service; enabled)\n     Active: active (running) since Wed 2026-05-27 10:05:00 JST\n     Status: Server is operational\n     Memory: 364.3M","sudo mysql -u root":"Welcome to the MySQL monitor. Commands end with ; or \\g.\nYour MySQL connection id is 8\nServer version: 8.0.36 (Ubuntu)\n\nmysql>  ← 実機ではここで SQL コマンドを実行します","sudo mysql_secure_installation":"Securing the MySQL server deployment.\n\n[対話式で実行されます — 実機で確認しましょう]\n\n💡 設定項目:\n   ✓ rootパスワードの設定\n   ✓ 匿名ユーザーの削除\n   ✓ リモートrootログインの禁止\n   ✓ testデータベースの削除","mysql -u hanamall -p hanamall_db":"Enter password: \nWelcome to the MySQL monitor.\nmysql>  (接続成功！)","help":"=== MySQL 練習コマンド一覧 ===\n【インストール・起動】\n  sudo apt install -y mysql-server\n  sudo systemctl start mysql\n  sudo systemctl enable mysql\n  sudo systemctl status mysql\n\n【セキュリティ設定】\n  sudo mysql_secure_installation\n\n【接続確認】\n  sudo mysql -u root\n  mysql -u hanamall -p hanamall_db\n\n💡 SQL操作は実機で実施してください"}},"LAMP_php":{"prompt":"ubuntu@web-server:~$","intro":["=== PHP インストール・Apache 連携練習 ===","PHP をインストールして Apache と連携させよう","・libapache2-mod-php で Apache に統合","・php-mysql で MySQL 接続を有効化"],"commands":{"sudo apt install -y php libapache2-mod-php php-mysql":"パッケージリストを読み込んでいます... 完了\n以下が新たにインストールされます:\n  libapache2-mod-php8.1  php  php-mysql  php8.1\n  php8.1-cli  php8.1-mysql  php8.1-opcache\n...\n設定中 libapache2-mod-php8.1 (8.1.2-1ubuntu2.14) ...","php --version":"PHP 8.1.2-1ubuntu2.14 (cli) (built: Aug 18 2023 11:41:11) (NTS)\nCopyright (c) The PHP Group\nZend Engine v4.1.2, Copyright (c) Zend Technologies\n    with Zend OPcache v8.1.2, Copyright (c), by Zend Technologies","php -m | grep mysql":"mysqli\nmysqlnd\npdo_mysql","php -m":"bcmath\nCore\nctype\ncurl\ndate\ndom\nhash\njson\nmysqli\nmysqlnd\nopenssl\npcre\nPDO\npdo_mysql\nPhar\nReflection\nsession\nSPL\nstandard\nZend OPcache\nzip\nzlib","sudo systemctl restart apache2":"💡 PHP インストール後は Apache を再起動して mod_php を有効にします","apache2 -M | grep php":"Loaded Modules:\n php8.1_module (shared)\n\n💡 php8.1_module が表示されれば Apache に PHP が統合されています","help":"=== PHP 練習コマンド一覧 ===\n【インストール】\n  sudo apt install -y php libapache2-mod-php php-mysql\n\n【バージョン確認】\n  php --version\n\n【モジュール確認】\n  php -m\n  php -m | grep mysql\n  apache2 -M | grep php\n\n【Apache再起動】\n  sudo systemctl restart apache2\n\n💡 info.php や接続テストは実機で確認しましょう"}},"DNS_primary":{"prompt":"ubuntu@ns1:~$","intro":["=== プライマリDNSサーバー (ns1.hanamall.internal) ===","BIND9 のインストールと設定を練習します。","・named-checkconf / named-checkzone で検証","・dig コマンドで名前解決を確認"],"commands":{"sudo apt update":"取得:1 http://archive.ubuntu.com jammy InRelease [270 kB]\n完了\n271 個のパッケージをアップグレードできます。","sudo apt install -y bind9 bind9utils bind9-doc":"パッケージリストを読み込んでいます... 完了\n以下が新たにインストールされます: bind9 bind9utils bind9-doc\n...\n設定中 bind9 (1:9.18.12-0ubuntu0.22.04.1) ...","sudo systemctl enable named":"Synchronizing state of named.service with SysV service script.\nExecuting: /lib/systemd/systemd-sysv-install enable named","sudo systemctl start named":"","sudo systemctl status named":"● named.service - BIND Domain Name Server\n     Loaded: loaded (/lib/systemd/system/named.service; enabled)\n     Active: active (running) since Wed 2026-05-27 10:00:00 JST\n   Main PID: 1842 (named)\n     Memory: 20.1M\n     CGroup: /system.slice/named.service\n             └─1842 /usr/sbin/named -f -u bind","named -v":"BIND 9.18.12-0ubuntu0.22.04.1 (Extended Support Version) <id:>","sudo named-checkconf":"💡 エラーがなければ何も出力されません","sudo named-checkzone hanamall.internal /etc/bind/zones/hanamall.internal.zone":"Loading serial: 2024010101\nOK","sudo named-checkzone 1.168.192.in-addr.arpa /etc/bind/zones/1.168.192.rev":"Loading serial: 2024010101\nOK","sudo systemctl restart named":"","dig @localhost web01.hanamall.internal":"; <<>> DiG 9.18.12 <<>> @localhost web01.hanamall.internal\n;; ANSWER SECTION:\nweb01.hanamall.internal.\t86400\tIN\tA\t192.168.1.20\n\n;; Query time: 1 msec\n;; SERVER: 127.0.0.1#53(localhost)","dig @localhost -x 192.168.1.20":"; <<>> DiG 9.18.12 <<>> @localhost -x 192.168.1.20\n;; ANSWER SECTION:\n20.1.168.192.in-addr.arpa. 86400 IN PTR web01.hanamall.internal.\n\n;; Query time: 1 msec","dig @localhost hanamall.internal NS":"; <<>> DiG 9.18.12 <<>> @localhost hanamall.internal NS\n;; ANSWER SECTION:\nhanamall.internal.\t86400\tIN\tNS\tns1.hanamall.internal.\nhanamall.internal.\t86400\tIN\tNS\tns2.hanamall.internal."}},"DNS_secondary":{"prompt":"ubuntu@ns2:~$","intro":["=== セカンダリDNSサーバー (ns2.hanamall.internal) ===","ゾーン転送とスレーブ構成を練習します。","・プライマリ(192.168.1.10)が起動していることを前提としています。"],"commands":{"sudo apt install -y bind9 bind9utils":"パッケージリストを読み込んでいます... 完了\n以下が新たにインストールされます: bind9 bind9utils\n...\n設定中 bind9 (1:9.18.12-0ubuntu0.22.04.1) ...","sudo systemctl restart named":"","ls -la /var/cache/bind/":"合計 16\ndrwxrwsr-x 2 root bind 4096  5月 27 10:01 .\ndrwxr-xr-x 7 root root  4096  5月 27 10:00 ..\n-rw-r--r-- 1 bind bind  512  5月 27 10:01 hanamall.internal.zone\n-rw-r--r-- 1 bind bind  384  5月 27 10:01 1.168.192.rev\n💡 ゾーン転送成功！プライマリからファイルが転送された","sudo journalctl -u named -n 20":"May 27 10:01:00 ns2 named[2100]: zone hanamall.internal/IN: Transfer started.\nMay 27 10:01:00 ns2 named[2100]: transfer of hanamall.internal/IN from 192.168.1.10#53: connected\nMay 27 10:01:00 ns2 named[2100]: zone hanamall.internal/IN: transferred serial 2024010101\nMay 27 10:01:00 ns2 named[2100]: zone hanamall.internal/IN: Transfer completed","dig @192.168.1.11 web01.hanamall.internal":"; <<>> DiG 9.18.12 <<>> @192.168.1.11 web01.hanamall.internal\n;; ANSWER SECTION:\nweb01.hanamall.internal.\t86400\tIN\tA\t192.168.1.20\n\n;; SERVER: 192.168.1.11#53(192.168.1.11)","sudo rndc status":"version: BIND 9.18.12 <id:>\nrunning on ns2: Linux x86_64 5.15.0\nboot time: Wed, 27 May 2026 10:00:00 GMT\nlast configured: Wed, 27 May 2026 10:00:00 GMT\nnumber of zones: 2","sudo rndc reload":"server reload successful","sudo rndc reload hanamall.internal":"zone reload up-to-date"}},"DNS_verify":{"prompt":"ubuntu@client:~$","intro":["=== DNSクライアント 動作確認 ===","dig / nslookup / host コマンドで名前解決を確認します。","・プライマリDNS(192.168.1.10)が起動していることを前提としています。"],"commands":{"dig @192.168.1.10 web01.hanamall.internal":"; <<>> DiG 9.18.12 <<>> @192.168.1.10 web01.hanamall.internal\n;; ANSWER SECTION:\nweb01.hanamall.internal.\t86400\tIN\tA\t192.168.1.20\n\n;; Query time: 2 msec\n;; SERVER: 192.168.1.10#53(192.168.1.10)","dig @192.168.1.10 web01.hanamall.internal +short":"192.168.1.20","dig @192.168.1.10 -x 192.168.1.20":"; <<>> DiG 9.18.12 <<>> @192.168.1.10 -x 192.168.1.20\n;; ANSWER SECTION:\n20.1.168.192.in-addr.arpa. 86400 IN PTR web01.hanamall.internal.\n\n;; Query time: 1 msec","dig @192.168.1.10 hanamall.internal NS":"; <<>> DiG 9.18.12 <<>> @192.168.1.10 hanamall.internal NS\n;; ANSWER SECTION:\nhanamall.internal.\t86400\tIN\tNS\tns1.hanamall.internal.\nhanamall.internal.\t86400\tIN\tNS\tns2.hanamall.internal.","dig @192.168.1.10 hanamall.internal ANY":"; <<>> DiG 9.18.12 <<>> @192.168.1.10 hanamall.internal ANY\n;; ANSWER SECTION:\nhanamall.internal.\t86400\tIN\tNS\tns1.hanamall.internal.\nhanamall.internal.\t86400\tIN\tNS\tns2.hanamall.internal.\nhanamall.internal.\t86400\tIN\tSOA\tns1.hanamall.internal. admin.hanamall.internal. 2024010101 3600 900 604800 86400","nslookup web01.hanamall.internal 192.168.1.10":"Server:\t\t192.168.1.10\nAddress:\t192.168.1.10#53\n\nName:\tweb01.hanamall.internal\nAddress: 192.168.1.20","host web01.hanamall.internal 192.168.1.10":"Using domain server:\nName: 192.168.1.10\n\nweb01.hanamall.internal has address 192.168.1.20","ping -c 2 web01.hanamall.internal":"PING web01.hanamall.internal (192.168.1.20) 56(84) bytes of data.\n64 bytes from web01.hanamall.internal (192.168.1.20): icmp_seq=1 ttl=64 time=0.412 ms\n64 bytes from web01.hanamall.internal (192.168.1.20): icmp_seq=2 ttl=64 time=0.389 ms\n\n--- web01.hanamall.internal ping statistics ---\n2 packets transmitted, 2 received, 0% packet loss"}},"ZABBIX_server":{"prompt":"ubuntu@zabbix-server:~$","intro":["=== Zabbix Server 構築練習 ===","MariaDB セットアップから Zabbix インストールまで体験しよう","・apt でインストール → systemctl で起動確認","・zabbix-server が active になれば成功"],"commands":{"sudo apt install -y mariadb-server":"パッケージリストを読み込んでいます... 完了\n以下が新たにインストールされます: mariadb-server mariadb-server-10.6\n...\n設定中 mariadb-server-10.6 (1:10.6.12-0ubuntu0.22.04.1) ...","sudo systemctl start mariadb":"","sudo systemctl enable mariadb":"Synchronizing state of mariadb.service with SysV service script.\nExecuting: /lib/systemd/systemd-sysv-install enable mariadb","sudo apt install -y zabbix-server-mysql zabbix-frontend-php zabbix-apache-conf zabbix-sql-scripts zabbix-agent":"パッケージリストを読み込んでいます... 完了\n以下が新たにインストールされます: zabbix-server-mysql zabbix-frontend-php zabbix-apache-conf zabbix-sql-scripts zabbix-agent\n...\n設定中 zabbix-server-mysql (6.4.8) ...","sudo systemctl restart zabbix-server zabbix-agent apache2":"","sudo systemctl enable zabbix-server zabbix-agent apache2":"Synchronizing state of zabbix-server.service...\nSynchronizing state of zabbix-agent.service...\nSynchronizing state of apache2.service...","sudo systemctl status zabbix-server":"● zabbix-server.service - Zabbix Server\n     Loaded: loaded (/lib/systemd/system/zabbix-server.service; enabled)\n     Active: active (running) since Wed 2026-05-27 10:00:00 JST\n   Main PID: 3142 (zabbix_server)\n     Memory: 56.8M\n     CGroup: /system.slice/zabbix-server.service\n             ├─3142 /usr/sbin/zabbix_server -c /etc/zabbix/zabbix_server.conf\n             └─3143 /usr/sbin/zabbix_server: ha manager","sudo systemctl status zabbix-agent":"● zabbix-agent.service - Zabbix Monitoring Agent\n     Loaded: loaded (/lib/systemd/system/zabbix-agent.service; enabled)\n     Active: active (running) since Wed 2026-05-27 10:00:00 JST\n   Main PID: 3200 (zabbix_agentd)\n     Memory: 4.2M","grep DBPassword /etc/zabbix/zabbix_server.conf":"DBPassword=zabbix_pass","sudo tail -n 5 /var/log/zabbix/zabbix_server.log":" 3142:20260527:100000.123 Starting Zabbix Server. Zabbix 6.4.8 (revision XXXXX).\n 3142:20260527:100000.124 ****** Enabled features ******\n 3142:20260527:100000.125 SNMP monitoring:           YES\n 3142:20260527:100000.126 IPMI monitoring:           YES\n 3142:20260527:100001.000 database is up to date"}},"ZABBIX_agent":{"prompt":"ubuntu@web01:~$","intro":["=== Zabbix Agent 設定練習（監視対象: web01）===","Agent をインストールして Zabbix Server に接続する設定を体験しよう","・Server= に Zabbix Server の IP を設定","・Hostname= はこのホストの識別名"],"commands":{"sudo apt install -y zabbix-agent":"パッケージリストを読み込んでいます... 完了\n以下が新たにインストールされます: zabbix-agent\n...\n設定中 zabbix-agent (6.4.8) ...","sudo systemctl enable zabbix-agent":"Synchronizing state of zabbix-agent.service with SysV service script.","sudo systemctl start zabbix-agent":"","sudo systemctl status zabbix-agent":"● zabbix-agent.service - Zabbix Monitoring Agent\n     Loaded: loaded (/lib/systemd/system/zabbix-agent.service; enabled)\n     Active: active (running) since Wed 2026-05-27 10:02:00 JST\n   Main PID: 2500 (zabbix_agentd)\n     Memory: 4.2M\n     CGroup: /system.slice/zabbix-agent.service\n             └─2500 /usr/sbin/zabbix_agentd -c /etc/zabbix/zabbix_agentd.conf","grep -E \"^Server|^Hostname\" /etc/zabbix/zabbix_agentd.conf":"Server=192.168.1.100\nServerActive=192.168.1.100\nHostname=web01","sudo zabbix_agentd -t system.hostname":"system.hostname                               [s|web01]","sudo zabbix_agentd -t system.uname":"system.uname                                  [s|Linux web01 5.15.0-91-generic #101-Ubuntu SMP Tue Nov 14 13:30:08 UTC 2023 x86_64]","sudo zabbix_agentd -t vm.memory.size[available]":"vm.memory.size[available]                     [u|1876123648]","sudo zabbix_agentd -t system.cpu.load[all,avg1]":"system.cpu.load[all,avg1]                     [d|0.120000]","sudo ufw allow from 192.168.1.100 to any port 10050":"規則を追加しました\n規則を追加しました (v6)","sudo ufw status":"状態: アクティブ\nTo                   Action  From\nOpenSSH              ALLOW   Anywhere\n10050/tcp            ALLOW   192.168.1.100\nOpenSSH (v6)         ALLOW   Anywhere (v6)"}},"ZABBIX_verify":{"prompt":"ubuntu@zabbix-server:~$","intro":["=== Zabbix 動作確認・デバッグ ===","zabbix_get で監視対象からメトリクスを直接取得しよう","・zabbix_get が成功すれば Agent との通信は正常","・ログで Server 側のエラーを確認できる"],"commands":{"sudo apt install -y zabbix-get":"パッケージリストを読み込んでいます... 完了\n以下が新たにインストールされます: zabbix-get\n設定中 zabbix-get (6.4.8) ...","zabbix_get -s 192.168.1.20 -p 10050 -k system.hostname":"web01","zabbix_get -s 192.168.1.20 -p 10050 -k system.uname":"Linux web01 5.15.0-91-generic #101-Ubuntu SMP x86_64","zabbix_get -s 192.168.1.20 -p 10050 -k vm.memory.size[available]":"1876123648","zabbix_get -s 192.168.1.20 -p 10050 -k system.cpu.load[all,avg1]":"0.120000","zabbix_get -s 192.168.1.20 -p 10050 -k vfs.fs.size[/,pfree]":"72.453126","sudo tail -n 10 /var/log/zabbix/zabbix_server.log":" 3142:20260527:100100.001 enabling host: web01 (hostid:10084)\n 3142:20260527:100200.001 item \"web01:system.cpu.load[all,avg1]\" became supported\n 3142:20260527:100200.002 item \"web01:vm.memory.size[available]\" became supported\n 3142:20260527:100200.003 resuming Zabbix agent checks on host \"web01\"","sudo journalctl -u zabbix-server -n 5":"May 27 10:00:00 zabbix-server zabbix_server[3142]: Starting Zabbix Server.\nMay 27 10:01:00 zabbix-server zabbix_server[3142]: database is up to date\nMay 27 10:02:00 zabbix-server zabbix_server[3142]: enabling host: web01","for svc in zabbix-server zabbix-agent apache2 mariadb; do echo \"--- $svc ---\"; systemctl is-active $svc; done":"--- zabbix-server ---\nactive\n--- zabbix-agent ---\nactive\n--- apache2 ---\nactive\n--- mariadb ---\nactive"}}};

// ============================================================
// パーサー・フォーマッター
// ============================================================
function parseMD(md) {
  const lines = md.split("\n"), result = [];
  let inCode=false, lang="", codeLines=[], codeIndent=0, inTable=false, tableRows=[];
  const flushTable=()=>{ if(tableRows.length){result.push({type:"table",rows:tableRows});tableRows=[];inTable=false;}};
  for(let i=0;i<lines.length;i++){
    const L=lines[i];
    const TL=L.trimStart();
    if(TL.startsWith("```")){
      if(!inCode){flushTable();inCode=true;lang=TL.slice(3).trim();codeLines=[];codeIndent=L.length-TL.length;}
      else{result.push({type:"code",lang,content:codeLines.join("\n")});inCode=false;codeLines=[];lang="";codeIndent=0;}
      continue;
    }
    if(inCode){codeLines.push(L.startsWith(" ".repeat(codeIndent))?L.slice(codeIndent):L);continue;}
    if(L.startsWith("|")){
      if(L.match(/^\|[\s\-|]+\|$/))continue;
      const cells=L.split("|").filter((_,i,a)=>i>0&&i<a.length-1).map(c=>c.trim());
      if(!inTable){inTable=true;tableRows=[{header:true,cells}];}else tableRows.push({header:false,cells});
      continue;
    }else if(inTable)flushTable();
    if(L.startsWith("# "))     {result.push({type:"h1",c:L.slice(2)});continue;}
    if(L.startsWith("## "))    {result.push({type:"h2",c:L.slice(3)});continue;}
    if(L.startsWith("### "))   {result.push({type:"h3",c:L.slice(4)});continue;}
    if(L.startsWith("#### "))  {result.push({type:"h4",c:L.slice(5)});continue;}
    if(L.startsWith("> "))     {result.push({type:"bq",c:L.slice(2)});continue;}
    if(L.startsWith("- ")||L.startsWith("* ")){result.push({type:"li",c:L.slice(2)});continue;}
    if(L.match(/^\d+\. /))   {result.push({type:"oli",c:L.replace(/^\d+\. /,"")});continue;}
    if(L.startsWith("---"))    {result.push({type:"hr"});continue;}
    if(L.trim()==="")          {result.push({type:"br"});continue;}
    result.push({type:"p",c:L});
  }
  flushTable();
  return result;
}

function fmt(t){
  if(!t)return t;
  return t
    .replace(/`([^`]+)`/g,'<code style="background:var(--inline-code-bg);color:var(--inline-code-color);padding:1px 5px;border-radius:3px;font-size:.83em;font-family:monospace">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g,'<strong style="color:var(--t1)">$1</strong>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g,'<a href="$2" style="color:#60a5fa;text-decoration:underline" target="_blank">$1</a>');
}

// ============================================================
// ターミナルコンポーネント
// ============================================================
function Terminal({ weekKey }) {
  const config = WEEK_COMMANDS[weekKey];
  const getIntroLines = useCallback(() => [
    { type:"sys", text:"━".repeat(50) },
    ...(config?.intro ?? [`HanaMall 演習ターミナル — ${weekKey}`]).map(t=>({ type:"sys", text:t })),
    { type:"sys", text:"'help' でコマンド一覧 / Tab で補完 / ↑↓ で履歴" },
    { type:"sys", text:"━".repeat(50) },
  ], [config, weekKey]);

  const [lines, setLines] = useState(()=>getIntroLines());
  const [input, setInput] = useState("");
  const [hist, setHist] = useState([]);
  const [histIdx, setHistIdx] = useState(-1);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // weekKey が変わったら状態をリセット
  useEffect(()=>{
    setLines(getIntroLines());
    setInput("");
    setHist([]);
    setHistIdx(-1);
  }, [weekKey]); // eslint-disable-line

  const outputRef = useRef(null);
  useEffect(()=>{
    if(outputRef.current){
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  },[lines]);

  const run = useCallback((cmd) => {
    const t = cmd.trim();
    if(!t) return;
    if(t === "clear"){
      setLines([{type:"sys",text:"━".repeat(50)}]);
      setInput(""); setHist(p=>[t,...p]); setHistIdx(-1);
      return;
    }
    const next = [...lines, {type:"in",text:t}];
    const cmds = config?.commands ?? {};
    if(t in cmds){
      const out = cmds[t];
      if(out) next.push({type:"out",text:out});
      else    next.push({type:"out",text:""});
    } else {
      const base = t.split(" ")[0];
      const hint = Object.keys(cmds).find(k=>k.startsWith(base));
      next.push({type:"err", text: hint
        ? `候補: ${hint}`
        : `bash: ${base}: command not found`
      });
    }
    setLines(next);
    setHist(p=>[t,...p]);
    setHistIdx(-1);
    setInput("");
  }, [lines, config]);

  const onKey = (e) => {
    if(e.key==="Enter"){ run(input); }
    else if(e.key==="ArrowUp"){
      e.preventDefault();
      const i = Math.min(histIdx+1, hist.length-1);
      setHistIdx(i); setInput(hist[i]??"");
    } else if(e.key==="ArrowDown"){
      e.preventDefault();
      const i = Math.max(histIdx-1, -1);
      setHistIdx(i); setInput(i===-1?"":hist[i]??"");
    } else if(e.key==="Tab"){
      e.preventDefault();
      const match = Object.keys(config?.commands??{}).find(k=>k.startsWith(input));
      if(match) setInput(match);
    }
  };

  if(!config) return (
    <div style={{padding:16,color:"var(--t5)",fontFamily:"monospace",fontSize:".82em"}}>
      このWeekのターミナル演習は準備中です
    </div>
  );

  // help以外のコマンド一覧
  const cmdList = Object.keys(config.commands).filter(k => k !== "help");

  return (
    <div data-theme="dark" style={{background:"#0a0a0f",borderRadius:10,border:"1px solid var(--bd)",
      fontFamily:"'JetBrains Mono','Fira Code',monospace",fontSize:".82em",
      overflow:"hidden",marginTop:20}}>
      {/* タイトルバー */}
      <div style={{background:"var(--bg-alt)",padding:"7px 14px",display:"flex",
        alignItems:"center",gap:8,borderBottom:"1px solid var(--bd)"}}>
        {["#ff5f57","#febc2e","#28c840"].map(c=>(
          <div key={c} style={{width:11,height:11,borderRadius:"50%",background:c}}/>
        ))}
        <span style={{color:"var(--t6)",fontSize:".83em",marginLeft:6}}>
          {config.prompt.split(":")[0]} — bash
        </span>
      </div>

      <div style={{display:"flex",height:420}}>
        {/* 左：コマンド一覧パネル */}
        <div style={{width:220,flexShrink:0,borderRight:"1px solid var(--bd)",
          background:"#0d1117",overflowY:"auto",padding:"8px 0"}}>
          <div style={{padding:"6px 12px 4px",fontSize:".7em",fontWeight:700,
            color:"var(--t7)",textTransform:"uppercase",letterSpacing:".08em"}}>
            使えるコマンド
          </div>
          <div style={{padding:"0 6px 4px",fontSize:".68em",color:"#1e3a5f"}}>
            クリックで実行
          </div>
          {cmdList.map((cmd,i) => (
            <button key={i} onClick={()=>run(cmd)}
              style={{display:"block",width:"100%",textAlign:"left",
                background:"transparent",border:"none",
                padding:"4px 12px",cursor:"pointer",
                color:"var(--t5)",fontSize:".75em",lineHeight:1.5,
                whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",
                fontFamily:"inherit"}}
              onMouseEnter={e=>{e.currentTarget.style.background="var(--bd)";e.currentTarget.style.color="#7dd3fc";}}
              onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color="var(--t5)";}}>
              $ {cmd}
            </button>
          ))}
        </div>

        {/* 右：ターミナル出力 */}
        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
          <div onClick={()=>inputRef.current?.focus()}
            ref={outputRef}
            style={{flex:1,padding:"12px 16px",overflowY:"auto",lineHeight:1.65,cursor:"text"}}>
            {lines.map((l,i)=>{
              if(l.type==="sys")  return <div key={i} style={{color:"#1e3a5f",marginBottom:1}}>{l.text}</div>;
              if(l.type==="in")   return (
                <div key={i} style={{display:"flex",gap:8,marginTop:5}}>
                  <span style={{color:"var(--p1-badge)",flexShrink:0}}>{config.prompt}</span>
                  <span style={{color:"var(--t2)"}}>{l.text}</span>
                </div>
              );
              if(l.type==="err")  return <div key={i} style={{color:"#f87171",marginTop:2,whiteSpace:"pre-wrap"}}>{l.text}</div>;
              if(l.type==="out")  return l.text
                ? <div key={i} style={{color:"var(--t4)",whiteSpace:"pre-wrap",marginTop:2,marginBottom:4}}>{l.text}</div>
                : <div key={i} style={{height:4}}/>;
              return null;
            })}
            {/* 入力行 */}
            <div style={{display:"flex",gap:8,marginTop:5,alignItems:"center"}}>
              <span style={{color:"var(--p1-badge)",flexShrink:0}}>{config.prompt}</span>
              <input ref={inputRef} value={input}
                onChange={e=>setInput(e.target.value)} onKeyDown={onKey} autoFocus
                style={{background:"transparent",border:"none",outline:"none",
                  color:"var(--t2)",fontFamily:"inherit",fontSize:"inherit",flex:1,caretColor:"var(--p1-badge)"}}
                spellCheck={false} autoComplete="off"/>
              <span style={{width:8,height:"1.1em",background:"var(--p1-badge)",
                animation:"blink 1s step-end infinite",flexShrink:0}}/>
            </div>
          </div>
          {/* フッター */}
          <div style={{background:"var(--bg-card)",borderTop:"1px solid var(--bd)",
            padding:"5px 14px",display:"flex",gap:16,fontSize:".72em",color:"var(--t7)",flexShrink:0}}>
            <span>Tab: 補完</span><span>↑↓: 履歴</span><span>clear: クリア</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Markdown レンダラー
// ============================================================
function MD({ content, weekKey }) {
  const tokens = parseMD(content);
  let liB=[], oliB=[];
  const els=[];
  const fLi=()=>{
    if(liB.length){ els.push(<ul key={`u${els.length}`} style={{margin:"5px 0 5px 18px",paddingLeft:18,listStyleType:"disc"}}>
      {liB.map((x,j)=><li key={j} style={{color:"var(--t3)",marginBottom:3,lineHeight:1.7,fontSize:".93em"}} dangerouslySetInnerHTML={{__html:fmt(x)}}/>)}</ul>); liB=[];}
  };
  const fOli=()=>{
    if(oliB.length){ els.push(<ol key={`o${els.length}`} style={{margin:"5px 0 5px 18px",paddingLeft:22,listStyleType:"decimal"}}>
      {oliB.map((x,j)=><li key={j} style={{color:"var(--t3)",marginBottom:3,lineHeight:1.7,fontSize:".93em"}} dangerouslySetInnerHTML={{__html:fmt(x)}}/>)}</ol>); oliB=[];}
  };
  let homeworkSectionIdx = -1;
  tokens.forEach((tok,idx)=>{
    if(tok.type!=="li")fLi();
    if(tok.type!=="oli")fOli();
    switch(tok.type){
      case"h1":els.push(<h1 key={idx} style={{fontSize:"1.45em",fontWeight:800,color:"var(--t1)",borderBottom:"2px solid var(--t7)",paddingBottom:7,margin:"22px 0 12px"}} dangerouslySetInnerHTML={{__html:fmt(tok.c)}}/>);break;
      case"h2":
        els.push(<h2 key={idx} style={{fontSize:"1.08em",fontWeight:700,color:"var(--t2)",margin:"18px 0 8px",paddingLeft:9,borderLeft:"3px solid var(--accent)"}} dangerouslySetInnerHTML={{__html:fmt(tok.c)}}/>);
        if(tok.c.includes("今週の課題") || tok.c.includes("コマンド練習")) homeworkSectionIdx = els.length; // h2 push後に記録→見出しの直後に挿入
        break;
      case"h3":els.push(<h3 key={idx} style={{fontSize:".92em",fontWeight:700,color:"var(--t4)",margin:"14px 0 5px"}} dangerouslySetInnerHTML={{__html:fmt(tok.c)}}/>);break;
      case"h4":els.push(<div key={idx} style={{background:"var(--bg-inset)",border:"1px solid var(--inset-bd)",borderLeft:"3px solid var(--accent-b)",borderRadius:"0 6px 6px 0",padding:"9px 13px",margin:"12px 0 6px"}}><span style={{fontSize:".8em",fontWeight:700,color:"var(--accent-c)"}} dangerouslySetInnerHTML={{__html:"💡 "+fmt(tok.c)}}/></div>);break;
      case"bq":if(tok.c.trim())els.push(<blockquote key={idx} style={{borderLeft:"3px solid var(--amber)",background:"var(--bq-bg)",margin:"8px 0",padding:"9px 14px",color:"var(--amber-t)",borderRadius:"0 6px 6px 0",fontStyle:"italic",fontSize:".93em"}} dangerouslySetInnerHTML={{__html:fmt(tok.c)}}/>);break;
      case"code":els.push(<pre key={idx} style={{background:"var(--bg-card)",border:"1px solid var(--bd)",borderRadius:7,padding:"13px 15px",overflowX:"auto",margin:"10px 0",fontSize:".79em",lineHeight:1.7}}><code style={{color:"var(--t2)",fontFamily:"'JetBrains Mono','Fira Code',monospace"}}>{tok.content}</code></pre>);break;
      case"table":els.push(<div key={idx} style={{overflowX:"auto",margin:"9px 0"}}><table style={{borderCollapse:"collapse",width:"100%",fontSize:".83em"}}><tbody>{tok.rows.map((row,ri)=><tr key={ri} style={{background:row.header?"var(--bd)":ri%2===0?"var(--bg-card)":"var(--bg-alt)"}}>{row.cells.map((cell,ci)=><td key={ci} style={{padding:"7px 11px",border:"1px solid var(--bd)",color:row.header?"var(--t4)":"var(--t3)",fontWeight:row.header?600:400}} dangerouslySetInnerHTML={{__html:fmt(cell)}}/>)}</tr>)}</tbody></table></div>);break;
      case"li":liB.push(tok.c);break;
      case"oli":oliB.push(tok.c);break;
      case"hr":els.push(<hr key={idx} style={{border:"none",borderTop:"1px solid var(--bd)",margin:"16px 0"}}/>);break;
      case"br":break;
      case"p":els.push(<p key={idx} style={{color:tok.c.startsWith("→")?"var(--t5)":"var(--t3)",lineHeight:1.75,margin:"4px 0",fontSize:".93em"}} dangerouslySetInnerHTML={{__html:fmt(tok.c)}}/>);break;
    }
  });
  fLi(); fOli();

  // 課題セクションの後にターミナルを挿入
  if(homeworkSectionIdx >= 0 && weekKey && WEEK_COMMANDS[weekKey]) {
    const termEl = (
      <div key="terminal-section" style={{marginBottom:48}}>
        <div style={{marginTop:24,marginBottom:8,display:"flex",alignItems:"center",gap:10}}>
          <div style={{height:1,flex:1,background:"var(--bd)"}}/>
          <span style={{fontSize:".72em",color:"var(--t6)",fontWeight:700,textTransform:"uppercase",letterSpacing:".08em"}}>
            🖥️ コマンド事前練習（モック）
          </span>
          <div style={{height:1,flex:1,background:"var(--bd)"}}/>
        </div>
        <div style={{background:"var(--bg-surface)",border:"1px solid var(--inset-bd)",borderRadius:8,padding:"10px 14px",marginBottom:4}}>
          <p style={{fontSize:".8em",color:"var(--accent-c)",margin:0,lineHeight:1.6}}>
            📌 実機での課題に取り組む前に、コマンドの動きをここで確認できます。<br/>
            <span style={{color:"var(--t6)"}}>※ 下の「今週の課題」は必ず実機（サーバー）で実施してください。このモックは予習用です。</span>
          </p>
        </div>
        <Terminal weekKey={weekKey}/>
        <div style={{marginTop:20,padding:"11px 16px",background:"var(--bg-inset)",border:"1px solid var(--inset-bd)",borderRadius:8,display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:"1.1em"}}>✅</span>
          <span style={{fontSize:".82em",color:"var(--t3)",lineHeight:1.5}}>
            {weekKey && weekKey.startsWith("LAMP_") ? "コマンドの動きを確認できたら、実機（サーバー）でも実際に構築してみましょう。" : <>コマンドの動きを確認できたら、下の <strong style={{color:"var(--t1)"}}>「📝 今週の課題」</strong> を実機（サーバー）で実施してください。</>}
          </span>
        </div>
      </div>
    );
    // 課題セクションの直前に挿入
    const insertAt = homeworkSectionIdx;
    return <div>{[...els.slice(0,insertAt), termEl, ...els.slice(insertAt)]}</div>;
  }

  return <div>{els}</div>;
}

// ============================================================
// Additional シナリオデータ
// ============================================================
const ADDITIONAL_NAV = {
  WEB: {
    label: "🌐 オリジナルWebサイト",
    children: [
      { key: "WEB_html",    label: "📄 HTML作成" },
      { key: "WEB_css",     label: "🎨 CSS装飾" },
      { key: "WEB_publish", label: "🚀 複数ページ化・公開" },
    ],
  },
  LAMP: {
    label: "🖥️ LAMP構成",
    children: [
      { key: "LAMP_apache", label: "🌐 Apache" },
      { key: "LAMP_php",    label: "⚙️ PHP" },
      { key: "LAMP_mysql",  label: "🗄️ MySQL" },
    ],
  },
  DNS: {
    label: "🔍 内部DNS構成",
    children: [
      { key: "DNS_primary",   label: "🔍 プライマリDNS" },
      { key: "DNS_secondary", label: "🔁 セカンダリDNS" },
      { key: "DNS_verify",    label: "✅ 動作確認" },
    ],
  },
  ZABBIX: {
    label: "📊 Zabbix 監視基盤",
    children: [
      { key: "ZABBIX_server", label: "📊 Server 構築" },
      { key: "ZABBIX_agent",  label: "🖥️ Agent 設定" },
      { key: "ZABBIX_verify", label: "✅ 動作確認" },
    ],
  },
  TOMCAT: {
    label: "☕ Tomcat 構成",
    children: [
      { key: "TOMCAT_setup", label: "☕ インストール" },
      { key: "TOMCAT_nginx", label: "🔀 Nginx リバースプロキシ" },
      { key: "TOMCAT_mysql", label: "🗄️ MySQL 連携" },
      { key: "TOMCAT_ops",   label: "🔧 運用・チューニング" },
    ],
  },
};

const ADDITIONAL_SCENARIOS = [
  {
    id: "WEB",
    title: "オリジナルWebサイト作成",
    icon: "🌐",
    description: "Apache のデフォルトページを HTML・CSS で書き換えて、自分だけのポートフォリオサイトを公開する。Week05 の発展演習。",
    difficulty: "初級",
    servers: ["HTML", "CSS", "Apache"],
    bg: "var(--p1-bg)", bd: "var(--p1-bd)", badge: "var(--p1-badge)"
  },

  {
    id: "LAMP",
    title: "LAMP構成",
    icon: "🖥️",
    description: "Apache + MySQL + PHP による基本的な動的 Web サーバー構成。EC サイト・CMS など多くのサービスの基盤となる定番スタック。",
    difficulty: "中級",
    servers: ["Apache", "PHP", "MySQL"],
    bg: "var(--p2-bg)", bd: "var(--p2-bd)", badge: "var(--p2-badge)"
  },

  {
    id: "DNS",
    title: "内部DNSサーバー",
    icon: "🔍",
    description: "BINDを使ったプライマリ/セカンダリDNS構成。社内サーバーを名前で解決できるようにし、ゾーン転送による冗長化まで学ぶ。",
    difficulty: "中級",
    servers: ["BIND9", "ゾーン転送", "dig"],
    bg: "var(--p3-bg)", bd: "var(--p3-bd)", badge: "var(--p3-badge)"
  },

  {
    id: "ZABBIX",
    title: "Zabbix 監視基盤",
    icon: "📊",
    description: "Zabbix Server + Agent による監視構成。CPU・メモリ・ディスクを自動監視し、閾値超過でアラートを発報する定番エンタープライズ監視ツール。",
    difficulty: "中級",
    servers: ["Zabbix Server", "Zabbix Agent", "MariaDB"],
    bg: "var(--p4-bg)", bd: "var(--p4-bd)", badge: "var(--p4-badge)"
  },

  {
    id: "TOMCAT",
    title: "Nginx + Tomcat 構成",
    icon: "☕",
    description: "Nginx をリバースプロキシに、Tomcat をアプリケーションサーバーとして使う Java バックエンド構成。WAR デプロイから JVM チューニング・障害対応まで学ぶ。",
    difficulty: "中級",
    servers: ["Nginx", "Tomcat", "MySQL"],
    bg: "var(--p1-bg)", bd: "var(--p1-bd)", badge: "var(--p1-badge)"
  },
];

function ScenarioList({ onSelect }) {
  return (
    <div style={{padding:"36px 40px 56px",maxWidth:960,margin:"0 auto"}}>
      <div style={{marginBottom:32}}>
        <div style={{fontSize:".78em",fontWeight:700,color:"var(--t6)",letterSpacing:".1em",textTransform:"uppercase",marginBottom:6}}>📦 Additional</div>
        <h1 style={{fontSize:"1.8em",fontWeight:800,color:"var(--t1)",margin:"0 0 8px"}}>サーバー構築シナリオ</h1>
        <p style={{color:"var(--t5)",fontSize:".9em",margin:0}}>実際のインフラ構成を想定したサーバー構築シナリオ。複数サーバーの連携を構成図で確認しながら学ぼう。</p>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:16}}>
        {ADDITIONAL_SCENARIOS.map(s=>(
          <div key={s.id} onClick={()=>onSelect(s.id)}
            style={{background:s.bg,border:"1px solid "+s.bd,borderRadius:12,padding:"22px 24px",cursor:"pointer",transition:"transform .15s,box-shadow .15s"}}
            onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.boxShadow="0 6px 20px rgba(0,0,0,.25)";}}
            onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="none";}}>
            <div style={{fontSize:"2em",marginBottom:8}}>{s.icon}</div>
            <div style={{fontWeight:700,color:"var(--t1)",fontSize:"1.05em",marginBottom:6}}>{s.title}</div>
            <div style={{fontSize:".83em",color:"var(--t4)",marginBottom:14,lineHeight:1.55}}>{s.description}</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
              {s.servers.map(sv=>(
                <span key={sv} style={{fontSize:".7em",background:"var(--bg-card)",color:s.badge,padding:"2px 8px",borderRadius:4,border:"1px solid "+s.bd}}>{sv}</span>
              ))}
              <span style={{fontSize:".7em",color:"var(--t6)",marginLeft:"auto"}}>難易度: {s.difficulty}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function WebOverview({ onSelect }) {
  const steps = [
    { key:"WEB_html",    num:"01", icon:"📄", title:"HTMLでページを作る",      desc:"デフォルトページを書き換えて自分のトップページを作成する" },
    { key:"WEB_css",     num:"02", icon:"🎨", title:"CSSでデザインを整える",   desc:"スタイルシートを作ってプロらしい見た目に仕上げる" },
    { key:"WEB_publish", num:"03", icon:"🚀", title:"複数ページ化して公開する", desc:"スキル・連絡先ページを追加して本格的なサイトにする" },
  ];
  return (
    <div style={{padding:"36px 40px 56px",maxWidth:900,margin:"0 auto"}}>
      <div style={{marginBottom:28}}>
        <button onClick={()=>onSelect("ADDITIONAL")} style={{background:"none",border:"none",color:"var(--t5)",cursor:"pointer",fontSize:".82em",padding:0,marginBottom:10}}>← シナリオ一覧</button>
        <h1 style={{fontSize:"1.6em",fontWeight:800,color:"var(--t1)",margin:"0 0 6px"}}>🌐 オリジナルWebサイト作成</h1>
        <p style={{color:"var(--t5)",fontSize:".88em",margin:0}}>Week05 で構築した Apache を使って、HTML・CSS で自分だけのポートフォリオサイトを公開しよう。</p>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:16}}>
        {steps.map((s,i)=>(
          <div key={s.key} style={{display:"flex",alignItems:"stretch",gap:0}}>
            {i>0&&<div style={{width:3,background:"var(--bd)",margin:"0 0 0 28px",borderRadius:2,flexShrink:0,display:"none"}}/>}
            <div onClick={()=>onSelect(s.key)}
              style={{flex:1,background:"var(--bg-card)",border:"1px solid var(--bd)",borderRadius:10,padding:"20px 24px",cursor:"pointer",display:"flex",alignItems:"center",gap:20,transition:"transform .15s,box-shadow .15s"}}
              onMouseEnter={e=>{e.currentTarget.style.transform="translateX(4px)";e.currentTarget.style.boxShadow="0 4px 16px rgba(0,0,0,.2)";}}
              onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="none";}}>
              <div style={{width:52,height:52,borderRadius:"50%",background:"var(--p1-bg)",border:"2px solid var(--p1-bd)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.5em",flexShrink:0}}>{s.icon}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:".7em",fontWeight:700,color:"var(--p1-badge)",marginBottom:3}}>STEP {s.num}</div>
                <div style={{fontSize:"1em",fontWeight:700,color:"var(--t1)",marginBottom:4}}>{s.title}</div>
                <div style={{fontSize:".83em",color:"var(--t5)"}}>{s.desc}</div>
              </div>
              <div style={{fontSize:".75em",color:"var(--accent)",fontWeight:600}}>手順を見る →</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ArchDiagram({ scenarioId, onSelect }) {
  const [hovId, setHovId] = useState(null);
  const scenario = ADDITIONAL_SCENARIOS.find(s=>s.id===scenarioId);

  const Box = (id, icon, title, sub, bg, bd) => (
    <div
      onClick={()=>onSelect(id)}
      onMouseEnter={()=>setHovId(id)}
      onMouseLeave={()=>setHovId(null)}
      style={{
        background:bg, border:"2px solid "+bd, borderRadius:10,
        padding:"18px 24px", cursor:"pointer", minWidth:200, textAlign:"center",
        transform:hovId===id?"translateY(-3px)":"none",
        boxShadow:hovId===id?"0 6px 20px rgba(0,0,0,.3)":"none",
        transition:"transform .15s,box-shadow .15s",
      }}>
      <div style={{fontSize:"2em",marginBottom:6}}>{icon}</div>
      <div style={{fontWeight:700,color:"var(--t1)",fontSize:".95em"}}>{title}</div>
      <div style={{fontSize:".75em",color:"var(--t5)",marginTop:3}}>{sub}</div>
      <div style={{fontSize:".72em",color:"var(--accent)",marginTop:8,opacity:hovId===id?1:0.5,transition:"opacity .15s"}}>構築手順を見る →</div>
    </div>
  );

  const Arrow = (label) => (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",color:"var(--t6)",padding:"6px 0",gap:1}}>
      <span style={{fontSize:".7em",letterSpacing:".02em"}}>{label}</span>
      <span style={{fontSize:"1.5em",lineHeight:1}}>↓</span>
    </div>
  );

  return (
    <div style={{padding:"36px 40px 56px",maxWidth:900,margin:"0 auto"}}>
      <div style={{marginBottom:28}}>
        <button onClick={()=>onSelect("ADDITIONAL")} style={{background:"none",border:"none",color:"var(--t5)",cursor:"pointer",fontSize:".82em",padding:0,marginBottom:10}}>← シナリオ一覧</button>
        <h1 style={{fontSize:"1.6em",fontWeight:800,color:"var(--t1)",margin:"0 0 6px"}}>{scenario?.title}</h1>
        <p style={{color:"var(--t5)",fontSize:".88em",margin:0}}>{scenario?.description}</p>
      </div>

      <div style={{background:"var(--bg-card)",border:"1px solid var(--bd)",borderRadius:12,padding:"32px 24px",marginBottom:20}}>
        <div style={{fontSize:".73em",fontWeight:700,color:"var(--t6)",letterSpacing:".08em",textTransform:"uppercase",marginBottom:24,textAlign:"center"}}>
          構成図 — 各サーバーをクリックすると構築手順が開きます
        </div>

        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:0}}>
          <div style={{background:"var(--bg-alt)",border:"1px solid var(--bd)",borderRadius:8,padding:"10px 32px",fontSize:".83em",color:"var(--t5)",fontWeight:600}}>
            🖥️ クライアント（ブラウザ）
          </div>

          {Arrow("HTTP (Port 80)")}

          <div style={{display:"flex",alignItems:"center",gap:20}}>
            {Box("LAMP_apache","🌐","Apache","Webサーバー (Port 80)","var(--p2-bg)","var(--p2-bd)")}
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3,color:"var(--t6)"}}>
              <span style={{fontSize:"1.4em"}}>←</span>
              <span style={{fontSize:".65em",whiteSpace:"nowrap"}}>mod_php</span>
            </div>
            {Box("LAMP_php","⚙️","PHP","mod_php モジュール","var(--p1-bg)","var(--p1-bd)")}
          </div>

          {Arrow("MySQL Protocol (Port 3306)")}

          {Box("LAMP_mysql","🗄️","MySQL","DBサーバー (Port 3306)","var(--p3-bg)","var(--p3-bd)")}
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
        {[
          {id:"LAMP_apache",icon:"🌐",label:"Apache 構築手順"},
          {id:"LAMP_php",icon:"⚙️",label:"PHP 構築手順"},
          {id:"LAMP_mysql",icon:"🗄️",label:"MySQL 構築手順"},
        ].map(({id,icon,label})=>(
          <button key={id} onClick={()=>onSelect(id)}
            style={{background:"var(--bg-card)",border:"1px solid var(--bd)",color:"var(--t3)",borderRadius:8,padding:"11px",cursor:"pointer",fontSize:".82em",fontWeight:600,transition:"background .15s"}}
            onMouseEnter={e=>e.currentTarget.style.background="var(--bg-alt)"}
            onMouseLeave={e=>e.currentTarget.style.background="var(--bg-card)"}>
            {icon} {label}
          </button>
        ))}
      </div>
    </div>
  );
}

function DNSDiagram({ onSelect }) {
  const [hovId, setHovId] = useState(null);

  const boxStyle = (id, bg, bd) => ({
    background: bg,
    border: "2px solid " + bd,
    borderRadius: 10,
    padding: "16px 22px",
    cursor: "pointer",
    minWidth: 200,
    textAlign: "center",
    transform: hovId === id ? "translateY(-3px)" : "none",
    boxShadow: hovId === id ? "0 6px 20px rgba(0,0,0,.3)" : "none",
    transition: "transform .15s,box-shadow .15s",
  });

  return (
    <div style={{padding:"36px 40px 56px",maxWidth:900,margin:"0 auto"}}>
      <div style={{marginBottom:28}}>
        <button onClick={()=>onSelect("ADDITIONAL")} style={{background:"none",border:"none",color:"var(--t5)",cursor:"pointer",fontSize:".82em",padding:0,marginBottom:10}}>← シナリオ一覧</button>
        <h1 style={{fontSize:"1.6em",fontWeight:800,color:"var(--t1)",margin:"0 0 6px"}}>内部DNSサーバー構成</h1>
        <p style={{color:"var(--t5)",fontSize:".88em",margin:0}}>BINDを使ったプライマリ/セカンダリ構成。社内サーバーを名前で解決できるようにします。</p>
      </div>

      <div style={{background:"var(--bg-card)",border:"1px solid var(--bd)",borderRadius:12,padding:"32px 24px",marginBottom:20}}>
        <div style={{fontSize:".73em",fontWeight:700,color:"var(--t6)",letterSpacing:".08em",textTransform:"uppercase",marginBottom:24,textAlign:"center"}}>
          構成図 — 各サーバーをクリックすると構築手順が開きます
        </div>
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:0}}>
          <div style={{background:"var(--bg-alt)",border:"1px solid var(--bd)",borderRadius:8,padding:"10px 32px",fontSize:".83em",color:"var(--t5)",fontWeight:600}}>
            💻 クライアント（社内PC）
          </div>
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",color:"var(--t6)",padding:"6px 0",gap:1}}>
            <span style={{fontSize:".7em"}}>名前解決クエリ（UDP 53）</span>
            <span style={{fontSize:"1.5em",lineHeight:1}}>↓</span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:24}}>
            <div onClick={()=>onSelect("DNS_primary")} onMouseEnter={()=>setHovId("DNS_primary")} onMouseLeave={()=>setHovId(null)} style={boxStyle("DNS_primary","var(--p3-bg)","var(--p3-bd)")}>
              <div style={{fontSize:"1.8em",marginBottom:6}}>🔍</div>
              <div style={{fontWeight:700,color:"var(--t1)",fontSize:".95em"}}>プライマリ DNS</div>
              <div style={{fontSize:".75em",color:"var(--t5)",marginTop:3}}>BIND9 (192.168.1.10)</div>
              <div style={{fontSize:".72em",color:"var(--accent)",marginTop:8,opacity:hovId==="DNS_primary"?1:0.5,transition:"opacity .15s"}}>構築手順を見る →</div>
            </div>
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3,color:"var(--t6)"}}>
              <span style={{fontSize:"1.4em"}}>→</span>
              <span style={{fontSize:".65em",whiteSpace:"nowrap"}}>未解決の場合</span>
            </div>
            <div style={{background:"var(--bg-alt)",border:"1px solid var(--bd)",borderRadius:8,padding:"12px 20px",textAlign:"center"}}>
              <div style={{fontSize:"1.6em",marginBottom:4}}>🌐</div>
              <div style={{fontWeight:600,color:"var(--t3)",fontSize:".88em"}}>外部 DNS</div>
              <div style={{fontSize:".72em",color:"var(--t6)",marginTop:2}}>8.8.8.8</div>
            </div>
          </div>
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",color:"var(--t6)",padding:"6px 0",gap:1}}>
            <span style={{fontSize:".7em"}}>ゾーン転送（TCP 53）</span>
            <span style={{fontSize:"1.5em",lineHeight:1}}>↓</span>
          </div>
          <div onClick={()=>onSelect("DNS_secondary")} onMouseEnter={()=>setHovId("DNS_secondary")} onMouseLeave={()=>setHovId(null)} style={boxStyle("DNS_secondary","var(--p1-bg)","var(--p1-bd)")}>
            <div style={{fontSize:"1.8em",marginBottom:6}}>🔁</div>
            <div style={{fontWeight:700,color:"var(--t1)",fontSize:".95em"}}>セカンダリ DNS</div>
            <div style={{fontSize:".75em",color:"var(--t5)",marginTop:3}}>BIND9 (192.168.1.11)</div>
            <div style={{fontSize:".72em",color:"var(--accent)",marginTop:8,opacity:hovId==="DNS_secondary"?1:0.5,transition:"opacity .15s"}}>構築手順を見る →</div>
          </div>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
        {[
          {id:"DNS_primary",icon:"🔍",label:"プライマリDNS 構築手順"},
          {id:"DNS_secondary",icon:"🔁",label:"セカンダリDNS 構築手順"},
          {id:"DNS_verify",icon:"✅",label:"動作確認・dig コマンド"},
        ].map(({id,icon,label})=>(
          <button key={id} onClick={()=>onSelect(id)}
            style={{background:"var(--bg-card)",border:"1px solid var(--bd)",color:"var(--t3)",borderRadius:8,padding:"11px",cursor:"pointer",fontSize:".82em",fontWeight:600,transition:"background .15s"}}
            onMouseEnter={e=>e.currentTarget.style.background="var(--bg-alt)"}
            onMouseLeave={e=>e.currentTarget.style.background="var(--bg-card)"}>
            {icon} {label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ZabbixDiagram({ onSelect }) {
  const [hovId, setHovId] = useState(null);

  const boxStyle = (id, bg, bd) => ({
    background: bg,
    border: "2px solid " + bd,
    borderRadius: 10,
    padding: "16px 24px",
    cursor: "pointer",
    minWidth: 240,
    textAlign: "center",
    transform: hovId === id ? "translateY(-3px)" : "none",
    boxShadow: hovId === id ? "0 6px 20px rgba(0,0,0,.3)" : "none",
    transition: "transform .15s,box-shadow .15s",
  });

  return (
    <div style={{padding:"36px 40px 56px",maxWidth:900,margin:"0 auto"}}>
      <div style={{marginBottom:28}}>
        <button onClick={()=>onSelect("ADDITIONAL")} style={{background:"none",border:"none",color:"var(--t5)",cursor:"pointer",fontSize:".82em",padding:0,marginBottom:10}}>← シナリオ一覧</button>
        <h1 style={{fontSize:"1.6em",fontWeight:800,color:"var(--t1)",margin:"0 0 6px"}}>Zabbix 監視基盤</h1>
        <p style={{color:"var(--t5)",fontSize:".88em",margin:0}}>Zabbix Server + Agent による監視構成。CPU・メモリ・ディスク使用率を自動監視し、閾値超過でアラートを発報します。</p>
      </div>

      <div style={{background:"var(--bg-card)",border:"1px solid var(--bd)",borderRadius:12,padding:"32px 24px",marginBottom:20}}>
        <div style={{fontSize:".73em",fontWeight:700,color:"var(--t6)",letterSpacing:".08em",textTransform:"uppercase",marginBottom:24,textAlign:"center"}}>
          構成図 — 各サーバーをクリックすると構築手順が開きます
        </div>
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:0}}>
          <div style={{background:"var(--bg-alt)",border:"1px solid var(--bd)",borderRadius:8,padding:"10px 32px",fontSize:".83em",color:"var(--t5)",fontWeight:600}}>
            🖥️ 管理ブラウザ（Zabbix Web UI）
          </div>
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",color:"var(--t6)",padding:"6px 0",gap:1}}>
            <span style={{fontSize:".7em"}}>HTTP (Port 80)</span>
            <span style={{fontSize:"1.5em",lineHeight:1}}>↓</span>
          </div>
          <div onClick={()=>onSelect("ZABBIX_server")} onMouseEnter={()=>setHovId("ZABBIX_server")} onMouseLeave={()=>setHovId(null)} style={boxStyle("ZABBIX_server","var(--p4-bg)","var(--p4-bd)")}>
            <div style={{fontSize:"1.8em",marginBottom:6}}>📊</div>
            <div style={{fontWeight:700,color:"var(--t1)",fontSize:".95em"}}>Zabbix Server</div>
            <div style={{fontSize:".72em",color:"var(--t5)",marginTop:4,lineHeight:1.6}}>Zabbix Server Process<br/>Frontend (Apache + PHP)<br/>MariaDB（監視データ保存）</div>
            <div style={{fontSize:".72em",color:"var(--accent)",marginTop:8,opacity:hovId==="ZABBIX_server"?1:0.5,transition:"opacity .15s"}}>構築手順を見る →</div>
          </div>
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",color:"var(--t6)",padding:"6px 0",gap:1}}>
            <span style={{fontSize:"1.5em",lineHeight:1}}>↑</span>
            <span style={{fontSize:".7em"}}>Zabbix Protocol (Port 10050)</span>
          </div>
          <div onClick={()=>onSelect("ZABBIX_agent")} onMouseEnter={()=>setHovId("ZABBIX_agent")} onMouseLeave={()=>setHovId(null)} style={boxStyle("ZABBIX_agent","var(--p2-bg)","var(--p2-bd)")}>
            <div style={{fontSize:"1.8em",marginBottom:6}}>🖥️</div>
            <div style={{fontWeight:700,color:"var(--t1)",fontSize:".95em"}}>監視対象サーバー</div>
            <div style={{fontSize:".72em",color:"var(--t5)",marginTop:4,lineHeight:1.6}}>Zabbix Agent<br/>web01 • db01 • ...</div>
            <div style={{fontSize:".72em",color:"var(--accent)",marginTop:8,opacity:hovId==="ZABBIX_agent"?1:0.5,transition:"opacity .15s"}}>構築手順を見る →</div>
          </div>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
        {[
          {id:"ZABBIX_server",icon:"📊",label:"Zabbix Server 構築手順"},
          {id:"ZABBIX_agent",icon:"🖥️",label:"Zabbix Agent 設定手順"},
          {id:"ZABBIX_verify",icon:"✅",label:"動作確認・zabbix_get"},
        ].map(({id,icon,label})=>(
          <button key={id} onClick={()=>onSelect(id)}
            style={{background:"var(--bg-card)",border:"1px solid var(--bd)",color:"var(--t3)",borderRadius:8,padding:"11px",cursor:"pointer",fontSize:".82em",fontWeight:600,transition:"background .15s"}}
            onMouseEnter={e=>e.currentTarget.style.background="var(--bg-alt)"}
            onMouseLeave={e=>e.currentTarget.style.background="var(--bg-card)"}>
            {icon} {label}
          </button>
        ))}
      </div>
    </div>
  );
}


// ============================================================
// ストーリーマップ
// ============================================================
const WEEKS = [
  { key:"ROOT",   label:"📋 概要",   title:null, phase:null },
  { key:"Week01", label:"Week 01", title:"Linux環境構築・基本操作",    phase:1, slack:"入社初日。dev01の環境確認レポートを作ってください。" },
  { key:"Week02", label:"Week 02", title:"シェル・テキスト処理",        phase:1, slack:"昨夜アクセスエラーが多発。ログを解析して原因を報告して。" },
  { key:"Week03", label:"Week 03", title:"ユーザー管理・プロセス管理",  phase:1, slack:"鈴木さんのアカウント設定 ＋ CPU急騰プロセスを止めて。" },
  { key:"Week04", label:"Week 04", title:"ネットワーク設定・管理",      phase:2, slack:"急ぎ！新サーバーが外から繋がらない。原因を特定して！🚨" },
  { key:"Week05", label:"Week 05", title:"Webサーバー構築（Apache）",   phase:2, slack:"shop と admin を同じサーバーで動かしてほしい（VirtualHost）。" },
  { key:"Week06", label:"Week 06", title:"SSH・cron・自動化基盤",       phase:2, slack:"SSH がパスワード認証のまま指摘された ＋ 手動作業を自動化して。" },
  { key:"Week07", label:"Week 07", title:"シェルスクリプト実践",        phase:2, slack:"バックアップを手動でやってました…スクリプト化してください😅" },
  { key:"Week08", label:"Week 08", title:"ストレージ・ディスク管理",    phase:2, slack:"🌙 深夜2時：ディスクフルで本番が落ちました！助けて！" },
  { key:"Week09", label:"Week 09", title:"パッケージ管理・systemd",     phase:3, slack:"Apache が勝手にアップデートされた…バージョン固定＋サービス化を。" },
  { key:"Week10", label:"Week 10", title:"監視・障害対応",              phase:3, slack:"GWセールで急に重くなった。リソース監視の仕組みを作って。" },
  { key:"Week11", label:"Week 11", title:"クラウド連携・Docker入門",    phase:3, slack:"開発チームからDocker環境が欲しいと要望が来ました。" },
  { key:"Week12", label:"Week 12", title:"総合演習・振り返り",          phase:4, slack:"🎊 3ヶ月経ちました！本番投入OKレポートを出してください。" },
];
const PC = {
  1:{bg:"var(--p1-bg)",border:"var(--p1-bd)",badge:"var(--p1-badge)",text:"var(--p1-t)",label:"Phase 1 基礎固め"},
  2:{bg:"var(--p2-bg)",border:"var(--p2-bd)",badge:"var(--p2-badge)",text:"var(--p2-t)",label:"Phase 2 インフラ実務"},
  3:{bg:"var(--p3-bg)",border:"var(--p3-bd)",badge:"var(--p3-badge)",text:"var(--p3-t)",label:"Phase 3 応用技術"},
  4:{bg:"var(--p4-bg)",border:"var(--p4-bd)",badge:"var(--p4-badge)",text:"var(--p4-t)",label:"Phase 4 総仕上げ"},
};


function TomcatDiagram({ onSelect }) {
  const [hovId, setHovId] = useState(null);

  const boxStyle = (id, bg, bd) => ({
    background: bg,
    border: "2px solid " + bd,
    borderRadius: 10,
    padding: "16px 24px",
    cursor: "pointer",
    minWidth: 240,
    textAlign: "center",
    transform: hovId === id ? "translateY(-3px)" : "none",
    boxShadow: hovId === id ? "0 6px 20px rgba(0,0,0,.3)" : "none",
    transition: "transform .15s,box-shadow .15s",
  });

  return (
    <div style={{padding:"36px 40px 56px",maxWidth:900,margin:"0 auto"}}>
      <div style={{marginBottom:28}}>
        <button onClick={()=>onSelect("ADDITIONAL")} style={{background:"none",border:"none",color:"var(--t5)",cursor:"pointer",fontSize:".82em",padding:0,marginBottom:10}}>← シナリオ一覧</button>
        <h1 style={{fontSize:"1.6em",fontWeight:800,color:"var(--t1)",margin:"0 0 6px"}}>Nginx + Tomcat 構成</h1>
        <p style={{color:"var(--t5)",fontSize:".88em",margin:0}}>Nginx をリバースプロキシに、Tomcat を Java アプリケーションサーバーとして使う構成。WAR デプロイから JVM チューニング・障害対応まで学びます。</p>
      </div>

      <div style={{background:"var(--bg-card)",border:"1px solid var(--bd)",borderRadius:12,padding:"32px 24px",marginBottom:20}}>
        <div style={{fontSize:".73em",fontWeight:700,color:"var(--t6)",letterSpacing:".08em",textTransform:"uppercase",marginBottom:24,textAlign:"center"}}>
          構成図 — 各サーバーをクリックすると構築手順が開きます
        </div>
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:0}}>
          <div style={{background:"var(--bg-alt)",border:"1px solid var(--bd)",borderRadius:8,padding:"10px 32px",fontSize:".83em",color:"var(--t5)",fontWeight:600}}>
            🌐 ブラウザ
          </div>
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",color:"var(--t6)",padding:"6px 0",gap:1}}>
            <span style={{fontSize:".7em"}}>HTTP (Port 80)</span>
            <span style={{fontSize:"1.5em",lineHeight:1}}>↓</span>
          </div>
          <div onClick={()=>onSelect("TOMCAT_nginx")} onMouseEnter={()=>setHovId("TOMCAT_nginx")} onMouseLeave={()=>setHovId(null)} style={boxStyle("TOMCAT_nginx","var(--p3-bg)","var(--p3-bd)")}>
            <div style={{fontSize:"1.8em",marginBottom:6}}>🔀</div>
            <div style={{fontWeight:700,color:"var(--t1)",fontSize:".95em"}}>Nginx</div>
            <div style={{fontSize:".72em",color:"var(--t5)",marginTop:4,lineHeight:1.6}}>リバースプロキシ<br/>静的ファイル配信<br/>SSL終端（将来）</div>
            <div style={{fontSize:".72em",color:"var(--accent)",marginTop:8,opacity:hovId==="TOMCAT_nginx"?1:0.5,transition:"opacity .15s"}}>構築手順を見る →</div>
          </div>
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",color:"var(--t6)",padding:"6px 0",gap:1}}>
            <span style={{fontSize:"1.5em",lineHeight:1}}>↓</span>
            <span style={{fontSize:".7em"}}>HTTP (Port 8080 / localhost のみ)</span>
          </div>
          <div onClick={()=>onSelect("TOMCAT_setup")} onMouseEnter={()=>setHovId("TOMCAT_setup")} onMouseLeave={()=>setHovId(null)} style={boxStyle("TOMCAT_setup","var(--p1-bg)","var(--p1-bd)")}>
            <div style={{fontSize:"1.8em",marginBottom:6}}>☕</div>
            <div style={{fontWeight:700,color:"var(--t1)",fontSize:".95em"}}>Tomcat</div>
            <div style={{fontSize:".72em",color:"var(--t5)",marginTop:4,lineHeight:1.6}}>Java Servlet / JSP 実行<br/>WAR デプロイ<br/>OpenJDK 17</div>
            <div style={{fontSize:".72em",color:"var(--accent)",marginTop:8,opacity:hovId==="TOMCAT_setup"?1:0.5,transition:"opacity .15s"}}>構築手順を見る →</div>
          </div>
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",color:"var(--t6)",padding:"6px 0",gap:1}}>
            <span style={{fontSize:"1.5em",lineHeight:1}}>↓</span>
            <span style={{fontSize:".7em"}}>JDBC (Port 3306)</span>
          </div>
          <div onClick={()=>onSelect("TOMCAT_mysql")} onMouseEnter={()=>setHovId("TOMCAT_mysql")} onMouseLeave={()=>setHovId(null)} style={boxStyle("TOMCAT_mysql","var(--p2-bg)","var(--p2-bd)")}>
            <div style={{fontSize:"1.8em",marginBottom:6}}>🗄️</div>
            <div style={{fontWeight:700,color:"var(--t1)",fontSize:".95em"}}>MySQL</div>
            <div style={{fontSize:".72em",color:"var(--t5)",marginTop:4,lineHeight:1.6}}>DB・ユーザー作成<br/>JDBC ドライバ<br/>コネクションプール</div>
            <div style={{fontSize:".72em",color:"var(--accent)",marginTop:8,opacity:hovId==="TOMCAT_mysql"?1:0.5,transition:"opacity .15s"}}>構築手順を見る →</div>
          </div>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
        {[
          {id:"TOMCAT_setup",icon:"☕",label:"Tomcat インストール・WAR デプロイ"},
          {id:"TOMCAT_nginx",icon:"🔀",label:"Nginx リバースプロキシ設定"},
          {id:"TOMCAT_mysql",icon:"🗄️",label:"MySQL 連携・コネクションプール"},
          {id:"TOMCAT_ops",icon:"🔧",label:"JVM チューニング・障害対応"},
        ].map(({id,icon,label})=>(
          <button key={id} onClick={()=>onSelect(id)}
            style={{background:"var(--bg-card)",border:"1px solid var(--bd)",color:"var(--t3)",borderRadius:8,padding:"11px",cursor:"pointer",fontSize:".82em",fontWeight:600,transition:"background .15s"}}
            onMouseEnter={e=>e.currentTarget.style.background="var(--bg-alt)"}
            onMouseLeave={e=>e.currentTarget.style.background="var(--bg-card)"}>
            {icon} {label}
          </button>
        ))}
      </div>
    </div>
  );
}

function StoryMap({ onSelect }) {
  return (
    <div style={{padding:"36px 40px 56px",maxWidth:1100,margin:"0 auto"}}>
      <div style={{marginBottom:36}}>
        <div style={{fontSize:".78em",fontWeight:700,color:"var(--t6)",letterSpacing:".1em",textTransform:"uppercase",marginBottom:6}}>HanaMall インフラチーム</div>
        <h1 style={{fontSize:"2em",fontWeight:800,color:"var(--t1)",margin:"0 0 8px"}}>田中さんの12週間</h1>
        <p style={{color:"var(--t5)",fontSize:".95em",margin:0}}>ECサイト「HanaMall」に中途入社した田中さんのストーリー。先輩・佐藤さんからのSlack指示をこなしながら実務スキルを身につける。</p>
      </div>
      {[1,2,3,4].map(phase=>{
        const pc=PC[phase];
        return (
          <div key={phase} style={{marginBottom:32}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
              <span style={{background:pc.bg,color:pc.badge,border:`1px solid ${pc.border}`,fontSize:".8em",fontWeight:700,padding:"4px 13px",borderRadius:4,textTransform:"uppercase",letterSpacing:".06em"}}>{pc.label}</span>
              <div style={{flex:1,height:1,background:"var(--bd)"}}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(230px,1fr))",gap:14}}>
              {WEEKS.filter(w=>w.phase===phase).map(w=>(
                <button key={w.key} onClick={()=>onSelect(w.key)}
                  style={{background:"var(--bg-surface)",border:`1px solid ${pc.border}`,borderRadius:10,padding:"16px 18px",textAlign:"left",cursor:"pointer",transition:"transform .15s"}}
                  onMouseEnter={e=>e.currentTarget.style.transform="translateY(-3px)"}
                  onMouseLeave={e=>e.currentTarget.style.transform="translateY(0)"}>
                  <div style={{fontSize:".78em",fontWeight:700,color:pc.badge,marginBottom:5}}>{w.label}</div>
                  <div style={{fontSize:".9em",fontWeight:700,color:"var(--t2)",marginBottom:8,lineHeight:1.4}}>{w.title}</div>
                  <div style={{fontSize:".78em",color:"var(--t5)",lineHeight:1.5,borderTop:"1px solid var(--bd)",paddingTop:8}}>💬 {w.slack}</div>
                </button>
              ))}
            </div>
          </div>
        );
      })}
      <div style={{marginTop:36,background:"var(--bg-surface)",border:"1px solid var(--bd)",borderRadius:12,padding:"20px 24px"}}>
        <div style={{fontSize:".82em",fontWeight:700,color:"var(--t6)",marginBottom:14,textTransform:"uppercase",letterSpacing:".08em"}}>登場人物</div>
        <div style={{display:"flex",gap:32,flexWrap:"wrap"}}>
          {[{icon:"👤",name:"田中（あなた）",desc:"中途入社1ヶ月目\nインフラエンジニア",color:"var(--accent-b)"},
            {icon:"👨\u200d💻",name:"佐藤（先輩）",desc:"インフラチームリーダー\n各Weekの指示を出す人",color:"var(--p1-badge)"},
            {icon:"🛒",name:"HanaMall",desc:"架空のECサイト\nインフラを守る対象",color:"var(--p3-badge)"}].map(p=>(
            <div key={p.name} style={{display:"flex",gap:12,alignItems:"flex-start"}}>
              <div style={{width:44,height:44,borderRadius:"50%",background:"var(--bg-card)",border:`2px solid ${p.color}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.3em",flexShrink:0}}>{p.icon}</div>
              <div>
                <div style={{fontSize:".9em",fontWeight:700,color:"var(--t1)"}}>{p.name}</div>
                <div style={{fontSize:".82em",color:"var(--t5)",whiteSpace:"pre-line"}}>{p.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{marginTop:24,background:"var(--bg-surface)",border:"1px solid var(--accent-c)",borderRadius:12,padding:"20px 24px"}}>
        <div style={{fontSize:".82em",fontWeight:700,color:"var(--accent-c)",marginBottom:10,textTransform:"uppercase",letterSpacing:".08em"}}>📦 サーバー構築シナリオ</div>
        <p style={{fontSize:".88em",color:"var(--t5)",margin:"0 0 14px"}}>12週間を終えたら、実際のインフラ構成を想定したサーバー構築シナリオに挑戦しよう。</p>
        <button onClick={()=>onSelect("ADDITIONAL")} style={{background:"var(--accent-c)",color:"#fff",border:"none",borderRadius:6,padding:"8px 20px",cursor:"pointer",fontSize:".84em",fontWeight:700}}>シナリオ一覧を見る →</button>
      </div>
    </div>
  );
}
// ============================================================
// メインアプリ
// ============================================================
export default function App() {
  const [selected, setSelected] = useState("STORY");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isDark, setIsDark] = useState(true);
  const scrollRef = useRef(null);
  useEffect(() => { document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light"); }, [isDark]);
  useEffect(() => { if(scrollRef.current) scrollRef.current.scrollTop = 0; }, [selected]);
  const current = WEEKS.find(w=>w.key===selected);
  const grouped = [null,1,2,3,4].map(phase=>({phase,items:phase===null?WEEKS.filter(w=>!w.phase):WEEKS.filter(w=>w.phase===phase)}));
  const additionalParent = Object.entries(ADDITIONAL_NAV).find(([,v])=>v.children.some(c=>c.key===selected))?.[0]??null;
  const isAdditional = selected==="WEB"||selected?.startsWith("WEB_")||selected==="LAMP"||selected?.startsWith("LAMP_")||selected==="DNS"||selected?.startsWith("DNS_")||selected==="ZABBIX"||selected?.startsWith("ZABBIX_");
  const ALL = ["STORY",...WEEKS.map(w=>w.key),"ADDITIONAL"];
  const ci = isAdditional?-1:ALL.indexOf(selected);
  const addSiblings = additionalParent?ADDITIONAL_NAV[additionalParent].children:[];
  const addIdx = addSiblings.findIndex(c=>c.key===selected);
  const prevKey = additionalParent?(addIdx>0?addSiblings[addIdx-1].key:null):(!isAdditional&&ci>0?ALL[ci-1]:null);
  const nextKey = additionalParent?(addIdx<addSiblings.length-1?addSiblings[addIdx+1].key:null):(!isAdditional&&ci<ALL.length-1?ALL[ci+1]:null);
  const pLabel = additionalParent?addSiblings[addIdx-1]?.label:(prevKey==="STORY"?"🗺 ストーリー":prevKey==="ADDITIONAL"?"📦 サーバー構築シナリオ":WEEKS.find(w=>w.key===prevKey)?.label);
  const nLabel = additionalParent?addSiblings[addIdx+1]?.label:(nextKey==="STORY"?"🗺 ストーリー":nextKey==="ADDITIONAL"?"📦 サーバー構築シナリオ":WEEKS.find(w=>w.key===nextKey)?.label);
  const counter = additionalParent?`${addIdx+1} / ${addSiblings.length}`:`${ci+1} / ${ALL.length}`;

  return (
    <div style={{display:"flex",height:"100vh",background:"var(--bg-base)",fontFamily:"'Noto Sans JP','Inter',sans-serif",color:"var(--t2)"}}>
      <div style={{width:sidebarOpen?256:0,minWidth:sidebarOpen?256:0,background:"var(--bg-surface)",borderRight:"1px solid var(--bd)",overflow:"hidden",transition:"width .2s,min-width .2s",display:"flex",flexDirection:"column"}}>
        <div style={{padding:"14px 12px 8px",borderBottom:"1px solid var(--bd)",flexShrink:0}}>
          <div style={{fontSize:".66em",fontWeight:700,color:"var(--t6)",letterSpacing:".1em",textTransform:"uppercase",marginBottom:2}}>HanaMall インフラ</div>
          <div style={{fontSize:".95em",fontWeight:800,color:"var(--t1)"}}>Linux実務習得</div>
        </div>
        <div style={{overflowY:"auto",flex:1,padding:"6px 0"}}>
          <button onClick={()=>setSelected("STORY")} style={{display:"block",width:"100%",textAlign:"left",background:selected==="STORY"?"var(--bg-card)":"transparent",border:"none",borderLeft:selected==="STORY"?"3px solid var(--amber)":"3px solid transparent",padding:"8px 14px 8px 12px",cursor:"pointer"}}>
            <div style={{fontSize:".78em",fontWeight:700,color:selected==="STORY"?"var(--t1)":"var(--t5)"}}>🗺 ストーリーマップ</div>
          </button>
          {grouped.map(({phase,items})=>(
            <div key={phase??"r"}>
              {phase&&<div style={{padding:"10px 14px 3px",fontSize:".64em",fontWeight:700,color:PC[phase].badge,letterSpacing:".08em",textTransform:"uppercase"}}>{PC[phase].label}</div>}
              {items.map(w=>(
                <button key={w.key} onClick={()=>setSelected(w.key)} style={{display:"block",width:"100%",textAlign:"left",background:selected===w.key?(phase?PC[phase].bg:"var(--bg-card)"):"transparent",border:"none",borderLeft:selected===w.key?`3px solid ${phase?PC[phase].badge:"var(--accent)"}`:"3px solid transparent",padding:"6px 14px 6px 12px",cursor:"pointer"}}>
                  <div style={{fontSize:".77em",fontWeight:700,color:selected===w.key?"var(--t1)":"var(--t5)"}}>{w.label}</div>
                  {w.title&&<div style={{fontSize:".68em",color:selected===w.key?(phase?PC[phase].text:"var(--t4)"):"var(--t7)",marginTop:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{w.title}</div>}
                </button>
              ))}
            </div>
          ))}
          <div>
            <div style={{padding:"10px 14px 3px",fontSize:".64em",fontWeight:700,color:"var(--accent-c)",letterSpacing:".08em",textTransform:"uppercase"}}>📦 Additional</div>
            <button onClick={()=>setSelected("ADDITIONAL")} style={{display:"block",width:"100%",textAlign:"left",background:isAdditional?"var(--bg-card)":"transparent",border:"none",borderLeft:isAdditional?"3px solid var(--accent-b)":"3px solid transparent",padding:"6px 14px 6px 12px",cursor:"pointer"}}>
              <div style={{fontSize:".77em",fontWeight:700,color:isAdditional?"var(--t1)":"var(--t5)"}}>サーバー構築シナリオ</div>
            </button>
          </div>
        </div>
      </div>
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <div style={{height:44,background:"var(--bg-surface)",borderBottom:"1px solid var(--bd)",display:"flex",alignItems:"center",padding:"0 16px",gap:12,flexShrink:0}}>
          <button onClick={()=>setSidebarOpen(v=>!v)} style={{background:"none",border:"none",color:"var(--t5)",cursor:"pointer",fontSize:"1.1em",padding:"4px 6px"}}>☰</button>
          {selected==="STORY"
            ?<span style={{fontSize:".84em",fontWeight:600,color:"var(--amber)"}}>🗺 ストーリーマップ</span>
            :selected==="ADDITIONAL"
            ?<span style={{fontSize:".84em",fontWeight:600,color:"var(--accent-c)"}}>📦 サーバー構築シナリオ</span>
            :selected==="LAMP"
            ?<span style={{fontSize:".84em",fontWeight:600,color:"var(--accent-c)"}}>🖥️ LAMP構成</span>
            :selected?.startsWith("LAMP_")
            ?<><span style={{fontSize:".68em",fontWeight:700,background:"var(--p2-bg)",color:"var(--p2-badge)",border:"1px solid var(--p2-bd)",padding:"2px 8px",borderRadius:4}}>LAMP</span>
              <span style={{fontSize:".84em",fontWeight:600,color:"var(--t4)"}}>{{"LAMP_apache":"🌐 Apache","LAMP_mysql":"🗄️ MySQL","LAMP_php":"⚙️ PHP"}[selected]}</span></>
            :selected==="DNS"
            ?<span style={{fontSize:".84em",fontWeight:600,color:"var(--p3-badge)"}}>🔍 内部DNS構成</span>
            :selected?.startsWith("DNS_")
            ?<><span style={{fontSize:".68em",fontWeight:700,background:"var(--p3-bg)",color:"var(--p3-badge)",border:"1px solid var(--p3-bd)",padding:"2px 8px",borderRadius:4}}>DNS</span>
              <span style={{fontSize:".84em",fontWeight:600,color:"var(--t4)"}}>{{"DNS_primary":"🔍 プライマリDNS","DNS_secondary":"🔁 セカンダリDNS","DNS_verify":"✅ 動作確認"}[selected]}</span></>
            :selected==="ZABBIX"
            ?<span style={{fontSize:".84em",fontWeight:600,color:"var(--p4-badge)"}}>📊 Zabbix 監視基盤</span>
            :selected?.startsWith("ZABBIX_")
            ?<><span style={{fontSize:".68em",fontWeight:700,background:"var(--p4-bg)",color:"var(--p4-badge)",border:"1px solid var(--p4-bd)",padding:"2px 8px",borderRadius:4}}>ZABBIX</span>
              <span style={{fontSize:".84em",fontWeight:600,color:"var(--t4)"}}>{{"ZABBIX_server":"📊 Zabbixサーバー","ZABBIX_agent":"🖥️ Zabbix Agent","ZABBIX_verify":"✅ 動作確認"}[selected]}</span></>
            :<>
              {current?.phase&&<span style={{fontSize:".68em",fontWeight:700,background:PC[current.phase].bg,color:PC[current.phase].badge,border:`1px solid ${PC[current.phase].border}`,padding:"2px 8px",borderRadius:4}}>{PC[current.phase].label}</span>}
              <span style={{fontSize:".84em",fontWeight:600,color:"var(--t4)"}}>{current?.label}{current?.title?` — ${current.title}`:""}</span>
            </>
          }
          <button className="theme-btn" onClick={()=>setIsDark(d=>!d)}>
            {isDark ? "☀️ ライト" : "🌙 ダーク"}
          </button>
        </div>
        <div ref={scrollRef} style={{flex:1,overflowY:"auto"}}>
          {selected==="STORY"
            ?<StoryMap onSelect={setSelected}/>
            :selected==="ADDITIONAL"
            ?<ScenarioList onSelect={setSelected}/>
            :selected==="WEB"
            ?<WebOverview onSelect={setSelected}/>
            :selected==="LAMP"
            ?<ArchDiagram scenarioId="LAMP" onSelect={setSelected}/>
            :selected==="DNS"
            ?<DNSDiagram onSelect={setSelected}/>
            :selected==="ZABBIX"
            ?<ZabbixDiagram onSelect={setSelected}/>
            :selected==="TOMCAT"
            ?<TomcatDiagram onSelect={setSelected}/>
            :<div style={{padding:"22px 30px 48px"}}><div style={{maxWidth:820,margin:"0 auto"}}>
              {additionalParent&&(
                <div style={{marginBottom:20}}>
                  <div style={{fontSize:".78em",color:"var(--t5)",marginBottom:10,display:"flex",alignItems:"center",gap:4,flexWrap:"wrap"}}>
                    <button onClick={()=>setSelected("ADDITIONAL")} style={{background:"none",border:"none",color:"var(--accent-c)",cursor:"pointer",padding:0,fontSize:"inherit",fontWeight:600}}>📦 シナリオ一覧</button>
                    <span style={{color:"var(--t7)"}}>›</span>
                    <button onClick={()=>setSelected(additionalParent)} style={{background:"none",border:"none",color:"var(--accent-c)",cursor:"pointer",padding:0,fontSize:"inherit",fontWeight:600}}>{ADDITIONAL_NAV[additionalParent].label}</button>
                    <span style={{color:"var(--t7)"}}>›</span>
                    <span style={{color:"var(--t2)",fontWeight:600}}>{ADDITIONAL_NAV[additionalParent].children.find(c=>c.key===selected)?.label}</span>
                  </div>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                    {ADDITIONAL_NAV[additionalParent].children.map(c=>(
                      <button key={c.key} onClick={()=>setSelected(c.key)}
                        style={{background:c.key===selected?"var(--accent-c)":"var(--bg-card)",color:c.key===selected?"#fff":"var(--t4)",border:"1px solid "+(c.key===selected?"var(--accent-c)":"var(--bd)"),borderRadius:6,padding:"5px 14px",cursor:"pointer",fontSize:".8em",fontWeight:600,transition:"background .15s"}}>
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <MD content={README_DATA[selected]||""} weekKey={selected}/>
            </div></div>
          }
        </div>
        <div style={{height:46,background:"var(--bg-surface)",borderTop:"1px solid var(--bd)",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 22px",flexShrink:0}}>
          <button onClick={()=>prevKey&&setSelected(prevKey)} disabled={!prevKey} style={{background:"none",border:"1px solid var(--bd)",color:prevKey?"var(--t4)":"var(--bd)",padding:"4px 13px",borderRadius:5,cursor:prevKey?"pointer":"default",fontSize:".78em"}}>← {pLabel??""}</button>
          <span style={{fontSize:".7em",color:"var(--t7)"}}>{counter}</span>
          <button onClick={()=>nextKey&&setSelected(nextKey)} disabled={!nextKey} style={{background:"none",border:"1px solid var(--bd)",color:nextKey?"var(--t4)":"var(--bd)",padding:"4px 13px",borderRadius:5,cursor:nextKey?"pointer":"default",fontSize:".78em"}}>{nLabel??""} →</button>
        </div>
      </div>
    </div>
  );
}
