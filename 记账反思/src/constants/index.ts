// 默认分类列表
export const DEFAULT_CATEGORIES = [
  { label: '餐饮', value: 'food' },
  { label: '交通', value: 'transport' },
  { label: '日用', value: 'daily' },
  { label: '服饰美妆', value: 'clothing' },
  { label: '数码/配件', value: 'digital' },
  { label: '学习/课程', value: 'study' },
  { label: '娱乐', value: 'entertainment' },
  { label: '医疗健康', value: 'health' },
  { label: '人情社交', value: 'social' },
  { label: '家庭', value: 'family' },
  { label: '旅行', value: 'travel' },
  { label: '其他', value: 'other' }
];

// 动机标签列表
export const MOTIVE_TAGS = ['刚需', '冲动', '情绪', '促销', '社交', '提升效率', '奖励自己'];

// 便签标签列表 - 场景类
export const SCENE_TAGS = ['深夜', '发薪日', '通勤', '加班', '周末', '旅行中'];

// 便签标签列表 - 计划类
export const PLAN_TAGS = ['计划内', '计划外', '替代品已有', '临时起意'];

// 便签标签列表 - 渠道类
export const CHANNEL_TAGS = ['直播间', '拼团', '满减', '限时', '朋友推荐', '种草'];

// 便签标签列表 - 情境类
export const CONTEXT_TAGS = ['心情差', '奖励自己', '社交压力', '怕错过（FOMO）'];

// 默认高后悔品类
export const HIGH_REGRET_CATEGORIES = [
  { category: 'food', subCategory: '外卖/奶茶', reason: '餐饮' },
  { category: 'clothing', reason: '服饰美妆' },
  { category: 'digital', subCategory: '数码配件/小电器', reason: '数码/配件' },
  { category: 'study', subCategory: '课程/知识付费', reason: '学习/课程' },
  { category: 'entertainment', subCategory: '娱乐冲动消费', reason: '游戏充值/直播打赏等' },
  { category: 'daily', subCategory: '促销囤货', reason: '日用' }
];

// 预置规则库
export const DEFAULT_RULES = [
  {
    id: 'rule_1',
    name: '金额门槛冷静期',
    description: '单笔金额 ≥ 200 元时，触发 24h 冷静期',
    enabled: true,
    type: 'amount',
    conditions: [{ type: 'amount', operator: '>=', value: 200 }],
    actions: [{ type: 'cooloff', duration: 24 }],
    threshold: 200
  },
  {
    id: 'rule_2',
    name: '深夜下单风险',
    description: '22:00–02:00 且带有冲动/情绪/促销标签时，标红风险',
    enabled: true,
    type: 'time',
    conditions: [{ type: 'time', range: [22, 2] }, { type: 'tag', includes: ['冲动', '情绪', '促销'] }],
    actions: [{ type: 'risk_alert', level: 'high' }]
  },
  {
    id: 'rule_3',
    name: '同类 30 天不重复买',
    description: '30 天内同一品类已购买过，提示"你最近已买过"',
    enabled: false,
    type: 'repeat',
    conditions: [{ type: 'category', days: 30, count: 1 }],
    actions: [{ type: 'repeat_alert' }]
  },
  {
    id: 'rule_4',
    name: '促销场景默认冷静期',
    description: '带有满减/限时/直播间标签时，触发 12h 冷静期',
    enabled: true,
    type: 'promo',
    conditions: [{ type: 'tag', includes: ['满减', '限时', '直播间'] }],
    actions: [{ type: 'cooloff', duration: 12 }]
  },
  {
    id: 'rule_5',
    name: '高后悔品类强提醒',
    description: '购买高后悔品类时，优先进入"今日反思精选"',
    enabled: true,
    type: 'regret',
    conditions: [{ type: 'category', regretRank: 'top3' }],
    actions: [{ type: 'priority_reflection' }]
  },
  {
    id: 'rule_6',
    name: '课程/订阅二次确认',
    description: '学习/娱乐分类且单笔 ≥ 100 元时，T+7 强制出现"使用次数"问题',
    enabled: false,
    type: 'subscription',
    conditions: [{ type: 'category', includes: ['学习', '娱乐'] }, { type: 'amount', operator: '>=', value: 100 }],
    actions: [{ type: 'usage_check', delay: 7 }],
    threshold: 100
  },
  {
    id: 'rule_7',
    name: '外卖上限提醒',
    description: '本周外卖次数 ≥ X 或金额 ≥ Y 时，给出提示',
    enabled: true,
    type: 'budget',
    conditions: [{ type: 'category', includes: ['餐饮'] }, { type: 'weekly_limit', times: 5, amount: 500 }],
    actions: [{ type: 'budget_alert' }]
  },
  {
    id: 'rule_8',
    name: '购物清单优先',
    description: '购买意图未在清单时，提示"先加入清单 + 冷静期"',
    enabled: false,
    type: 'list',
    conditions: [{ type: 'not_in_list' }],
    actions: [{ type: 'list_prompt' }]
  }
];

// 反思答案→规则推荐映射
export const REFLECTION_RULE_MAPPING = [
  // T+1 触发规则
  {
    conditions: { worth: 'not_worth' },
    recommendedRules: ['rule_3', 'rule_1'] // 同类30天不重复买 + 金额门槛冷静期
  },
  {
    conditions: { buyAgain: 'no' },
    recommendedRules: ['rule_3', 'rule_1'] // 同类30天不重复买 + 金额门槛冷静期
  },
  {
    conditions: { motiveTags: ['促销'] },
    recommendedRules: ['rule_4'] // 促销场景默认冷静期
  },
  {
    conditions: { notesTags: ['满减', '限时', '直播间'] },
    recommendedRules: ['rule_4'] // 促销场景默认冷静期
  },
  {
    conditions: { motiveTags: ['情绪', '奖励自己'] },
    recommendedRules: ['rule_2'] // 情绪消费冷静期（使用深夜下单风险规则）
  },
  {
    conditions: { notesTags: ['深夜'] },
    recommendedRules: ['rule_2'] // 深夜下单风险
  },
  
  // T+7 触发规则
  {
    conditions: { usage: '0' },
    recommendedRules: ['rule_8', 'rule_6'] // 购买前清单优先 + 课程/订阅二次确认
  },
  {
    conditions: { expectationGap: 'worse' },
    recommendedRules: ['rule_8', 'rule_6'] // 购买前清单优先 + 课程/订阅二次确认
  },
  {
    conditions: { usage: '1-2', worth: 'neutral' },
    recommendedRules: ['rule_3'] // 同类30天不重复买
  }
];

// 本地存储键名
export const STORAGE_KEYS = {
  TRANSACTIONS: 'expense_reflection_transactions',
  REFLECTION_TASKS: 'expense_reflection_tasks',
  REFLECTION_RESULTS: 'expense_reflection_results',
  RULES: 'expense_reflection_rules',
  SETTINGS: 'expense_reflection_settings'
};