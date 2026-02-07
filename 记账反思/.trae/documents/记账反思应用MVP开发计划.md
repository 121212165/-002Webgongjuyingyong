# 记账反思应用MVP开发计划

## 1. 项目初始化
- 技术栈：Vue 3 + TypeScript + Vite
- 路由：Vue Router
- 状态管理：Pinia
- UI组件：自定义组件（保持简洁）
- 本地存储：LocalStorage（用于模拟数据持久化）

## 2. 核心数据模型设计

### 2.1 交易记录(Transaction)
```typescript
interface Transaction {
  id: string;
  amount: number;
  category: string;
  merchantText?: string;
  occurredAt: Date;
  motiveTags: string[];
  notesTags: string[];
  personalInput?: string;
  returnDeadlineAt?: Date;
}
```

### 2.2 反思任务(ReflectionTask)
```typescript
interface ReflectionTask {
  id: string;
  transactionId: string;
  type: 't1' | 't7'; // T+1 或 T+7
  status: 'pending' | 'completed' | 'snoozed' | 'skipped';
  dueAt: Date;
}
```

### 2.3 反思结果(ReflectionResult)
```typescript
interface ReflectionResult {
  id: string;
  taskId: string;
  worth: 'worth' | 'not_worth' | 'neutral';
  buyAgain: 'yes' | 'no' | 'maybe';
  usage: string; // '0', '1-2', '3+'
  expectationGap: 'better' | 'worse' | 'same';
  regret: 'yes' | 'no';
  regretReason: string[];
  completedAt: Date;
  recommendedRules: string[];
}
```

### 2.4 规则(Rule)
```typescript
interface Rule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  type: string;
  conditions: any[];
  actions: any[];
  threshold?: number;
}
```

## 3. 页面开发顺序

### 3.1 记账页(/add)
- 金额输入（必填）
- 分类选择（必填，默认推荐）
- 商家输入（可选）
- 动机标签选择（可选，点选）
- 高级选项（收起）：
  - 个人输入（最多60字）
  - 便签标签选择（场景类、计划类、渠道类、情境类）
  - 退货期限（默认按品类）
- 保存后提示："已生成 T+1 反思（10秒）"

### 3.2 反思收件箱(/inbox)
- 卡片流展示待处理的反思任务
- 每个卡片包含交易信息和反思问题
- 支持：完成、稍后、跳过操作
- 完成后展示规则推荐

### 3.3 规则列表(/rules)
- 展示8条预置规则
- 支持启用/停用规则
- 显示规则描述和效果

### 3.4 首页Dashboard(/)
- 今日精选反思卡
- 退货倒计时
- 本周概览（支出、反思完成情况）

### 3.5 统计页(/analytics)
- 后悔率排行
- 深夜消费占比
- 规则效果分析

### 3.6 设置页(/settings)
- 频率模式选择
- 阈值设置
- 通知订阅管理

## 4. 核心功能实现

### 4.1 记账功能
- 表单验证
- 自动生成T+1/T+7反思任务
- 退货期限自动计算（根据分类）

### 4.2 反思任务管理
- 任务状态机（pending → completed/snoozed/skipped）
- 任务生成逻辑（T+1和T+7）
- 任务筛选和排序

### 4.3 规则引擎
- 规则匹配逻辑
- 规则启用/停用管理
- 反思答案→规则推荐映射

### 4.4 退货提醒
- 退货期限倒计时
- 到期前提醒（D-3/D-1）

### 4.5 统计分析
- 后悔率计算
- 消费趋势分析
- 规则效果评估

## 5. API设计（模拟）

### 5.1 交易相关
- `POST /api/transactions` - 创建交易
- `GET /api/transactions` - 获取交易列表
- `PATCH /api/transactions/:id` - 更新交易

### 5.2 反思任务相关
- `GET /api/reflection_tasks/today` - 获取今日精选任务
- `GET /api/reflection_tasks` - 获取反思任务列表
- `POST /api/reflection_tasks/:id/complete` - 完成反思任务
- `POST /api/reflection_tasks/:id/snooze` - 稍后处理
- `POST /api/reflection_tasks/:id/skip` - 跳过任务

### 5.3 规则相关
- `GET /api/rules` - 获取规则列表
- `POST /api/rules/enable/:id` - 启用规则
- `POST /api/rules/disable/:id` - 停用规则

### 5.4 统计相关
- `GET /api/analytics/regret_rank` - 获取后悔率排行
- `GET /api/analytics/time_risk` - 获取时间段风险
- `GET /api/analytics/rule_effect` - 获取规则效果

## 6. 开发步骤

1. **项目初始化** - 创建Vue 3 + TypeScript + Vite项目
2. **路由配置** - 配置6个核心页面路由
3. **数据模型定义** - 实现核心数据模型
4. **记账页开发** - 实现记账功能和表单
5. **反思任务生成** - 实现T+1/T+7任务生成逻辑
6. **反思收件箱开发** - 实现任务处理功能
7. **规则模板实现** - 实现8条预置规则
8. **首页Dashboard开发** - 实现今日精选和概览
9. **退货提醒功能** - 实现退货期限管理和提醒
10. **统计页开发** - 实现基本统计功能
11. **设置页开发** - 实现应用设置功能
12. **规则推荐映射** - 实现反思答案到规则的映射
13. **测试和优化** - 确保功能正常运行，优化用户体验

## 7. 关键特性实现

### 7.1 默认分类与高后悔品类
- 12个默认分类
- 6个高后悔品类（用于优先级加分）

### 7.2 标签体系
- 动机标签：刚需/冲动/情绪/促销/社交/提升效率/奖励自己
- 便签标签：场景类、计划类、渠道类、情境类

### 7.3 预置规则库
- 8条规则模板，支持一键启用

### 7.4 反思答案→规则推荐映射
- T+1触发规则
- T+7触发规则
- 退货提醒触发规则

### 7.5 频率控制
- 默认每日1条通知
- 用户跳过/忽略后自动降频7天

## 8. 本地存储设计

- `transactions` - 存储所有交易记录
- `reflectionTasks` - 存储所有反思任务
- `reflectionResults` - 存储所有反思结果
- `rules` - 存储所有规则（包括启用状态）
- `settings` - 存储应用设置
- `statistics` - 存储统计数据

这个计划将按照用户建议的开发顺序，先实现核心功能，再逐步完善其他特性，确保MVP能够跑通闭环。