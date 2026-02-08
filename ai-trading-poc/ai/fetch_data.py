"""
データ取得スクリプト - Alpha Vantage APIからUSD/JPYデータを取得
"""

import os
import sys
import json
import time
from datetime import datetime, timedelta
import logging
import yaml
import requests
import pandas as pd
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

class DataFetcher:
    """Alpha Vantage APIからデータを取得するクラス"""
    
    def __init__(self, config_path='config.yaml'):
        """初期化"""
        self.config = self._load_config(config_path)
        self.api_key = os.getenv('ALPHA_VANTAGE_KEY', 'demo')
        self.base_url = self.config['api']['base_url']
        self.timeout = self.config['api']['timeout']
        self.raw_data_path = Path(self.config['data']['raw_data_path'])
        self.raw_data_path.mkdir(parents=True, exist_ok=True)
        
        logger.info(f"DataFetcher initialized with API key: {self.api_key[:10]}...")
    
    @staticmethod
    def _load_config(config_path):
        """YAMLコンフィグを読み込む"""
        with open(config_path, 'r', encoding='utf-8') as f:
            return yaml.safe_load(f)
    
    def fetch_intraday(self, symbol='USDJPY', interval='1min'):
        """
        Alpha Vantage Intraday APIからデータを取得
        
        Args:
            symbol (str): 通貨ペア (e.g., 'USDJPY')
            interval (str): 時間足 ('1min', '5min', '15min' など)
        
        Returns:
            pd.DataFrame: OHLCV データ
        """
        logger.info(f"Fetching {symbol} with interval {interval}...")
        
        params = {
            'function': 'FX_INTRADAY',
            'from_symbol': symbol[:3],  # USD
            'to_symbol': symbol[3:],    # JPY
            'interval': interval,
            'apikey': self.api_key,
            'outputsize': 'full'  # 完全なデータセットを取得
        }
        
        try:
            response = requests.get(
                self.base_url,
                params=params,
                timeout=self.timeout
            )
            response.raise_for_status()
            
            data = response.json()
            
            # エラーチェック
            if 'Error Message' in data:
                logger.error(f"API Error: {data['Error Message']}")
                return None
            
            if 'Note' in data:
                logger.warning(f"API Note: {data['Note']} (Rate limit)")
                return None
            
            # タイムシリーズデータを抽出
            if 'Time Series (1min)' not in data and 'Time Series FX (Intraday)' not in data:
                logger.error("No time series data found in response")
                logger.debug(f"Response keys: {data.keys()}")
                return None
            
            # データを整形
            ts_key = list(data.keys())[1]  # 'Time Series (1min)' など
            ts_data = data[ts_key]
            
            # DataFrameに変換
            df = pd.DataFrame.from_dict(ts_data, orient='index')
            df.index = pd.to_datetime(df.index)
            df = df.sort_index()
            
            # カラム名を標準化
            df.columns = [
                'open', 'high', 'low', 'close'
            ]
            
            # 数値に変換
            for col in df.columns:
                df[col] = pd.to_numeric(df[col], errors='coerce')
            
            # NaNを削除
            df = df.dropna()
            
            logger.info(f"✅ Fetched {len(df)} records for {symbol}")
            return df
        
        except requests.exceptions.RequestException as e:
            logger.error(f"❌ Network error: {e}")
            return None
        except Exception as e:
            logger.error(f"❌ Error fetching data: {e}")
            return None
    
    def fetch_demo_data(self, symbol='USDJPY', interval='1min'):
        """
        デモデータを生成（AIテスト用）
        実際のApiが使えない環境での検証用
        """
        logger.info(f"Generating demo data for {symbol}...")
        
        # 過去200時間分のデータを生成
        dates = pd.date_range(
            end=datetime.now(),
            periods=200,
            freq='1min'
        )
        
        # 仮想的なランダムウォーク価格
        import numpy as np
        np.random.seed(42)
        
        base_price = 145.0
        log_returns = np.random.normal(0.0001, 0.002, len(dates))
        prices = base_price * np.exp(np.cumsum(log_returns))
        
        df = pd.DataFrame({
            'open': prices + np.random.normal(0, 0.01, len(dates)),
            'high': prices + np.random.uniform(0, 0.05, len(dates)),
            'low': prices - np.random.uniform(0, 0.05, len(dates)),
            'close': prices,
        }, index=dates)
        
        logger.info(f"✅ Generated {len(df)} demo records")
        return df
    
    def save_data(self, df, symbol='USDJPY'):
        """データをCSVで保存"""
        if df is None or len(df) == 0:
            logger.warning("No data to save")
            return None
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = self.raw_data_path / f"{symbol}_{timestamp}.csv"
        
        df.to_csv(filename)
        logger.info(f"💾 Saved data to {filename}")
        return filename
    
    def get_latest_data(self, symbol='USDJPY', days=7):
        """
        最新のCSVファイルを読み込む（オフライン用）
        
        Args:
            symbol (str): 通貨ペア
            days (int): 過去N日分を返す
        
        Returns:
            pd.DataFrame: データ
        """
        # raw_data_pathから最新のCSVを探す
        csv_files = sorted(self.raw_data_path.glob(f"{symbol}_*.csv"))
        
        if not csv_files:
            logger.warning(f"No CSV files found for {symbol}")
            return None
        
        latest_file = csv_files[-1]
        logger.info(f"Loading from {latest_file}")
        
        df = pd.read_csv(latest_file, index_col=0, parse_dates=True)
        
        # 過去Nデー分を返す
        cutoff_date = datetime.now() - timedelta(days=days)
        df = df[df.index >= cutoff_date]
        
        logger.info(f"✅ Loaded {len(df)} records from {latest_file}")
        return df


def main():
    """メイン処理"""
    import sys
    
    logger.info("=" * 50)
    logger.info("🔄 USD/JPY Data Fetching Pipeline")
    logger.info("=" * 50)
    
    fetcher = DataFetcher('config.yaml')
    
    # デモデータを取得 (API Keyが'demo'の場合)
    if fetcher.api_key == 'demo':
        logger.info("Using demo data (API key is 'demo')")
        df = fetcher.fetch_demo_data('USDJPY', '1min')
    else:
        # 実データを取得
        df = fetcher.fetch_intraday('USDJPY', '1min')
    
    if df is not None:
        # データを保存
        fetcher.save_data(df, 'USDJPY')
        
        # 統計情報を表示
        logger.info("\n📊 Data Statistics:")
        logger.info(f"  Rows: {len(df)}")
        logger.info(f"  Date range: {df.index[0]} to {df.index[-1]}")
        logger.info(f"  Close price range: {df['close'].min():.4f} ~ {df['close'].max():.4f}")
        
        return df
    else:
        logger.error("❌ Failed to fetch data")
        return None


if __name__ == '__main__':
    main()
