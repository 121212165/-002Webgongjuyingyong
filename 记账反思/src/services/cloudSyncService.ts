import { Transaction, ReflectionTask, ReflectionResult, Settings } from '../types';
import { storageService } from './storage';
import { authService } from './authService';
import { STORAGE_KEYS } from '../constants';

// 云同步服务类（模拟实现）
export class CloudSyncService {
  constructor() {}

  // 检查用户是否已登录
  private checkAuth(): void {
    if (!authService.isAuthenticated()) {
      throw new Error('用户未登录');
    }
  }

  // 获取云存储键
  private getCloudStorageKey(baseKey: string): string {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      throw new Error('用户未登录');
    }
    return `cloud_${currentUser.id}_${baseKey}`;
  }

  // 上传数据到云端
  uploadData(): void {
    this.checkAuth();
    
    // 上传交易记录
    const transactions = storageService.getTransactions();
    localStorage.setItem(this.getCloudStorageKey(STORAGE_KEYS.TRANSACTIONS), JSON.stringify(transactions));
    
    // 上传反思任务
    const reflectionTasks = storageService.getReflectionTasks();
    localStorage.setItem(this.getCloudStorageKey(STORAGE_KEYS.REFLECTION_TASKS), JSON.stringify(reflectionTasks));
    
    // 上传反思结果
    const reflectionResults = storageService.getReflectionResults();
    localStorage.setItem(this.getCloudStorageKey(STORAGE_KEYS.REFLECTION_RESULTS), JSON.stringify(reflectionResults));
    
    // 上传设置
    const settings = storageService.getSettings();
    localStorage.setItem(this.getCloudStorageKey(STORAGE_KEYS.SETTINGS), JSON.stringify(settings));
    
    // 记录最后同步时间
    localStorage.setItem(this.getCloudStorageKey('lastSync'), JSON.stringify(new Date()));
  }

  // 从云端下载数据
  downloadData(): void {
    this.checkAuth();
    
    // 下载交易记录
    const cloudTransactions = localStorage.getItem(this.getCloudStorageKey(STORAGE_KEYS.TRANSACTIONS));
    if (cloudTransactions) {
      localStorage.setItem(storageService['getUserStorageKey'](STORAGE_KEYS.TRANSACTIONS), cloudTransactions);
    }
    
    // 下载反思任务
    const cloudReflectionTasks = localStorage.getItem(this.getCloudStorageKey(STORAGE_KEYS.REFLECTION_TASKS));
    if (cloudReflectionTasks) {
      localStorage.setItem(storageService['getUserStorageKey'](STORAGE_KEYS.REFLECTION_TASKS), cloudReflectionTasks);
    }
    
    // 下载反思结果
    const cloudReflectionResults = localStorage.getItem(this.getCloudStorageKey(STORAGE_KEYS.REFLECTION_RESULTS));
    if (cloudReflectionResults) {
      localStorage.setItem(storageService['getUserStorageKey'](STORAGE_KEYS.REFLECTION_RESULTS), cloudReflectionResults);
    }
    
    // 下载设置
    const cloudSettings = localStorage.getItem(this.getCloudStorageKey(STORAGE_KEYS.SETTINGS));
    if (cloudSettings) {
      localStorage.setItem(storageService['getUserStorageKey'](STORAGE_KEYS.SETTINGS), cloudSettings);
    }
    
    // 记录最后同步时间
    localStorage.setItem(this.getCloudStorageKey('lastSync'), JSON.stringify(new Date()));
  }

  // 同步数据（双向同步，以最新数据为准）
  syncData(): void {
    this.checkAuth();
    
    // 获取最后同步时间
    const lastSyncStr = localStorage.getItem(this.getCloudStorageKey('lastSync'));
    const lastSync = lastSyncStr ? new Date(JSON.parse(lastSyncStr)) : null;
    
    // 同步交易记录
    this.syncCollection(STORAGE_KEYS.TRANSACTIONS, lastSync);
    
    // 同步反思任务
    this.syncCollection(STORAGE_KEYS.REFLECTION_TASKS, lastSync);
    
    // 同步反思结果
    this.syncCollection(STORAGE_KEYS.REFLECTION_RESULTS, lastSync);
    
    // 同步设置（设置以云端最新为准）
    this.syncSettings();
    
    // 更新最后同步时间
    localStorage.setItem(this.getCloudStorageKey('lastSync'), JSON.stringify(new Date()));
  }

  // 同步单个集合
  private syncCollection(collectionKey: string, lastSync: Date | null): void {
    const localKey = storageService['getUserStorageKey'](collectionKey);
    const cloudKey = this.getCloudStorageKey(collectionKey);
    
    // 获取本地和云端数据
    const localDataStr = localStorage.getItem(localKey);
    const cloudDataStr = localStorage.getItem(cloudKey);
    
    if (!localDataStr && !cloudDataStr) {
      // 本地和云端都没有数据，无需同步
      return;
    }
    
    if (!localDataStr) {
      // 本地没有数据，直接从云端下载
      localStorage.setItem(localKey, cloudDataStr!);
      return;
    }
    
    if (!cloudDataStr) {
      // 云端没有数据，直接上传本地数据
      localStorage.setItem(cloudKey, localDataStr);
      return;
    }
    
    const localData = JSON.parse(localDataStr) as Array<any>;
    const cloudData = JSON.parse(cloudDataStr) as Array<any>;
    
    // 如果没有最后同步时间，以云端数据为准
    if (!lastSync) {
      localStorage.setItem(localKey, cloudDataStr);
      return;
    }
    
    // 合并数据，以最新数据为准
    const mergedData = this.mergeData(localData, cloudData, lastSync);
    
    // 保存合并后的数据
    localStorage.setItem(localKey, JSON.stringify(mergedData));
    localStorage.setItem(cloudKey, JSON.stringify(mergedData));
  }

  // 合并数据
  private mergeData(localData: Array<any>, cloudData: Array<any>, lastSync: Date): Array<any> {
    const mergedMap = new Map<string, any>();
    
    // 添加本地数据
    localData.forEach(item => {
      mergedMap.set(item.id, { ...item, source: 'local' });
    });
    
    // 添加或更新云端数据
    cloudData.forEach(item => {
      const existingItem = mergedMap.get(item.id);
      if (!existingItem) {
        // 云端有，本地没有，添加
        mergedMap.set(item.id, { ...item, source: 'cloud' });
      } else {
        // 本地和云端都有，比较修改时间（这里简化处理，假设id包含时间戳）
        const localIdTime = parseInt(existingItem.id.split('_')[1]);
        const cloudIdTime = parseInt(item.id.split('_')[1]);
        
        if (cloudIdTime > localIdTime) {
          // 云端数据更新，使用云端数据
          mergedMap.set(item.id, { ...item, source: 'cloud' });
        }
      }
    });
    
    return Array.from(mergedMap.values()).map(item => {
      // 移除source字段
      const { source, ...rest } = item;
      return rest;
    });
  }

  // 同步设置（以云端最新为准）
  private syncSettings(): void {
    const localKey = storageService['getUserStorageKey'](STORAGE_KEYS.SETTINGS);
    const cloudKey = this.getCloudStorageKey(STORAGE_KEYS.SETTINGS);
    
    const cloudSettingsStr = localStorage.getItem(cloudKey);
    if (cloudSettingsStr) {
      localStorage.setItem(localKey, cloudSettingsStr);
    }
  }

  // 获取最后同步时间
  getLastSyncTime(): Date | null {
    try {
      this.checkAuth();
      const lastSyncStr = localStorage.getItem(this.getCloudStorageKey('lastSync'));
      return lastSyncStr ? new Date(JSON.parse(lastSyncStr)) : null;
    } catch (error) {
      return null;
    }
  }
}

// 导出单例实例
export const cloudSyncService = new CloudSyncService();
