"""
モデル学習スクリプト - LightGBMを用いて3値分類モデルを学習
"""

import os
import sys
import logging
from datetime import datetime
import pickle
import yaml
import pandas as pd
import numpy as np
from pathlib import Path
from dotenv import load_dotenv

import lightgbm as lgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score

# 環境変数ロード
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

# ロギング設定
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class ModelTrainer:
    """LightGBMモデル学習クラス"""
    
    def __init__(self, config_path='config.yaml'):
        """初期化"""
        self.config = self._load_config(config_path)
        self.model_path = Path(self.config['model']['model_path'])
        self.model_path.mkdir(parents=True, exist_ok=True)
        
        self.lgb_params = self.config['model']['lgb_params']
        self.model = None
    
    @staticmethod
    def _load_config(config_path):
        """YAMLコンフィグを読み込む"""
        with open(config_path, 'r', encoding='utf-8') as f:
            return yaml.safe_load(f)
    
    def prepare_data(self, features):
        """
        すぐに使える, データを学習/テスト分割に準備
        
        Args:
            features (pd.DataFrame): 特徴量データ
        
        Returns:
            tuple: (X_train, X_test, y_train, y_test)
        """
        logger.info("📊 Preparing training data...")
        
        # 目的変数と特徴量を分離
        y = features['target'].copy()
        X = features.drop(columns=['target', 'target_return']).copy()
        
        # NaNを削除
        valid_idx = ~y.isna()
        X = X[valid_idx]
        y = y[valid_idx]
        
        logger.info(f"   Total samples: {len(X)}")
        logger.info(f"   Class distribution: {y.value_counts().to_dict()}")
        
        # 時系列データなので，ランダム分割ではなく時間順に分割
        split_point = int(len(X) * (1 - self.config['model']['validation_split']))
        
        X_train = X.iloc[:split_point]
        X_test = X.iloc[split_point:]
        y_train = y.iloc[:split_point]
        y_test = y.iloc[split_point:]
        
        logger.info(f"   Train samples: {len(X_train)}")
        logger.info(f"   Test samples: {len(X_test)}")
        
        return X_train, X_test, y_train, y_test
    
    def train(self, X_train, y_train):
        """
        LightGBMモデルを学習
        
        Args:
            X_train (pd.DataFrame): 学習データ（特徴量）
            y_train (pd.Series): 学習データ（ラベル）
        """
        logger.info("🎓 Training LightGBM model...")
        
        # LightGBMデータセットを作成
        train_data = lgb.Dataset(
            X_train,
            label=y_train,
            feature_name=list(X_train.columns)
        )
        
        # パラメータをログ出力
        logger.info(f"   Model params: {self.lgb_params}")
        
        # 学習
        self.model = lgb.train(
            self.lgb_params,
            train_data,
            num_boost_round=self.config['model']['num_boosting_rounds']
        )
        
        logger.info("✅ Model training complete")
    
    def evaluate(self, X_test, y_test):
        """
        モデルを評価
        
        Args:
            X_test (pd.DataFrame): テストデータ（特徴量）
            y_test (pd.Series): テストデータ（ラベル）
        
        Returns:
            dict: 評価指標
        """
        logger.info("📈 Evaluating model...")
        
        if self.model is None:
            logger.error("Model not trained yet")
            return None
        
        # 予測
        y_pred_proba = self.model.predict(X_test)
        y_pred = np.argmax(y_pred_proba, axis=1)
        
        # 精度
        accuracy = accuracy_score(y_test, y_pred)
        logger.info(f"\n   Accuracy: {accuracy:.4f}")
        
        # クラスごとの評価
        logger.info(f"\n   Classification Report:")
        report = classification_report(
            y_test, y_pred,
            target_names=['SHORT', 'LONG', 'NO_TRADE'],
            digits=4
        )
        logger.info(f"\n{report}")
        
        # 混同行列
        logger.info(f"\n   Confusion Matrix:")
        cm = confusion_matrix(y_test, y_pred)
        logger.info(f"\n{cm}")
        
        # 特徴量の重要度
        logger.info(f"\n   Top 10 Important Features:")
        importance = pd.DataFrame({
            'feature': X_test.columns,
            'importance': self.model.feature_importance()
        }).sort_values('importance', ascending=False).head(10)
        
        for idx, row in importance.iterrows():
            logger.info(f"      {row['feature']}: {row['importance']}")
        
        return {
            'accuracy': accuracy,
            'report': report,
            'confusion_matrix': cm.tolist(),
            'feature_importance': importance.to_dict()
        }
    
    def save_model(self, symbol='USDJPY'):
        """モデルを保存"""
        if self.model is None:
            logger.error("No model to save")
            return None
        
        model_file = self.model_path / self.config['model']['model_filename']
        
        with open(model_file, 'wb') as f:
            pickle.dump(self.model, f)
        
        logger.info(f"💾 Model saved to {model_file}")
        return model_file
    
    @staticmethod
    def load_model(model_path):
        """保存されたモデルを読み込む"""
        if not os.path.exists(model_path):
            logger.error(f"Model file not found: {model_path}")
            return None
        
        with open(model_path, 'rb') as f:
            model = pickle.load(f)
        
        logger.info(f"✅ Model loaded from {model_path}")
        return model


def main():
    """メイン処理"""
    import feature_engineer
    
    logger.info("=" * 50)
    logger.info("🎓 Model Training Pipeline")
    logger.info("=" * 50)
    
    # 特徴量を取得
    engineer = feature_engineer.FeatureEngineer('config.yaml')
    features = engineer.get_latest_features('USDJPY')
    
    if features is not None:
        # モデル学習器を初期化
        trainer = ModelTrainer('config.yaml')
        
        # データを準備
        X_train, X_test, y_train, y_test = trainer.prepare_data(features)
        
        # モデルを学習
        trainer.train(X_train, y_train)
        
        # モデルを評価
        trainer.evaluate(X_test, y_test)
        
        # モデルを保存
        trainer.save_model('USDJPY')
        
        logger.info("\n✅ Training pipeline complete!")
        return trainer.model
    
    logger.error("❌ Failed to train model")
    return None


if __name__ == '__main__':
    main()
