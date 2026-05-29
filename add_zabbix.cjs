const fs = require('fs');

const filePath = 'C:/Users/ohtsu/Documents/Samurai/hanamall-linux-curriculum/viewer/src/App.jsx';
let src = fs.readFileSync(filePath, 'utf8');
let lines = src.split('\n');

// ============================================================
// STEP 1: README_DATA に Zabbix エントリを追加
// ============================================================
const ZABBIX_SERVER_MD =
`# 🗂️ Zabbixサーバー構築

## シナリオ

> Week10で手動監視に限界を感じた。CPU・メモリ・ディスク使用率を自動監視して、閾値超過でアラートを飛ばしてほしい。— 佐藤

## 構成

| 項目 | 内容 |
|---|---|
| OS | Ubuntu 22.04 |
| Zabbix | 6.4 LTS |
| DB | MariaDB 10.6 |
| Web | Apache2 + PHP 8.1 |

## 1. Zabbix リポジトリ追加

Zabbix 公式リポジトリを追加してインストールします。

\`\`\`bash
# Zabbix リポジトリパッケージを取得（公式サイトのURLを使用）
wget https://repo.zabbix.com/zabbix/6.4/ubuntu/pool/main/z/zabbix-release/zabbix-release_6.4-1+ubuntu22.04_all.deb
sudo dpkg -i zabbix-release_6.4-1+ubuntu22.04_all.deb
sudo apt update
\`\`\`

## 2. Zabbix インストール

\`\`\`bash
sudo apt install -y zabbix-server-mysql zabbix-frontend-php zabbix-apache-conf zabbix-sql-scripts zabbix-agent
\`\`\`

## 3. MariaDB セットアップ

\`\`\`bash
sudo apt install -y mariadb-server
sudo systemctl enable mariadb
sudo systemctl start mariadb
sudo mysql_secure_installation
\`\`\`

## 4. Zabbix 用 DB 作成

\`\`\`bash
sudo mysql -uroot -p
\`\`\`

\`\`\`sql
CREATE DATABASE zabbix CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
CREATE USER zabbix@localhost IDENTIFIED BY 'zabbix_pass';
GRANT ALL PRIVILEGES ON zabbix.* TO zabbix@localhost;
SET GLOBAL log_bin_trust_function_creators = 1;
QUIT;
\`\`\`

## 5. 初期スキーマのインポート

\`\`\`bash
zcat /usr/share/zabbix-sql-scripts/mysql/server.sql.gz | sudo mysql --default-character-set=utf8mb4 -uzabbix -p zabbix
\`\`\`

\`\`\`bash
# インポート後、log_bin_trust を元に戻す
sudo mysql -uroot -p -e "SET GLOBAL log_bin_trust_function_creators = 0;"
\`\`\`

## 6. zabbix_server.conf の設定

\`\`\`bash
sudo nano /etc/zabbix/zabbix_server.conf
\`\`\`

\`\`\`
# 以下の行を設定
DBPassword=zabbix_pass
\`\`\`

## 7. PHP タイムゾーン設定

\`\`\`bash
sudo nano /etc/zabbix/apache.conf
\`\`\`

\`\`\`
# php_value date.timezone の行を有効化してタイムゾーンを設定
php_value date.timezone Asia/Tokyo
\`\`\`

## 8. サービス起動

\`\`\`bash
sudo systemctl restart zabbix-server zabbix-agent apache2
sudo systemctl enable zabbix-server zabbix-agent apache2
sudo systemctl status zabbix-server
\`\`\`

## 9. Web セットアップウィザード

ブラウザで \`http://<サーバーIP>/zabbix\` にアクセスしてウィザードを完了する。

- デフォルト管理者: Admin / zabbix
- **初回ログイン後に必ずパスワードを変更すること**

## 今週の課題

1. Zabbix リポジトリを追加して Zabbix Server をインストールする
2. MariaDB に zabbix データベースを作成し、初期スキーマをインポートする
3. \`zabbix_server.conf\` に DB パスワードを設定する
4. \`sudo systemctl status zabbix-server\` で active (running) を確認する
5. ブラウザで Zabbix Web UI にアクセスし、セットアップウィザードを完了する
`;

const ZABBIX_AGENT_MD =
`# 🖥️ Zabbix Agent 設定（監視対象ホスト）

## 概要

監視対象サーバー（web01, db01 など）に Zabbix Agent をインストールします。
Agent が Zabbix Server からのポーリングに応答して、メトリクスを収集・送信します。

## 1. Zabbix リポジトリ追加 + Agent インストール

\`\`\`bash
# リポジトリ追加（Zabbixサーバーと同じ手順）
wget https://repo.zabbix.com/zabbix/6.4/ubuntu/pool/main/z/zabbix-release/zabbix-release_6.4-1+ubuntu22.04_all.deb
sudo dpkg -i zabbix-release_6.4-1+ubuntu22.04_all.deb
sudo apt update
sudo apt install -y zabbix-agent
\`\`\`

## 2. zabbix_agentd.conf の設定

\`\`\`bash
sudo nano /etc/zabbix/zabbix_agentd.conf
\`\`\`

\`\`\`
# Zabbix Server の IP アドレス（ポーリング許可元）
Server=192.168.1.100

# アクティブチェック送信先
ServerActive=192.168.1.100

# このホストの識別名（Zabbix Web UI に表示される名前と一致させる）
Hostname=web01
\`\`\`

## 3. Agent 起動

\`\`\`bash
sudo systemctl enable zabbix-agent
sudo systemctl start zabbix-agent
sudo systemctl status zabbix-agent
\`\`\`

## 4. ファイアウォール設定

\`\`\`bash
# Zabbix Server からのポーリング用ポートを開放
sudo ufw allow from 192.168.1.100 to any port 10050
sudo ufw status
\`\`\`

## 5. Agent の動作確認（Agent ホスト側）

\`\`\`bash
# Agent デーモンが起動しているか確認
sudo zabbix_agentd -t system.hostname
sudo zabbix_agentd -t system.uname
sudo zabbix_agentd -t vm.memory.size[available]
\`\`\`

## 6. Zabbix Web UI でホスト登録

1. Web UI → **設定 → ホスト → ホストの作成**
2. ホスト名: \`web01\`（zabbix_agentd.conf の Hostname と一致させる）
3. グループ: \`Linux servers\`
4. インターフェース: エージェント、IPアドレス \`192.168.1.20\`、ポート \`10050\`
5. テンプレート: \`Linux by Zabbix agent\` を適用

## 今週の課題

1. 監視対象ホストに Zabbix Agent をインストールする
2. \`zabbix_agentd.conf\` の Server/Hostname を正しく設定する
3. \`sudo systemctl status zabbix-agent\` で active を確認する
4. Zabbix Web UI でホストを登録し、監視が開始されることを確認する
5. ホストのステータスが「緑（正常）」になることを確認する
`;

const ZABBIX_VERIFY_MD =
`# ✅ Zabbix 動作確認・トラブルシューティング

## zabbix_get — サーバー側からエージェントに問い合わせ

Zabbix Server 側から Agent に直接メトリクスを取得するデバッグツール。

\`\`\`bash
# zabbix_get のインストール（サーバー側）
sudo apt install -y zabbix-get

# エージェントからメトリクス取得
zabbix_get -s 192.168.1.20 -p 10050 -k system.hostname
zabbix_get -s 192.168.1.20 -p 10050 -k system.uname
zabbix_get -s 192.168.1.20 -p 10050 -k vm.memory.size[available]
zabbix_get -s 192.168.1.20 -p 10050 -k system.cpu.load[all,avg1]
zabbix_get -s 192.168.1.20 -p 10050 -k vfs.fs.size[/,pfree]
\`\`\`

## ログ確認

\`\`\`bash
# Zabbix Server ログ
sudo tail -f /var/log/zabbix/zabbix_server.log

# Zabbix Agent ログ（監視対象ホスト側）
sudo tail -f /var/log/zabbix/zabbix_agentd.log

# systemd ジャーナル
sudo journalctl -u zabbix-server -n 30
sudo journalctl -u zabbix-agent -n 30
\`\`\`

## よくあるエラーと対処

### Get value from agent failed: ZBX_TCP_READ() failed

\`\`\`bash
# Agent が起動していない → 起動する
sudo systemctl start zabbix-agent

# ファイアウォールで Port 10050 がブロックされている
sudo ufw allow 10050/tcp
sudo ufw status
\`\`\`

### Cannot connect to the database

\`\`\`bash
# MariaDB が起動していない
sudo systemctl status mariadb
sudo systemctl start mariadb

# DB 接続情報を確認
grep DBPassword /etc/zabbix/zabbix_server.conf
\`\`\`

### DB 使用量の確認

\`\`\`bash
sudo mysql -uzabbix -p -e "SELECT COUNT(*) FROM zabbix.history;" 2>/dev/null
sudo mysql -uzabbix -p -e "SELECT COUNT(*) FROM zabbix.trends;" 2>/dev/null
\`\`\`

## サービス状態まとめ確認

\`\`\`bash
for svc in zabbix-server zabbix-agent apache2 mariadb; do
  echo "--- $svc ---"
  systemctl is-active $svc
done
\`\`\`

## 今週の課題

1. \`zabbix_get\` で監視対象ホストのメトリクスが取得できることを確認する
2. Zabbix Web UI でグラフが更新されていることを確認する
3. CPU 使用率が高い状態を意図的に作り（\`stress\` コマンドなど）、トリガーが発火することを確認する
4. アラートメール送信を設定する（メディアタイプ → ユーザーのメディア → アクション）
`;

// README_DATA（line 3, 0-index: 2）
const README_PREFIX = 'const README_DATA = ';
let readmeLine = lines[2];
const readmeJSON = readmeLine.slice(README_PREFIX.length, -1);
const readmeObj = JSON.parse(readmeJSON);
readmeObj['ZABBIX_server'] = ZABBIX_SERVER_MD;
readmeObj['ZABBIX_agent']  = ZABBIX_AGENT_MD;
readmeObj['ZABBIX_verify'] = ZABBIX_VERIFY_MD;
lines[2] = README_PREFIX + JSON.stringify(readmeObj) + ';';

// ============================================================
// STEP 2: WEEK_COMMANDS に Zabbix エントリを追加
// ============================================================
const ZABBIX_SERVER_CMDS = {
  prompt: 'ubuntu@zabbix-server:~$',
  intro: [
    '=== Zabbix Server 構築練習 ===',
    'MariaDB セットアップから Zabbix インストールまで体験しよう',
    '・apt でインストール → systemctl で起動確認',
    '・zabbix-server が active になれば成功'
  ],
  commands: {
    'sudo apt install -y mariadb-server': 'パッケージリストを読み込んでいます... 完了\n以下が新たにインストールされます: mariadb-server mariadb-server-10.6\n...\n設定中 mariadb-server-10.6 (1:10.6.12-0ubuntu0.22.04.1) ...',
    'sudo systemctl start mariadb': '',
    'sudo systemctl enable mariadb': 'Synchronizing state of mariadb.service with SysV service script.\nExecuting: /lib/systemd/systemd-sysv-install enable mariadb',
    'sudo apt install -y zabbix-server-mysql zabbix-frontend-php zabbix-apache-conf zabbix-sql-scripts zabbix-agent': 'パッケージリストを読み込んでいます... 完了\n以下が新たにインストールされます: zabbix-server-mysql zabbix-frontend-php zabbix-apache-conf zabbix-sql-scripts zabbix-agent\n...\n設定中 zabbix-server-mysql (6.4.8) ...',
    'sudo systemctl restart zabbix-server zabbix-agent apache2': '',
    'sudo systemctl enable zabbix-server zabbix-agent apache2': 'Synchronizing state of zabbix-server.service...\nSynchronizing state of zabbix-agent.service...\nSynchronizing state of apache2.service...',
    'sudo systemctl status zabbix-server': '● zabbix-server.service - Zabbix Server\n     Loaded: loaded (/lib/systemd/system/zabbix-server.service; enabled)\n     Active: active (running) since Wed 2026-05-27 10:00:00 JST\n   Main PID: 3142 (zabbix_server)\n     Memory: 56.8M\n     CGroup: /system.slice/zabbix-server.service\n             ├─3142 /usr/sbin/zabbix_server -c /etc/zabbix/zabbix_server.conf\n             └─3143 /usr/sbin/zabbix_server: ha manager',
    'sudo systemctl status zabbix-agent': '● zabbix-agent.service - Zabbix Monitoring Agent\n     Loaded: loaded (/lib/systemd/system/zabbix-agent.service; enabled)\n     Active: active (running) since Wed 2026-05-27 10:00:00 JST\n   Main PID: 3200 (zabbix_agentd)\n     Memory: 4.2M',
    'grep DBPassword /etc/zabbix/zabbix_server.conf': 'DBPassword=zabbix_pass',
    'sudo tail -n 5 /var/log/zabbix/zabbix_server.log': ' 3142:20260527:100000.123 Starting Zabbix Server. Zabbix 6.4.8 (revision XXXXX).\n 3142:20260527:100000.124 ****** Enabled features ******\n 3142:20260527:100000.125 SNMP monitoring:           YES\n 3142:20260527:100000.126 IPMI monitoring:           YES\n 3142:20260527:100001.000 database is up to date'
  }
};

const ZABBIX_AGENT_CMDS = {
  prompt: 'ubuntu@web01:~$',
  intro: [
    '=== Zabbix Agent 設定練習（監視対象: web01）===',
    'Agent をインストールして Zabbix Server に接続する設定を体験しよう',
    '・Server= に Zabbix Server の IP を設定',
    '・Hostname= はこのホストの識別名'
  ],
  commands: {
    'sudo apt install -y zabbix-agent': 'パッケージリストを読み込んでいます... 完了\n以下が新たにインストールされます: zabbix-agent\n...\n設定中 zabbix-agent (6.4.8) ...',
    'sudo systemctl enable zabbix-agent': 'Synchronizing state of zabbix-agent.service with SysV service script.',
    'sudo systemctl start zabbix-agent': '',
    'sudo systemctl status zabbix-agent': '● zabbix-agent.service - Zabbix Monitoring Agent\n     Loaded: loaded (/lib/systemd/system/zabbix-agent.service; enabled)\n     Active: active (running) since Wed 2026-05-27 10:02:00 JST\n   Main PID: 2500 (zabbix_agentd)\n     Memory: 4.2M\n     CGroup: /system.slice/zabbix-agent.service\n             └─2500 /usr/sbin/zabbix_agentd -c /etc/zabbix/zabbix_agentd.conf',
    'grep -E "^Server|^Hostname" /etc/zabbix/zabbix_agentd.conf': 'Server=192.168.1.100\nServerActive=192.168.1.100\nHostname=web01',
    'sudo zabbix_agentd -t system.hostname': 'system.hostname                               [s|web01]',
    'sudo zabbix_agentd -t system.uname': 'system.uname                                  [s|Linux web01 5.15.0-91-generic #101-Ubuntu SMP Tue Nov 14 13:30:08 UTC 2023 x86_64]',
    'sudo zabbix_agentd -t vm.memory.size[available]': 'vm.memory.size[available]                     [u|1876123648]',
    'sudo zabbix_agentd -t system.cpu.load[all,avg1]': 'system.cpu.load[all,avg1]                     [d|0.120000]',
    'sudo ufw allow from 192.168.1.100 to any port 10050': '規則を追加しました\n規則を追加しました (v6)',
    'sudo ufw status': '状態: アクティブ\nTo                   Action  From\nOpenSSH              ALLOW   Anywhere\n10050/tcp            ALLOW   192.168.1.100\nOpenSSH (v6)         ALLOW   Anywhere (v6)'
  }
};

const ZABBIX_VERIFY_CMDS = {
  prompt: 'ubuntu@zabbix-server:~$',
  intro: [
    '=== Zabbix 動作確認・デバッグ ===',
    'zabbix_get で監視対象からメトリクスを直接取得しよう',
    '・zabbix_get が成功すれば Agent との通信は正常',
    '・ログで Server 側のエラーを確認できる'
  ],
  commands: {
    'sudo apt install -y zabbix-get': 'パッケージリストを読み込んでいます... 完了\n以下が新たにインストールされます: zabbix-get\n設定中 zabbix-get (6.4.8) ...',
    'zabbix_get -s 192.168.1.20 -p 10050 -k system.hostname': 'web01',
    'zabbix_get -s 192.168.1.20 -p 10050 -k system.uname': 'Linux web01 5.15.0-91-generic #101-Ubuntu SMP x86_64',
    'zabbix_get -s 192.168.1.20 -p 10050 -k vm.memory.size[available]': '1876123648',
    'zabbix_get -s 192.168.1.20 -p 10050 -k system.cpu.load[all,avg1]': '0.120000',
    'zabbix_get -s 192.168.1.20 -p 10050 -k vfs.fs.size[/,pfree]': '72.453126',
    'sudo tail -n 10 /var/log/zabbix/zabbix_server.log': ' 3142:20260527:100100.001 enabling host: web01 (hostid:10084)\n 3142:20260527:100200.001 item "web01:system.cpu.load[all,avg1]" became supported\n 3142:20260527:100200.002 item "web01:vm.memory.size[available]" became supported\n 3142:20260527:100200.003 resuming Zabbix agent checks on host "web01"',
    'sudo journalctl -u zabbix-server -n 5': 'May 27 10:00:00 zabbix-server zabbix_server[3142]: Starting Zabbix Server.\nMay 27 10:01:00 zabbix-server zabbix_server[3142]: database is up to date\nMay 27 10:02:00 zabbix-server zabbix_server[3142]: enabling host: web01',
    'for svc in zabbix-server zabbix-agent apache2 mariadb; do echo "--- $svc ---"; systemctl is-active $svc; done': '--- zabbix-server ---\nactive\n--- zabbix-agent ---\nactive\n--- apache2 ---\nactive\n--- mariadb ---\nactive'
  }
};

// WEEK_COMMANDS（line 8, 0-index: 7）
const CMDS_PREFIX = 'const WEEK_COMMANDS = ';
let cmdsLine = lines[7];
const cmdsJSON = cmdsLine.slice(CMDS_PREFIX.length, -1);
const cmdsObj = JSON.parse(cmdsJSON);
cmdsObj['ZABBIX_server'] = ZABBIX_SERVER_CMDS;
cmdsObj['ZABBIX_agent']  = ZABBIX_AGENT_CMDS;
cmdsObj['ZABBIX_verify'] = ZABBIX_VERIFY_CMDS;
lines[7] = CMDS_PREFIX + JSON.stringify(cmdsObj) + ';';

// lines を再結合
src = lines.join('\n');

// ============================================================
// STEP 3: ADDITIONAL_SCENARIOS に ZABBIX を追加
// ============================================================
const zabbixScenario =
`  {
    id: "ZABBIX",
    title: "Zabbix 監視基盤",
    icon: "📊",
    description: "Zabbix Server + Agent による監視構成。CPU・メモリ・ディスクを自動監視し、閾値超過でアラートを発報する定番エンタープライズ監視ツール。",
    difficulty: "中級",
    servers: ["Zabbix Server", "Zabbix Agent", "MariaDB"],
    bg: "var(--p4-bg)", bd: "var(--p4-bd)", badge: "var(--p4-badge)"
  },`;

const scenariosMarker = '    bg: "var(--p3-bg)", bd: "var(--p3-bd)", badge: "var(--p3-badge)"\n  },\n];';
const scenariosIdx = src.indexOf(scenariosMarker);
if (scenariosIdx === -1) { console.error('FAIL: ADDITIONAL_SCENARIOS DNS end marker not found'); process.exit(1); }
src = src.slice(0, scenariosIdx + scenariosMarker.length - 2) + '\n' + zabbixScenario + '\n];' + src.slice(scenariosIdx + scenariosMarker.length);

// ============================================================
// STEP 4: ZabbixDiagram コンポーネントを DNSDiagram の後に追加
// ============================================================
const zabbixDiagramCode =
`
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
`;

const dnsEnd = '\n\n// ============================================================\n// ストーリーマップ\n// ============================================================';
const dnsEndIdx = src.indexOf(dnsEnd);
if (dnsEndIdx === -1) { console.error('FAIL: ストーリーマップ marker not found'); process.exit(1); }
src = src.slice(0, dnsEndIdx) + zabbixDiagramCode + src.slice(dnsEndIdx);

// ============================================================
// STEP 5: ヘッダーに ZABBIX ケースを追加
// ============================================================
const dnsHeaderEnd = '            ?<><span style={{fontSize:".68em",fontWeight:700,background:"var(--p3-bg)",color:"var(--p3-badge)",border:"1px solid var(--p3-bd)",padding:"2px 8px",borderRadius:4}}>DNS</span>\n              <span style={{fontSize:".84em",fontWeight:600,color:"var(--t4)"}}>{{"DNS_primary":"🔍 プライマリDNS","DNS_secondary":"🔁 セカンダリDNS","DNS_verify":"✅ 動作確認"}[selected]}</span></>\n            :<>\n';
const dnsHeaderIdx = src.indexOf(dnsHeaderEnd);
if (dnsHeaderIdx === -1) { console.error('FAIL: DNS header end branch not found'); process.exit(1); }

const zabbixHeaderCases =
`            ?<><span style={{fontSize:".68em",fontWeight:700,background:"var(--p3-bg)",color:"var(--p3-badge)",border:"1px solid var(--p3-bd)",padding:"2px 8px",borderRadius:4}}>DNS</span>
              <span style={{fontSize:".84em",fontWeight:600,color:"var(--t4)"}}>{{"DNS_primary":"🔍 プライマリDNS","DNS_secondary":"🔁 セカンダリDNS","DNS_verify":"✅ 動作確認"}[selected]}</span></>
            :selected==="ZABBIX"
            ?<span style={{fontSize:".84em",fontWeight:600,color:"var(--p4-badge)"}}>📊 Zabbix 監視基盤</span>
            :selected?.startsWith("ZABBIX_")
            ?<><span style={{fontSize:".68em",fontWeight:700,background:"var(--p4-bg)",color:"var(--p4-badge)",border:"1px solid var(--p4-bd)",padding:"2px 8px",borderRadius:4}}>ZABBIX</span>
              <span style={{fontSize:".84em",fontWeight:600,color:"var(--t4)"}}>{{"ZABBIX_server":"📊 Zabbixサーバー","ZABBIX_agent":"🖥️ Zabbix Agent","ZABBIX_verify":"✅ 動作確認"}[selected]}</span></>
            :<>
`;
src = src.slice(0, dnsHeaderIdx) + zabbixHeaderCases + src.slice(dnsHeaderIdx + dnsHeaderEnd.length);

// ============================================================
// STEP 6: ルーティングに ZABBIX を追加
// ============================================================
const routingMarker = '            :selected==="DNS"\n            ?<DNSDiagram onSelect={setSelected}/>\n            :<div style={{padding:"22px 30px 48px"}}>';
const routingIdx = src.indexOf(routingMarker);
if (routingIdx === -1) { console.error('FAIL: DNS routing marker not found'); process.exit(1); }
const zabbixRouting = '            :selected==="DNS"\n            ?<DNSDiagram onSelect={setSelected}/>\n            :selected==="ZABBIX"\n            ?<ZabbixDiagram onSelect={setSelected}/>\n            :<div style={{padding:"22px 30px 48px"}}>';
src = src.slice(0, routingIdx) + zabbixRouting + src.slice(routingIdx + routingMarker.length);

// ============================================================
// STEP 7: isAdditional に ZABBIX を追加
// ============================================================
const isAdditionalOld = 'const isAdditional = selected==="ADDITIONAL"||selected==="LAMP"||selected?.startsWith("LAMP_")||selected==="DNS"||selected?.startsWith("DNS_");';
const isAdditionalNew = 'const isAdditional = selected==="ADDITIONAL"||selected==="LAMP"||selected?.startsWith("LAMP_")||selected==="DNS"||selected?.startsWith("DNS_")||selected==="ZABBIX"||selected?.startsWith("ZABBIX_");';
if (!src.includes(isAdditionalOld)) { console.error('FAIL: isAdditional line not found'); process.exit(1); }
src = src.replace(isAdditionalOld, isAdditionalNew);

// ============================================================
// 書き出し
// ============================================================
fs.writeFileSync(filePath, src, 'utf8');
console.log('Done! All 7 steps applied successfully.');
