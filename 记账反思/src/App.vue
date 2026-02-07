<template>
  <div class="app-container">
    <header class="app-header">
      <h1>记账反思</h1>
    </header>
    
    <main class="app-main">
      <router-view />
    </main>
    
    <footer class="app-footer">
      <nav class="bottom-nav">
        <router-link to="/" class="nav-item">
          <span>首页</span>
        </router-link>
        <router-link to="/add" class="nav-item add-btn">
          <span>+</span>
        </router-link>
        <router-link to="/inbox" class="nav-item">
          <span>反思</span>
        </router-link>
        <router-link to="/analytics" class="nav-item">
          <span>统计</span>
        </router-link>
        <router-link to="/settings" class="nav-item">
          <span>设置</span>
        </router-link>
      </nav>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { storageService } from './services/storage'
import { notificationService } from './services/notificationService'

// 定期检查通知的间隔（毫秒）
const CHECK_INTERVAL = 60000 // 1分钟

// 检查反思任务并发送提醒
const checkReflectionTasks = () => {
  const pendingTasks = storageService.getReflectionTasks().filter(task => task.status === 'pending')
  if (pendingTasks.length > 0) {
    notificationService.sendReflectionReminder(pendingTasks.length)
  }
}

// 检查退货到期并发送提醒
const checkReturnDeadlines = () => {
  const transactions = storageService.getTransactions()
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  transactions.forEach(transaction => {
    if (transaction.returnDeadlineAt) {
      const deadline = new Date(transaction.returnDeadlineAt)
      // 检查是否明天到期
      if (deadline.toDateString() === tomorrow.toDateString()) {
        notificationService.sendReturnDeadlineReminder(transaction.name, deadline)
      }
    }
  })
}

// 定期检查通知的函数
let checkInterval: number | null = null
const startNotificationCheck = () => {
  // 立即检查一次
  checkReflectionTasks()
  checkReturnDeadlines()
  
  // 设置定期检查
  checkInterval = window.setInterval(() => {
    checkReflectionTasks()
    checkReturnDeadlines()
  }, CHECK_INTERVAL)
}

// 组件挂载时请求通知权限并开始定期检查
onMounted(async () => {
  // 请求通知权限
  await notificationService.requestPermission()
  
  // 开始定期检查通知
  startNotificationCheck()
})

// 组件卸载时清除定时器
onUnmounted(() => {
  if (checkInterval) {
    clearInterval(checkInterval)
  }
})
</script>

<style scoped>
.app-container {
  max-width: 600px;
  margin: 0 auto;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f5f5f5;
}

.app-header {
  background-color: #4a90e2;
  color: white;
  padding: 1rem;
  text-align: center;
}

.app-header h1 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
}

.app-main {
  flex: 1;
  padding: 1rem;
  background-color: white;
  margin: 1rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.app-footer {
  padding: 1rem;
  background-color: white;
  border-top: 1px solid #e0e0e0;
}

.bottom-nav {
  display: flex;
  justify-content: space-around;
  align-items: center;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  color: #666;
  font-size: 0.875rem;
  padding: 0.5rem;
  border-radius: 8px;
  transition: all 0.2s;
}

.nav-item:hover {
  background-color: #f0f0f0;
}

.nav-item.router-link-active {
  color: #4a90e2;
}

.add-btn {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background-color: #4a90e2;
  color: white;
  font-size: 2rem;
  font-weight: bold;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  transform: translateY(-25%);
}

.add-btn:hover {
  background-color: #357abd;
  transform: translateY(-25%) scale(1.05);
}
</style>