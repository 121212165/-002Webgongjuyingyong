import { Transaction, ReflectionTask } from '../types';
import { storageService } from './storage';

// 任务生成服务类
export class TaskGeneratorService {
  constructor() {}

  // 计算T+1时间
  private calculateT1Time(occurredAt: Date): Date {
    const t1Time = new Date(occurredAt);
    t1Time.setDate(t1Time.getDate() + 1);
    return t1Time;
  }

  // 计算T+7时间
  private calculateT7Time(occurredAt: Date): Date {
    const t7Time = new Date(occurredAt);
    t7Time.setDate(t7Time.getDate() + 7);
    return t7Time;
  }

  // 为交易生成反思任务
  generateTasksForTransaction(transaction: Transaction): void {
    // 生成T+1任务
    const t1Task: Omit<ReflectionTask, 'id'> = {
      transactionId: transaction.id,
      type: 't1',
      status: 'pending',
      dueAt: this.calculateT1Time(transaction.occurredAt)
    };
    storageService.createReflectionTask(t1Task);

    // 生成T+7任务
    const t7Task: Omit<ReflectionTask, 'id'> = {
      transactionId: transaction.id,
      type: 't7',
      status: 'pending',
      dueAt: this.calculateT7Time(transaction.occurredAt)
    };
    storageService.createReflectionTask(t7Task);
  }

  // 批量生成任务（用于初始化或导入数据时）
  generateTasksForAllTransactions(): void {
    const transactions = storageService.getTransactions();
    transactions.forEach(transaction => {
      this.generateTasksForTransaction(transaction);
    });
  }
}

// 导出单例实例
export const taskGeneratorService = new TaskGeneratorService();