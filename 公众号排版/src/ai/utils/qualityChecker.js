/**
 * 质量检测器 - MVP 版本（纯本地实现）
 * 不依赖 AI，使用规则引擎
 */
export class QualityChecker {
    /**
     * 标题党关键词库
     */
    static CLICKBAIT_KEYWORDS = {
        high: ['震惊', '惊呆', '惊爆', '吓傻', '哭晕', '跪了', '必看', '必转', '必存', '必备', '刚刚', '突发', '重磅', '紧急通知', '删前', '速看', '马上删'],
        medium: ['竟然', '居然', '意想不到', '不敢相信', '原来', '真相', '揭秘', '曝光', '终于', '总算'],
        low: ['竟然是', '居然是', '没想到', '谁料到']
    };

    /**
     * 夸张词汇
     */
    static EXAGGERATION_WORDS = ['史上最强', '天下第一', '绝无仅有', '空前绝后', '史上最', '世界第一', '顶级', '极致', '完美', '100%', '绝对', '一定'];

    /**
     * 检测标题党程度
     */
    static checkClickbait(title) {
        const matched = [];
        let score = 0;

        // 检测高强度词汇
        this.CLICKBAIT_KEYWORDS.high.forEach(word => {
            if (title.includes(word)) {
                matched.push({ word, level: 'high' });
                score += 30;
            }
        });

        // 检测中强度词汇
        this.CLICKBAIT_KEYWORDS.medium.forEach(word => {
            if (title.includes(word)) {
                matched.push({ word, level: 'medium' });
                score += 15;
            }
        });

        // 检测夸张词
        this.EXAGGERATION_WORDS.forEach(word => {
            if (title.includes(word)) {
                matched.push({ word, level: 'exaggeration' });
                score += 20;
            }
        });

        // 判定等级
        let level = 'low';
        if (score >= 50) level = 'high';
        else if (score >= 20) level = 'medium';

        return {
            level,
            score: Math.min(score, 100),
            matchedKeywords: matched,
            suggestion: this.getClickbaitSuggestion(level)
        };
    }

    /**
     * 获取标题党优化建议
     */
    static getClickbaitSuggestion(level) {
        if (level === 'high') {
            return '强烈建议删减"震惊"、"必看"等强烈标题党词汇';
        } else if (level === 'medium') {
            return '适当减少情绪化词汇，增加内容实质性描述';
        }
        return '标题正常，保持专业度';
    }

    /**
     * 检测标题长度
     */
    static checkLength(title) {
        const length = title.length;
        let status = 'optimal';
        let suggestion = '';

        if (length < 10) {
            status = 'short';
            suggestion = '标题偏短，建议扩充至15-25字';
        } else if (length > 27) {
            status = 'long';
            suggestion = '标题过长，建议精简至27字以内';
        }

        return {
            length,
            status,
            suggestion,
            isOptimal: status === 'optimal'
        };
    }

    /**
     * 检测标点符号
     */
    static checkPunctuation(title) {
        const exclamation = (title.match(/！/g) || []).length;
        const question = (title.match(/？/g) || []).length;
        const comma = (title.match(/，/g) || []).length;

        const issues = [];

        if (exclamation > 2) issues.push(`使用了${exclamation}个感叹号，建议控制在1个以内`);
        if (question > 1) issues.push('使用了多个问号，降低专业度');
        if (comma > 3) issues.push('逗号过多，建议简化');

        return {
            exclamation,
            question,
            comma,
            hasIssues: issues.length > 0,
            issues
        };
    }

    /**
     * 分析段落结构
     */
    static analyzeParagraphs(content) {
        // 移除 markdown 符号后分割段落
        const paragraphs = content
            .replace(/#{1,6}\s/g, '')
            .replace(/```[\s\S]*?```/g, '')
            .split(/\n\n+/)
            .map(p => p.trim())
            .filter(p => p.length > 0);

        const totalParagraphs = paragraphs.length;
        const lengths = paragraphs.map(p => p.length);
        const avgLength = lengths.reduce((a, b) => a + b, 0) / totalParagraphs;
        const longParagraphs = lengths.filter(l => l > 200).length;

        return {
            totalParagraphs,
            avgLength: Math.round(avgLength),
            longParagraphs,
            suggestion: longParagraphs > 0
                ? `发现${longParagraphs}个超长段落（>200字），建议拆分`
                : '段落结构合理'
        };
    }

    /**
     * 综合质量检测
     */
    static check(title, content = '') {
        const clickbaitCheck = this.checkClickbait(title);
        const lengthCheck = this.checkLength(title);
        const punctuationCheck = this.checkPunctuation(title);
        const paragraphCheck = content ? this.analyzeParagraphs(content) : null;

        // 计算总分
        let totalScore = 100;
        totalScore -= clickbaitCheck.score * 0.5; // 标题党扣分
        if (!lengthCheck.isOptimal) totalScore -= 10;
        if (punctuationCheck.hasIssues) totalScore -= 5;

        totalScore = Math.max(totalScore, 0);

        // 评级
        let grade = 'excellent';
        if (totalScore < 90) grade = 'good';
        if (totalScore < 70) grade = 'fair';
        if (totalScore < 50) grade = 'poor';

        return {
            totalScore: Math.round(totalScore),
            grade,
            checks: {
                clickbait: clickbaitCheck,
                length: lengthCheck,
                punctuation: punctuationCheck,
                paragraphs: paragraphCheck
            },
            summary: this.generateSummary(clickbaitCheck, lengthCheck, punctuationCheck)
        };
    }

    /**
     * 生成检测摘要
     */
    static generateSummary(clickbaitCheck, lengthCheck, punctuationCheck) {
        const issues = [];

        if (clickbaitCheck.level !== 'low') {
            issues.push(`标题${clickbaitCheck.level === 'high' ? '过于' : '略显'}标题党`);
        }

        if (!lengthCheck.isOptimal) {
            issues.push('标题长度不理想');
        }

        if (punctuationCheck.hasIssues) {
            issues.push('标点符号使用不当');
        }

        if (issues.length === 0) {
            return '标题质量良好，无明显问题';
        }

        return `发现${issues.length}个问题：${issues.join('、')}`;
    }
}

export const qualityChecker = QualityChecker;
