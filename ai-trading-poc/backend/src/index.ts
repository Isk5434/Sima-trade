/**
 * AI Trading PoC - Node.js Backend Main Server
 */

import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import apiRoutes, { setupPythonRunner } from './api/routes';
import { PythonRunner } from './services/pythonRunner';

// 環境変数をロード
dotenv.config({
  path: path.resolve(__dirname, '../../.env'),
});

const app: Express = express();
const PORT = process.env.BACKEND_PORT || 5000;
const PYTHON_PATH = process.env.PYTHON_PATH || 'python';
const AI_DIR = '../ai';

// ===== ミドルウェア設定 =====

// CORS設定
app.use(
  cors({
    origin: [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5174',
      'http://127.0.0.1:3000',
    ],
    credentials: true,
  })
);

// JSON解析
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// リクエストロギング
app.use((req: Request, res: Response, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// ===== PythonRunner初期化 =====

const pythonRunner = new PythonRunner(PYTHON_PATH, AI_DIR);
setupPythonRunner(pythonRunner);

// ===== ルート定義 =====

/**
 * GET / - API情報
 */
app.get('/', (req: Request, res: Response) => {
  res.json({
    service: 'AI Trading PoC Backend',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: 'GET /health',
      metrics: 'GET /metrics',
      signal: 'GET /api/signal',
      train: 'POST /api/train',
      refresh: 'POST /api/refresh',
    },
  });
});

// APIルートをマウント
app.use('/', apiRoutes);

// ===== エラーハンドリング =====

// 404ハンドラ
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    path: req.path,
    timestamp: new Date().toISOString(),
  });
});

// ===== サーバー起動 =====

async function startServer() {
  try {
    // Pythonの確認
    const pythonAvailable = await pythonRunner.isPythonAvailable();
    if (!pythonAvailable) {
      console.error(
        '❌ Python not found. Make sure Python 3.10+ is installed.'
      );
      process.exit(1);
    }
    console.log('✅ Python is available');

    // モデルの確認
    const modelAvailable = pythonRunner.isModelAvailable();
    if (!modelAvailable) {
      console.warn(
        '⚠️  Model not found. Please train the model first using POST /api/train'
      );
    } else {
      console.log('✅ Model is available');
    }

    // サーバー起動
    app.listen(PORT, () => {
      console.log('');
      console.log('═══════════════════════════════════════════');
      console.log('🚀 AI Trading PoC Backend Server');
      console.log('═══════════════════════════════════════════');
      console.log(`Server running at http://localhost:${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log('');
      console.log('Available endpoints:');
      console.log(`  GET  http://localhost:${PORT}/            (Info)`);
      console.log(`  GET  http://localhost:${PORT}/health     (Health)`);
      console.log(`  GET  http://localhost:${PORT}/metrics    (Metrics)`);
      console.log(`  GET  http://localhost:${PORT}/api/signal (Prediction)`);
      console.log(`  POST http://localhost:${PORT}/api/train  (Train Model)`);
      console.log(`  POST http://localhost:${PORT}/api/refresh (Refresh Cache)`);
      console.log('');
      console.log('Usage:');
      console.log(`  curl http://localhost:${PORT}/health`);
      console.log(`  curl http://localhost:${PORT}/api/signal`);
      console.log('═══════════════════════════════════════════');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// グレースフルシャットダウン
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down gracefully...');
  process.exit(0);
});

// サーバー起動
startServer();
