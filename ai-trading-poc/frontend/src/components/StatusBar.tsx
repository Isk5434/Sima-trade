/**
 * StatusBarコンポーネント - システムステータスを表示
 */

import React from 'react';
import { HealthStatus } from '../types';

interface StatusBarProps {
  health: HealthStatus | null;
}

export const StatusBar: React.FC<StatusBarProps> = ({ health }) => {
  if (!health) {
    return (
      <footer className="status-bar">
        <span>🔴 API接続中...</span>
        <span>USD/JPY Trading PoC v0.1.0</span>
      </footer>
    );
  }

  const pythonStatus = health.python_available ? '✅ Python' : '❌ Python';
  const modelStatus = health.model_loaded ? '✅ Model' : '⚠️ Model';
  const overallStatus = health.status === 'healthy' ? '🟢' : '🔴';

  return (
    <footer className="status-bar">
      <span className="flex gap-4">
        {overallStatus} {health.status === 'healthy' ? 'Ready' : 'Not Ready'}
      </span>
      <span className="flex gap-4 text-xs">
        <span>{pythonStatus}</span>
        <span>{modelStatus}</span>
      </span>
      <span>USD/JPY Trading PoC v0.1.0</span>
    </footer>
  );
};

export default StatusBar;
