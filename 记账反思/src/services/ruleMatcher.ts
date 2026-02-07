import { Rule, RuleCondition, Transaction } from '../types';

// 规则匹配引擎服务类
export class RuleMatcherService {
  constructor() {}

  // 匹配单个基础条件
  private matchBaseCondition(condition: any, transaction: Transaction): boolean {
    switch (condition.type) {
      case 'amount':
        return this.matchAmountCondition(condition, transaction);
      case 'category':
        return this.matchCategoryCondition(condition, transaction);
      case 'tag':
        return this.matchTagCondition(condition, transaction);
      case 'time':
        return this.matchTimeCondition(condition, transaction);
      case 'weekly_limit':
        return this.matchWeeklyLimitCondition(condition, transaction);
      case 'not_in_list':
        return this.matchNotInListCondition(condition, transaction);
      default:
        return false;
    }
  }

  // 匹配金额条件
  private matchAmountCondition(condition: any, transaction: Transaction): boolean {
    if (!condition.operator || condition.value === undefined) {
      return false;
    }

    switch (condition.operator) {
      case '>':
        return transaction.amount > condition.value;
      case '>=':
        return transaction.amount >= condition.value;
      case '<':
        return transaction.amount < condition.value;
      case '<=':
        return transaction.amount <= condition.value;
      case '==':
        return transaction.amount === condition.value;
      default:
        return false;
    }
  }

  // 匹配分类条件
  private matchCategoryCondition(condition: any, transaction: Transaction): boolean {
    if (condition.includes) {
      return condition.includes.includes(transaction.category);
    }
    return transaction.category === condition.value;
  }

  // 匹配标签条件
  private matchTagCondition(condition: any, transaction: Transaction): boolean {
    if (!condition.includes || !Array.isArray(condition.includes)) {
      return false;
    }

    // 检查动机标签或便签标签中是否包含任何一个条件标签
    return transaction.motiveTags.some(tag => condition.includes.includes(tag)) ||
           transaction.notesTags.some(tag => condition.includes.includes(tag));
  }

  // 匹配时间条件
  private matchTimeCondition(condition: any, transaction: Transaction): boolean {
    if (!condition.range || condition.range.length !== 2) {
      return false;
    }

    const [startHour, endHour] = condition.range;
    const transactionHour = new Date(transaction.occurredAt).getHours();

    // 处理跨天的时间范围，例如22:00-02:00
    if (startHour > endHour) {
      return transactionHour >= startHour || transactionHour <= endHour;
    }

    return transactionHour >= startHour && transactionHour <= endHour;
  }

  // 匹配每周限制条件
  private matchWeeklyLimitCondition(condition: any, transaction: Transaction): boolean {
    // 这里简化处理，实际应该查询本周同一分类的交易记录
    // 目前返回false，表示不匹配
    return false;
  }

  // 匹配不在清单中的条件
  private matchNotInListCondition(condition: any, transaction: Transaction): boolean {
    // 这里简化处理，实际应该检查购物清单
    // 目前返回false，表示不匹配
    return false;
  }

  // 匹配规则条件
  private matchCondition(condition: RuleCondition, transaction: Transaction): boolean {
    // 处理复合条件
    if ('conditions' in condition) {
      if (condition.type === 'AND') {
        // 所有条件都必须匹配
        return condition.conditions.every(subCondition => 
          this.matchCondition(subCondition, transaction)
        );
      } else if (condition.type === 'OR') {
        // 至少一个条件匹配
        return condition.conditions.some(subCondition => 
          this.matchCondition(subCondition, transaction)
        );
      }
    }

    // 处理基础条件
    return this.matchBaseCondition(condition, transaction);
  }

  // 检查交易是否匹配规则
  matchRule(rule: Rule, transaction: Transaction): boolean {
    // 如果规则未启用，不匹配
    if (!rule.enabled) {
      return false;
    }

    // 检查所有条件是否匹配
    return rule.conditions.every(condition => 
      this.matchCondition(condition, transaction)
    );
  }

  // 检查交易是否匹配任何规则
  matchAnyRule(rules: Rule[], transaction: Transaction): Rule[] {
    return rules.filter(rule => this.matchRule(rule, transaction));
  }
}

// 导出单例实例
export const ruleMatcherService = new RuleMatcherService();