"""
推論スクリプト - 学習済みモデルを使ってリアルタイム予測を実施
"""

import os
import sys
import json
import logging
from datetime import datetime, timedelta
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


class PredictionEngine:
    """推論エンジン"""
    
    def __init__(self, config_path='config.yaml'):
        """初期化"""
        self.config = self._load_config(config_path)
        self.model = None
        self.class_map = self.config['prediction']['classes']
        self.confidence_threshold = self.config['prediction']['confidence_threshold']
    
    @staticmethod
    def _load_config(config_path):
        """YAMLコンフィグを読み込む"""
        with open(config_path, 'r', encoding='utf-8') as f:
            return yaml.safe_load(f)
    
    def load_model(self, model_path):
        """モデルを読み込む"""
        import train_model
        
        self.model = train_model.ModelTrainer.load_model(model_path)
        return self.model is not None
    
    def predict(self, features_df):
        """
        最新の特徴量から予測を実施
        
        Args:
            features_df (pd.DataFrame): 特徴量データ（最新1行）
        
        Returns:
            dict: 予測結果
        """
        if self.model is None:
            logger.error("Model not loaded")
            return None
        
        if len(features_df) == 0:
            logger.error("Empty features dataframe")
            return None
        
        # 最後の行を使用
        latest_features = features_df.iloc[-1:]
        
        # 目的変数カラムを除去
        X = latest_features.drop(
            columns=['target', 'target_return'],
            errors='ignore'
        )
        
        # 予測
        pred_proba = self.model.predict(X)
        pred_class = int(np.argmax(pred_proba[0]))
        confidence = float(np.max(pred_proba[0]))
        
        # クラスマッピング
        signal = self.class_map.get(pred_class, 'UNKNOWN')
        
        # 特徴を辞書化（デバッグ用）
        feature_values = X.iloc[0].to_dict()
        
        # 結果を辞書に
        result = {
            'signal': signal,
            'confidence': confidence,
            'timestamp': datetime.now().isoformat() + 'Z',
            'predicted_class': pred_class,
            'class_probabilities': {
                'SHORT': float(pred_proba[0][0]),
                'LONG': float(pred_proba[0][1]),
                'NO_TRADE': float(pred_proba[0][2])
            },
            'latest_features': {
                'close': float(feature_values.get('close', np.nan)),
                'return_1m': float(feature_values.get('return_1m', np.nan)),
                'rsi': float(feature_values.get('rsi', np.nan)),
                'hour': int(feature_values.get('hour', 0)),
            }
        }
        
        logger.info(f"🎯 Prediction: {signal} (confidence: {confidence:.4f})")
        
        return result
    
    def predict_batch(self, features_df):
        """
        バッチ予測（複数行の特徴量から予測）
        
        Args:
            features_df (pd.DataFrame): 特徴量データ
        
        Returns:
            list: 予測結果のリスト
        """
        if self.model is None or len(features_df) == 0:
            return []
        
        # 目的変数カラムを除去
        X = features_df.drop(
            columns=['target', 'target_return'],
            errors='ignore'
        )
        
        # バッチ予測
        pred_proba = self.model.predict(X)
        pred_classes = np.argmax(pred_proba, axis=1)
        confidences = np.max(pred_proba, axis=1)
        
        results = []
        for i in range(len(X)):
            pred_class = int(pred_classes[i])
            confidence = float(confidences[i])
            signal = self.class_map.get(pred_class, 'UNKNOWN')
            
            result = {
                'timestamp': features_df.index[i].isoformat() + 'Z',
                'signal': signal,
                'confidence': confidence,
                'predicted_class': pred_class,
                'close': float(features_df['close'].iloc[i]),
            }
            results.append(result)
        
        logger.info(f"✅ Batch predictions: {len(results)} rows")
        return results


def main():
    """メイン処理"""
    import fetch_data
    import feature_engineer
    import train_model
    
    logger.info("=" * 50)
    logger.info("🔮 Prediction Pipeline")
    logger.info("=" * 50)
    
    # データを取得
    data_fetcher = fetch_data.DataFetcher('config.yaml')
    df = data_fetcher.get_latest_data('USDJPY', days=1)
    
    if df is None:
        logger.error("❌ Failed to get data")
        return None
    
    # 特徴量を生成
    engineer = feature_engineer.FeatureEngineer('config.yaml')
    features = engineer.engineer_features(df)
    
    if features is None:
        logger.error("❌ Failed to engineer features")
        return None
    
    # 推論エンジンを初期化
    engine = PredictionEngine('config.yaml')
    
    # モデルを読み込む
    model_path = Path(
        engineer.config['model']['model_path']
    ) / engineer.config['model']['model_filename']
    
    if engine.load_model(str(model_path)):
        # 最新の予測を実施
        latest_prediction = engine.predict(features)
        
        if latest_prediction:
            logger.info("\n📊 Latest Prediction Result:")
            logger.info(json.dumps(latest_prediction, indent=2, ensure_ascii=False))
            
            # 結果をJSONで保存
            output_file = Path('./prediction_output.json')
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(latest_prediction, f, indent=2, ensure_ascii=False)
            
            logger.info(f"💾 Saved prediction to {output_file}")
            
            return latest_prediction
    else:
        logger.error("❌ Failed to load model")
    
    return None


if __name__ == '__main__':
    result = main()
    if result:
        print(json.dumps(result, indent=2, ensure_ascii=False))
