<template>
  <div class="inbox-page">
    <h2>反思收件箱</h2>
    
    <div v-if="pendingTasks.length === 0" class="empty-state">
      <p>暂无待处理的反思任务</p>
    </div>
    
    <div v-else class="tasks-list">
      <div
        v-for="task in pendingTasks"
        :key="task.id"
        class="card task-item"
      >
        <div class="task-header">
          <h3 class="task-title">反思任务</h3>
          <span class="task-type">{{ task.type === 't1' ? 'T+1' : 'T+7' }}</span>
        </div>
        
        <div class="task-content">
          <div class="transaction-info">
            <p class="task-amount">¥{{ getTransactionAmount(task.transactionId) }}</p>
            <p class="task-category">{{ getTransactionCategory(task.transactionId) }}</p>
            <p class="task-merchant">{{ getTransactionMerchant(task.transactionId) || '无商家' }}</p>
            <p class="task-personal-input" v-if="getTransactionPersonalInput(task.transactionId)">
              备注：{{ getTransactionPersonalInput(task.transactionId) }}
            </p>
          </div>
          <p class="task-due">截止时间：{{ formatDate(task.dueAt) }}</p>
        </div>
        
        <div class="task-actions">
          <button class="btn btn-primary" @click="showReflectionForm(task)">
            完成
          </button>
          <button class="btn btn-secondary" @click="handleSnooze(task)">
            稍后
          </button>
          <button class="btn btn-danger" @click="handleSkip(task)">
            跳过
          </button>
        </div>
      </div>
    </div>
    
    <!-- 反思表单弹窗 -->
    <div class="modal-overlay" v-if="showForm">
      <div class="modal-content">
        <ReflectionForm
          :task-id="currentTaskId"
          @submit="handleReflectionSubmit"
          @cancel="handleReflectionCancel"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ReflectionTask, Transaction, ReflectionResult, ReflectionAnswer } from '../types'
import { storageService } from '../services/storage'
import { ruleRecommendationService } from '../services/ruleRecommendation'
import ReflectionForm from '../components/ReflectionForm.vue'

// 所有任务
const tasks = ref<ReflectionTask[]>([])

// 交易记录映射
const transactionsMap = ref<Map<string, Transaction>>(new Map())

// 反思表单显示状态
const showForm = ref(false)

// 当前处理的任务ID
const currentTaskId = ref('')

// 获取待处理任务
const pendingTasks = computed(() => {
  return tasks.value.filter(task => task.status === 'pending')
})

// 格式化日期
const formatDate = (date: Date | string): string => {
  const d = new Date(date)
  return d.toLocaleString('zh-CN')
}

// 获取交易金额
const getTransactionAmount = (transactionId: string): number => {
  const transaction = transactionsMap.value.get(transactionId)
  return transaction?.amount || 0
}

// 获取交易分类
const getTransactionCategory = (transactionId: string): string => {
  const transaction = transactionsMap.value.get(transactionId)
  return transaction?.category || '未知分类'
}

// 获取交易商家
const getTransactionMerchant = (transactionId: string): string | undefined => {
  const transaction = transactionsMap.value.get(transactionId)
  return transaction?.merchantText
}

// 获取交易个人输入
const getTransactionPersonalInput = (transactionId: string): string | undefined => {
  const transaction = transactionsMap.value.get(transactionId)
  return transaction?.personalInput
}

// 加载数据
const loadData = () => {
  // 加载任务
  tasks.value = storageService.getReflectionTasks()
  
  // 加载交易记录并构建映射
  const transactions = storageService.getTransactions()
  transactionsMap.value = new Map(transactions.map(trans => [trans.id, trans]))
}

// 显示反思表单
const showReflectionForm = (task: ReflectionTask) => {
  currentTaskId.value = task.id
  showForm.value = true
}

// 处理反思提交
const handleReflectionSubmit = (formData: ReflectionAnswer) => {
  // 创建反思结果
  const reflectionResult: Omit<ReflectionResult, 'id'> = {
    taskId: currentTaskId.value,
    ...formData,
    completedAt: new Date(),
    recommendedRules: []
  }
  
  // 保存反思结果
  const savedResult = storageService.createReflectionResult(reflectionResult)
  
  // 生成规则推荐
  const recommendedRules = ruleRecommendationService.recommendRules(savedResult)
  
  // 获取推荐规则的详细信息
  const recommendedRulesDetails = ruleRecommendationService.getRecommendedRulesDetails(recommendedRules)
  
  // 更新反思结果的推荐规则
  savedResult.recommendedRules = recommendedRules
  
  // 更新任务状态为已完成
  storageService.updateReflectionTask(currentTaskId.value, { status: 'completed' })
  
  // 关闭表单
  showForm.value = false
  
  // 重新加载数据
  loadData()
  
  // 显示反思完成提示和推荐规则
  if (recommendedRulesDetails.length > 0) {
    const ruleNames = recommendedRulesDetails.map(rule => rule.name).join('、')
    alert(`反思已提交\n\n推荐启用以下规则：\n${ruleNames}`)
  } else {
    alert('反思已提交')
  }
}

// 处理反思取消
const handleReflectionCancel = () => {
  showForm.value = false
  currentTaskId.value = ''
}

// 稍后处理
const handleSnooze = (task: ReflectionTask) => {
  // 更新任务状态为稍后
  storageService.updateReflectionTask(task.id, { status: 'snoozed' })
  
  // 重新加载数据
  loadData()
  
  alert('任务已设置为稍后处理')
}

// 跳过任务
const handleSkip = (task: ReflectionTask) => {
  // 更新任务状态为已跳过
  storageService.updateReflectionTask(task.id, { status: 'skipped' })
  
  // 重新加载数据
  loadData()
  
  alert('任务已跳过')
}

// 初始化加载数据
onMounted(() => {
  loadData()
})
</script>

<style scoped>
/* 模态框样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
}

/* 页面样式 */
.inbox-page {
  h2 {
    margin-bottom: 1.5rem;
    color: #333;
  }

  .empty-state {
    text-align: center;
    padding: 2rem;
    background-color: #f9f9f9;
    border-radius: 8px;
    color: #666;
  }

  .tasks-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .task-item {
    transition: transform 0.2s, box-shadow 0.2s;
  }

  .task-item:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }

  .task-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .task-title {
    margin: 0;
    font-size: 1.125rem;
  }

  .task-type {
    padding: 0.25rem 0.75rem;
    background-color: #4a90e2;
    color: white;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 500;
  }

  .task-content {
    margin-bottom: 1.5rem;
  }

  .task-amount {
    font-size: 1.5rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
    color: #333;
  }

  .task-category {
    font-weight: 500;
    margin-bottom: 0.25rem;
  }

  .task-merchant {
    color: #666;
    margin-bottom: 0.25rem;
    font-size: 0.875rem;
  }

  .task-due {
    color: #999;
    font-size: 0.875rem;
  }

  .task-actions {
    display: flex;
    gap: 0.5rem;
  }

  .btn {
    flex: 1;
  }
}
</style>