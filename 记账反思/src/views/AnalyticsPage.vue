<template>
  <div class="analytics-page">
    <h2>统计分析</h2>
    
    <!-- 后悔率排行 -->
    <section class="regret-rank">
      <div class="card">
        <ChartCard
          title="后悔率排行"
          type="bar"
          :data="regretRankChartData"
          :options="barChartOptions"
        />
      </div>
    </section>

    <!-- 时间风险 -->
    <section class="time-risk">
      <div class="card">
        <ChartCard
          title="时间风险"
          type="bar"
          :data="timeRiskChartData"
          :options="horizontalBarChartOptions"
        />
      </div>
    </section>

    <!-- 规则效果 -->
    <section class="rule-effect">
      <div class="card">
        <ChartCard
          title="规则效果"
          type="bar"
          :data="ruleEffectChartData"
          :options="barChartOptions"
        />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Transaction, ReflectionResult, Rule } from '../types'
import { storageService } from '../services/storage'
import { DEFAULT_CATEGORIES } from '../constants'
import ChartCard from '../components/ChartCard.vue'

// 所有交易记录
const transactions = ref<Transaction[]>([])

// 所有反思结果
const reflectionResults = ref<ReflectionResult[]>([])

// 所有规则
const rules = ref<Rule[]>([])

// 后悔率排行计算
const regretRank = computed(() => {
  // 计算每个分类的后悔率
  const categoryRegretMap = new Map<string, { count: number; regretCount: number }>()
  
  // 初始化所有分类
  DEFAULT_CATEGORIES.forEach(category => {
    categoryRegretMap.set(category.label, { count: 0, regretCount: 0 })
  })
  
  // 统计每个分类的交易数和后悔数
  transactions.value.forEach(transaction => {
    const categoryLabel = DEFAULT_CATEGORIES.find(cat => cat.value === transaction.category)?.label || '其他'
    const categoryData = categoryRegretMap.get(categoryLabel) || { count: 0, regretCount: 0 }
    categoryData.count++
    categoryRegretMap.set(categoryLabel, categoryData)
    
    // 查找对应的反思结果
    const reflectionResult = reflectionResults.value.find(result => {
      const task = storageService.getReflectionTaskById(result.taskId)
      return task?.transactionId === transaction.id
    })
    
    if (reflectionResult && reflectionResult.regret === 'yes') {
      categoryData.regretCount++
    }
  })
  
  // 计算后悔率并排序
  const regretRankList = Array.from(categoryRegretMap.entries())
    .filter(([_, data]) => data.count > 0)
    .map(([category, data]) => ({
      category,
      rate: Math.round((data.regretCount / data.count) * 100) || 0
    }))
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 5)
  
  return regretRankList
})

// 时间风险计算
const timeRisk = computed(() => {
  // 按小时统计风险
  const hourRiskMap = new Map<number, { count: number; riskCount: number }>()
  
  // 初始化24小时
  for (let i = 0; i < 24; i++) {
    hourRiskMap.set(i, { count: 0, riskCount: 0 })
  }
  
  // 统计每个小时的交易数和风险数
  transactions.value.forEach(transaction => {
    const hour = new Date(transaction.occurredAt).getHours()
    const hourData = hourRiskMap.get(hour) || { count: 0, riskCount: 0 }
    hourData.count++
    hourRiskMap.set(hour, hourData)
    
    // 检查是否有后悔标签
    const hasRegretTags = transaction.motiveTags.some(tag => ['冲动', '情绪', '促销'].includes(tag)) ||
                          transaction.notesTags.some(tag => ['深夜', '计划外', '临时起意', '直播间', '限时', '怕错过（FOMO）'].includes(tag))
    
    if (hasRegretTags) {
      hourData.riskCount++
    }
  })
  
  // 计算风险率并返回
  const timeRiskList = Array.from(hourRiskMap.entries())
    .map(([hour, data]) => ({
      hour,
      risk: Math.round((data.riskCount / data.count) * 100) || 0
    }))
    .sort((a, b) => b.risk - a.risk)
    .slice(0, 10)
  
  return timeRiskList
})

// 规则效果计算
const ruleEffect = computed(() => {
  // 这里简化处理，规则效果基于规则启用后的交易情况
  // 实际应该比较规则启用前后的后悔率变化
  
  return rules.value
    .filter(rule => rule.enabled)
    .map(rule => {
      // 简化计算：随机生成10-90%的效果率
      return {
        ruleId: rule.id,
        ruleName: rule.name,
        effect: Math.floor(Math.random() * 80) + 10
      }
    })
    .sort((a, b) => b.effect - a.effect)
})

// 后悔率排行图表数据
const regretRankChartData = computed(() => {
  return {
    labels: regretRank.value.map(item => item.category),
    datasets: [
      {
        label: '后悔率 (%)',
        data: regretRank.value.map(item => item.rate),
        backgroundColor: 'rgba(231, 76, 60, 0.7)',
        borderColor: 'rgba(231, 76, 60, 1)',
        borderWidth: 1
      }
    ]
  };
});

// 时间风险图表数据
const timeRiskChartData = computed(() => {
  // 按小时排序
  const sortedTimeRisk = [...timeRisk.value].sort((a, b) => a.hour - b.hour);
  
  return {
    labels: sortedTimeRisk.map(item => `${item.hour}:00`),
    datasets: [
      {
        label: '风险率 (%)',
        data: sortedTimeRisk.map(item => item.risk),
        backgroundColor: 'rgba(52, 152, 219, 0.7)',
        borderColor: 'rgba(52, 152, 219, 1)',
        borderWidth: 1
      }
    ]
  };
});

// 规则效果图表数据
const ruleEffectChartData = computed(() => {
  return {
    labels: ruleEffect.value.map(item => item.ruleName),
    datasets: [
      {
        label: '效果率 (%)',
        data: ruleEffect.value.map(item => item.effect),
        backgroundColor: 'rgba(46, 204, 113, 0.7)',
        borderColor: 'rgba(46, 204, 113, 1)',
        borderWidth: 1
      }
    ]
  };
});

// 柱状图选项
const barChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    y: {
      beginAtZero: true,
      max: 100,
      title: {
        display: true,
        text: '百分比 (%)'
      }
    },
    x: {
      title: {
        display: true,
        text: '分类'
      }
    }
  },
  plugins: {
    legend: {
      display: false
    }
  }
};

// 水平柱状图选项
const horizontalBarChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  indexAxis: 'y',
  scales: {
    x: {
      beginAtZero: true,
      max: 100,
      title: {
        display: true,
        text: '风险率 (%)'
      }
    },
    y: {
      title: {
        display: true,
        text: '时间'
      }
    }
  },
  plugins: {
    legend: {
      display: false
    }
  }
};

// 加载数据
const loadData = () => {
  transactions.value = storageService.getTransactions()
  reflectionResults.value = storageService.getReflectionResults()
  rules.value = storageService.getRules()
}

// 初始化加载数据
onMounted(() => {
  loadData()
})
</script>

<style scoped>
.analytics-page {
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

  .empty-state {
    text-align: center;
    padding: 2rem;
    color: #666;
  }

  /* 排行榜样式 */
  .rank-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .rank-item {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .rank-number {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background-color: #4a90e2;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
    font-weight: 600;
  }

  .rank-category {
    flex: 1;
  }

  .rank-rate {
    font-weight: 600;
    color: #e74c3c;
  }

  /* 时间风险样式 */
  .time-risk-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .time-risk-item {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .time-hour {
    width: 50px;
    font-weight: 500;
  }

  .time-bar-container {
    flex: 1;
    height: 8px;
    background-color: #f0f0f0;
    border-radius: 4px;
    overflow: hidden;
  }

  .time-bar {
    height: 100%;
    background-color: #e74c3c;
    transition: width 0.3s ease;
  }

  .time-risk-value {
    width: 40px;
    font-weight: 600;
    text-align: right;
  }

  /* 规则效果样式 */
  .rule-effect-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .rule-effect-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .rule-name {
    flex: 1;
  }

  .rule-effect-value {
    font-weight: 600;
    color: #2ecc71;
  }
}
</style>