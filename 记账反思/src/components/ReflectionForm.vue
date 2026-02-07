<template>
  <div class="reflection-form">
    <h3>反思表单</h3>
    
    <form @submit.prevent="handleSubmit">
      <!-- 这笔消费值得吗？ -->
      <div class="form-group">
        <label class="form-label">1. 这笔消费值得吗？</label>
        <div class="radio-group">
          <label class="radio-item">
            <input type="radio" v-model="form.worth" value="worth" required />
            <span>值得</span>
          </label>
          <label class="radio-item">
            <input type="radio" v-model="form.worth" value="not_worth" required />
            <span>不值</span>
          </label>
          <label class="radio-item">
            <input type="radio" v-model="form.worth" value="neutral" required />
            <span>一般</span>
          </label>
        </div>
      </div>

      <!-- 你还会再次购买吗？ -->
      <div class="form-group">
        <label class="form-label">2. 你还会再次购买吗？</label>
        <div class="radio-group">
          <label class="radio-item">
            <input type="radio" v-model="form.buyAgain" value="yes" required />
            <span>会</span>
          </label>
          <label class="radio-item">
            <input type="radio" v-model="form.buyAgain" value="no" required />
            <span>不会</span>
          </label>
          <label class="radio-item">
            <input type="radio" v-model="form.buyAgain" value="maybe" required />
            <span>不确定</span>
          </label>
        </div>
      </div>

      <!-- 你使用了多少次？ -->
      <div class="form-group">
        <label class="form-label">3. 你使用了多少次？</label>
        <div class="radio-group">
          <label class="radio-item">
            <input type="radio" v-model="form.usage" value="0" required />
            <span>0次</span>
          </label>
          <label class="radio-item">
            <input type="radio" v-model="form.usage" value="1-2" required />
            <span>1-2次</span>
          </label>
          <label class="radio-item">
            <input type="radio" v-model="form.usage" value="3+" required />
            <span>3次以上</span>
          </label>
        </div>
      </div>

      <!-- 实际使用体验与预期差距？ -->
      <div class="form-group">
        <label class="form-label">4. 实际使用体验与预期差距？</label>
        <div class="radio-group">
          <label class="radio-item">
            <input type="radio" v-model="form.expectationGap" value="better" required />
            <span>超出预期</span>
          </label>
          <label class="radio-item">
            <input type="radio" v-model="form.expectationGap" value="worse" required />
            <span>低于预期</span>
          </label>
          <label class="radio-item">
            <input type="radio" v-model="form.expectationGap" value="same" required />
            <span>符合预期</span>
          </label>
        </div>
      </div>

      <!-- 你后悔购买吗？ -->
      <div class="form-group">
        <label class="form-label">5. 你后悔购买吗？</label>
        <div class="radio-group">
          <label class="radio-item">
            <input type="radio" v-model="form.regret" value="yes" required />
            <span>是的</span>
          </label>
          <label class="radio-item">
            <input type="radio" v-model="form.regret" value="no" required />
            <span>不后悔</span>
          </label>
        </div>
      </div>

      <!-- 后悔原因（多选） -->
      <div class="form-group" v-if="form.regret === 'yes'">
        <label class="form-label">6. 后悔原因（可多选）</label>
        <div class="checkbox-group">
          <label class="checkbox-item" v-for="reason in regretReasons" :key="reason">
            <input type="checkbox" v-model="form.regretReason" :value="reason" />
            <span>{{ reason }}</span>
          </label>
        </div>
      </div>

      <!-- 提交按钮 -->
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" @click="$emit('cancel')">
          取消
        </button>
        <button type="submit" class="btn btn-primary">
          提交反思
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue';
import { ReflectionAnswer } from '../types';

// Props
const props = defineProps<{
  taskId: string;
}>();

// Emits
const emit = defineEmits<{
  (e: 'submit', formData: ReflectionAnswer): void;
  (e: 'cancel'): void;
}>();

// 后悔原因选项
const regretReasons = [
  '促销冲动',
  '重复购买',
  '不需要',
  '性价比低',
  '质量问题',
  '冲动消费',
  '被误导',
  '其他'
];

// 表单数据
const form = reactive<ReflectionAnswer>({
  worth: 'neutral',
  buyAgain: 'maybe',
  usage: '0',
  expectationGap: 'same',
  regret: 'no',
  regretReason: []
});

// 提交表单
const handleSubmit = () => {
  emit('submit', form);
};
</script>

<style scoped>
.reflection-form {
  padding: 1rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-label {
  display: block;
  margin-bottom: 0.75rem;
  font-weight: 500;
  color: #555;
}

.radio-group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.radio-item,
.checkbox-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 6px;
  transition: background-color 0.2s;
}

.radio-item:hover,
.checkbox-item:hover {
  background-color: #f0f0f0;
}

.form-actions {
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
}

.btn {
  flex: 1;
}
</style>