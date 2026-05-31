# 📄 HTML でトップページを作る

## シナリオ

> Week05 でApacheの構築とバーチャルホスト設定を終えた田中さん。  
> 佐藤さんから「せっかくだから自分のポートフォリオサイトを作ってみたら？」と提案される。  
> `/var/www/html/` のデフォルトページを書き換えて、世界に一つのWebサイトを公開しよう。

---

## 1. 現在のデフォルトページを確認する

```bash
# Apacheのデフォルトページを確認
cat /var/www/html/index.html

# ブラウザでアクセスして表示を確認
# http://サーバーのIPアドレス/
curl -s http://localhost | head -20
```

---

## 2. バックアップを取ってから編集する

現場での鉄則：**編集前にバックアップ**。

```bash
# 元のファイルを保存しておく
sudo cp /var/www/html/index.html /var/www/html/index.html.bak

# バックアップされたことを確認
ls -la /var/www/html/
```

---

## 3. 自分のトップページを作る

```bash
sudo nano /var/www/html/index.html
```

以下の内容で書き換えてみよう。**名前・自己紹介文は自分のものに変えること。**

```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>田中 太郎 | インフラエンジニア</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <header>
    <h1>田中 太郎</h1>
    <p class="tagline">インフラエンジニア | Linux / AWS / Docker</p>
  </header>

  <main>
    <section class="about">
      <h2>自己紹介</h2>
      <p>
        HanaMall のインフラチームに所属。Linux サーバーの構築・運用を担当しています。
        日々の業務でシェルスクリプトや監視ツールを活用しながら、安定したサービス提供を目指しています。
      </p>
    </section>

    <section class="skills">
      <h2>スキル</h2>
      <ul>
        <li>Linux（Ubuntu / CentOS）</li>
        <li>Apache / Nginx</li>
        <li>シェルスクリプト</li>
        <li>AWS EC2 / S3</li>
        <li>Docker / Docker Compose</li>
      </ul>
    </section>

    <section class="works">
      <h2>取り組んだこと</h2>
      <ul>
        <li>本番サーバーの Apache バーチャルホスト構成</li>
        <li>深夜ディスクフル障害の対応・再発防止策の実施</li>
        <li>Zabbix による死活監視・アラート設定</li>
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

## 4. ファイルのパーミッションを設定する

```bash
# Apacheが読めるようにパーミッションを設定
sudo chmod 644 /var/www/html/index.html
sudo chown www-data:www-data /var/www/html/index.html

# 確認
ls -la /var/www/html/index.html
```

---

## 5. ブラウザで確認する

```bash
# Apacheの設定に問題がないか確認
sudo apache2ctl configtest

# 問題なければリロード（再起動不要）
sudo systemctl reload apache2

# コマンドラインで確認
curl -s http://localhost | grep "<title>"
```

ブラウザで `http://サーバーのIPアドレス/` にアクセスして、自分のページが表示されれば成功！

---

## 💡 ポイント

| ファイル | 役割 |
|----------|------|
| `/var/www/html/index.html` | ルートURL (`/`) で表示されるファイル |
| `www-data` | Apacheの実行ユーザー。このユーザーが読めないとエラーになる |
| `644` | 所有者が読み書き可、その他は読み取りのみ。Webファイルの標準 |

次のステップ → CSSでデザインを整えよう
