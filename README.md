# HanaMall Linux実務習得カリキュラム

ECサイト「HanaMall」のインフラチームに入社した田中さんが
先輩・佐藤さんのSlack指示をこなしながら12週間でLinux実務スキルを習得するカリキュラム。

## 📖 カリキュラムビューア

👉 **https://ohtsuka-shota-se.github.io/hanamall-linux-curriculum/**

カリキュラムビューアを見ながら、必要な資材は適宜curriculumから取得してください。

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
