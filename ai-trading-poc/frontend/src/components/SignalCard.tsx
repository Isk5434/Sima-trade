/**
 * SignalCardコンポーネント - 予測シグナルを表示
 */

import React from 'react';
import { PredictionResult, SignalStyle } from '../types';

interface SignalCardProps {
  signal: PredictionResult | null;
  loading?: boolean;
  error?: string | null;
}

const getSignalStyle = (signal: string): SignalStyle => {
  const styles: Record<string, SignalStyle> = {
    LONG: {
      bg: 'bg-green-900',
      border: 'border-green-500',
      text: 'text-green-300',
      icon: '📈',
    },
    SHORT: {
      bg: 'bg-red-900',
      border: 'border-red-500',
      text: 'text-red-300',
      icon: '📉',
    },
    NO_TRADE: {
      bg: 'bg-gray-800',
      border: 'border-gray-500',
      text: 'text-gray-300',
      icon: '⏸️',
    },
  };
  return styles[signal] || styles.NO_TRADE;
};

export const SignalCard: React.FC<SignalCardProps> = ({
  signal,
  loading = false,
  error = null,
}) => {
  if (error) {
    return (
      <div className="card border-red-700 bg-red-900 bg-opacity-20">
        <div className="card-header">
          <h2 className="card-title text-red-400">⚠️ エラー</h2>
        </div>
        <p className="text-red-300">{error}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="card">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin">
            <div className="w-12 h-12 border-4 border-dusk border-t-ribbon rounded-full"></div>
          </div>
          <span className="ml-4 text-dusk font-serif">推論中...</span>
        </div>
      </div>
    );
  }

  if (!signal) {
    return (
      <div className="card">
        <div className="text-center">
          <p className="text-dusk font-serif">シグナルを読み込んでいます...</p>
        </div>
      </div>
    );
  }

  const style = getSignalStyle(signal.signal);
  const confidence = (signal.confidence * 100).toFixed(1);

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">💫 現在のシグナル</h2>
      </div>

      <div className="space-y-6">
        {/* メインシグナル */}
        <div className="flex justify-center">
          <div
            className={`signal-badge ${style.bg} ${style.border} ${style.text}`}
          >
            <div>{style.icon}</div>
            <div className="text-4xl mt-2">{signal.signal}</div>
          </div>
        </div>

        {/* 信頼度 */}
        <div className="text-center">
          <p className="text-lace text-lg font-serif mb-2">確度</p>
          <div className="w-full bg-gothic rounded-full h-4 border border-dusk overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${style.bg}`}
              style={{ width: `${signal.confidence * 100}%` }}
            ></div>
          </div>
          <p className={`mt-2 text-2xl font-serif font-bold ${style.text}`}>
            {confidence}%
          </p>
        </div>

        {/* クラス確率 */}
        <div className="space-y-3">
          <p className="text-lace text-sm font-serif mb-3">クラス別確率</p>

          <div>
            <div className="flex justify-between mb-1">
              <span className="text-green-300 text-sm">📈 LONG</span>
              <span className="text-green-300 text-sm">
                {(signal.class_probabilities.LONG * 100).toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gothic rounded h-2 border border-green-700 overflow-hidden">
              <div
                className="h-full bg-green-700"
                style={{ width: `${signal.class_probabilities.LONG * 100}%` }}
              ></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <span className="text-red-300 text-sm">📉 SHORT</span>
              <span className="text-red-300 text-sm">
                {(signal.class_probabilities.SHORT * 100).toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gothic rounded h-2 border border-red-700 overflow-hidden">
              <div
                className="h-full bg-red-700"
                style={{ width: `${signal.class_probabilities.SHORT * 100}%` }}
              ></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <span className="text-gray-300 text-sm">⏸️ NO_TRADE</span>
              <span className="text-gray-300 text-sm">
                {(signal.class_probabilities.NO_TRADE * 100).toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gothic rounded h-2 border border-gray-700 overflow-hidden">
              <div
                className="h-full bg-gray-700"
                style={{ width: `${signal.class_probabilities.NO_TRADE * 100}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* 特徴量情報 */}
        <div className="border-t border-dusk pt-4">
          <p className="text-lace text-sm font-serif mb-3">📊 最新特徴量</p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-dusk">Close</p>
              <p className="text-lace font-serif">
                {signal.latest_features.close.toFixed(4)}
              </p>
            </div>
            <div>
              <p className="text-dusk">Return (1m)</p>
              <p className={`font-serif ${
                signal.latest_features.return_1m > 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {signal.latest_features.return_1m.toFixed(3)}%
              </p>
            </div>
            <div>
              <p className="text-dusk">RSI</p>
              <p className="text-lace font-serif">
                {signal.latest_features.rsi.toFixed(1)}
              </p>
            </div>
            <div>
              <p className="text-dusk">Hour</p>
              <p className="text-lace font-serif">
                {signal.latest_features.hour}:00
              </p>
            </div>
          </div>
        </div>

        {/* タイムスタンプ */}
        <p className="text-xs text-dusk text-center pt-4 border-t border-dusk">
          🕐 {new Date(signal.timestamp).toLocaleString('ja-JP')}
        </p>
      </div>
    </div>
  );
};

export default SignalCard;
