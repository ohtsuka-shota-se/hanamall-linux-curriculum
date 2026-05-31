# 🎨 CSS でデザインを整える

## シナリオ

> HTMLでページの構造は作れた。でも見た目が素っ気ない…。  
> CSSでデザインを整えて、プロらしいポートフォリオに仕上げよう。

---

## 1. CSSファイルを新規作成する

```bash
sudo nano /var/www/html/style.css
```

以下の内容を貼り付けよう。色やフォントは自由に変えてOK。

```css
/* ===== リセット & 基本設定 ===== */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Noto Sans JP', 'Hiragino Sans', sans-serif;
  background-color: #f5f7fa;
  color: #333;
  line-height: 1.7;
}

/* ===== ヘッダー ===== */
header {
  background: linear-gradient(135deg, #1e3a5f, #2d6a9f);
  color: white;
  padding: 60px 20px;
  text-align: center;
}

header h1 {
  font-size: 2.4em;
  font-weight: 700;
  margin-bottom: 10px;
}

.tagline {
  font-size: 1.1em;
  opacity: 0.85;
  letter-spacing: 0.05em;
}

/* ===== メインコンテンツ ===== */
main {
  max-width: 800px;
  margin: 0 auto;
  padding: 40px 20px 60px;
}

section {
  background: white;
  border-radius: 8px;
  padding: 32px;
  margin-bottom: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

section h2 {
  font-size: 1.3em;
  color: #1e3a5f;
  border-left: 4px solid #2d6a9f;
  padding-left: 12px;
  margin-bottom: 16px;
}

section p {
  color: #555;
  font-size: 0.95em;
}

/* ===== リスト ===== */
ul {
  list-style: none;
  padding: 0;
}

ul li {
  padding: 8px 0;
  border-bottom: 1px solid #eee;
  font-size: 0.95em;
  color: #444;
}

ul li:last-child {
  border-bottom: none;
}

ul li::before {
  content: "▸ ";
  color: #2d6a9f;
  font-weight: bold;
}

/* ===== フッター ===== */
footer {
  background: #1e3a5f;
  color: rgba(255, 255, 255, 0.7);
  text-align: center;
  padding: 20px;
  font-size: 0.85em;
}
```

---

## 2. パーミッションを設定する

```bash
sudo chmod 644 /var/www/html/style.css
sudo chown www-data:www-data /var/www/html/style.css

# ファイル一覧を確認
ls -la /var/www/html/
```

---

## 3. ブラウザで確認する

```bash
# Apacheをリロード（設定変更なしなら不要だが念のため）
sudo systemctl reload apache2

# CSSが読み込まれているか確認
curl -s http://localhost | grep "style.css"
```

ブラウザで確認してデザインが反映されていればOK。

---

## 4. カスタマイズしてみよう

### 背景色を変える
```css
/* body の background-color を変えてみよう */
body {
  background-color: #eef2f7;  /* 薄い青 */
  /* background-color: #fff8f0;  薄いオレンジ */
  /* background-color: #f0fff4;  薄い緑 */
}
```

### ヘッダーの色を変える
```css
header {
  /* グラデーションの色を自由に変えよう */
  background: linear-gradient(135deg, #2d1b69, #8e44ad);  /* 紫系 */
}
```

### フォントを変える（Google Fonts を使う場合）

`index.html` の `<head>` に追加：

```html
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700&display=swap" rel="stylesheet">
```

---

## 5. トラブルシューティング

CSSが反映されない場合は以下を確認：

```bash
# Apacheのエラーログを確認
sudo tail -20 /var/log/apache2/error.log

# CSSファイルの存在・パーミッション確認
ls -la /var/www/html/style.css

# index.html の <link> タグが正しいか確認
grep "style.css" /var/www/html/index.html
```

---

## 💡 ポイント

| プロパティ | 説明 |
|-----------|------|
| `box-sizing: border-box` | paddingをwidth計算に含める。現代CSSの標準設定 |
| `linear-gradient` | 2色のグラデーション。`135deg` は右下方向 |
| `box-shadow` | 要素に影をつけてカード風に見せる |
| `::before` | 疑似要素。リストの先頭に装飾を追加 |

次のステップ → 複数ページを追加して本格サイトに仕上げよう
