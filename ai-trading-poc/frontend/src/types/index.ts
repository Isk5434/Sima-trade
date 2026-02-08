/**
 * フロントエンド型定義
 */

export interface PredictionResult {
  signal: 'LONG' | 'SHORT' | 'NO_TRADE';
  confidence: number;
  timestamp: string;
  predicted_class: number;
  class_probabilities: {
    SHORT: number;
    LONG: number;
    NO_TRADE: number;
  };
  latest_features: {
    close: number;
    return_1m: number;
    rsi: number;
    hour: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  python_available: boolean;
  model_loaded: boolean;
  api_timestamp: string;
}

export interface SystemMetrics {
  uptime: number;
  memory_usage: number;
  last_prediction_time: string | null;
  total_predictions: number;
}

export interface SignalStyle {
  bg: string;
  border: string;
  text: string;
  icon: string;
}
