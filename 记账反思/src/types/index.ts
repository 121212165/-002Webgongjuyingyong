// 用户类型
export interface User {
  id: string;
  username: string;
  email: string;
  password: string;
  createdAt: Date;
}

// 交易记录类型
export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  category: string;
  merchantText?: string;
  occurredAt: Date;
  motiveTags: string[];
  notesTags: string[];
  personalInput?: string;
  returnDeadlineAt?: Date;
}

// 反思任务类型
export interface ReflectionTask {
  id: string;
  userId: string;
  transactionId: string;
  type: 't1' | 't7'; // T+1 或 T+7
  status: 'pending' | 'completed' | 'snoozed' | 'skipped';
  dueAt: Date;
}

// 反思结果类型
export interface ReflectionResult {
  id: string;
  userId: string;
  taskId: string;
  worth: 'worth' | 'not_worth' | 'neutral';
  buyAgain: 'yes' | 'no' | 'maybe';
  usage: '0' | '1-2' | '3+';
  expectationGap: 'better' | 'worse' | 'same';
  regret: 'yes' | 'no';
  regretReason: string[];
  completedAt: Date;
  recommendedRules: string[];
}

// 规则条件类型 - 基础条件
export interface BaseCondition {
  type: string;
  operator?: string;
  value?: any;
  includes?: string[];
  range?: number[];
  days?: number;
  count?: number;
  regretRank?: string;
}

// 复合条件
export interface CompositeCondition {
  type: 'AND' | 'OR';
  conditions: (BaseCondition | CompositeCondition)[];
}

// 规则条件类型
export type RuleCondition = BaseCondition | CompositeCondition;

// 规则动作类型
export interface RuleAction {
  type: string;
  duration?: number;
  level?: string;
  delay?: number;
}

// 规则类型
export interface Rule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  type: string;
  conditions: RuleCondition[];
  actions: RuleAction[];
  threshold?: number;
}

// 分类类型
export interface Category {
  label: string;
  value: string;
}

// 设置类型
export interface Settings {
  userId: string;
  frequencyMode: 'daily' | 'smart' | 'manual';
  cooloffThreshold: number;
  takeoutLimit: number;
  takeoutAmountLimit: number;
  notifications: {
    reflection: boolean;
    returnDeadline: boolean;
    weeklyReport: boolean;
  };
}

// 统计数据类型
export interface RegretRankItem {
  category: string;
  rate: number;
}

export interface TimeRiskItem {
  hour: number;
  risk: number;
}

export interface RuleEffectItem {
  ruleId: string;
  ruleName: string;
  effect: number;
}

// 高后悔品类类型
export interface HighRegretCategory {
  category: string;
  subCategory?: string;
  reason?: string;
}

// 反思答案类型（用于提交反思结果）
export interface ReflectionAnswer {
  worth: 'worth' | 'not_worth' | 'neutral';
  buyAgain: 'yes' | 'no' | 'maybe';
  usage: '0' | '1-2' | '3+';
  expectationGap: 'better' | 'worse' | 'same';
  regret: 'yes' | 'no';
  regretReason: string[];
}

// 规则推荐映射类型
export interface RuleRecommendationMap {
  conditions: {
    worth?: 'worth' | 'not_worth' | 'neutral';
    buyAgain?: 'yes' | 'no' | 'maybe';
    usage?: '0' | '1-2' | '3+';
    expectationGap?: 'better' | 'worse' | 'same';
    regret?: 'yes' | 'no';
    motiveTags?: string[];
    notesTags?: string[];
  };
  recommendedRules: string[];
}