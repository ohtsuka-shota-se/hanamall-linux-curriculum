# 🚀 複数ページ化と公開確認

## シナリオ

> トップページが完成した！次は「スキル詳細」「連絡先」ページを追加して、  
> 本格的な複数ページサイトに仕上げよう。Week05 で学んだApacheの知識をフル活用する。

---

## 1. ディレクトリ構成を設計する

まずサイトのファイル構成を決めよう。

```
/var/www/html/
├── index.html        ← トップページ（作成済み）
├── style.css         ← スタイルシート（作成済み）
├── skills.html       ← スキル詳細ページ（今回追加）
└── contact.html      ← 連絡先ページ（今回追加）
```

---

## 2. ナビゲーションをトップページに追加する

`index.html` の `<header>` 内に追加：

```bash
sudo nano /var/www/html/index.html
```

`<header>` ブロックを以下に書き換え：

```html
<header>
  <h1>田中 太郎</h1>
  <p class="tagline">インフラエンジニア | Linux / AWS / Docker</p>
  <nav>
    <a href="index.html">ホーム</a>
    <a href="skills.html">スキル詳細</a>
    <a href="contact.html">連絡先</a>
  </nav>
</header>
```

`style.css` にナビゲーションのスタイルを追加：

```bash
sudo nano /var/www/html/style.css
```

ファイルの末尾に追記：

```css
/* ===== ナビゲーション ===== */
nav {
  margin-top: 20px;
}

nav a {
  color: rgba(255, 255, 255, 0.9);
  text-decoration: none;
  margin: 0 12px;
  font-size: 0.95em;
  padding: 6px 0;
  border-bottom: 2px solid transparent;
  transition: border-color 0.2s;
}

nav a:hover {
  border-bottom-color: rgba(255, 255, 255, 0.7);
}
```

---

## 3. スキル詳細ページを作る

```bash
sudo nano /var/www/html/skills.html
```

```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>スキル詳細 | 田中 太郎</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <header>
    <h1>田中 太郎</h1>
    <p class="tagline">インフラエンジニア | Linux / AWS / Docker</p>
    <nav>
      <a href="index.html">ホーム</a>
      <a href="skills.html">スキル詳細</a>
      <a href="contact.html">連絡先</a>
    </nav>
  </header>

  <main>
    <section>
      <h2>Linux / サーバー構築</h2>
      <ul>
        <li>Ubuntu 22.04 / CentOS 9 でのサーバー構築・運用</li>
        <li>Apache / Nginx のバーチャルホスト設定</li>
        <li>systemd によるサービス管理・自動起動設定</li>
        <li>cron を使った定期バックアップ自動化</li>
        <li>firewalld / ufw でのファイアウォール設定</li>
      </ul>
    </section>

    <section>
      <h2>監視・障害対応</h2>
      <ul>
        <li>Zabbix Server / Agent のインストール・設定</li>
        <li>CPU・メモリ・ディスクの閾値アラート設定</li>
        <li>ログ分析（grep / awk / sed）による障害原因特定</li>
        <li>ディスクフル・プロセス異常などの障害対応経験</li>
      </ul>
    </section>

    <section>
      <h2>クラウド / コンテナ</h2>
      <ul>
        <li>AWS EC2 インスタンス作成・セキュリティグループ設定</li>
        <li>Docker コンテナの起動・ネットワーク設定</li>
        <li>Docker Compose による複数コンテナ管理</li>
      </ul>
    </section>
  </main>

  <footer>
    <p>&copy; 2025 田中 太郎</p>
  </footer>
</body>
</html>
```

---

## 4. 連絡先ページを作る

```bash
sudo nano /var/www/html/contact.html
```

```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>連絡先 | 田中 太郎</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <header>
    <h1>田中 太郎</h1>
    <p class="tagline">インフラエンジニア | Linux / AWS / Docker</p>
    <nav>
      <a href="index.html">ホーム</a>
      <a href="skills.html">スキル詳細</a>
      <a href="contact.html">連絡先</a>
    </nav>
  </header>

  <main>
    <section>
      <h2>連絡先</h2>
      <ul>
        <li>GitHub: github.com/tanaka-taro</li>
        <li>メール: tanaka@example.com</li>
      </ul>
    </section>

    <section>
      <h2>活動記録</h2>
      <ul>
        <li>2025年4月 — HanaMall インフラチームに中途入社</li>
        <li>2025年5月 — Apache バーチャルホスト構成を本番投入</li>
        <li>2025年6月 — Zabbix 監視基盤を構築・運用開始</li>
      </ul>
    </section>
  </main>

  <footer>
    <p>&copy; 2025 田中 太郎</p>
  </footer>
</body>
</html>
```

---

## 5. パーミッションをまとめて設定する

```bash
# 全ファイルのパーミッションを一括設定
sudo chmod 644 /var/www/html/*.html /var/www/html/*.css
sudo chown www-data:www-data /var/www/html/*.html /var/www/html/*.css

# 確認
ls -la /var/www/html/
```

---

## 6. 全ページの動作確認

```bash
# 各ページが正常に返ってくるか確認
for page in index.html skills.html contact.html style.css; do
  status=$(curl -o /dev/null -s -w "%{http_code}" http://localhost/$page)
  echo "$page : HTTP $status"
done
```

全ページ `HTTP 200` が返れば成功。

---

## 7. Apacheのアクセスログでアクセスを確認する

```bash
# アクセスログをリアルタイムで確認
sudo tail -f /var/log/apache2/access.log
```

別ターミナルで各ページにアクセスし、ログに記録されることを確認しよう。

---

## 💡 完成チェックリスト

- [ ] `http://サーバーIP/` でトップページが表示される
- [ ] ナビゲーションリンクで各ページに移動できる
- [ ] `http://サーバーIP/skills.html` が表示される
- [ ] `http://サーバーIP/contact.html` が表示される
- [ ] Apacheのエラーログにエラーが出ていない
- [ ] ファイルのパーミッションが `644`、オーナーが `www-data`

```bash
# エラーログに何も出ていないか確認
sudo tail -20 /var/log/apache2/error.log
```

エラーがなければ、あなたのオリジナルWebサイトの完成です！ 🎉
