<template>
  <div class="home-page">
    <h2>首页Dashboard</h2>
    
    <!-- 今日精选反思卡 -->
    <section class="today-reflection">
      <h3>今日精选反思</h3>
      <div v-if="todayReflectionTask" class="card">
        <div class="reflection-card-header">
          <h4>请反思这笔消费</h4>
          <span class="reflection-type">{{ todayReflectionTask.type === 't1' ? 'T+1' : 'T+7' }}</span>
        </div>
        <div class="reflection-card-content">
          <p class="reflection-amount">¥{{ getTransactionAmount(todayReflectionTask.transactionId) }}</p>
          <p class="reflection-category">{{ getTransactionCategory(todayReflectionTask.transactionId) }}</p>
          <p class="reflection-merchant">{{ getTransactionMerchant(todayReflectionTask.transactionId) || '无商家' }}</p>
          <p class="reflection-personal-input" v-if="getTransactionPersonalInput(todayReflectionTask.transactionId)">
            备注：{{ getTransactionPersonalInput(todayReflectionTask.transactionId) }}
          </p>
        </div>
        <div class="reflection-card-actions">
          <button class="btn btn-primary" @click="goToCompleteReflection(todayReflectionTask.id)">
            立即反思
          </button>
        </div>
      </div>
      <div v-else class="card">
        <p>暂无今日反思任务</p>
      </div>
    </section>

    <!-- 退货倒计时 -->
    <section class="return-deadline">
      <h3>退货倒计时</h3>
      <div v-if="returnDeadlineTransactions.length > 0" class="card">
        <div class="deadline-list">
          <div
            v-for="transaction in returnDeadlineTransactions"
            :key="transaction.id"
            class="deadline-item"
          >
            <div class="deadline-info">
              <p class="deadline-amount">¥{{ transaction.amount }}</p>
              <p class="deadline-category">{{ transaction.category }}</p>
              <p class="deadline-merchant">{{ transaction.merchantText || '无商家' }}</p>
            </div>
            <div class="deadline-countdown">
              <p class="deadline-days">{{ calculateDaysUntilDeadline(transaction.returnDeadlineAt!) }} 天</p>
              <p class="deadline-date">{{ formatDate(transaction.returnDeadlineAt!) }}</p>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="card">
        <p>暂无即将到期的退货</p>
      </div>
    </section>

    <!-- 本周概览 -->
    <section class="week-overview">
      <h3>本周概览</h3>
      <div class="card">
        <div class="overview-grid">
          <div class="overview-item">
            <div class="overview-label">总支出</div>
            <div class="overview-value">¥{{ weeklySummary.totalExpense }}</div>
          </div>
          <div class="overview-item">
            <div class="overview-label">记账笔数</div>
            <div class="overview-value">{{ weeklySummary.transactionCount }}</div>
          </div>
          <div class="overview-item">
            <div class="overview-label">反思完成</div>
            <div class="overview-value">{{ weeklySummary.completedReflections }}/{{ weeklySummary.totalReflections }}</div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ReflectionTask, Transaction } from '../types'
import { storageService } from '../services/storage'

const router = useRouter()

// 所有任务
const tasks = ref<ReflectionTask[]>([])

// 所有交易
const transactions = ref<Transaction[]>([])

// 今日精选反思任务
const todayReflectionTask = computed(() => {
  // 这里简化处理，返回第一个待处理任务
  const pendingTasks = tasks.value.filter(task => task.status === 'pending')
  return pendingTasks.length > 0 ? pendingTasks[0] : null
})

// 有退货期限的交易
const returnDeadlineTransactions = computed(() => {
  return transactions.value
    .filter(transaction => transaction.returnDeadlineAt)
    .filter(transaction => {
      const deadline = new Date(transaction.returnDeadlineAt!)
      const now = new Date()
      // 只显示未来7天内到期的退货
      const diffTime = deadline.getTime() - now.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      return diffDays >= 0 && diffDays <= 7
    })
    .sort((a, b) => {
      const aDeadline = new Date(a.returnDeadlineAt!)
      const bDeadline = new Date(b.returnDeadlineAt!)
      return aDeadline.getTime() - bDeadline.getTime()
    })
})

// 本周概览数据
const weeklySummary = computed(() => {
  // 计算本周的开始和结束时间
  const now = new Date()
  const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()))
  startOfWeek.setHours(0, 0, 0, 0)
  
  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(endOfWeek.getDate() + 7)
  endOfWeek.setHours(23, 59, 59, 999)
  
  // 计算本周支出
  const weeklyTransactions = transactions.value.filter(transaction => {
    const occurredAt = new Date(transaction.occurredAt)
    return occurredAt >= startOfWeek && occurredAt <= endOfWeek
  })
  
  const totalExpense = weeklyTransactions.reduce((sum, trans) => sum + trans.amount, 0)
  const transactionCount = weeklyTransactions.length
  
  // 计算反思完成情况
  const totalReflections = tasks.value.length
  const completedReflections = tasks.value.filter(task => task.status === 'completed').length
  
  return {
    totalExpense: totalExpense.toFixed(2),
    transactionCount,
    totalReflections,
    completedReflections
  }
})

// 格式化日期
const formatDate = (date: Date | string): string => {
  const d = new Date(date)
  return d.toLocaleDateString('zh-CN')
}

// 获取交易金额
const getTransactionAmount = (transactionId: string): number => {
  const transaction = transactions.value.find(trans => trans.id === transactionId)
  return transaction?.amount || 0
}

// 获取交易分类
const getTransactionCategory = (transactionId: string): string => {
  const transaction = transactions.value.find(trans => trans.id === transactionId)
  return transaction?.category || '未知分类'
}

// 获取交易商家
const getTransactionMerchant = (transactionId: string): string | undefined => {
  const transaction = transactions.value.find(trans => trans.id === transactionId)
  return transaction?.merchantText
}

// 获取交易个人输入
const getTransactionPersonalInput = (transactionId: string): string | undefined => {
  const transaction = transactions.value.find(trans => trans.id === transactionId)
  return transaction?.personalInput
}

// 计算退货倒计时天数
const calculateDaysUntilDeadline = (deadline: Date | string): number => {
  const now = new Date()
  const deadlineDate = new Date(deadline)
  const diffTime = deadlineDate.getTime() - now.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

// 跳转到完成反思页面
const goToCompleteReflection = (taskId: string) => {
  // 这里可以跳转到专门的反思页面，目前简化处理
  console.log('跳转到完成反思页面:', taskId)
  alert('跳转到完成反思页面')
}

// 加载数据
const loadData = () => {
  tasks.value = storageService.getReflectionTasks()
  transactions.value = storageService.getTransactions()
}

// 初始化加载数据
onMounted(() => {
  loadData()
})
</script>

<style scoped>
.home-page {
  h2 {
    margin-bottom: 1.5rem;
    color: #333;
  }

  section {
    margin-bottom: 2rem;
  }

  h3 {
    font-size: 1.125rem;
    margin-bottom: 1rem;
    color: #555;
  }

  /* 今日精选反思卡样式 */
  .reflection-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .reflection-card-header h4 {
    margin: 0;
    font-size: 1.125rem;
  }

  .reflection-type {
    padding: 0.25rem 0.75rem;
    background-color: #4a90e2;
    color: white;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 500;
  }

  .reflection-card-content {
    margin-bottom: 1.5rem;
  }

  .reflection-amount {
    font-size: 2rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
    color: #333;
  }

  .reflection-category {
    font-weight: 500;
    margin-bottom: 0.25rem;
  }

  .reflection-merchant {
    color: #666;
    margin-bottom: 0.25rem;
    font-size: 0.875rem;
  }

  .reflection-personal-input {
    background-color: #f9f9f9;
    padding: 0.75rem;
    border-radius: 6px;
    font-size: 0.875rem;
    margin-top: 0.5rem;
  }

  /* 退货倒计时样式 */
  .deadline-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .deadline-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    background-color: #f9f9f9;
    border-radius: 6px;
  }

  .deadline-info {
    flex: 1;
  }

  .deadline-amount {
    font-weight: 600;
    margin-bottom: 0.25rem;
  }

  .deadline-category {
    font-size: 0.875rem;
    color: #666;
    margin-bottom: 0.25rem;
  }

  .deadline-merchant {
    font-size: 0.75rem;
    color: #999;
  }

  .deadline-countdown {
    text-align: right;
  }

  .deadline-days {
    font-size: 1.5rem;
    font-weight: 600;
    color: #e74c3c;
  }

  .deadline-date {
    font-size: 0.75rem;
    color: #666;
  }

  /* 本周概览样式 */
  .overview-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
  }

  .overview-item {
    text-align: center;
  }

  .overview-label {
    font-size: 0.875rem;
    color: #666;
    margin-bottom: 0.25rem;
  }

  .overview-value {
    font-size: 1.5rem;
    font-weight: 600;
    color: #333;
  }
}
</style>