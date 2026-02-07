import { ReflectionResult, Transaction } from '../types';
import { REFLECTION_RULE_MAPPING } from '../constants';
import { storageService } from './storage';

// 规则推荐服务类
export class RuleRecommendationService {
  constructor() {}

  // 根据反思结果推荐规则
  recommendRules(result: ReflectionResult): string[] {
    const recommendedRules = new Set<string>();
    
    // 获取对应的交易记录
    const task = storageService.getReflectionTaskById(result.taskId);
    if (!task) {
      return [];
    }
    
    const transaction = storageService.getTransactionById(task.transactionId);
    if (!transaction) {
      return [];
    }
    
    // 遍历映射规则
    REFLECTION_RULE_MAPPING.forEach(mapping => {
      const conditions = mapping.conditions;
      let match = true;
      
      // 检查所有条件是否满足
      for (const [key, value] of Object.entries(conditions)) {
        switch (key) {
          case 'worth':
            if (result.worth !== value) {
              match = false;
            }
            break;
          case 'buyAgain':
            if (result.buyAgain !== value) {
              match = false;
            }
            break;
          case 'usage':
            if (result.usage !== value) {
              match = false;
            }
            break;
          case 'expectationGap':
            if (result.expectationGap !== value) {
              match = false;
            }
            break;
          case 'regret':
            if (result.regret !== value) {
              match = false;
            }
            break;
          case 'motiveTags':
            if (Array.isArray(value)) {
              const hasMatchingTag = transaction.motiveTags.some(tag => value.includes(tag));
              if (!hasMatchingTag) {
                match = false;
              }
            }
            break;
          case 'notesTags':
            if (Array.isArray(value)) {
              const hasMatchingTag = transaction.notesTags.some(tag => value.includes(tag));
              if (!hasMatchingTag) {
                match = false;
              }
            }
            break;
          default:
            break;
        }
        
        if (!match) {
          break;
        }
      }
      
      // 如果所有条件都满足，添加推荐规则
      if (match) {
        mapping.recommendedRules.forEach(ruleId => {
          recommendedRules.add(ruleId);
        });
      }
    });
    
    return Array.from(recommendedRules);
  }

  // 获取推荐规则的详细信息
  getRecommendedRulesDetails(ruleIds: string[]) {
    const allRules = storageService.getRules();
    return allRules.filter(rule => ruleIds.includes(rule.id));
  }
}

// 导出单例实例
export const ruleRecommendationService = new RuleRecommendationService();