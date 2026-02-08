/**
 * useSignal Hook - バックエンドから予測データを取得
 */

import { useState, useEffect, useCallback } from 'react';
import { PredictionResult, HealthStatus } from '../types';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000';

export function useSignal() {
  const [signal, setSignal] = useState<PredictionResult | null>(null);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * ヘルスチェック
   */
  const checkHealth = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/health`);
      setHealth(response.data.data);
    } catch (err) {
      console.error('Health check failed:', err);
      setHealth(null);
    }
  }, []);

  /**
   * シグナルを取得
   */
  const fetchSignal = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.get(`${API_BASE_URL}/api/signal`);
      if (response.data.success) {
        setSignal(response.data.data);
      } else {
        setError(response.data.error || 'Unknown error');
      }
    } catch (err) {
      const errorMsg = axios.isAxiosError(err)
        ? err.response?.data?.error || err.message
        : 'Failed to fetch signal';
      setError(errorMsg);
      console.error('Signal fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * キャッシュを更新
   */
  const refreshSignal = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.post(`${API_BASE_URL}/api/refresh`);
      if (response.data.success) {
        setSignal(response.data.data);
      } else {
        setError(response.data.error || 'Unknown error');
      }
    } catch (err) {
      const errorMsg = axios.isAxiosError(err)
        ? err.response?.data?.error || err.message
        : 'Failed to refresh signal';
      setError(errorMsg);
      console.error('Refresh error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * モデルを再学習
   */
  const trainModel = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.post(`${API_BASE_URL}/api/train`);
      if (response.data.success) {
        // 学習後にシグナルを再取得
        await fetchSignal();
      } else {
        setError(response.data.error || 'Training failed');
      }
    } catch (err) {
      const errorMsg = axios.isAxiosError(err)
        ? err.response?.data?.error || err.message
        : 'Failed to train model';
      setError(errorMsg);
      console.error('Training error:', err);
    } finally {
      setLoading(false);
    }
  }, [fetchSignal]);

  /**
   * マウント時の初期化
   */
  useEffect(() => {
    checkHealth();
    fetchSignal();

    // 定期的にシグナルを更新（5分ごと）
    const interval = setInterval(() => {
      fetchSignal();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [checkHealth, fetchSignal]);

  return {
    signal,
    health,
    loading,
    error,
    fetchSignal,
    refreshSignal,
    trainModel,
    checkHealth,
  };
}
