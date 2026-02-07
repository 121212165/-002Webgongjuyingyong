import * as XLSX from 'xlsx';
import { Transaction, ReflectionResult, ReflectionTask } from '../types';

// 数据导出服务类
export class DataExportService {
  constructor() {}

  // 导出为CSV格式
  exportToCSV<T>(data: T[], filename: string): void {
    if (data.length === 0) {
      alert('没有数据可以导出');
      return;
    }

    // 将数据转换为CSV格式
    const csvContent = this.convertToCSV(data);
    
    // 创建Blob对象
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    
    // 下载文件
    this.downloadBlob(blob, `${filename}.csv`);
  }

  // 导出为Excel格式
  exportToExcel<T>(data: T[], filename: string): void {
    if (data.length === 0) {
      alert('没有数据可以导出');
      return;
    }

    // 创建工作簿
    const wb = XLSX.utils.book_new();
    
    // 将数据转换为工作表
    const ws = XLSX.utils.json_to_sheet(data);
    
    // 添加工作表到工作簿
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    
    // 生成Excel文件并下载
    XLSX.writeFile(wb, `${filename}.xlsx`);
  }

  // 将数据转换为CSV格式
  private convertToCSV<T>(data: T[]): string {
    if (data.length === 0) return '';
    
    // 获取表头（所有对象的键的并集）
    const headers = new Set<string>();
    data.forEach(item => {
      Object.keys(item).forEach(key => headers.add(key));
    });
    const headerArray = Array.from(headers);
    
    // 创建CSV内容
    const csvRows = [];
    
    // 添加表头
    csvRows.push(headerArray.join(','));
    
    // 添加数据行
    data.forEach(item => {
      const values = headerArray.map(header => {
        const value = (item as any)[header];
        // 处理特殊字符
        if (value === null || value === undefined) {
          return '';
        }
        if (typeof value === 'string') {
          // 处理包含逗号、引号或换行符的字符串
          return `"${value.replace(/"/g, '""')}"`;
        }
        if (value instanceof Date) {
          // 格式化日期
          return value.toISOString();
        }
        return value;
      });
      csvRows.push(values.join(','));
    });
    
    return csvRows.join('\n');
  }

  // 下载Blob对象
  private downloadBlob(blob: Blob, filename: string): void {
    // 创建下载链接
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    
    // 触发下载
    document.body.appendChild(link);
    link.click();
    
    // 清理
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  }

  // 导出交易记录
  exportTransactions(transactions: Transaction[], format: 'csv' | 'excel'): void {
    const filename = `交易记录_${new Date().toISOString().slice(0, 10)}`;
    if (format === 'csv') {
      this.exportToCSV(transactions, filename);
    } else {
      this.exportToExcel(transactions, filename);
    }
  }

  // 导出反思结果
  exportReflectionResults(results: ReflectionResult[], format: 'csv' | 'excel'): void {
    const filename = `反思结果_${new Date().toISOString().slice(0, 10)}`;
    if (format === 'csv') {
      this.exportToCSV(results, filename);
    } else {
      this.exportToExcel(results, filename);
    }
  }

  // 导出反思任务
  exportReflectionTasks(tasks: ReflectionTask[], format: 'csv' | 'excel'): void {
    const filename = `反思任务_${new Date().toISOString().slice(0, 10)}`;
    if (format === 'csv') {
      this.exportToCSV(tasks, filename);
    } else {
      this.exportToExcel(tasks, filename);
    }
  }
}

// 导出单例实例
export const dataExportService = new DataExportService();