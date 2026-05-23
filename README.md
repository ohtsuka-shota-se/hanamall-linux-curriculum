# HanaMall Linux実務習得カリキュラム

ECサイト「HanaMall」のインフラチームに入社した田中さんが
先輩・佐藤さんのSlack指示をこなしながら12週間でLinux実務スキルを習得するカリキュラム。

## 📖 カリキュラムビューア

👉 **https://ohtsuka-shota-se.github.io/hanamall-linux-curriculum/**

## 📁 構成

```
hanamall-linux-curriculum/
├── curriculum/          # カリキュラム本体（Week01〜12）
│   ├── Week01/
│   │   ├── README.md    # 学習内容・ミッション・課題
│   │   ├── hands-on/    # ハンズオン用スクリプト
│   │   ├── data/        # 練習用サンプルデータ
│   │   └── answers/     # 回答例・解説
│   └── Week02〜12/
├── viewer/              # GitHub Pages ビューア（Vite + React）
│   ├── src/
│   │   └── App.jsx
│   └── package.json
└── .github/
    └── workflows/
        └── deploy.yml   # 自動ビルド・デプロイ
```

## 🚀 GitHub Pages セットアップ手順

### 1. リポジトリ名に合わせて base を変更

`viewer/vite.config.js` の `base` をリポジトリ名に合わせる：

```js
// リポジトリ名が hanamall-linux-curriculum の場合
base: '/hanamall-linux-curriculum/',
```

### 2. GitHub Pages を有効化

```
リポジトリ → Settings → Pages
→ Source: GitHub Actions
→ Save
```

### 3. push するだけで自動デプロイ

```bash
git push origin main
# → GitHub Actions が自動でビルド・デプロイ
# → 数分後に Pages URL でビューアが表示される
```

## 💻 ローカルで開発する

```bash
cd viewer
npm install
npm run dev
# → http://localhost:5173 でビューアが開く
```

## 🔄 カリキュラムを更新したときの手順

```bash
# 1. curriculum/ 以下のREADMEを編集

# 2. viewer/src/App.jsx の README_DATA を更新
#    （Claudeとのチャットで cv*.jsx を生成してコピー）

# 3. push
git add .
git commit -m "update Week03 README"
git push origin main
# → 自動でPages が更新される
```

## 📚 カリキュラム内容

| Phase | Week | テーマ |
|-------|------|--------|
| Phase1 基礎固め | Week01 | Linux環境構築・基本操作 |
| Phase1 基礎固め | Week02 | シェル・テキスト処理 |
| Phase1 基礎固め | Week03 | ユーザー管理・プロセス管理 |
| Phase2 インフラ実務 | Week04 | ネットワーク設定・管理 |
| Phase2 インフラ実務 | Week05 | Webサーバー構築（Apache） |
| Phase2 インフラ実務 | Week06 | SSH・cron・自動化基盤 |
| Phase2 インフラ実務 | Week07 | シェルスクリプト実践 |
| Phase2 インフラ実務 | Week08 | ストレージ・ディスク管理 |
| Phase3 応用技術 | Week09 | パッケージ管理・systemd |
| Phase3 応用技術 | Week10 | 監視・障害対応 |
| Phase3 応用技術 | Week11 | クラウド連携・Docker入門 |
| Phase4 総仕上げ | Week12 | 総合演習・振り返り |
