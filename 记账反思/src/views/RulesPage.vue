<template>
  <div class="rules-page">
    <h2>规则管理</h2>
    
    <div class="rules-list">
      <div
        v-for="rule in rules"
        :key="rule.id"
        class="card rule-item"
      >
        <div class="rule-header">
          <div class="rule-info">
            <h3 class="rule-name">{{ rule.name }}</h3>
            <p class="rule-description">{{ rule.description }}</p>
          </div>
          <div class="rule-toggle">
            <input
              type="checkbox"
              :id="`rule-${rule.id}`"
              :checked="rule.enabled"
              @change="toggleRule(rule)"
            />
            <label :for="`rule-${rule.id}`">{{ rule.enabled ? '启用' : '禁用' }}</label>
          </div>
        </div>
        
        <div class="rule-details">
          <p class="rule-type">类型：{{ rule.type }}</p>
          <p class="rule-threshold" v-if="rule.threshold">
            阈值：{{ rule.threshold }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Rule } from '../types'
import { storageService } from '../services/storage'

// 规则列表
const rules = ref<Rule[]>([])

// 加载规则
const loadRules = () => {
  rules.value = storageService.getRules()
}

// 切换规则启用状态
const toggleRule = (rule: Rule) => {
  const success = storageService.toggleRuleEnabled(rule.id)
  if (success) {
    rule.enabled = !rule.enabled
    console.log('切换规则状态:', rule)
  } else {
    alert('切换规则状态失败')
  }
}

// 初始化加载规则
onMounted(() => {
  loadRules()
})
</script>

<style scoped>
.rules-page {
  h2 {
    margin-bottom: 1.5rem;
    color: #333;
  }

  .rules-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .rule-item {
    transition: transform 0.2s, box-shadow 0.2s;
  }

  .rule-item:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }

  .rule-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1rem;
  }

  .rule-info {
    flex: 1;
  }

  .rule-name {
    margin: 0 0 0.5rem 0;
    font-size: 1.125rem;
  }

  .rule-description {
    margin: 0;
    color: #666;
    font-size: 0.875rem;
  }

  .rule-toggle {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .rule-details {
    padding-top: 1rem;
    border-top: 1px solid #e0e0e0;
    font-size: 0.875rem;
    color: #666;
  }

  .rule-type {
    margin-bottom: 0.25rem;
  }
}
</style>