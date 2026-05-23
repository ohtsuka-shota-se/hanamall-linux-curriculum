# Linux実務習得カリキュラム（オーダーメイド12週間）

## 対象者
- インフラエンジニア・29歳男性
- CCNA取得済み・プログラミング学習経験あり
- Linux業務利用が目的（資格取得ではなく実務スキル優先）

## カリキュラム構成

| Phase | Week | テーマ |
|-------|------|--------|
| Phase1 基礎固め | Week01 | Linux環境構築・基本操作 |
| Phase1 基礎固め | Week02 | シェル・テキスト処理 |
| Phase1 基礎固め | Week03 | ユーザー管理・プロセス管理 |
| Phase2 インフラ実務 | Week04 | ネットワーク設定・管理 |
| Phase2 インフラ実務 | Week05 | Webサーバー構築（Nginx） |
| Phase2 インフラ実務 | Week06 | SSH・自動化基盤（cron） |
| Phase2 インフラ実務 | Week07 | シェルスクリプト実践 |
| Phase2 インフラ実務 | Week08 | ストレージ・ディスク管理 |
| Phase3 応用技術 | Week09 | パッケージ管理・systemd |
| Phase3 応用技術 | Week10 | 監視・障害対応 |
| Phase3 応用技術 | Week11 | クラウド連携・Docker入門 |
| Phase4 総仕上げ | Week12 | 総合演習・振り返り |

## 各Weekのフォルダ構成

```
WeekXX/
├── README.md        # 当週の目標・学習内容・演習手順
├── hands-on/        # ハンズオン用スクリプト・設定ファイル
├── data/            # 練習用サンプルデータ（ログファイル等）
└── answers/         # 回答例・解説
```

## 進め方
1. 各WeekのREADMEを読んでから演習を開始する
2. `hands-on/` のファイルを使って手を動かす
3. 詰まったら `answers/` を参照する
4. 毎週1つ課題を提出 → 次回レッスンでレビュー

## 環境準備
- WSL2（Ubuntu 22.04 推奨）または VirtualBox + Ubuntu
- AWS無料枠アカウント（Week11から使用）
- Git（本リポジトリのclone用）
