const fs = require('fs');

const filePath = 'C:/Users/ohtsu/Documents/Samurai/hanamall-linux-curriculum/viewer/src/App.jsx';
let src = fs.readFileSync(filePath, 'utf8');
let lines = src.split('\n');

// ============================================================
// STEP 1: README_DATA に DNS エントリを追加
// ============================================================
const DNS_PRIMARY_MD =
`# 🔍 プライマリDNSサーバー構築

## シナリオ

> HanaMallの社内サーバーが増え、IPアドレス管理が煩雑になってきた。\`web01.hanamall.internal\` のような名前でアクセスできる内部DNSを構築してほしい。— 佐藤

## 構成

| 項目 | 内容 |
|---|---|
| ソフトウェア | BIND9 |
| 役割 | hanamall.internal の権威DNS（プライマリ） |
| IPアドレス | 192.168.1.10 |

## 1. BINDインストール

\`\`\`bash
sudo apt update
sudo apt install -y bind9 bind9utils bind9-doc
sudo systemctl enable named
sudo systemctl start named
\`\`\`

## 2. フォワーダー設定（/etc/bind/named.conf.options）

\`\`\`bash
sudo nano /etc/bind/named.conf.options
\`\`\`

\`\`\`
options {
    directory "/var/cache/bind";
    forwarders { 8.8.8.8; 8.8.4.4; };
    dnssec-validation auto;
    listen-on { any; };
    allow-query { any; };
};
\`\`\`

## 3. ゾーン定義（/etc/bind/named.conf.local）

\`\`\`bash
sudo nano /etc/bind/named.conf.local
\`\`\`

\`\`\`
zone "hanamall.internal" {
    type master;
    file "/etc/bind/zones/hanamall.internal.zone";
    allow-transfer { 192.168.1.11; };
};

zone "1.168.192.in-addr.arpa" {
    type master;
    file "/etc/bind/zones/1.168.192.rev";
    allow-transfer { 192.168.1.11; };
};
\`\`\`

## 4. 正引きゾーンファイル

\`\`\`bash
sudo mkdir -p /etc/bind/zones
sudo nano /etc/bind/zones/hanamall.internal.zone
\`\`\`

\`\`\`
$TTL 86400
@   IN  SOA ns1.hanamall.internal. admin.hanamall.internal. (
        2024010101  ; Serial
        3600        ; Refresh
        900         ; Retry
        604800      ; Expire
        86400 )     ; Minimum TTL

@       IN  NS  ns1.hanamall.internal.
@       IN  NS  ns2.hanamall.internal.

ns1     IN  A   192.168.1.10
ns2     IN  A   192.168.1.11
web01   IN  A   192.168.1.20
db01    IN  A   192.168.1.30
\`\`\`

## 5. 逆引きゾーンファイル

\`\`\`bash
sudo nano /etc/bind/zones/1.168.192.rev
\`\`\`

\`\`\`
$TTL 86400
@   IN  SOA ns1.hanamall.internal. admin.hanamall.internal. (
        2024010101 3600 900 604800 86400 )

@   IN  NS  ns1.hanamall.internal.
10  IN  PTR ns1.hanamall.internal.
11  IN  PTR ns2.hanamall.internal.
20  IN  PTR web01.hanamall.internal.
30  IN  PTR db01.hanamall.internal.
\`\`\`

## 6. 検証・起動

\`\`\`bash
sudo named-checkconf
sudo named-checkzone hanamall.internal /etc/bind/zones/hanamall.internal.zone
sudo named-checkzone 1.168.192.in-addr.arpa /etc/bind/zones/1.168.192.rev
sudo systemctl restart named
sudo systemctl status named
\`\`\`

## 今週の課題

1. BIND9をインストールしてプライマリDNSを起動する
2. \`hanamall.internal\` の正引きゾーンを作成する（Aレコード 4件以上）
3. 逆引きゾーン（PTRレコード）を設定する
4. \`named-checkconf\` / \`named-checkzone\` でエラーがないことを確認する
5. \`dig @192.168.1.10 web01.hanamall.internal\` で正引きが成功することを確認する
`;

const DNS_SECONDARY_MD =
`# 🔁 セカンダリDNS構築（ゾーン転送）

## 概要

プライマリDNSからゾーン情報を自動転送するセカンダリDNSを構築します。
プライマリが落ちても名前解決を継続できる冗長構成にします。

| 項目 | 内容 |
|---|---|
| ソフトウェア | BIND9（スレーブ） |
| IPアドレス | 192.168.1.11 |
| ゾーン転送元 | 192.168.1.10（プライマリ） |

## 1. BINDインストール（セカンダリ側）

\`\`\`bash
sudo apt update
sudo apt install -y bind9 bind9utils
sudo systemctl enable named
\`\`\`

## 2. スレーブゾーン設定（/etc/bind/named.conf.local）

\`\`\`bash
sudo nano /etc/bind/named.conf.local
\`\`\`

\`\`\`
zone "hanamall.internal" {
    type slave;
    file "/var/cache/bind/hanamall.internal.zone";
    masters { 192.168.1.10; };
};

zone "1.168.192.in-addr.arpa" {
    type slave;
    file "/var/cache/bind/1.168.192.rev";
    masters { 192.168.1.10; };
};
\`\`\`

## 3. ゾーン転送の確認

\`\`\`bash
sudo systemctl restart named

# 転送ログを確認
sudo journalctl -u named -n 20

# ゾーンファイルが作成されたか確認
ls -la /var/cache/bind/
\`\`\`

## 4. レコード追加時のシリアル番号更新

ゾーンファイルを更新する際は **シリアル番号を必ずインクリメント** すること。セカンダリへの自動反映はこの値を比較して行われる。

\`\`\`bash
# プライマリ側でゾーンファイルを編集
sudo nano /etc/bind/zones/hanamall.internal.zone
# → Serial を 2024010101 → 2024010102 に変更
# → 新しいAレコードを追加

sudo named-checkzone hanamall.internal /etc/bind/zones/hanamall.internal.zone
sudo rndc reload hanamall.internal
\`\`\`

## 今週の課題

1. セカンダリDNSにBIND9をインストールし、スレーブゾーンを設定する
2. プライマリからゾーン転送が成功することを確認する（\`ls /var/cache/bind/\`）
3. セカンダリDNSへの問い合わせで同じ結果が返ることを確認する
4. プライマリでレコードを追加・シリアル番号更新後、セカンダリに反映されることを確認する
`;

const DNS_VERIFY_MD =
`# ✅ DNS動作確認・トラブルシューティング

## dig コマンドの基本

DNSの動作確認には \`dig\` が最も重要なツールです。

\`\`\`bash
# 正引き（Aレコード）
dig web01.hanamall.internal

# 特定のDNSサーバーに問い合わせ
dig @192.168.1.10 web01.hanamall.internal

# IPアドレスのみ表示（+short）
dig +short web01.hanamall.internal

# 逆引き（PTRレコード）
dig -x 192.168.1.20

# NSレコード確認
dig hanamall.internal NS

# 全レコード表示
dig hanamall.internal ANY
\`\`\`

## nslookup / host

\`\`\`bash
nslookup web01.hanamall.internal 192.168.1.10
nslookup 192.168.1.20

host web01.hanamall.internal
host 192.168.1.20
\`\`\`

## よくあるエラーと対処

### SERVFAIL — ゾーンファイル構文エラー

\`\`\`bash
sudo named-checkzone hanamall.internal /etc/bind/zones/hanamall.internal.zone
sudo journalctl -u named -n 30
sudo systemctl restart named
\`\`\`

### ゾーン転送が失敗 — ファイアウォール確認

\`\`\`bash
sudo ufw allow 53/tcp
sudo ufw allow 53/udp
sudo ufw status
\`\`\`

### クライアントのDNS設定

\`\`\`bash
cat /etc/resolv.conf
# 以下を追加
# nameserver 192.168.1.10
# nameserver 192.168.1.11
# search hanamall.internal
\`\`\`

## 今週の課題

1. \`dig\` で正引き・逆引きの両方が成功することを確認する
2. セカンダリDNSへの問い合わせでも同じ結果が返ることを確認する
3. クライアントの \`/etc/resolv.conf\` を設定し、名前でpingが通ることを確認する
4. 意図的にゾーンファイルにエラーを入れ、\`named-checkzone\` でエラーを検出する
`;

// README_DATA（line 3, 0-index: 2）
const README_PREFIX = 'const README_DATA = ';
let readmeLine = lines[2];
const readmeJSON = readmeLine.slice(README_PREFIX.length, -1);
const readmeObj = JSON.parse(readmeJSON);
readmeObj['DNS_primary']   = DNS_PRIMARY_MD;
readmeObj['DNS_secondary'] = DNS_SECONDARY_MD;
readmeObj['DNS_verify']    = DNS_VERIFY_MD;
lines[2] = README_PREFIX + JSON.stringify(readmeObj) + ';';

// ============================================================
// STEP 2: WEEK_COMMANDS に DNS エントリを追加
// ============================================================
const DNS_PRIMARY_CMDS = {
  prompt: 'ubuntu@ns1:~$',
  intro: [
    '=== プライマリDNSサーバー (ns1.hanamall.internal) ===',
    'BIND9 のインストールと設定を練習します。',
    '・named-checkconf / named-checkzone で検証',
    '・dig コマンドで名前解決を確認'
  ],
  commands: {
    'sudo apt update': '取得:1 http://archive.ubuntu.com jammy InRelease [270 kB]\n完了\n271 個のパッケージをアップグレードできます。',
    'sudo apt install -y bind9 bind9utils bind9-doc': 'パッケージリストを読み込んでいます... 完了\n以下が新たにインストールされます: bind9 bind9utils bind9-doc\n...\n設定中 bind9 (1:9.18.12-0ubuntu0.22.04.1) ...',
    'sudo systemctl enable named': 'Synchronizing state of named.service with SysV service script.\nExecuting: /lib/systemd/systemd-sysv-install enable named',
    'sudo systemctl start named': '',
    'sudo systemctl status named': '● named.service - BIND Domain Name Server\n     Loaded: loaded (/lib/systemd/system/named.service; enabled)\n     Active: active (running) since Wed 2026-05-27 10:00:00 JST\n   Main PID: 1842 (named)\n     Memory: 20.1M\n     CGroup: /system.slice/named.service\n             └─1842 /usr/sbin/named -f -u bind',
    'named -v': 'BIND 9.18.12-0ubuntu0.22.04.1 (Extended Support Version) <id:>',
    'sudo named-checkconf': '💡 エラーがなければ何も出力されません',
    'sudo named-checkzone hanamall.internal /etc/bind/zones/hanamall.internal.zone': 'Loading serial: 2024010101\nOK',
    'sudo named-checkzone 1.168.192.in-addr.arpa /etc/bind/zones/1.168.192.rev': 'Loading serial: 2024010101\nOK',
    'sudo systemctl restart named': '',
    'dig @localhost web01.hanamall.internal': '; <<>> DiG 9.18.12 <<>> @localhost web01.hanamall.internal\n;; ANSWER SECTION:\nweb01.hanamall.internal.\t86400\tIN\tA\t192.168.1.20\n\n;; Query time: 1 msec\n;; SERVER: 127.0.0.1#53(localhost)',
    'dig @localhost -x 192.168.1.20': '; <<>> DiG 9.18.12 <<>> @localhost -x 192.168.1.20\n;; ANSWER SECTION:\n20.1.168.192.in-addr.arpa. 86400 IN PTR web01.hanamall.internal.\n\n;; Query time: 1 msec',
    'dig @localhost hanamall.internal NS': '; <<>> DiG 9.18.12 <<>> @localhost hanamall.internal NS\n;; ANSWER SECTION:\nhanamall.internal.\t86400\tIN\tNS\tns1.hanamall.internal.\nhanamall.internal.\t86400\tIN\tNS\tns2.hanamall.internal.'
  }
};

const DNS_SECONDARY_CMDS = {
  prompt: 'ubuntu@ns2:~$',
  intro: [
    '=== セカンダリDNSサーバー (ns2.hanamall.internal) ===',
    'ゾーン転送とスレーブ構成を練習します。',
    '・プライマリ(192.168.1.10)が起動していることを前提としています。'
  ],
  commands: {
    'sudo apt install -y bind9 bind9utils': 'パッケージリストを読み込んでいます... 完了\n以下が新たにインストールされます: bind9 bind9utils\n...\n設定中 bind9 (1:9.18.12-0ubuntu0.22.04.1) ...',
    'sudo systemctl restart named': '',
    'ls -la /var/cache/bind/': '合計 16\ndrwxrwsr-x 2 root bind 4096  5月 27 10:01 .\ndrwxr-xr-x 7 root root  4096  5月 27 10:00 ..\n-rw-r--r-- 1 bind bind  512  5月 27 10:01 hanamall.internal.zone\n-rw-r--r-- 1 bind bind  384  5月 27 10:01 1.168.192.rev\n💡 ゾーン転送成功！プライマリからファイルが転送された',
    'sudo journalctl -u named -n 20': 'May 27 10:01:00 ns2 named[2100]: zone hanamall.internal/IN: Transfer started.\nMay 27 10:01:00 ns2 named[2100]: transfer of hanamall.internal/IN from 192.168.1.10#53: connected\nMay 27 10:01:00 ns2 named[2100]: zone hanamall.internal/IN: transferred serial 2024010101\nMay 27 10:01:00 ns2 named[2100]: zone hanamall.internal/IN: Transfer completed',
    'dig @192.168.1.11 web01.hanamall.internal': '; <<>> DiG 9.18.12 <<>> @192.168.1.11 web01.hanamall.internal\n;; ANSWER SECTION:\nweb01.hanamall.internal.\t86400\tIN\tA\t192.168.1.20\n\n;; SERVER: 192.168.1.11#53(192.168.1.11)',
    'sudo rndc status': 'version: BIND 9.18.12 <id:>\nrunning on ns2: Linux x86_64 5.15.0\nboot time: Wed, 27 May 2026 10:00:00 GMT\nlast configured: Wed, 27 May 2026 10:00:00 GMT\nnumber of zones: 2',
    'sudo rndc reload': 'server reload successful',
    'sudo rndc reload hanamall.internal': 'zone reload up-to-date'
  }
};

const DNS_VERIFY_CMDS = {
  prompt: 'ubuntu@client:~$',
  intro: [
    '=== DNSクライアント 動作確認 ===',
    'dig / nslookup / host コマンドで名前解決を確認します。',
    '・プライマリDNS(192.168.1.10)が起動していることを前提としています。'
  ],
  commands: {
    'dig @192.168.1.10 web01.hanamall.internal': '; <<>> DiG 9.18.12 <<>> @192.168.1.10 web01.hanamall.internal\n;; ANSWER SECTION:\nweb01.hanamall.internal.\t86400\tIN\tA\t192.168.1.20\n\n;; Query time: 2 msec\n;; SERVER: 192.168.1.10#53(192.168.1.10)',
    'dig @192.168.1.10 web01.hanamall.internal +short': '192.168.1.20',
    'dig @192.168.1.10 -x 192.168.1.20': '; <<>> DiG 9.18.12 <<>> @192.168.1.10 -x 192.168.1.20\n;; ANSWER SECTION:\n20.1.168.192.in-addr.arpa. 86400 IN PTR web01.hanamall.internal.\n\n;; Query time: 1 msec',
    'dig @192.168.1.10 hanamall.internal NS': '; <<>> DiG 9.18.12 <<>> @192.168.1.10 hanamall.internal NS\n;; ANSWER SECTION:\nhanamall.internal.\t86400\tIN\tNS\tns1.hanamall.internal.\nhanamall.internal.\t86400\tIN\tNS\tns2.hanamall.internal.',
    'dig @192.168.1.10 hanamall.internal ANY': '; <<>> DiG 9.18.12 <<>> @192.168.1.10 hanamall.internal ANY\n;; ANSWER SECTION:\nhanamall.internal.\t86400\tIN\tNS\tns1.hanamall.internal.\nhanamall.internal.\t86400\tIN\tNS\tns2.hanamall.internal.\nhanamall.internal.\t86400\tIN\tSOA\tns1.hanamall.internal. admin.hanamall.internal. 2024010101 3600 900 604800 86400',
    'nslookup web01.hanamall.internal 192.168.1.10': 'Server:\t\t192.168.1.10\nAddress:\t192.168.1.10#53\n\nName:\tweb01.hanamall.internal\nAddress: 192.168.1.20',
    'host web01.hanamall.internal 192.168.1.10': 'Using domain server:\nName: 192.168.1.10\n\nweb01.hanamall.internal has address 192.168.1.20',
    'ping -c 2 web01.hanamall.internal': 'PING web01.hanamall.internal (192.168.1.20) 56(84) bytes of data.\n64 bytes from web01.hanamall.internal (192.168.1.20): icmp_seq=1 ttl=64 time=0.412 ms\n64 bytes from web01.hanamall.internal (192.168.1.20): icmp_seq=2 ttl=64 time=0.389 ms\n\n--- web01.hanamall.internal ping statistics ---\n2 packets transmitted, 2 received, 0% packet loss'
  }
};

// WEEK_COMMANDS（line 8, 0-index: 7）
const CMDS_PREFIX = 'const WEEK_COMMANDS = ';
let cmdsLine = lines[7];
const cmdsJSON = cmdsLine.slice(CMDS_PREFIX.length, -1);
const cmdsObj = JSON.parse(cmdsJSON);
cmdsObj['DNS_primary']   = DNS_PRIMARY_CMDS;
cmdsObj['DNS_secondary'] = DNS_SECONDARY_CMDS;
cmdsObj['DNS_verify']    = DNS_VERIFY_CMDS;
lines[7] = CMDS_PREFIX + JSON.stringify(cmdsObj) + ';';

// lines を再結合
src = lines.join('\n');

// ============================================================
// STEP 3: ADDITIONAL_SCENARIOS に DNS を追加
// ============================================================
const dnsScenario =
`  {
    id: "DNS",
    title: "内部DNSサーバー",
    icon: "🔍",
    description: "BINDを使ったプライマリ/セカンダリDNS構成。社内サーバーを名前で解決できるようにし、ゾーン転送による冗長化まで学ぶ。",
    difficulty: "中級",
    servers: ["BIND9", "ゾーン転送", "dig"],
    bg: "var(--p3-bg)", bd: "var(--p3-bd)", badge: "var(--p3-badge)"
  },`;

const scenariosMarker = '    bg: "var(--p2-bg)", bd: "var(--p2-bd)", badge: "var(--p2-badge)"\n  },\n];';
const scenariosIdx = src.indexOf(scenariosMarker);
if (scenariosIdx === -1) { console.error('FAIL: ADDITIONAL_SCENARIOS end marker not found'); process.exit(1); }
src = src.slice(0, scenariosIdx + scenariosMarker.length - 2) + '\n' + dnsScenario + '\n];' + src.slice(scenariosIdx + scenariosMarker.length);

// ============================================================
// STEP 4: DNSDiagram コンポーネントを ArchDiagram の後に追加
// ============================================================
const dnsDiagramCode =
`
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
`;

const archDiagramEnd = '\n\n// ============================================================\n// ストーリーマップ\n// ============================================================';
const archIdx = src.indexOf(archDiagramEnd);
if (archIdx === -1) { console.error('FAIL: ArchDiagram end / ストーリーマップ marker not found'); process.exit(1); }
src = src.slice(0, archIdx) + dnsDiagramCode + src.slice(archIdx);

// ============================================================
// STEP 5: ヘッダー に DNS ケースを追加
// ============================================================
const headerLampEnd = '            :<>\n';
const headerLampBranch = '            :selected?.startsWith("LAMP_")\n            ?<><span style={{fontSize:".68em",fontWeight:700,background:"var(--p2-bg)",color:"var(--p2-badge)",border:"1px solid var(--p2-bd)",padding:"2px 8px",borderRadius:4}}>LAMP</span>\n              <span style={{fontSize:".84em",fontWeight:600,color:"var(--t4)"}}>{{"LAMP_apache":"🌐 Apache","LAMP_mysql":"🗄️ MySQL","LAMP_php":"⚙️ PHP"}[selected]}</span></>\n            :<>\n';
const headerLampIdx = src.indexOf(headerLampBranch);
if (headerLampIdx === -1) { console.error('FAIL: header LAMP_ branch not found'); process.exit(1); }

const dnsHeaderCases =
`            :selected==="DNS"
            ?<span style={{fontSize:".84em",fontWeight:600,color:"var(--p3-badge)"}}>🔍 内部DNS構成</span>
            :selected?.startsWith("DNS_")
            ?<><span style={{fontSize:".68em",fontWeight:700,background:"var(--p3-bg)",color:"var(--p3-badge)",border:"1px solid var(--p3-bd)",padding:"2px 8px",borderRadius:4}}>DNS</span>
              <span style={{fontSize:".84em",fontWeight:600,color:"var(--t4)"}}>{{"DNS_primary":"🔍 プライマリDNS","DNS_secondary":"🔁 セカンダリDNS","DNS_verify":"✅ 動作確認"}[selected]}</span></>
            :<>
`;

src = src.slice(0, headerLampIdx + headerLampBranch.length - headerLampEnd.length) + dnsHeaderCases + src.slice(headerLampIdx + headerLampBranch.length);

// ============================================================
// STEP 6: メインコンテンツ ルーティングに DNS を追加
// ============================================================
const routingMarker = '            ?<ArchDiagram scenarioId="LAMP" onSelect={setSelected}/>\n            :<div style={{padding:"22px 30px 48px"}}>';
const routingIdx = src.indexOf(routingMarker);
if (routingIdx === -1) { console.error('FAIL: routing LAMP marker not found'); process.exit(1); }
const dnsRouting = '            ?<ArchDiagram scenarioId="LAMP" onSelect={setSelected}/>\n            :selected==="DNS"\n            ?<DNSDiagram onSelect={setSelected}/>\n            :<div style={{padding:"22px 30px 48px"}}>';
src = src.slice(0, routingIdx) + dnsRouting + src.slice(routingIdx + routingMarker.length);

// ============================================================
// STEP 7: isAdditional に DNS を追加
// ============================================================
const isAdditionalOld = 'const isAdditional = selected==="ADDITIONAL"||selected==="LAMP"||selected?.startsWith("LAMP_");';
const isAdditionalNew = 'const isAdditional = selected==="ADDITIONAL"||selected==="LAMP"||selected?.startsWith("LAMP_")||selected==="DNS"||selected?.startsWith("DNS_");';
if (!src.includes(isAdditionalOld)) { console.error('FAIL: isAdditional line not found'); process.exit(1); }
src = src.replace(isAdditionalOld, isAdditionalNew);

// ============================================================
// 書き出し
// ============================================================
fs.writeFileSync(filePath, src, 'utf8');
console.log('Done! All 7 steps applied successfully.');
