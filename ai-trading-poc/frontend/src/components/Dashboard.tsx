/**
 * Dashboardコンポーネント - メインダッシュボード
 */

import React, { useState } from 'react';
import { useSignal } from '../hooks/useSignal';
import SignalCard from './SignalCard';
import StatusBar from './StatusBar';

export const Dashboard: React.FC = () => {
  const {
    signal,
    health,
    loading,
    error,
    fetchSignal,
    refreshSignal,
    trainModel,
  } = useSignal();

  const [trainingLoading, setTrainingLoading] = useState(false);
  const [trainingError, setTrainingError] = useState<string | null>(null);

  const handleRefresh = async () => {
    await refreshSignal();
  };

  const handleTrain = async () => {
    setTrainingLoading(true);
    setTrainingError(null);
    try {
      await trainModel();
    } catch (err) {
      setTrainingError('モデルの学習に失敗しました');
    } finally {
      setTrainingLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gothic text-lace pb-20">
      {/* ヘッダー */}
      <header className="border-b border-dusk backdrop-blur-sm sticky top-0 z-40 bg-gothic bg-opacity-95">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <h1 className="text-3xl mb-2">🏮 島ちゃんAI Trading PoC</h1>
          <p className="text-dusk text-sm">
            USD/JPY 予測トレーディングシステム
          </p>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-6xl mx-auto px-6 py-12">
        {/* 装飾 */}
        <div className="ornament">✦ ✦ ✦</div>

        {/* シグナルカード */}
        <SignalCard
          signal={signal}
          loading={loading}
          error={error}
        />

        {/* 装飾 */}
        <div className="divider"></div>

        {/* コントロールパネル */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">⚙️ コントロール</h2>
          </div>

          <div className="space-y-4">
            {/* リフレッシュボタン */}
            <div>
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="btn btn-primary w-full"
              >
                {loading ? '取得中...' : '🔄 シグナルを更新'}
              </button>
              <p className="text-xs text-dusk mt-2">
                * キャッシュをクリアして新しい予測を取得します
              </p>
            </div>

            {/* 学習ボタン */}
            <div>
              <button
                onClick={handleTrain}
                disabled={trainingLoading || loading}
                className="btn btn-secondary w-full"
              >
                {trainingLoading ? '学習中...' : '🎓 モデルを再学習'}
              </button>
              <p className="text-xs text-dusk mt-2">
                * 新しいデータでモデルを再訓練します（5-10分）
              </p>
            </div>

            {trainingError && (
              <div className="p-3 bg-red-900 bg-opacity-20 border border-red-700 rounded">
                <p className="text-red-400 text-sm">{trainingError}</p>
              </div>
            )}
          </div>
        </div>

        {/* 装飾 */}
        <div className="divider"></div>

        {/* 情報パネル */}
        <div className="grid-2">
          {/* システム情報 */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title text-lg">ℹ️ システム情報</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-dusk">API Status</span>
                <span className={health?.status === 'healthy' ? 'text-green-400' : 'text-red-400'}>
                  {health?.status === 'healthy' ? '✅ Ready' : '❌ Error'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-dusk">Python</span>
                <span className={health?.python_available ? 'text-green-400' : 'text-red-400'}>
                  {health?.python_available ? '✅ Available' : '❌ Not Found'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-dusk">Model</span>
                <span className={health?.model_loaded ? 'text-green-400' : 'text-yellow-400'}>
                  {health?.model_loaded ? '✅ Loaded' : '⚠️ Missing'}
                </span>
              </div>
            </div>
          </div>

          {/* 使用方法 */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title text-lg">📖 使用方法</h3>
            </div>
            <div className="space-y-2 text-xs text-dusk">
              <p>1. シグナルカードで現在の予測を確認</p>
              <p>2. 信頼度で判断材料を検討</p>
              <p>3. 「シグナルを更新」で最新予測を取得</p>
              <p>4. データが古い場合は「モデルを再学習」</p>
            </div>
          </div>
        </div>

        {/* 装飾 */}
        <div className="ornament mt-12">✦ ✦ ✦</div>

        {/* フッターテキスト */}
        <div className="text-center mt-12 text-dusk text-xs space-y-2">
          <p>⚠️ このシステムはPoC（Proof of Concept）です</p>
          <p>精度の極大化は目的ではなく、アーキテクチャ検証用です</p>
          <p>実売買に使用しないでください</p>
        </div>
      </main>

      {/* ステータスバー */}
      <StatusBar health={health} />
    </div>
  );
};

export default Dashboard;
