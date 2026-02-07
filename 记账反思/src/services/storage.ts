import { Transaction, ReflectionTask, ReflectionResult, Rule, Settings, User } from '../types';
import { DEFAULT_RULES, STORAGE_KEYS } from '../constants';
import { authService } from './authService';

// 本地存储服务类
export class StorageService {
  constructor() {
    this.init();
  }

  // 初始化本地存储
  private init(): void {
    // 初始化规则（全局，不区分用户）
    if (!localStorage.getItem(STORAGE_KEYS.RULES)) {
      localStorage.setItem(STORAGE_KEYS.RULES, JSON.stringify(DEFAULT_RULES));
    }
  }

  // 获取当前用户ID
  private getCurrentUserId(): string {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      throw new Error('用户未登录');
    }
    return currentUser.id;
  }

  // 获取用户特定的存储键
  private getUserStorageKey(baseKey: string): string {
    const userId = this.getCurrentUserId();
    return `${baseKey}_${userId}`;
  }

  // 通用获取数据方法
  private getData<T>(baseKey: string): T[] {
    const key = this.getUserStorageKey(baseKey);
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  }

  // 通用保存数据方法
  private saveData<T>(baseKey: string, data: T[]): void {
    const key = this.getUserStorageKey(baseKey);
    localStorage.setItem(key, JSON.stringify(data));
  }

  // 通用获取单个数据方法
  private getItemById<T>(baseKey: string, id: string): T | undefined {
    const data = this.getData<T>(baseKey);
    return data.find((item: any) => item.id === id);
  }

  // 通用更新单个数据方法
  private updateItemById<T>(baseKey: string, id: string, update: Partial<T>): boolean {
    const data = this.getData<T>(baseKey);
    const index = data.findIndex((item: any) => item.id === id);
    if (index === -1) {
      return false;
    }
    data[index] = { ...data[index], ...update };
    this.saveData(baseKey, data);
    return true;
  }

  // 通用删除单个数据方法
  private deleteItemById<T>(baseKey: string, id: string): boolean {
    const data = this.getData<T>(baseKey);
    const newData = data.filter((item: any) => item.id !== id);
    if (newData.length === data.length) {
      return false;
    }
    this.saveData(baseKey, newData);
    return true;
  }

  // ===================
  // 交易记录相关方法
  // ===================

  // 创建交易记录
  createTransaction(transaction: Omit<Transaction, 'id' | 'userId'>): Transaction {
    const userId = this.getCurrentUserId();
    const transactions = this.getData<Transaction>(STORAGE_KEYS.TRANSACTIONS);
    const newTransaction = {
      ...transaction,
      id: `trans_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId
    };
    transactions.push(newTransaction);
    this.saveData(STORAGE_KEYS.TRANSACTIONS, transactions);
    return newTransaction;
  }

  // 获取所有交易记录
  getTransactions(): Transaction[] {
    return this.getData<Transaction>(STORAGE_KEYS.TRANSACTIONS);
  }

  // 根据条件获取交易记录
  getTransactionsByCondition(condition: Partial<Transaction>): Transaction[] {
    const transactions = this.getData<Transaction>(STORAGE_KEYS.TRANSACTIONS);
    return transactions.filter(transaction => {
      return Object.keys(condition).every(key => {
        const conditionKey = key as keyof Transaction;
        if (conditionKey === 'occurredAt' || conditionKey === 'returnDeadlineAt') {
          // 日期类型比较，这里简化处理
          return true;
        }
        return transaction[conditionKey] === condition[conditionKey];
      });
    });
  }

  // 获取单个交易记录
  getTransactionById(id: string): Transaction | undefined {
    return this.getItemById<Transaction>(STORAGE_KEYS.TRANSACTIONS, id);
  }

  // 更新交易记录
  updateTransaction(id: string, update: Partial<Transaction>): boolean {
    return this.updateItemById<Transaction>(STORAGE_KEYS.TRANSACTIONS, id, update);
  }

  // 删除交易记录
  deleteTransaction(id: string): boolean {
    return this.deleteItemById<Transaction>(STORAGE_KEYS.TRANSACTIONS, id);
  }

  // ===================
  // 反思任务相关方法
  // ===================

  // 创建反思任务
  createReflectionTask(task: Omit<ReflectionTask, 'id' | 'userId'>): ReflectionTask {
    const userId = this.getCurrentUserId();
    const tasks = this.getData<ReflectionTask>(STORAGE_KEYS.REFLECTION_TASKS);
    const newTask = {
      ...task,
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId
    };
    tasks.push(newTask);
    this.saveData(STORAGE_KEYS.REFLECTION_TASKS, tasks);
    return newTask;
  }

  // 获取所有反思任务
  getReflectionTasks(): ReflectionTask[] {
    return this.getData<ReflectionTask>(STORAGE_KEYS.REFLECTION_TASKS);
  }

  // 根据状态获取反思任务
  getReflectionTasksByStatus(status: ReflectionTask['status']): ReflectionTask[] {
    const tasks = this.getData<ReflectionTask>(STORAGE_KEYS.REFLECTION_TASKS);
    return tasks.filter(task => task.status === status);
  }

  // 获取单个反思任务
  getReflectionTaskById(id: string): ReflectionTask | undefined {
    return this.getItemById<ReflectionTask>(STORAGE_KEYS.REFLECTION_TASKS, id);
  }

  // 更新反思任务
  updateReflectionTask(id: string, update: Partial<ReflectionTask>): boolean {
    return this.updateItemById<ReflectionTask>(STORAGE_KEYS.REFLECTION_TASKS, id, update);
  }

  // 删除反思任务
  deleteReflectionTask(id: string): boolean {
    return this.deleteItemById<ReflectionTask>(STORAGE_KEYS.REFLECTION_TASKS, id);
  }

  // ===================
  // 反思结果相关方法
  // ===================

  // 创建反思结果
  createReflectionResult(result: Omit<ReflectionResult, 'id' | 'userId'>): ReflectionResult {
    const userId = this.getCurrentUserId();
    const results = this.getData<ReflectionResult>(STORAGE_KEYS.REFLECTION_RESULTS);
    const newResult = {
      ...result,
      id: `result_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId
    };
    results.push(newResult);
    this.saveData(STORAGE_KEYS.REFLECTION_RESULTS, results);
    return newResult;
  }

  // 获取所有反思结果
  getReflectionResults(): ReflectionResult[] {
    return this.getData<ReflectionResult>(STORAGE_KEYS.REFLECTION_RESULTS);
  }

  // 根据任务ID获取反思结果
  getReflectionResultByTaskId(taskId: string): ReflectionResult | undefined {
    const results = this.getData<ReflectionResult>(STORAGE_KEYS.REFLECTION_RESULTS);
    return results.find(result => result.taskId === taskId);
  }

  // ===================
  // 规则相关方法
  // ===================

  // 获取所有规则
  getRules(): Rule[] {
    return this.getData<Rule>(STORAGE_KEYS.RULES);
  }

  // 更新规则启用状态
  toggleRuleEnabled(id: string): boolean {
    const rules = this.getData<Rule>(STORAGE_KEYS.RULES);
    const index = rules.findIndex(rule => rule.id === id);
    if (index === -1) {
      return false;
    }
    rules[index].enabled = !rules[index].enabled;
    this.saveData(STORAGE_KEYS.RULES, rules);
    return true;
  }

  // 更新规则
  updateRule(id: string, update: Partial<Rule>): boolean {
    return this.updateItemById<Rule>(STORAGE_KEYS.RULES, id, update);
  }

  // ===================
  // 设置相关方法
  // ===================

  // 获取设置
  getSettings(): Settings {
    try {
      const userId = this.getCurrentUserId();
      const settings = localStorage.getItem(this.getUserStorageKey(STORAGE_KEYS.SETTINGS));
      if (settings) {
        return JSON.parse(settings);
      }
    } catch (error) {
      // 用户未登录时使用默认设置
    }
    
    // 默认设置
    const defaultSettings: Settings = {
      userId: this.getCurrentUserId(),
      frequencyMode: 'daily',
      cooloffThreshold: 200,
      takeoutLimit: 5,
      takeoutAmountLimit: 500,
      notifications: {
        reflection: true,
        returnDeadline: true,
        weeklyReport: true
      }
    };
    this.saveSettings(defaultSettings);
    return defaultSettings;
  }

  // 保存设置
  saveSettings(settings: Settings): void {
    const userId = this.getCurrentUserId();
    const userSettings = {
      ...settings,
      userId
    };
    localStorage.setItem(this.getUserStorageKey(STORAGE_KEYS.SETTINGS), JSON.stringify(userSettings));
  }
}

// 导出单例实例
export const storageService = new StorageService();