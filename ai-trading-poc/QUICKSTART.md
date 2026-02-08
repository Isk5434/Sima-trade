# ⚡ クイック実装ガイド

**5分で動かす最小実装スタート**

---

## 環境構築（2分）

### Windows PowerShell

```powershell
# 1. Python依存をインストール
cd ai-trading-poc\ai
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt

# 2. Node依存をインストール
cd ..\backend
npm install

# 3. フロントエンド依存をインストール
cd ..\frontend
npm install
```

### macOS / Linux

```bash
# 1. Python依存をインストール
cd ai-trading-poc/ai
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 2. Node依存をインストール
cd ../backend
npm install

# 3. フロントエンド依存をインストール
cd ../frontend
npm install
```

---

## モデル学習（3分）

### ターミナル1: Python AI層

```bash
cd ai-trading-poc/ai
source venv/bin/activate  # または .\venv\Scripts\activate

# 自動パイプラインを実行
python fetch_data.py      # 〜1分
python feature_engineer.py # 〜10秒
python train_model.py      # 〜30秒

# ✅ 完了: ./models/usdjpy_model.pkl が生成されます
```

---

## システム起動（並行実行）

### ターミナル2: バックエンド

```bash
cd ai-trading-poc/backend
npm run dev

# 出力:
# 🚀 AI Trading PoC Backend Server
# Server running at http://localhost:5000
```

### ターミナル3: フロントエンド

```bash
cd ai-trading-poc/frontend
npm run dev

# 出力:
# ➜  Local:   http://localhost:5173/
```

### ブラウザ

```
http://localhost:5173
```

✅ **完了！ダッシュボードが表示されます**

---

## 次のステップ

### 日次運用

```bash
# 毎日（例：朝8:00）
cd ai
source venv/bin/activate
python fetch_data.py
python feature_engineer.py
python train_model.py
```

### 手動更新

ダッシュボードから：
- 「🔄 シグナルを更新」 - 最新予測を取得
- 「🎓 モデルを再学習」 - 最新データで学習

---

## 🐛 トラブル時

| 症状 | 対応 |
|:---|:---|
| Python コマンドが見つからない | `python --version` で確認。py / python3 に変更 |
| "Module not found" | `pip install -r requirements.txt` を再実行 |
| ポート 5000/5173 が使用中 | `.env` で別のポート番号を指定 |
| モデルが見つからない | `train_model.py` を完全に実行したか確認 |
| API が応答しない | バックエンドが起動しているか確認 |

---

## 📊 動作確認

```bash
# ターミナルで
curl http://localhost:5000/health

# 返り値:
# {
#   "success": true,
#   "data": {
#     "status": "healthy",
#     "python_available": true,
#     "model_loaded": true
#   }
# }
```

✅ **`healthy` なら完了！**

---

**詳細は [SETUP.md](SETUP.md) と [README.md](README.md) を参照**
