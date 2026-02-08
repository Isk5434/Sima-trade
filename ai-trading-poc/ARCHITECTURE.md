# 🏛️ アーキテクチャドキュメント

USD/JPY 価格予測AIシステムの全体設計図

---

## システムアーキテクチャ図

```
┌─────────────────────────────────────────────────────────────────┐
│                    🌐 ブラウザ (React)                           │
│                   http://localhost:5173                         │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │  Dashboard   │  │ SignalCard   │  │ StatusBar    │           │
│  │              │  │              │  │              │           │
│  │ LONG/SHORT/  │  │ 信頼度表示    │  │ API Status   │           │
│  │ NO_TRADE     │  │ 特徴量表示    │  │ Model Status │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
└────────────────────────────┬──────────────────────────────────────┘
                             │ HTTP (fetch/axios)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                  🔌 Node.js Backend API                          │
│                   http://localhost:5000                         │
│                                                                   │
│  Express.js ルーター                                             │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ GET  /health         → Python & Model 確認                │ │
│  │ GET  /metrics        → メトリクス                          │ │
│  │ GET  /api/signal     → 最新予測取得                        │ │
│  │ POST /api/train      → モデル学習（5-10分）                │ │
│  │ POST /api/refresh    → キャッシュクリア                    │ │
│  └────────────────────────────────┬─────────────────────────────┘ │
│                                  │                               │
│                   child_process で Python実行                     │
│                                  │                               │
└──────────────────────────────────┼───────────────────────────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    ▼                             ▼
        ┌──────────────────────┐   ┌──────────────────────┐
        │  🐍 Python (AI層)    │   │  データ/モデルストレージ │
        │  http://localhost:5000│   │                      │
        │                      │   │  ./ai/data/          │
        │ ┌──────────────────┐ │   │  - raw/*.csv         │
        │ │ fetch_data.py    │ │   │  - features/*.csv    │
        │ │ ↓                │ │   │  ./ai/models/        │
        │ │ feature_eng...   │ │   │  - usdjpy_model.pkl  │
        │ │ ↓                │ │   │                      │
        │ │ train_model.py   │ │   └──────────────────────┘
        │ │ ↓                │ │
        │ │ predict.py       │ │
        │ │ (推論)            │ │
        │ │                  │ │
        │ │ LightGBM         │ │
        │ │ pandas/numpy     │ │
        │ └──────────────────┘ │
        │                      │
        │ 外部API:              │
        │ Alpha Vantage        │
        │ (1分足OHLC)          │
        └──────────────────────┘
```

---

## データフロー

### リアルタイム予測フロー

```
ユーザー
  │
  └─→ [ブラウザ] GET /api/signal
       │
       └─→ [バックエンド] キャッシュをチェック
            ├─ キャッシュ有効(< 5分)
            │   └─→ 前回の結果を返す (< 100ms)
            │
            └─ キャッシュ無効
                └─→ [Python] predict.py を実行
                    ├─ 最新の1分足OHLC を取得
                    ├─ 過去60分分を読み込む
                    ├─ 特徴量を計算
                    ├─ LightGBMで推論
                    └─→ 予測結果 (JSON) を返す
                
       └─→ [ブラウザ] 結果を表示 (1-2秒)
```

### モデル再学習フロー

```
ユーザー
  │
  └─→ [ブラウザ] POST /api/train
       │
       └─→ [バックエンド] コマンド実行
            │
            ├─1─→ [Python] fetch_data.py
            │      - Alpha Vantage API から過去30日取得
            │      - ./data/raw/ に CSV 保存
            │      └─→ (1-2分)
            │
            ├─2─→ [Python] feature_engineer.py
            │      - 特徴量生成
            │      - ./data/features/ に CSV 保存
            │      └─→ (10秒)
            │
            └─3─→ [Python] train_model.py
                  - 70% → 訓練セット (7日)
                  - 20% → 検証セット (1日)
                  - 10% → テストセット (1日)
                  - LightGBM で学習
                  - ./models/usdjpy_model.pkl に保存
                  └─→ (30秒)
       
       └─→ キャッシュクリア
            └─→ [ブラウザ] 完了通知 (5-10分トータル)
```

---

## ファイル構成と責務

### Python層 (`ai/`)

```
ai/
├── config.yaml              ← 全設定（特徴量、モデルパラメータなど）
├── requirements.txt         ← pip依存パッケージ
│
├── fetch_data.py            ← Alpha Vantage APIからデータ取得
│   ├─ DataFetcher クラス
│   ├─ パチパチ APIから生データ(OHLCV)を取得
│   └─ CSVで保存
│
├── feature_engineer.py      ← 特徴量生成
│   ├─ FeatureEngineer クラス
│   ├─ 14個の特徴量を計算
│   └─ 教師ラベル (target) を生成
│
├── train_model.py           ← モデル学習
│   ├─ ModelTrainer クラス
│   ├─ LightGBMで学習
│   ├─ 評価（精度、混同行列）
│   └─ pickle で保存
│
├── predict.py               ← リアルタイム推論
│   ├─ PredictionEngine クラス
│   ├─ 最新特徴量から予測
│   └─ JSON 出力
│
└── data/
    ├── raw/                 ← Alpha Vantage から取得したCSV
    │   └── USDJPY_*.csv
    ├── features/            ← 生成された特徴量CSV
    │   └── USDJPY_features_*.csv
    └── models/              ← 学習済みモデル
        └── usdjpy_model.pkl
```

### Node.js層 (`backend/`)

```
backend/
├── src/
│   ├── index.ts             ← メインサーバー
│   │   ├─ Express アプリ初期化
│   │   ├─ CORS/JSON ミドルウェア設定
│   │   ├─ PythonRunner 初期化
│   │   └─ ルートマウント
│   │
│   ├── api/
│   │   └── routes.ts        ← APIエンドポイント定義
│   │       ├─ GET /health
│   │       ├─ GET /metrics
│   │       ├─ GET /api/signal     → predict.py
│   │       ├─ POST /api/train     → 3ステップパイプライン
│   │       └─ POST /api/refresh   → predict.py (キャッシュなし)
│   │
│   ├── services/
│   │   └── pythonRunner.ts  ← Pythonプロセス実行
│   │       ├─ exec() でスクリプト実行
│   │       ├─ JSON パース
│   │       ├─ 5分キャッシング
│   │       └─ エラーハンドリング
│   │
│   └── types/
│       └── index.ts         ← TypeScript型定義
│
├── package.json             ← npm 依存（express など）
├── tsconfig.json            ← TypeScript 設定
└── .env                     ← Node環境変数
```

### React層 (`frontend/`)

```
frontend/
├── src/
│   ├── main.tsx             ← Reactエントリポイント
│   │
│   ├── App.tsx              ← ルートコンポーネント
│   │   └─ <Dashboard /> をレンダリング
│   │
│   ├── components/
│   │   ├── Dashboard.tsx    ← メインUI
│   │   │   ├─ レイアウト
│   │   │   ├─ 操作パネル
│   │   │   └─ useSignal Hook 呼び出し
│   │   │
│   │   ├── SignalCard.tsx   ← 予測結果表示
│   │   │   ├─ シグナル (LONG/SHORT)
│   │   │   ├─ 信頼度バー
│   │   │   ├─ クラス確率
│   │   │   └─ 特徴量表示
│   │   │
│   │   └── StatusBar.tsx    ← フッターステータス
│   │       └─ API/Model/Python状態表示
│   │
│   ├── hooks/
│   │   └── useSignal.ts     ← バックエンド通信
│   │       ├─ fetchSignal()
│   │       ├─ trainModel()
│   │       ├─ checkHealth()
│   │       └─ 5分定期更新
│   │
│   ├── styles/
│   │   └── globals.css      ← グローバルスタイル
│   │       ├─ ダウナー・ゴスロリテーマ
│   │       ├─ Tailwind CSS 統合
│   │       └─ animations
│   │
│   └── types/
│       └── index.ts         ← 型定義
│
├── index.html               ← HTML テンプレート
├── vite.config.ts           ← Vite 設定（プロキシ等）
├── tsconfig.json            ← TypeScript 設定
├── tailwind.config.js       ← Tailwind 設定
├── postcss.config.js        ← PostCSS プリセット
└── package.json             ← npm 依存（react など）
```

---

## 技術スタック詳細

### Python の責務

```python
# 計算集約的なタスクに特化
- 30日分のOHLCデータ処理（pandas）
- 14個の特徴量を1440行×14列で計算
- LightGBM で200ラウンドのブースティング学習
- 推論（高速: 数ms）
```

**何をしない？**
- Web サーバー化（Node.js に委譲）
- HTTPリクエスト処理（Node.js に委譲）
- UI レンダリング（React に委譲）

### Node.js の責務

```javascript
// オーケストレーション
- Python スクリプト実行管理
- エラーハンドリング
- キャッシング (5分)
- HTTP/JSON インターフェース
- CORS ハンドリング
```

**何をしない？**
- ML計算（Python に委譲）
- UI レンダリング（React に委譲）

### React の責務

```jsx
// ユーザーインターフェース
- 予測結果の可視化
- ダウナー・ゴスロリテーマUI
- 操作ボタン（更新、学習）
- リアルタイムステータス表示
```

**何をしない？**
- API 実装（Node.js に委譲）
- ML 学習（Python に委譲）

---

## 実行フロー時系列

### 初回起動時

```
[T+0]   ユーザーがブラウザを開く
        └─→ React が起動
            └─→ useSignal Hook が実行
                ├─ GET /health (100ms)
                └─ GET /api/signal (500ms-2s)
[T+2]   ダッシュボードが表示
        └─→ シグナルカード に結果を表示
            (または「モデルが見つかりません」表示)
[T+5]   [オプション] 「🎓 モデルを再学習」をクリック
        └─→ POST /api/train
            ├─ 1分: fetch_data
            ├─ 10秒: feature_engineer
            ├─ 30秒: train_model
            └─ [T+105] 完了
[T+106] 「✅ 学習完了」メッセージ表示
```

### 定常状態（毎日）

```
[毎朝 08:00]
└─→ ターミナルで手動実行:
    python fetch_data.py
    python feature_engineer.py
    python train_model.py
    (合計: 2-3分)

[以降 24時間]
└─→ ユーザーがダッシュボード を開く
    └─→ 前日のモデル で予測実施
        (キャッシュが有効なら前回結果)
```

---

## スケーラビリティロードマップ

### 現在（PoC）

```
クライアント 1台
コンピューター 1台
   └─ Python + Node + React
   └─ メモリ: 100MB
   └─ CPU: ほぼ未使用
```

### Phase 1（小規模運用）

```
クライアント 複数台
サーバー 1台
   ├─ Python Worker (訓練専用)
   └─ Node API (複数インスタンス)
```

### Phase 2（本番環境）

```
クライアント 多数
           ▲
           │ REST API
           ▼
       [API Gateway]
           │
    ┌──────┼──────┐
    ▼      ▼      ▼
  [API]  [API]  [API]  × 複数
    │      │      │
    └──────┼──────┘
           │
       [Cache Layer]  ← Redis
           │
    ┌──────┼──────────────┐
    ▼      ▼              ▼
  [ML]   [DB]         [Queue]  ← 学習ジョブ
```

---

## セキュリティ考慮事項（将来）

```
現在（PoC）：
❌ 認証なし
❌ APIキーが plaintext (.env)
❌ HTTPS未対応
❌ SQL インジェクション対策なし

Phase 2 追加:
✅ JWT 認証
✅ API キーの暗号化管理
✅ HTTPS/TLS
✅ レート制限
✅ 入力バリデーション
✅ ロギング & 監視
```

---

## パフォーマンス特性

```
クリティカルパス:

[ブラウザ]
   │ HTTP (30ms)
   ▼
[Node.js]
   │ child_process spawn (50ms)
   ▼
[Python]
   ├─ fetch_data (CSV load): 100ms
   ├─ feature_engineer (計算): 200ms
   └─ predict (推論): 50ms
   │ collect stdout (100ms)
   ▼
[Node.js]
   │ JSON parse (10ms)
   └─ キャッシング (1ms)
   │ HTTP response (20ms)
   ▼
[ブラウザ]
   └─ render (300ms)

合計: 800ms～2s （初回）
     100ms （キャッシュ有）
```

---

**バージョン**: 0.1.0-PoC  
**最終更新**: 2025年2月7日
