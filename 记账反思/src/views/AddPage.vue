<template>
  <div class="add-page">
    <h2>记一笔</h2>
    
    <form @submit.prevent="handleSubmit">
      <!-- 金额输入 -->
      <div class="form-group">
        <input
          type="number"
          v-model.number="form.amount"
          placeholder="请输入金额"
          class="amount-input"
          required
        />
      </div>

      <!-- 分类选择 -->
      <div class="form-group">
        <label class="form-label">分类</label>
        <div class="category-grid">
          <div
            v-for="category in categories"
            :key="category.value"
            class="category-item"
            :class="{ selected: form.category === category.value }"
            @click="form.category = category.value"
          >
            {{ category.label }}
          </div>
        </div>
      </div>

      <!-- 商家输入 -->
      <div class="form-group">
        <label class="form-label">商家（可选）</label>
        <input
          type="text"
          v-model="form.merchantText"
          placeholder="请输入商家名称"
          class="form-control"
        />
      </div>

      <!-- 动机标签 -->
      <div class="form-group">
        <label class="form-label">动机标签（可选）</label>
        <div class="tags-container">
          <span
            v-for="tag in motiveTags"
            :key="tag"
            class="tag"
            :class="{ selected: form.motiveTags.includes(tag) }"
            @click="toggleTag(tag, 'motiveTags')"
          >
            {{ tag }}
          </span>
        </div>
      </div>

      <!-- 高级选项 -->
      <div class="advanced-section">
        <div class="collapsible-header" @click="isAdvancedOpen = !isAdvancedOpen">
          <span>高级选项</span>
          <span>{{ isAdvancedOpen ? '▼' : '▶' }}</span>
        </div>
        
        <div v-if="isAdvancedOpen" class="collapsible-content">
          <!-- 个人输入 -->
          <div class="form-group">
            <label class="form-label">个人输入（最多60字）</label>
            <textarea
              v-model="form.personalInput"
              placeholder="当时为什么买？一句话就行"
              class="form-control"
              rows="3"
              maxlength="60"
            ></textarea>
            <div class="char-count">{{ form.personalInput.length }}/60</div>
          </div>

          <!-- 便签标签 -->
          <div class="form-group">
            <label class="form-label">便签标签（多选）</label>
            
            <h4>场景类</h4>
            <div class="tags-container">
              <span
                v-for="tag in sceneTags"
                :key="tag"
                class="tag"
                :class="{ selected: form.notesTags.includes(tag) }"
                @click="toggleTag(tag, 'notesTags')"
              >
                {{ tag }}
              </span>
            </div>

            <h4>计划类</h4>
            <div class="tags-container">
              <span
                v-for="tag in planTags"
                :key="tag"
                class="tag"
                :class="{ selected: form.notesTags.includes(tag) }"
                @click="toggleTag(tag, 'notesTags')"
              >
                {{ tag }}
              </span>
            </div>

            <h4>渠道类</h4>
            <div class="tags-container">
              <span
                v-for="tag in channelTags"
                :key="tag"
                class="tag"
                :class="{ selected: form.notesTags.includes(tag) }"
                @click="toggleTag(tag, 'notesTags')"
              >
                {{ tag }}
              </span>
            </div>

            <h4>情境类</h4>
            <div class="tags-container">
              <span
                v-for="tag in contextTags"
                :key="tag"
                class="tag"
                :class="{ selected: form.notesTags.includes(tag) }"
                @click="toggleTag(tag, 'notesTags')"
              >
                {{ tag }}
              </span>
            </div>
          </div>

          <!-- 退货期限 -->
          <div class="form-group">
            <label class="form-label">退货期限</label>
            <input
              type="date"
              v-model="form.returnDeadline"
              class="form-control"
            />
          </div>
        </div>
      </div>

      <!-- 提交按钮 -->
      <div class="form-actions">
        <button type="submit" class="btn btn-primary" style="width: 100%;">
          保存
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { Transaction } from '../types'
import { storageService } from '../services/storage'
import { taskGeneratorService } from '../services/taskGenerator'
import { ruleMatcherService } from '../services/ruleMatcher'
import { DEFAULT_CATEGORIES, MOTIVE_TAGS, SCENE_TAGS, PLAN_TAGS, CHANNEL_TAGS, CONTEXT_TAGS } from '../constants'

// 表单数据
const form = reactive({
  amount: 0,
  category: '',
  merchantText: '',
  motiveTags: [] as string[],
  notesTags: [] as string[],
  personalInput: '',
  returnDeadline: ''
})

// 分类列表
const categories = DEFAULT_CATEGORIES

// 动机标签
const motiveTags = MOTIVE_TAGS

// 便签标签
const sceneTags = SCENE_TAGS
const planTags = PLAN_TAGS
const channelTags = CHANNEL_TAGS
const contextTags = CONTEXT_TAGS

// 高级选项展开状态
const isAdvancedOpen = ref(false)

// 切换标签
const toggleTag = (tag: string, field: 'motiveTags' | 'notesTags') => {
  const index = form[field].indexOf(tag)
  if (index > -1) {
    form[field].splice(index, 1)
  } else {
    form[field].push(tag)
  }
}

// 表单提交
const handleSubmit = () => {
  // 表单验证
  if (!form.amount || form.amount <= 0) {
    alert('请输入有效的金额')
    return
  }
  
  if (!form.category) {
    alert('请选择分类')
    return
  }
  
  // 创建交易记录
  const transaction: Omit<Transaction, 'id'> = {
    amount: form.amount,
    category: form.category,
    merchantText: form.merchantText,
    occurredAt: new Date(),
    motiveTags: form.motiveTags,
    notesTags: form.notesTags,
    personalInput: form.personalInput,
    returnDeadlineAt: form.returnDeadline ? new Date(form.returnDeadline) : undefined
  }
  
  // 保存交易记录
  const savedTransaction = storageService.createTransaction(transaction)
  
  // 匹配规则
  const rules = storageService.getRules()
  const matchedRules = ruleMatcherService.matchAnyRule(rules, savedTransaction)
  
  // 生成反思任务
  taskGeneratorService.generateTasksForTransaction(savedTransaction)
  
  // 显示成功提示和匹配的规则
  let message = '已生成 T+1 反思（10秒）'
  
  if (matchedRules.length > 0) {
    const ruleNames = matchedRules.map(rule => rule.name).join('、')
    message += `\n\n匹配到以下规则：\n${ruleNames}`
  }
  
  // 显示提示
  alert(message)
  
  // 重置表单
  form.amount = 0
  form.category = ''
  form.merchantText = ''
  form.motiveTags = []
  form.notesTags = []
  form.personalInput = ''
  form.returnDeadline = ''
}
</script>

<style scoped>
.add-page {
  h2 {
    margin-bottom: 1.5rem;
    color: #333;
  }

  h4 {
    font-size: 0.875rem;
    margin: 1rem 0 0.5rem;
    color: #666;
  }

  .form-actions {
    margin-top: 2rem;
  }

  .char-count {
    text-align: right;
    font-size: 0.875rem;
    color: #999;
    margin-top: 0.25rem;
  }
}
</style>