"""
特徴量エンジニアリング - OHLCV データから特徴量を生成
"""

import os
import sys
import logging
from datetime import datetime
import yaml
import pandas as pd
import numpy as np
from pathlib import Path
from dotenv import load_dotenv

# 環境変数ロード
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

# ロギング設定
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class FeatureEngineer:
    """特徴量生成クラス"""
    
    def __init__(self, config_path='config.yaml'):
        """初期化"""
        self.config = self._load_config(config_path)
        self.features_path = Path(self.config['data']['features_path'])
        self.features_path.mkdir(parents=True, exist_ok=True)
    
    @staticmethod
    def _load_config(config_path):
        """YAMLコンフィグを読み込む"""
        with open(config_path, 'r', encoding='utf-8') as f:
            return yaml.safe_load(f)
    
    def engineer_features(self, df):
        """
        OHLCV データから特徴量を生成
        
        Args:
            df (pd.DataFrame): OHLCV データ
        
        Returns:
            pd.DataFrame: 特徴量データ
        """
        if df is None or len(df) == 0:
            logger.error("Empty dataframe")
            return None
        
        logger.info("🔧 Engineering features...")
        
        features = df.copy()
        
        # ===== リターン系特徴量 =====
        for period in self.config['features']['returns']:
            col_name = f'return_{period}m'
            features[col_name] = (
                (df['close'].shift(0) - df['close'].shift(period)) / 
                df['close'].shift(period) * 100
            )
        
        # ===== SMA 乖離率 =====
        for period in self.config['features']['sma_deviation']:
            sma = df['close'].rolling(window=period).mean()
            col_name = f'sma_dev_{period}m'
            features[col_name] = (
                (df['close'] - sma) / sma * 100
            )
        
        # ===== ATR（Average True Range）- ボラティリティ =====
        for period in self.config['features']['atr_periods']:
            atr = self._calculate_atr(df, period)
            col_name = f'atr_{period}m'
            features[col_name] = atr
        
        # ===== RSI（Relative Strength Index） =====
        rsi_period = self.config['features']['rsi_period']
        rsi = self._calculate_rsi(df['close'], rsi_period)
        features['rsi'] = rsi
        
        # ===== 時間帯特徴量 =====
        if self.config['features']['include_hour']:
            features['hour'] = features.index.hour
            
            # 営業時間帯を分類 (東京, ロンドン, NY)
            def get_market_session(hour):
                if 8 <= hour < 17:  # 東京
                    return 0
                elif 15 <= hour < 24 or 0 <= hour < 2:  # ロンドン/重複
                    return 1
                elif 20 <= hour < 24 or 0 <= hour < 8:  # NY
                    return 2
                else:
                    return 3
            
            features['market_session'] = features['hour'].apply(get_market_session)
        
        if self.config['features']['include_dow']:
            features['day_of_week'] = features.index.dayofweek
            features['is_weekend'] = (features['day_of_week'] >= 5).astype(int)
        
        # ===== フォワードリターン（教師ラベル用）=====
        # 1時間後（60分後）のリターンを計算
        forward_return = (
            df['close'].shift(-60) - df['close']
        ) / df['close'] * 100
        
        features['target_return'] = forward_return
        
        # =====3クラスラベル生成 =====
        def classify_trend(ret):
            if pd.isna(ret):
                return np.nan
            elif ret > 0.1:  # 0.1%以上の上昇
                return 1  # LONG
            elif ret < -0.1:  # 0.1%以上の下落
                return 0  # SHORT
            else:
                return 2  # NO_TRADE
        
        features['target'] = features['target_return'].apply(classify_trend)
        
        # ===== NaNを削除 =====
        # 特徴量計算に必要な過去データの分だけ削除
        lookback = max(self.config['features']['returns'] + 
                      self.config['features']['sma_deviation'] +
                      self.config['features']['atr_periods'])
        
        features = features.iloc[lookback:].dropna()
        
        logger.info(f"✅ Generated {len(features)} feature rows")
        logger.info(f"   Shape: {features.shape}")
        logger.info(f"   Columns: {', '.join(features.columns.tolist())}")
        
        return features
    
    @staticmethod
    def _calculate_atr(df, period):
        """ATR（Average True Range）を計算"""
        high_low = df['high'] - df['low']
        high_close = abs(df['high'] - df['close'].shift())
        low_close = abs(df['low'] - df['close'].shift())
        
        tr = pd.concat([high_low, high_close, low_close], axis=1).max(axis=1)
        atr = tr.rolling(window=period).mean()
        
        return atr
    
    @staticmethod
    def _calculate_rsi(series, period):
        """RSI（Relative Strength Index）を計算"""
        delta = series.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
        
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))
        
        return rsi
    
    def save_features(self, features, symbol='USDJPY'):
        """特徴量をCSVで保存"""
        if features is None or len(features) == 0:
            logger.warning("No features to save")
            return None
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = self.features_path / f"{symbol}_features_{timestamp}.csv"
        
        features.to_csv(filename)
        logger.info(f"💾 Saved features to {filename}")
        return filename
    
    def get_latest_features(self, symbol='USDJPY'):
        """最新の特徴量CSVを読み込む"""
        csv_files = sorted(self.features_path.glob(f"{symbol}_features_*.csv"))
        
        if not csv_files:
            logger.warning(f"No feature files found for {symbol}")
            return None
        
        latest_file = csv_files[-1]
        logger.info(f"Loading features from {latest_file}")
        
        features = pd.read_csv(latest_file, index_col=0, parse_dates=True)
        logger.info(f"✅ Loaded {len(features)} feature rows")
        
        return features


def main():
    """メイン処理"""
    import fetch_data
    
    logger.info("=" * 50)
    logger.info("🔧 Feature Engineering Pipeline")
    logger.info("=" * 50)
    
    # データを取得
    data_fetcher = fetch_data.DataFetcher('config.yaml')
    
    # 直近のデータを取得
    df = data_fetcher.get_latest_data('USDJPY', days=7)
    
    if df is not None:
        # 特徴量を生成
        engineer = FeatureEngineer('config.yaml')
        features = engineer.engineer_features(df)
        
        if features is not None:
            # 特徴量を保存
            engineer.save_features(features, 'USDJPY')
            
            # 統計情報を表示
            logger.info("\n📊 Feature Statistics:")
            logger.info(f"  {features.describe()}")
            
            return features
    
    logger.error("❌ Failed to engineer features")
    return None


if __name__ == '__main__':
    main()
