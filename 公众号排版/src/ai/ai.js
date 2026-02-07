/**
 * AI 功能主入口 - MVP 版本
 * 统一管理所有 AI 相关功能
 */
import { titleOptimizer } from './services/titleOptimizer.js';
import { qualityChecker } from './utils/qualityChecker.js';
import { apiKeyManager } from './services/apiKeyManager.js';

export class AIFeature {
    constructor() {
        this.isPanelOpen = false;
        this.isProcessing = false;
    }

    /**
     * 打开 AI 面板
     */
    openPanel() {
        this.isPanelOpen = true;
        const panel = document.getElementById('aiPanel');
        if (panel) panel.classList.add('open');
    }

    /**
     * 关闭 AI 面板
     */
    closePanel() {
        this.isPanelOpen = false;
        const panel = document.getElementById('aiPanel');
        if (panel) panel.classList.remove('open');
    }

    /**
     * 检查配置状态
     */
    checkConfig() {
        return {
            isConfigured: apiKeyManager.isConfigured(),
            stats: apiKeyManager.getStats()
        };
    }

    /**
     * 优化标题
     */
    async optimizeTitle(title, content = '') {
        if (this.isProcessing) {
            throw new Error('正在处理中，请稍候...');
        }

        this.isProcessing = true;
        this.showLoading();

        try {
            const result = await titleOptimizer.optimize({ title, content });
            this.showResults(result);
            return result;
        } catch (error) {
            this.showError(error.message);
            throw error;
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * 质量检测（本地）
     */
    checkQuality(title, content = '') {
        const result = qualityChecker.check(title, content);
        this.showQualityReport(result);
        return result;
    }

    /**
     * 显示加载状态
     */
    showLoading() {
        const container = document.getElementById('aiResults');
        if (container) {
            container.innerHTML = `
                <div class="ai-loading">
                    <div class="spinner"></div>
                    <p>AI 正在分析标题...</p>
                    <p class="secondary">预计需要 3-5 秒</p>
                </div>
            `;
        }
    }

    /**
     * 显示优化结果
     */
    showResults(result) {
        const container = document.getElementById('aiResults');
        if (!container) return;

        const { original, suggestions } = result;

        container.innerHTML = `
            <div class="ai-results">
                <!-- 原标题分析 -->
                <div class="result-section original-title">
                    <h3>原标题分析</h3>
                    <div class="title-display">${original.title}</div>
                    <div class="score-badge score-${this.getScoreClass(original.score)}">
                        ${original.score}分
                    </div>
                    ${original.issues.length > 0 ? `
                        <div class="issues-list">
                            ${original.issues.map(issue => `<p>• ${issue}</p>`).join('')}
                        </div>
                    ` : ''}
                </div>

                <!-- AI 优化建议 -->
                <div class="result-section suggestions">
                    <h3>AI 优化建议</h3>
                    ${suggestions.map((s, index) => `
                        <div class="suggestion-card ${index === 0 ? 'featured' : ''}">
                            <div class="suggestion-header">
                                <span class="score">${s.score}分</span>
                                <span class="category">${s.category}</span>
                            </div>
                            <div class="suggestion-title">${s.title}</div>
                            <div class="suggestion-reason">${s.reason}</div>
                            <div class="suggestion-actions">
                                <button class="btn primary" onclick="AI.applyTitle('${s.title.replace(/'/g, "\\'")}')">
                                    ✨ 应用
                                </button>
                                <button class="btn secondary" onclick="AI.copyToClipboard('${s.title.replace(/'/g, "\\'")}')">
                                    📋 复制
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    /**
     * 显示质量报告
     */
    showQualityReport(result) {
        const container = document.getElementById('aiResults');
        if (!container) return;

        const { totalScore, grade, checks, summary } = result;

        container.innerHTML = `
            <div class="ai-results">
                <div class="result-section quality-report">
                    <h3>📊 质量检测报告</h3>
                    <div class="overall-score">
                        <div class="score-circle grade-${grade}">
                            <span class="score-value">${totalScore}</span>
                            <span class="score-label">${this.getGradeLabel(grade)}</span>
                        </div>
                    </div>
                    <p class="summary">${summary}</p>

                    <!-- 标题党检测 -->
                    <div class="check-item clickbait">
                        <h4>标题党检测</h4>
                        <p>等级：<strong>${checks.clickbait.level}</strong> (${checks.clickbait.score}分)</p>
                        <p class="suggestion">${checks.clickbait.suggestion}</p>
                        ${checks.clickbait.matchedKeywords.length > 0 ? `
                            <div class="matched-words">
                                检测到：${checks.clickbait.matchedKeywords.map(k => k.word).join('、')}
                            </div>
                        ` : ''}
                    </div>

                    <!-- 标题长度 -->
                    <div class="check-item length">
                        <h4>标题长度</h4>
                        <p>当前长度：${checks.length.length}字</p>
                        <p>状态：<strong>${this.getStatusLabel(checks.length.status)}</strong></p>
                        ${checks.length.suggestion ? `<p class="suggestion">${checks.length.suggestion}</p>` : ''}
                    </div>

                    ${checks.punctuation ? `
                        <!-- 标点符号 -->
                        <div class="check-item punctuation">
                            <h4>标点符号</h4>
                            <p>感叹号：${checks.punctuation.exclamation}个，问号：${checks.punctuation.question}个</p>
                            ${checks.punctuation.hasIssues ? `
                                <p class="suggestion">${checks.punctuation.issues.join('；')}</p>
                            ` : '<p class="ok">✓ 使用正常</p>'}
                        </div>
                    ` : ''}

                    ${checks.paragraphs ? `
                        <!-- 段落结构 -->
                        <div class="check-item paragraphs">
                            <h4>段落结构</h4>
                            <p>总段落数：${checks.paragraphs.totalParagraphs}</p>
                            <p>平均长度：${checks.paragraphs.avgLength}字</p>
                            ${checks.paragraphs.longParagraphs > 0 ? `
                                <p class="warning">⚠️ ${checks.paragraphs.suggestion}</p>
                            ` : '<p class="ok">✓ 结构合理</p>'}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    /**
     * 显示错误
     */
    showError(message) {
        const container = document.getElementById('aiResults');
        if (!container) return;

        container.innerHTML = `
            <div class="ai-error">
                <div class="error-icon">⚠️</div>
                <h3>出错了</h3>
                <p>${message}</p>
                <div class="error-actions">
                    <button class="btn secondary" onclick="AI.showConfig()">配置 API Key</button>
                    <button class="btn secondary" onclick="AI.closePanel()">关闭</button>
                </div>
            </div>
        `;
    }

    /**
     * 显示配置界面
     */
    showConfig() {
        const config = apiKeyManager.getApiKey();
        const container = document.getElementById('aiResults');
        if (!container) return;

        container.innerHTML = `
            <div class="ai-config">
                <h3>⚙️ API Key 配置</h3>
                <p class="hint">您的 API Key 将加密存储在本地浏览器中，不会上传到任何服务器。</p>

                <div class="config-form">
                    <div class="form-group">
                        <label>API Key</label>
                        <div class="input-group">
                            <input
                                type="password"
                                id="apiKeyInput"
                                placeholder="sk-..."
                                value="${config ? '••••••••••••••••••••••••••••••••' : ''}"
                            >
                            <button id="toggleKeyBtn" class="icon-btn">👁️</button>
                        </div>
                        <p class="hint">OpenAI API Key 格式：sk-开头，共 51 个字符</p>
                    </div>

                    ${config ? `
                        <div class="config-stats">
                            <p>✅ 已配置</p>
                            <p>模型：${config.model}</p>
                            <p>总调用：${apiKeyManager.getStats().totalCalls} 次</p>
                        </div>
                        <div class="form-actions">
                            <button class="btn primary" onclick="AI.testKey()">验证 Key</button>
                            <button class="btn secondary" onclick="AI.deleteKey()">删除</button>
                        </div>
                    ` : `
                        <div class="form-actions">
                            <button class="btn primary" onclick="AI.saveKey()">保存配置</button>
                        </div>
                        <p class="help-link">
                            <a href="https://platform.openai.com/api-keys" target="_blank">
                                如何获取 OpenAI API Key？
                            </a>
                        </p>
                    `}
                </div>
            </div>
        `;

        // 绑定事件
        if (!config) {
            const saveBtn = container.querySelector('button[onclick="AI.saveKey()"]');
            if (saveBtn) {
                saveBtn.onclick = () => {
                    const key = document.getElementById('apiKeyInput').value;
                    this.saveKey(key);
                };
            }
        }

        const toggleBtn = document.getElementById('toggleKeyBtn');
        if (toggleBtn) {
            toggleBtn.onclick = () => this.toggleKeyVisibility();
        }
    }

    /**
     * 保存 API Key
     */
    async saveKey() {
        const input = document.getElementById('apiKeyInput');
        const key = input.value.trim();

        if (!key) {
            alert('请输入 API Key');
            return;
        }

        if (!apiKeyManager.validateKeyFormat(key)) {
            alert('API Key 格式不正确，应该是 sk- 开头的 51 个字符');
            return;
        }

        apiKeyManager.saveApiKey(key);
        alert('配置已保存！');
        this.showConfig();
    }

    /**
     * 删除 API Key
     */
    deleteKey() {
        if (confirm('确定要删除 API Key 配置吗？')) {
            apiKeyManager.deleteApiKey();
            alert('已删除配置');
            this.showConfig();
        }
    }

    /**
     * 切换 Key 显示/隐藏
     */
    toggleKeyVisibility() {
        const input = document.getElementById('apiKeyInput');
        const btn = document.getElementById('toggleKeyBtn');

        if (input.type === 'password') {
            input.type = 'text';
            btn.textContent = '🙈';
        } else {
            input.type = 'password';
            btn.textContent = '👁️';
        }
    }

    /**
     * 测试 API Key
     */
    async testKey() {
        alert('功能开发中，敬请期待...');
    }

    /**
     * 应用标题
     */
    applyTitle(title) {
        const titleInput = document.getElementById('articleTitle');
        if (titleInput) {
            titleInput.value = title;
            // 触发输入事件以保存
            titleInput.dispatchEvent(new Event('input'));
        }
        alert('✅ 标题已应用！');
    }

    /**
     * 复制到剪贴板
     */
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            alert('📋 已复制到剪贴板');
        } catch (err) {
            alert('复制失败，请手动复制');
        }
    }

    /**
     * 辅助方法：获取评分等级
     */
    getScoreClass(score) {
        if (score >= 80) return 'excellent';
        if (score >= 60) return 'good';
        return 'fair';
    }

    /**
     * 辅助方法：获取等级标签
     */
    getGradeLabel(grade) {
        const labels = {
            excellent: '优秀',
            good: '良好',
            fair: '一般',
            poor: '较差'
        };
        return labels[grade] || '未知';
    }

    /**
     * 辅助方法：获取状态标签
     */
    getStatusLabel(status) {
        const labels = {
            short: '过短',
            optimal: '最佳',
            long: '过长'
        };
        return labels[status] || status;
    }
}

// 导出全局实例
export const AI = new AIFeature();
