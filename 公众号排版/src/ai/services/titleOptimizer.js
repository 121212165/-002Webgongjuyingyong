/**
 * 标题优化服务 - MVP 版本
 * 调用 OpenAI API 生成优化建议
 */
import { apiKeyManager } from './apiKeyManager.js';

export class TitleOptimizer {
    constructor() {
        this.apiUrl = 'https://api.openai.com/v1/chat/completions';
        this.model = 'gpt-4o-mini';
    }

    /**
     * 优化标题（主入口）
     */
    async optimize(params) {
        const { title, content = '' } = params;

        // 验证输入
        if (!title || title.trim().length === 0) {
            throw new Error('标题不能为空');
        }

        // 检查 API Key
        const config = apiKeyManager.getApiKey();
        if (!config) {
            throw new Error('请先配置 OpenAI API Key');
        }

        // 构建 Prompt
        const prompt = this.buildPrompt(title, content);

        try {
            // 调用 OpenAI API
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.apiKey}`
                },
                body: JSON.stringify({
                    model: config.model || this.model,
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.7,
                    max_tokens: 1500
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error?.message || 'API 调用失败');
            }

            const data = await response.json();

            // 更新统计
            const tokens = data.usage?.total_tokens || 0;
            apiKeyManager.updateStats(tokens);

            // 解析结果
            return this.parseResponse(data, title);

        } catch (error) {
            console.error('Title optimization failed:', error);
            throw error;
        }
    }

    /**
     * 构建 Prompt
     */
    buildPrompt(title, content) {
        const contentHint = content
            ? `正文摘要：${content.substring(0, 200)}...`
            : '（未提供正文）';

        return `你是一位资深的微信公众号运营专家，擅长创作爆款标题。

【任务】
分析原标题，生成5个优化后的标题建议。

【原标题】
${title}

${contentHint}

【爆款标题特征】
公众号爆款标题通常具备以下特征：
1. 数字化：使用具体数字增加可信度（如"5个技巧"、"3年经验"）
2. 痛点切入：直击用户焦虑或需求（如"终于戒掉"、"不再迷茫"）
3. 利益承诺：明确价值获得（如"附清单"、"免费领"、"手把手"）
4. 好奇驱动：制造信息差（如"为什么..."、"这3个..."）
5. 权威背书：专家/大厂/知名案例（如"阿里专家"、"哈佛研究"）
6. 紧迫感：时间限制（如"今天必看"、"最后3天"）
7. 对比反差：前后对比（如"从月薪3K到30K"）
8. 情感共鸣：代入感强（如"工作3年"、"我终于"）
9. 负面警示：恐惧营销（如"千万别做"、"这3个坑"）
10. 清单式：工具化输出（如"附清单"、"模板可下载"）

【标题长度限制】
- 严格控制在27字以内（微信公众号推荐长度）
- 最佳长度：15-25字
- 避免过长导致在朋友圈被截断

【输出格式】
请严格按以下JSON格式输出，不要包含其他文字：

\`\`\`json
{
  "originalAnalysis": {
    "title": "原标题",
    "score": 0-100,
    "issues": ["问题1", "问题2"],
    "strengths": ["优点1", "优点2"]
  },
  "suggestions": [
    {
      "title": "优化标题1",
      "score": 0-100,
      "category": "分类",
      "reason": "为什么这个标题会有效"
    }
  ]
}
\`\`\`

【注意事项】
1. 输出必须是有效的JSON格式
2. 生成5个不同风格的标题
3. 每个标题必须属于不同类别
4. 评分要基于公众号爆款数据
5. reason要具体说明为什么有效
6. 避免过于标题党，保持专业度
7. 优先考虑SEO和可读性`;
    }

    /**
     * 解析 AI 响应
     */
    parseResponse(data, originalTitle) {
        try {
            const content = data.choices[0].message.content;

            // 提取 JSON（可能包含在 markdown 代码块中）
            const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/)
                || content.match(/\{[\s\S]*\}/);

            if (!jsonMatch) {
                throw new Error('AI 返回格式错误');
            }

            const result = JSON.parse(jsonMatch[1] || jsonMatch[0]);

            return {
                success: true,
                original: result.originalAnalysis,
                suggestions: result.suggestions,
                meta: {
                    model: data.model,
                    tokensUsed: data.usage?.total_tokens || 0
                }
            };
        } catch (error) {
            console.error('Failed to parse AI response:', error);
            throw new Error('解析 AI 响应失败');
        }
    }

    /**
     * 快速优化（只生成 3 个建议，减少 token 消耗）
     */
    async quickOptimize(title) {
        const result = await this.optimize({ title });
        result.suggestions = result.suggestions.slice(0, 3);
        return result;
    }
}

// 导出单例
export const titleOptimizer = new TitleOptimizer();
