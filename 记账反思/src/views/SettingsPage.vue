<template>
  <div class="settings-page">
    <h2>设置</h2>
    
    <div class="settings-list">
      <!-- 频率模式 -->
      <div class="card setting-item">
        <h3 class="setting-title">频率模式</h3>
        <div class="setting-content">
          <div class="radio-group">
            <label class="radio-item">
              <input
                type="radio"
                v-model="settings.frequencyMode"
                value="daily"
              />
              <span>每日1条</span>
            </label>
            <label class="radio-item">
              <input
                type="radio"
                v-model="settings.frequencyMode"
                value="smart"
              />
              <span>智能模式</span>
            </label>
            <label class="radio-item">
              <input
                type="radio"
                v-model="settings.frequencyMode"
                value="manual"
              />
              <span>手动控制</span>
            </label>
          </div>
        </div>
      </div>

      <!-- 阈值设置 -->
      <div class="card setting-item">
        <h3 class="setting-title">阈值设置</h3>
        <div class="setting-content">
          <div class="form-group">
            <label class="form-label">金额门槛冷静期</label>
            <input
              type="number"
              v-model.number="settings.cooloffThreshold"
              class="form-control"
              min="0"
            />
            <small class="form-text">单笔金额超过此值时触发冷静期</small>
          </div>
          
          <div class="form-group">
            <label class="form-label">外卖次数上限</label>
            <input
              type="number"
              v-model.number="settings.takeoutLimit"
              class="form-control"
              min="0"
            />
            <small class="form-text">每周外卖次数上限</small>
          </div>
          
          <div class="form-group">
            <label class="form-label">外卖金额上限</label>
            <input
              type="number"
              v-model.number="settings.takeoutAmountLimit"
              class="form-control"
              min="0"
            />
            <small class="form-text">每周外卖金额上限</small>
          </div>
        </div>
      </div>

      <!-- 通知订阅 -->
      <div class="card setting-item">
        <h3 class="setting-title">通知订阅</h3>
        <div class="setting-content">
          <div class="checkbox-group">
            <label class="checkbox-item">
              <input
                type="checkbox"
                v-model="settings.notifications.reflection"
              />
              <span>反思任务提醒</span>
            </label>
            <label class="checkbox-item">
              <input
                type="checkbox"
                v-model="settings.notifications.returnDeadline"
              />
              <span>退货到期提醒</span>
            </label>
            <label class="checkbox-item">
              <input
                type="checkbox"
                v-model="settings.notifications.weeklyReport"
              />
              <span>每周报告</span>
            </label>
          </div>
        </div>
      </div>

      <!-- 数据导出 -->
      <div class="card setting-item">
        <h3 class="setting-title">数据导出</h3>
        <div class="setting-content">
          <div class="export-section">
            <h4>交易记录</h4>
            <div class="export-actions">
              <button class="btn btn-secondary" @click="exportData('transactions', 'csv')">
                导出CSV
              </button>
              <button class="btn btn-primary" @click="exportData('transactions', 'excel')">
                导出Excel
              </button>
            </div>
          </div>
          
          <div class="export-section">
            <h4>反思结果</h4>
            <div class="export-actions">
              <button class="btn btn-secondary" @click="exportData('reflectionResults', 'csv')">
                导出CSV
              </button>
              <button class="btn btn-primary" @click="exportData('reflectionResults', 'excel')">
                导出Excel
              </button>
            </div>
          </div>
          
          <div class="export-section">
            <h4>反思任务</h4>
            <div class="export-actions">
              <button class="btn btn-secondary" @click="exportData('reflectionTasks', 'csv')">
                导出CSV
              </button>
              <button class="btn btn-primary" @click="exportData('reflectionTasks', 'excel')">
                导出Excel
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 云同步 -->
      <div class="card setting-item">
        <h3 class="setting-title">云同步</h3>
        <div class="setting-content">
          <div class="sync-status" v-if="syncStatus">
            {{ syncStatus }}
          </div>
          
          <div class="last-sync-info">
            <p>最后同步时间：{{ formattedLastSyncTime }}</p>
          </div>
          
          <div class="sync-actions">
            <button 
              class="btn btn-primary" 
              @click="syncData"
              :disabled="isSyncing"
            >
              {{ isSyncing ? '同步中...' : '同步' }}
            </button>
            <button 
              class="btn btn-secondary" 
              @click="uploadDataToCloud"
              :disabled="isSyncing"
            >
              上传
            </button>
            <button 
              class="btn btn-secondary" 
              @click="downloadDataFromCloud"
              :disabled="isSyncing"
            >
              下载
            </button>
          </div>
        </div>
      </div>

      <!-- 登出功能 -->
      <div class="card setting-item">
        <div class="setting-actions">
          <button class="btn btn-danger" @click="handleLogout">
            退出登录
          </button>
        </div>
      </div>

      <!-- 保存按钮 -->
      <div class="card setting-item">
        <div class="setting-actions">
          <button class="btn btn-primary" @click="saveSettings">
            保存设置
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, onMounted, ref, computed } from 'vue'
import { Settings } from '../types'
import { storageService } from '../services/storage'
import { dataExportService } from '../services/dataExport'
import { authService } from '../services/authService'
import { cloudSyncService } from '../services/cloudSyncService'

// 设置数据
const settings = reactive<Settings>({
  frequencyMode: 'daily', // daily, smart, manual
  cooloffThreshold: 200,
  takeoutLimit: 5,
  takeoutAmountLimit: 500,
  notifications: {
    reflection: true,
    returnDeadline: true,
    weeklyReport: true
  }
})

// 云同步相关
const isSyncing = ref(false)
const lastSyncTime = ref<Date | null>(null)
const syncStatus = ref('')

// 格式化最后同步时间
const formattedLastSyncTime = computed(() => {
  if (!lastSyncTime.value) {
    return '从未同步'
  }
  return lastSyncTime.value.toLocaleString('zh-CN')
})

// 加载最后同步时间
const loadLastSyncTime = () => {
  lastSyncTime.value = cloudSyncService.getLastSyncTime()
}

// 同步数据
const syncData = async () => {
  try {
    isSyncing.value = true
    syncStatus.value = '正在同步...'
    cloudSyncService.syncData()
    loadLastSyncTime()
    syncStatus.value = '同步成功'
    setTimeout(() => {
      syncStatus.value = ''
    }, 2000)
  } catch (error: any) {
    syncStatus.value = `同步失败: ${error.message}`
    setTimeout(() => {
      syncStatus.value = ''
    }, 3000)
  } finally {
    isSyncing.value = false
  }
}

// 上传数据
const uploadDataToCloud = async () => {
  try {
    isSyncing.value = true
    syncStatus.value = '正在上传...'
    cloudSyncService.uploadData()
    loadLastSyncTime()
    syncStatus.value = '上传成功'
    setTimeout(() => {
      syncStatus.value = ''
    }, 2000)
  } catch (error: any) {
    syncStatus.value = `上传失败: ${error.message}`
    setTimeout(() => {
      syncStatus.value = ''
    }, 3000)
  } finally {
    isSyncing.value = false
  }
}

// 下载数据
const downloadDataFromCloud = async () => {
  try {
    isSyncing.value = true
    syncStatus.value = '正在下载...'
    cloudSyncService.downloadData()
    loadLastSyncTime()
    syncStatus.value = '下载成功'
    setTimeout(() => {
      syncStatus.value = ''
    }, 2000)
  } catch (error: any) {
    syncStatus.value = `下载失败: ${error.message}`
    setTimeout(() => {
      syncStatus.value = ''
    }, 3000)
  } finally {
    isSyncing.value = false
  }
}

// 加载设置
const loadSettings = () => {
  const savedSettings = storageService.getSettings()
  Object.assign(settings, savedSettings)
}

// 保存设置
const saveSettings = () => {
  storageService.saveSettings(settings)
  alert('设置已保存')
}

// 导出数据
const exportData = (type: string, format: 'csv' | 'excel') => {
  switch (type) {
    case 'transactions':
      const transactions = storageService.getTransactions()
      dataExportService.exportTransactions(transactions, format)
      break
    case 'reflectionResults':
      const reflectionResults = storageService.getReflectionResults()
      dataExportService.exportReflectionResults(reflectionResults, format)
      break
    case 'reflectionTasks':
      const reflectionTasks = storageService.getReflectionTasks()
      dataExportService.exportReflectionTasks(reflectionTasks, format)
      break
  }
}

// 退出登录
const handleLogout = () => {
  authService.logout()
  window.location.href = '/login'
}

// 初始化加载设置和最后同步时间
onMounted(() => {
  loadSettings()
  loadLastSyncTime()
})
</script>

<style scoped>
.settings-page {
  h2 {
    margin-bottom: 1.5rem;
    color: #333;
  }

  .settings-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .setting-item {
    transition: transform 0.2s, box-shadow 0.2s;
  }

  .setting-item:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }

  .setting-title {
    margin: 0 0 1rem 0;
    font-size: 1.125rem;
  }

  .radio-group {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .radio-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
  }

  .checkbox-group {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .checkbox-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
  }

  .form-text {
    display: block;
    margin-top: 0.25rem;
    font-size: 0.75rem;
    color: #999;
  }

  .setting-actions {
    display: flex;
    justify-content: center;
    padding: 1rem 0 0;
  }
  
  .sync-status {
    padding: 0.5rem;
    margin-bottom: 1rem;
    background-color: #e8f5e8;
    color: #2e7d32;
    border-radius: 4px;
    text-align: center;
    font-size: 0.875rem;
  }
  
  .last-sync-info {
    margin-bottom: 1rem;
    font-size: 0.875rem;
    color: #666;
  }
  
  .sync-actions {
    display: flex;
    gap: 0.5rem;
  }
  
  .sync-actions .btn {
    flex: 1;
  }
}
</style>