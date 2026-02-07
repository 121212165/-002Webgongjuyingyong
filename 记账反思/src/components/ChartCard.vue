<template>
  <div class="chart-card">
    <h3 class="chart-title">{{ title }}</h3>
    <div class="chart-container">
      <canvas ref="chartRef"></canvas>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted, PropType } from 'vue';
import {
  Chart,
  ChartConfiguration,
  ChartData,
  ChartOptions,
  ChartType
} from 'chart.js/auto';

// Props
const props = defineProps<{
  title: string;
  type: ChartType;
  data: ChartData;
  options?: ChartOptions;
}>();

// Refs
const chartRef = ref<HTMLCanvasElement | null>(null);
let chartInstance: Chart | null = null;

// 初始化图表
const initChart = () => {
  if (!chartRef.value) return;

  const ctx = chartRef.value.getContext('2d');
  if (!ctx) return;

  // 创建图表配置
  const config: ChartConfiguration = {
    type: props.type,
    data: props.data,
    options: props.options || {}
  };

  // 创建图表实例
  chartInstance = new Chart(ctx, config);
};

// 更新图表
const updateChart = () => {
  if (!chartInstance) return;

  chartInstance.data = props.data;
  chartInstance.update();
};

// 监听数据变化，更新图表
watch(
  () => props.data,
  () => {
    if (chartInstance) {
      updateChart();
    }
  },
  { deep: true }
);

// 监听类型变化，重新创建图表
watch(
  () => props.type,
  () => {
    if (chartInstance) {
      chartInstance.destroy();
      chartInstance = null;
    }
    initChart();
  }
);

// 组件挂载时初始化图表
onMounted(() => {
  initChart();
});

// 组件卸载时销毁图表
onUnmounted(() => {
  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }
});
</script>

<style scoped>
.chart-card {
  margin-bottom: 2rem;
}

.chart-title {
  margin-bottom: 1rem;
  font-size: 1.25rem;
  color: #333;
}

.chart-container {
  position: relative;
  height: 300px;
  background-color: #f9f9f9;
  border-radius: 8px;
  padding: 1rem;
}
</style>