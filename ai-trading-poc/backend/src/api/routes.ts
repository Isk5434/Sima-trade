/**
 * APIルート定義
 */

import {
  Router,
  Request,
  Response,
  NextFunction,
} from 'express';
import { PythonRunner } from '../services/pythonRunner';
import {
  ApiResponse,
  HealthStatus,
  SystemMetrics,
} from '../types';

const router = Router();
let pythonRunner: PythonRunner;
let startTime = Date.now();
let predictionCount = 0;

/**
 * PythonRunnerを設定
 */
export function setupPythonRunner(runner: PythonRunner) {
  pythonRunner = runner;
}

/**
 * エラーハンドラミドルウェア
 */
const asyncHandler = (fn: any) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * GET /health - ヘルスチェック
 */
router.get(
  '/health',
  asyncHandler(async (req: Request, res: Response) => {
    const pythonAvailable = await pythonRunner.isPythonAvailable();
    const modelLoaded = pythonRunner.isModelAvailable();

    const health: HealthStatus = {
      status:
        pythonAvailable && modelLoaded ? 'healthy' : 'unhealthy',
      python_available: pythonAvailable,
      model_loaded: modelLoaded,
      api_timestamp: new Date().toISOString(),
    };

    const response: ApiResponse<HealthStatus> = {
      success: true,
      data: health,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  })
);

/**
 * GET /metrics - システムメトリクス
 */
router.get(
  '/metrics',
  asyncHandler(async (req: Request, res: Response) => {
    const uptime = Date.now() - startTime;

    const metrics: SystemMetrics = {
      uptime,
      memory_usage:
        process.memoryUsage().heapUsed / 1024 / 1024, // MB
      last_prediction_time:
        pythonRunner.getLastPredictionTime()?.toISOString() ??
        null,
      total_predictions: predictionCount,
    };

    const response: ApiResponse<SystemMetrics> = {
      success: true,
      data: metrics,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  })
);

/**
 * GET /api/signal - 最新の予測シグナルを取得
 */
router.get(
  '/api/signal',
  asyncHandler(async (req: Request, res: Response) => {
    const prediction = await pythonRunner.predict();

    if (prediction === null) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Failed to get prediction',
        timestamp: new Date().toISOString(),
      };
      res.status(500).json(response);
    } else {
      predictionCount++;

      const response: ApiResponse<typeof prediction> = {
        success: true,
        data: prediction,
        timestamp: new Date().toISOString(),
      };
      res.json(response);
    }
  })
);

/**
 * POST /api/train - モデルを再学習
 */
router.post(
  '/api/train',
  asyncHandler(async (req: Request, res: Response) => {
    console.log('🎓 Starting model training...');

    // 順序: fetch_data -> feature_engineer -> train_model
    const fetchSuccess = await pythonRunner.fetchData();
    if (!fetchSuccess) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch data',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const engineSuccess = await pythonRunner.engineFeatures();
    if (!engineSuccess) {
      res.status(500).json({
        success: false,
        error: 'Failed to engineer features',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const trainSuccess = await pythonRunner.trainModel();
    if (!trainSuccess) {
      res.status(500).json({
        success: false,
        error: 'Failed to train model',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    pythonRunner.clearCache();

    const response: ApiResponse<{ trained: boolean }> = {
      success: true,
      data: { trained: true },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  })
);

/**
 * POST /api/refresh - キャッシュをクリアして予測を更新
 */
router.post(
  '/api/refresh',
  asyncHandler(async (req: Request, res: Response) => {
    pythonRunner.clearCache();

    const prediction = await pythonRunner.predict();

    if (prediction === null) {
      res.status(500).json({
        success: false,
        error: 'Failed to refresh prediction',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    predictionCount++;

    const response: ApiResponse<typeof prediction> = {
      success: true,
      data: prediction,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  })
);

/**
 * エラーハンドラ
 */
router.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('❌ API Error:', err.message);

  const response: ApiResponse<null> = {
    success: false,
    error: err.message,
    timestamp: new Date().toISOString(),
  };

  res.status(500).json(response);
});

export default router;
