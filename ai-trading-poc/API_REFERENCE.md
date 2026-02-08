# 📡 API リファレンス

AI Trading PoC のバックエンド API 仕様です。

## ベース URL

```
http://localhost:5000
```

## 認証

現在の実装ではAPI認証はありません。本番環境では JWT認証などの追加を推奨します。

---

## エンドポイント一覧

### 1. ℹ️ API情報 (GET /)

現在のAPIバージョアンド利用可能なエンドポイントを取得します。

**リクエスト:**
```bash
curl http://localhost:5000/
```

**レスポンス:**
```json
{
  "service": "AI Trading PoC Backend",
  "version": "0.1.0",
  "timestamp": "2025-02-07T14:30:00Z",
  "endpoints": {
    "health": "GET /health",
    "metrics": "GET /metrics",
    "signal": "GET /api/signal",
    "train": "POST /api/train",
    "refresh": "POST /api/refresh"
  }
}
```

---

### 2. 🏥 ヘルスチェック (GET /health)

システムの健全性を確認します。

**リクエスト:**
```bash
curl http://localhost:5000/health
```

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "python_available": true,
    "model_loaded": true,
    "api_timestamp": "2025-02-07T14:30:00Z"
  },
  "timestamp": "2025-02-07T14:30:00Z"
}
```

**ステータスコード:**
- `200 OK` - システム正常
- `500 Server Error` - エラー発生

---

### 3. 📊 メトリクス (GET /metrics)

システムのリソース使用状況と統計情報を取得します。

**リクエスト:**
```bash
curl http://localhost:5000/metrics
```

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "uptime": 3600000,
    "memory_usage": 45.2,
    "last_prediction_time": "2025-02-07T14:25:00Z",
    "total_predictions": 42
  },
  "timestamp": "2025-02-07T14:30:00Z"
}
```

**フィールド説明:**
- `uptime` (number) - サーバー起動からの経過時間（ミリ秒）
- `memory_usage` (number) - ヒープメモリ使用量（MB）
- `last_prediction_time` (string) - 最後の予測実行時刻
- `total_predictions` (number) - 累計予測数

---

### 4. 🔮 シグナル取得 (GET /api/signal)

最新の予測シグナルを取得します。キャッシュが有効な場合は前回の予測を返す場合があります。

**リクエスト:**
```bash
curl http://localhost:5000/api/signal
```

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "signal": "LONG",
    "confidence": 0.8234,
    "timestamp": "2025-02-07T14:30:00Z",
    "predicted_class": 1,
    "class_probabilities": {
      "SHORT": 0.0543,
      "LONG": 0.8234,
      "NO_TRADE": 0.1223
    },
    "latest_features": {
      "close": 145.4523,
      "return_1m": 0.0234,
      "rsi": 65.4,
      "hour": 14
    }
  },
  "timestamp": "2025-02-07T14:30:00Z"
}
```

**シグナルの意味:**
- `LONG` - 上昇予測。買い推奨
- `SHORT` - 下落予測。売り推奨
- `NO_TRADE` - 不確実。見送り推奨

**ステータスコード:**
- `200 OK` - 予測成功
- `500 Server Error` - 予測失敗

---

### 5. 🎓 モデル学習 (POST /api/train)

新しいデータでモデルを再学習します。**時間がかかるため（5-10分）、非同期で実行することを推奨します。**

**リクエスト:**
```bash
curl -X POST http://localhost:5000/api/train
```

**プロセス:**
1. Alpha Vantage APIから過去30日分のデータを取得
2. 特徴量を生成
3. LightGBMモデルを学習
4. キャッシュをクリア

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "trained": true
  },
  "timestamp": "2025-02-07T14:35:00Z"
}
```

**エラーレスポンス:**
```json
{
  "success": false,
  "error": "Failed to fetch data",
  "timestamp": "2025-02-07T14:35:00Z"
}
```

**ステップごとのエラー:**
- `Failed to fetch data` - Alpha Vantage APIが応答しない
- `Failed to engineer features` - 特徴量生成でエラー
- `Failed to train model` - モデル学習でエラー

---

### 6. 🔄 キャッシュ更新 (POST /api/refresh)

キャッシュをクリアして新しい予測を即座に取得します。**学習済みモデルから推論を実行するだけなので、通常1-2秒で完了します。**

**リクエスト:**
```bash
curl -X POST http://localhost:5000/api/refresh
```

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "signal": "SHORT",
    "confidence": 0.7123,
    "timestamp": "2025-02-07T14:31:00Z",
    "predicted_class": 0,
    "class_probabilities": {
      "SHORT": 0.7123,
      "LONG": 0.1234,
      "NO_TRADE": 0.1643
    },
    "latest_features": {
      "close": 145.4123,
      "return_1m": -0.0234,
      "rsi": 35.2,
      "hour": 14
    }
  },
  "timestamp": "2025-02-07T14:31:00Z"
}
```

---

## エラーハンドリング

すべてのエラーレスポンスは以下のフォーマットに従います：

```json
{
  "success": false,
  "error": "エラーメッセージ",
  "timestamp": "2025-02-07T14:30:00Z"
}
```

**一般的なエラー:**

| status | メッセージ | 対応 |
|:---:|:---|:---|
| 404 | Not Found | エンドポイントURLを確認 |
| 500 | Internal Server Error | ログを確認、サーバーを再起動 |
| _ | Failed to get prediction | 学習済みモデルが存在するか確認 |

---

## キャッシング戦略

**シグナル (GET /api/signal)**
- キャッシュ有効期間: **5分**
- 5分以内であれば前回の結果を返す
- 5分ごとに自動更新（バックグラウンド）

**モデル学習 (POST /api/train)**
- キャッシュをクリア
- 新しいモデルを読み込み

**キャッシュ更新 (POST /api/refresh)**
- 即座にキャッシュをクリア
- 新しい予測を実行

---

## リクエスト制限

- API キー: Alpha Vantage無料APIは **5リクエスト/分**に制限
- バックエンド: 特に制限なし（Python層の制限を継承）

---

## 使用例

### JavaScript / Node.js

```javascript
// シグナル取得
async function getSignal() {
  const response = await fetch('http://localhost:5000/api/signal');
  const data = await response.json();
  console.log(`Signal: ${data.data.signal}, Confidence: ${data.data.confidence}`);
}

// モデル学習
async function trainModel() {
  const response = await fetch('http://localhost:5000/api/train', {
    method: 'POST',
  });
  const data = await response.json();
  console.log(data);
}

getSignal();
```

### Python

```python
import requests

# シグナル取得
response = requests.get('http://localhost:5000/api/signal')
data = response.json()
print(f"Signal: {data['data']['signal']}")
```

### cURL

```bash
# ヘルスチェック
curl http://localhost:5000/health

# シグナル取得
curl http://localhost:5000/api/signal

# モデル学習
curl -X POST http://localhost:5000/api/train

# キャッシュ更新
curl -X POST http://localhost:5000/api/refresh
```

---

## レスポンスヘッダ

すべてのレスポンスに以下のヘッダが含まれます：

```
Content-Type: application/json
Access-Control-Allow-Origin: http://localhost:5173
```

---

## パフォーマンス目標

| エンドポイント | 応答時間 |
|:---|:---|
| GET /health | <100ms |
| GET /metrics | <100ms |
| GET /api/signal | 500ms-2s |
| POST /api/refresh | 1-3s |
| POST /api/train | 5-10分 |

---

## プロトタイプから本番へ

将来のアップグレード項目：

- [ ] JWT認証の追加
- [ ] レート制限（Rate Limiting）
- [ ] ロギングと監視
- [ ] キャッシュレイヤー（Redis）
- [ ] WebSocket リアルタイム更新
- [ ] API バージョニング（v1, v2）
- [ ] Swagger/OpenAPI ドキュメント

---

**最終更新**: 2025年2月7日  
**API バージョン**: 0.1.0
