/**
 * Python実行サービス - Pythonスクリプトを実行してAI推論を実施
 */

import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';
import { PredictionResult } from '../types';

const execAsync = promisify(exec);

const logger = console;

export class PythonRunner {
  private pythonPath: string;
  private aiDir: string;
  private lastPredictionTime: Date | null = null;
  private predictionCache: PredictionResult | null = null;
  private cacheDuration: number = 300000; // 5分（ミリ秒）

  constructor(pythonPath: string = 'python', aiDir: string = './ai') {
    this.pythonPath = pythonPath;
    this.aiDir = path.resolve(aiDir);
  }

  /**
   * 推論を実行（Pythonスクリプト呼び出し）
   */
  async predict(): Promise<PredictionResult | null> {
    // キャッシュをチェック
    if (this.isCacheValid()) {
      logger.log('🔄 Using cached prediction');
      return this.predictionCache;
    }

    try {
      logger.log('🔮 Executing Python prediction script...');

      // predict.py を実行
      const scriptPath = path.join(this.aiDir, 'predict.py');
      const command = `${this.pythonPath} "${scriptPath}"`;

      const { stdout, stderr } = await execAsync(command, {
        cwd: this.aiDir,
        timeout: 60000, // 60秒のタイムアウト
      });

      if (stderr) {
        logger.error('Python stderr:', stderr);
      }

      // 出力をパース（最後のJSON出力を抽出）
      const jsonMatch = stdout.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        logger.error('❌ No JSON output from Python script');
        return null;
      }

      const prediction = JSON.parse(jsonMatch[0]) as PredictionResult;
      
      // キャッシュを更新
      this.predictionCache = prediction;
      this.lastPredictionTime = new Date();

      logger.log(`✅ Prediction obtained: ${prediction.signal}`);
      return prediction;
    } catch (error) {
      logger.error('❌ Error executing Python script:', error);
      return null;
    }
  }

  /**
   * データ取得を実行
   */
  async fetchData(): Promise<boolean> {
    try {
      logger.log('📊 Executing Python data fetch...');

      const scriptPath = path.join(this.aiDir, 'fetch_data.py');
      const command = `${this.pythonPath} "${scriptPath}"`;

      const { stderr } = await execAsync(command, {
        cwd: this.aiDir,
        timeout: 120000, // 2分のタイムアウト
      });

      if (stderr && !stderr.includes('INFO')) {
        logger.error('Python fetch error:', stderr);
        return false;
      }

      logger.log('✅ Data fetch completed');
      return true;
    } catch (error) {
      logger.error('❌ Error fetching data:', error);
      return false;
    }
  }

  /**
   * 特徴量生成を実行
   */
  async engineFeatures(): Promise<boolean> {
    try {
      logger.log('🔧 Executing Python feature engineering...');

      const scriptPath = path.join(this.aiDir, 'feature_engineer.py');
      const command = `${this.pythonPath} "${scriptPath}"`;

      const { stderr } = await execAsync(command, {
        cwd: this.aiDir,
        timeout: 120000,
      });

      if (stderr && !stderr.includes('INFO')) {
        logger.error('Python feature error:', stderr);
        return false;
      }

      logger.log('✅ Feature engineering completed');
      return true;
    } catch (error) {
      logger.error('❌ Error engineering features:', error);
      return false;
    }
  }

  /**
   * モデル学習を実行
   */
  async trainModel(): Promise<boolean> {
    try {
      logger.log('🎓 Executing Python model training...');

      const scriptPath = path.join(this.aiDir, 'train_model.py');
      const command = `${this.pythonPath} "${scriptPath}"`;

      const { stderr } = await execAsync(command, {
        cwd: this.aiDir,
        timeout: 300000, // 5分のタイムアウト
      });

      if (stderr && !stderr.includes('INFO')) {
        logger.error('Python training error:', stderr);
        return false;
      }

      logger.log('✅ Model training completed');
      
      // 訓練後はキャッシュをクリア
      this.predictionCache = null;
      
      return true;
    } catch (error) {
      logger.error('❌ Error training model:', error);
      return false;
    }
  }

  /**
   * Pythonが利用可能かチェック
   */
  async isPythonAvailable(): Promise<boolean> {
    try {
      await execAsync(`${this.pythonPath} --version`, { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 学習済みモデルが存在するかチェック
   */
  isModelAvailable(): boolean {
    const modelPath = path.join(
      this.aiDir,
      'models',
      'usdjpy_model.pkl'
    );
    return fs.existsSync(modelPath);
  }

  /**
   * キャッシュが有効かチェック
   */
  private isCacheValid(): boolean {
    if (
      this.predictionCache === null ||
      this.lastPredictionTime === null
    ) {
      return false;
    }

    const now = new Date();
    const elapsed = now.getTime() - this.lastPredictionTime.getTime();
    return elapsed < this.cacheDuration;
  }

  /**
   * キャッシュをクリア
   */
  clearCache(): void {
    this.predictionCache = null;
    this.lastPredictionTime = null;
    logger.log('🧹 Cache cleared');
  }

  /**
   * 最後の予測時刻を取得
   */
  getLastPredictionTime(): Date | null {
    return this.lastPredictionTime;
  }
}
