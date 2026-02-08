# 🏮 島ちゃんAI Trading PoC 
**USD/JPY 1-2時間後の価格方向を予測するダウナー世界観のトレーディングAIシステム**

## 📋 プロダクト概要

米ドル/円（USD/JPY）の1〜2時間後の価格方向を予測し、  
**「今は賭けるべきか／やめるべきか」** を可視化するAIシステムです。

✅ **本PoCの目的**
- 実運用前提のアーキテクチャ検証
- AI × トレーディングUIの世界観検証
- 精度の極大化は目的としない (シミュレーション/デモ)

---

## 🛠️ 技術スタック

```
┌─────────────────────────────────────────┐
│           React + TS (UI)               │
│     (Tailwind CSS, ダウナー世界観)      │
├──────────────────┬──────────────────────┤
│   Node.js(API)   │  Python(AI/ML)      │
│   Express+TS     │  - sklearn          │
│                  │  - lightgbm         │
│                  │  - pandas/numpy     │
├──────────────────┴──────────────────────┤
│  Alpha Vantage API (無料為替データ)    │
│  .env管理, 実売買なし                  │
└─────────────────────────────────────────┘
```

| 項目 | 技術 |
|------|------|
| **AI/データ** | Python 3.10+, pandas, numpy, scikit-learn, lightgbm |
| **バックエンド** | Node.js, TypeScript, Express |
| **フロントエンド** | React, TypeScript, Vite, Tailwind CSS |
| **外部API** | Alpha Vantage (無料) |
| **ログ/設定** | CSV, JSON, YAML, .env |

---

## 📂 プロジェクト構造

```
ai-trading-poc/
├── README.md                    # このファイル
├── .env.example                 # 環境変数テンプレート
│
├── ai/                          # Python AI層
│   ├── requirements.txt         # Pythonの依存関係
│   ├── config.yaml              # 設定ファイル
│   ├── fetch_data.py            # データ取得スクリプト
│   ├── feature_engineer.py      # 特徴量生成
│   ├── train_model.py           # モデル学習
│   ├── predict.py               # 推論スクリプト
│   ├── data/                    # データディレクトリ
│   │   ├── raw/                 # 取得した生データ
│   │   └── features/            # 特徴量データ
│   └── models/                  # 学習済みモデル
│       └── usdjpy_model.pkl
│
├── backend/                     # Node.js バックエンド
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── index.ts             # メインエントリ
│   │   ├── api/
│   │   │   └── routes.ts        # API ルート
│   │   ├── services/
│   │   │   ├── pythonRunner.ts  # Pythonプロセス実行
│   │   │   └── modelService.ts  # モデル管理
│   │   └── types/
│   │       └── index.ts         # 型定義
│   └── .env
│
└── frontend/                    # React フロントエンド
    ├── package.json
    ├── vite.config.ts
    ├── tsconfig.json
    ├── src/
    │   ├── main.tsx             # エントリポイント
    │   ├── App.tsx              # ルートコンポーネント
    │   ├── components/
    │   │   ├── Dashboard.tsx     # メインダッシュボード
    │   │   ├── SignalCard.tsx    # シグナル表示
    │   │   ├── Chart.tsx         # チャート表示
    │   │   └── StatusBar.tsx     # ステータスバー
    │   ├── hooks/
    │   │   └── useSignal.ts      # シグナル取得Hook
    │   ├── styles/
    │   │   └── globals.css       # グローバルスタイル
    │   └── types/
    │       └── index.ts          # 型定義
    └── .env
```

---

## 🚀 クイックスタート

### 1. プロジェクトセットアップ

```bash
# ルートディレクトリで全体をセットアップ
cd ai-trading-poc

# .envファイルを作成 (API Key設定)
cp .env.example .env
# .envを編集してAlpha VantageのAPIキーを設定
```

### 2. Python AI層のセットアップ

```bash
cd ai
python -m venv venv
venv\Scripts\activate  # Windows
source venv/bin/activate  # macOS/Linux

pip install -r requirements.txt
```

### 3. Node.js バックエンドのセットアップ

```bash
cd ../backend
npm install
```

### 4. React フロントエンドのセットアップ

```bash
cd ../frontend
npm install
```

### 5. 運用開始

```bash
# ターミナル1: Python (定期的にデータ取得・推論)
cd ai
python fetch_data.py
python train_model.py
python predict.py

# ターミナル2: Node.js バックエンド
cd backend
npm run dev

# ターミナル3: React フロントエンド
cd frontend
npm run dev
```

---

## 📊 AI設計方針

### 入力データ
- **資産**: USD/JPY (1分足)
- **期間**: 直近60分分のOHLC データ

### 特徴量生成

```python
# リターン系
- 1分, 5分, 15分, 30分リターン

# テクニカル指標
- SMA乖離率 (5, 15, 60分)
- ボラティリティ (15分, 30分)
- RSI (14)

# 時間帯コンテキスト
- 時間帯 (東京/ロンドン/NY)
- 営業日判定
```

### 予測タスク（3クラス分類）

```json
{
  "LONG": "上昇予測 → 買い推奨",
  "SHORT": "下落予測 → 売り推奨",
  "NO_TRADE": "不確実 → 見送り推奨"
}
```

### 出力フォーマット

```json
{
  "signal": "LONG | SHORT | NO_TRADE",
  "confidence": 0.75,
  "timestamp": "2025-02-07T14:30:00Z",
  "features": {
    "roc_1m": 0.001,
    "rsi": 65.2,
    "atr": 0.045
  }
}
```

---

## 📈 段階的な拡張ロードマップ

### Phase 0 (現在)
- ✅ PoC基板構築
- ✅ データ取得パイプライン
- ✅ 簡易LGBMモデル
- ✅ API & UI検証

### Phase 1
- [ ] 特徴量エンジニアリング拡張
- [ ] バックテスト機能
- [ ] 複数タイムフレーム対応

### Phase 2
- [ ] リアルタイム推論 (WebSocket)
- [ ] パフォーマンスダッシュボード
- [ ] アラート機能

### Phase 3
- [ ] 複数通貨ペア対応
- [ ] オンライン学習

---

## 🔑 環境変数 (.env)

```bash
# Alpha Vantage API
ALPHA_VANTAGE_KEY=your_api_key_here
API_BASE_URL=https://www.alphavantage.co/query

# データベース (将来)
DB_HOST=localhost
DB_PORT=5432

# モデル設定
MODEL_UPDATE_INTERVAL=3600  # 1時間ごと

# ポート設定
BACKEND_PORT=5000
FRONTEND_PORT=5173
```

---

## 🏛️ アーキテクチャ設計

### データフロー

```
┌─────────────┐
│ Alpha API   │
└──────┬──────┘
       │ (1分足OHLC)
       ▼
┌─────────────────────────┐
│ fetch_data.py          │ (Python)
│ CSV 保存               │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐
│ feature_engineer.py     │ (Python)
│ 特徴量生成              │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐
│ train_model.py          │ (Python LightGBM)
│ モデル学習              │
└──────┬──────────────────┘
       │ (pkl保存)
       ▼
┌─────────────────────────┐
│ predict.py              │ (Python)
│ リアルタイム推論        │
└──────┬──────────────────┘
       │ (JSON出力)
       ▼
┌─────────────────────────┐
│ backend (Express API)   │ (Node.js)
│ 推論結果キャッシュ      │
└──────┬──────────────────┘
       │ (/api/signal)
       ▼
┌─────────────────────────┐
│ React Dashboard         │ (フロント)
│ 可視化 & UI             │
└─────────────────────────┘
```

---

## ✨ UI/UX世界観

**ダウナー・ゴスロリテーマ** 
- 💀 Dark theme with vintage palette
- 🎀 Ornamental borders and ribbons
- 📖 Serif font for signal strength
- 💔 Melancholic color scheme (#2C2417, #8B7B74など)

---

## 📝 注意事項

- ⚠️ **デモ・シミュレーション専用** (実売買なし)
- ⚠️ 精度の極大化は目的ではない
- ⚠️ Alpha Vantage無料APIは1分/リクエスト制限あり
- ⚠️ 見落としベースの検証フェーズ

---

## 🔗 参考リソース

- [Alpha Vantage API](https://www.alphavantage.co/)
- [LightGBM Python API](https://lightgbm.readthedocs.io/)
- [React 18 Docs](https://react.dev)
- [Express.js Guide](https://expressjs.com/)

---

**作成日**: 2025年2月7日  
**バージョン**: 0.1.0-PoC  
**ステータス**: 🔧 Development
