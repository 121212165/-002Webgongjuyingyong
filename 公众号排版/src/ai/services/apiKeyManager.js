/**
 * API Key 管理器 - MVP 版本
 * 只支持 OpenAI，加密存储在 localStorage
 */
export class ApiKeyManager {
    constructor() {
        this.storageKey = 'wechat_ai_openai_key';
        this.configKey = 'wechat_ai_config';
    }

    /**
     * 保存 API Key（Base64 编码存储）
     * MVP 版本使用简单的编码，生产环境应使用加密
     */
    saveApiKey(apiKey) {
        try {
            // 简单的 Base64 编码（注意：这不是加密，只是编码）
            const encoded = btoa(apiKey);
            const config = {
                apiKey: encoded,
                provider: 'openai',
                model: 'gpt-4o-mini',
                updatedAt: new Date().toISOString()
            };
            localStorage.setItem(this.configKey, JSON.stringify(config));
            return { success: true };
        } catch (error) {
            console.error('Failed to save API key:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 获取 API Key
     */
    getApiKey() {
        try {
            const data = localStorage.getItem(this.configKey);
            if (!data) return null;

            const config = JSON.parse(data);
            // 解码
            config.apiKey = atob(config.apiKey);
            return config;
        } catch (error) {
            console.error('Failed to get API key:', error);
            return null;
        }
    }

    /**
     * 删除 API Key
     */
    deleteApiKey() {
        localStorage.removeItem(this.configKey);
    }

    /**
     * 检查是否已配置
     */
    isConfigured() {
        return !!localStorage.getItem(this.configKey);
    }

    /**
     * 验证 API Key 格式
     */
    validateKeyFormat(apiKey) {
        // OpenAI API Key 格式：sk-开头的 51 个字符
        return /^sk-[a-zA-Z0-9]{48}$/.test(apiKey);
    }

    /**
     * 获取使用统计
     */
    getStats() {
        const stats = localStorage.getItem('wechat_ai_stats');
        return stats ? JSON.parse(stats) : { totalCalls: 0, totalTokens: 0 };
    }

    /**
     * 更新使用统计
     */
    updateStats(tokens) {
        const stats = this.getStats();
        stats.totalCalls++;
        stats.totalTokens += tokens;
        localStorage.setItem('wechat_ai_stats', JSON.stringify(stats));
    }
}

// 导出单例实例
export const apiKeyManager = new ApiKeyManager();
