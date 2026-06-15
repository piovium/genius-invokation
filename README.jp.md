# 七聖召喚シミュレーター

[中文版](./README.md)  | [English Version](./README.en.md) | [日本語版](./README.jp.md)

https://standalone.piovium.org でお試しください。

## このプロジェクトの特徴

- 完全なオープンソース（主にAGPLv3.0以降を使用）
- コアは現在公式に最も近い決済ルールを実装
- ![原神バージョン](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fplay.piovium.org%2Fapi%2Fversion&query=%24.currentGameVersion&label=Genshin%20Impact)までのすべてのカード定義
  - 定義形式は簡潔で明瞭、読みやすい
  - メンテナンスが容易
- 旧バージョンのすべてのカード（バランス調整前）の定義
  - ゲームバージョンを選択して対戦開始可能
- フロントエンド機能：
  - ゲーム可視化とローカルシミュレーション
  - 履歴の追跡（リプレイ）と途中再開
  - ゲームのインポート/エクスポート
  - 決済詳細ログの確認
- [対戦プラットフォーム(中国語版のみ)](https://play.piovium.org)（公開テスト中）
- 複数プログラミング言語のサポート
  - [C/C++](./packages/cbinding/)
  - [Python](./packages/pybinding/)
  - [C#](./packages/csbinding/)
  - 今後さらに多くの言語に対応予定…
- ~ベータサーバーの新カード先行公開~
- 現在も**多くのバグ**があり、さらなるテストが必要です

## [開発について](./docs/development/README.md)

上記のリンクで（おそらく古い）開発文書とメモを確認できます。

プロジェクトにご興味がある方、または詳しい情報を知りたい方は、[Discord サーバー](https://discord.gg/vGjh6XAKqk)にご参加ください。(主に英語と中国語で運営しています)

すべての内容は中国語版をご参照ください。



