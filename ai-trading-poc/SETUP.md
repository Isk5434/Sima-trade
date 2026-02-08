# 🚀 セットアップガイド

AI Trading PoC を0から運用開始までのステップバイステップガイドです。

## 📋 前提条件

- **Python 3.10+** がインストールされていること
- **Node.js 18+** がインストールされていること
- **npm** または **yarn** がインストールされていること
- Alpha Vantage API Key（無料で取得可能）

## 🔧 ステップ1: 環境変数の設定

### ルートディレクトリで `.env` ファイルを作成

```bash
cd ai-trading-poc
cp .env.example .env
```

`.env` ファイルを編集して、Alpha Vantage API キーを設定：

```env
ALPHA_VANTAGE_KEY=your_actual_api_key_here
API_BASE_URL=https://www.alphavantage.co/query
BACKEND_PORT=5000
FRONTEND_PORT=5173
```

API キーは以下で無料で取得できます：
- https://www.alphavantage.co/api/me

## 🐍 ステップ2: Python AI層のセットアップ

### 仮想環境を作成

```bash
cd ai

# Windows
python -m venv venv
venv\Scripts\activate

# macOS / Linux
python3 -m venv venv
source venv/bin/activate
```

### 依存パッケージをインストール

```bash
pip install -r requirements.txt
```

### データ取得とモデル学習のパイプラインを実行

```bash
# 1. データを取得（Alpha Vantage APIから）
python fetch_data.py

# 出力例：
# ✅ Fetched 200 records for USDJPY
# 💾 Saved data to ./data/raw/USDJPY_20250207_143055.csv
```

```bash
# 2. 特徴量を生成
python feature_engineer.py

# 出力例：
# ✅ Generated 180 feature rows
# 💾 Saved features to ./data/features/USDJPY_features_20250207_143102.csv
```

```bash
# 3. モデルを学習
python train_model.py

# 出力例：
# [100]	valid's multi_logloss: 0.9xx
# ✅ Training pipeline complete!
# 💾 Model saved to ./models/usdjpy_model.pkl
```

**✅ Python層のセットアップ完了！**

## 🔌 ステップ3: Node.js バックエンドのセットアップ

### ルートから backend ディレクトリへ移動

```bash
cd backend
```

### 依存パッケージをインストール

```bash
npm install
```

### バックエンドサーバーを起動

```bash
npm run dev

# 出力例：
# ═══════════════════════════════════════════
# 🚀 AI Trading PoC Backend Server
# ═══════════════════════════════════════════
# Server running at http://localhost:5000
```

**ターミナルは閉じずに実行を続けてください。**

### 動作確認

別のターミナルで以下を実行：

```bash
# ヘルスチェック
curl http://localhost:5000/health

# シグナル取得
curl http://localhost:5000/api/signal
```

**✅ バックエンド層のセットアップ完了！**

## ⚛️ ステップ4: React フロントエンドのセットアップ

### 新しいターミナルで frontend ディレクトリへ移動

```bash
cd frontend
```

### 依存パッケージをインストール

```bash
npm install
```

### フロントエンド開発サーバーを起動

```bash
npm run dev

# 出力例：
# 
#   VITE v4.4.9  ready in 500 ms
#
#   ➜  Local:   http://localhost:5173/
```

**✅ フロントエンド層のセットアップ完了！**

## 🎉 システム全体の確認

ブラウザで以下のURLにアクセス：

```
http://localhost:5173
```

以下が表示されたら成功です：

- 🏮 島ちゃんAI Trading PoC ページ
- 現在のシグナル（LONG / SHORT / NO_TRADE）
- 信頼度表示
- コントロールパネル

## 📚 ターミナル構成図

セットアップ完了後のターミナル構成：

```
ターミナル1: Python ai層
$ cd ai
$ python fetch_data.py  # 定期的に実行 (毎時間など)
$ python train_model.py  # 定期的に実行 (毎日など)

ターミナル2: Node.js バックエンド
$ cd backend
$ npm run dev
# http://localhost:5000

ターミナル3: React フロントエンド
$ cd frontend
$ npm run dev
# http://localhost:5173
```

## 🔄 運用フロー

### 日次運用

```bash
# (ターミナル1: Python層)
cd ai
source venv/bin/activate  # 仮想環境を有効化

# 1. 新しいデータを取得
python fetch_data.py

# 2. 特徴量を生成
python feature_engineer.py

# 3. モデルを再学習
python train_model.py
```

### バックエンド自動更新

バックエンドをブラウザで確認：

```bash
# 手動でキャッシュをクリア & 予測を更新
curl -X POST http://localhost:5000/api/refresh

# またはバックエンドのコントロール画面で
# 「シグナルを更新」ボタンをクリック
```

## 🐛 トラブルシューティング

### "Python not found"

```bash
# Windows
where python

# macOS / Linux
which python3
```

Python がインストールされていなければ：
- https://www.python.org/downloads/ からダウンロード

### "Module not found"

```bash
cd ai
pip install -r requirements.txt
```

### "Port 5000/5173 already in use"

別のアプリケーションが使用中の場合、.env で別のポートを指定：

```env
BACKEND_PORT=5001
FRONTEND_PORT=5174
```

### Alpha Vantage API のレート制限

無料APIは1分あたり5リクエストに制限されています。
エラーが出た場合は待ってから再度実行してください。

## 🎯 デモモード（API キーなし）

`.env` に以下を設定するとデモデータで動作します：

```env
ALPHA_VANTAGE_KEY=demo
```

このモードでは仮想データを使用して全機能をテストできます。

## 📖 次のステップ

- [AI設計ドキュメント](./AI_DESIGN.md)
- [API リファレンス](./API_REFERENCE.md)
- [フロントエンド開発ガイド](./FRONTEND_GUIDE.md)

---

**セットアップに問題がありましたか？**
各レイヤーのドキュメントを参照するか、 README.md を確認してください。
