// 通知服务类
export class NotificationService {
  constructor() {}

  // 检查浏览器是否支持通知
  isSupported(): boolean {
    return 'Notification' in window;
  }

  // 请求通知权限
  async requestPermission(): Promise<boolean> {
    if (!this.isSupported()) {
      console.error('浏览器不支持通知');
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  // 检查通知权限状态
  checkPermissionStatus(): NotificationPermission {
    if (!this.isSupported()) {
      return 'denied';
    }
    return Notification.permission;
  }

  // 显示通知
  showNotification(title: string, options?: NotificationOptions): Notification | null {
    if (this.checkPermissionStatus() !== 'granted') {
      console.error('未获得通知权限');
      return null;
    }

    try {
      return new Notification(title, options);
    } catch (error) {
      console.error('显示通知失败:', error);
      return null;
    }
  }

  // 发送反思任务提醒
  sendReflectionReminder(taskCount: number): void {
    if (this.checkPermissionStatus() !== 'granted') {
      return;
    }

    this.showNotification(
      '反思任务提醒',
      {
        body: `您有 ${taskCount} 个待完成的反思任务，点击查看详情。`,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'reflection-reminder',
        requireInteraction: false,
        silent: false
      }
    );
  }

  // 发送退货到期提醒
  sendReturnDeadlineReminder(productName: string, deadline: Date): void {
    if (this.checkPermissionStatus() !== 'granted') {
      return;
    }

    const deadlineStr = deadline.toLocaleDateString();
    this.showNotification(
      '退货到期提醒',
      {
        body: `商品 "${productName}" 的退货期限为 ${deadlineStr}，请及时处理。`,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'return-deadline-reminder',
        requireInteraction: false,
        silent: false
      }
    );
  }

  // 发送每周报告提醒
  sendWeeklyReportReminder(): void {
    if (this.checkPermissionStatus() !== 'granted') {
      return;
    }

    this.showNotification(
      '每周报告提醒',
      {
        body: '您的每周消费报告已生成，点击查看详情。',
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'weekly-report-reminder',
        requireInteraction: false,
        silent: false
      }
    );
  }
}

// 导出单例实例
export const notificationService = new NotificationService();
