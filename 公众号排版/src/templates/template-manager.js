/**
 * 公众号模板管理器
 * 统一管理所有公众号专属模板
 */
import { FollowModule } from './follow-module.js';
import { RewardModule } from './reward-module.js';
import { LinkModule } from './link-module.js';
import { ShareModule } from './share-module.js';
import { CopyrightModule } from './copyright-module.js';

export class TemplateManager {
    constructor() {
        this.modules = {
            follow: new FollowModule(),
            reward: new RewardModule(),
            link: new LinkModule(),
            share: new ShareModule(),
            copyright: new CopyrightModule()
        };

        this.enabledModules = ['follow', 'copyright'];
        this.loadConfig();
    }

    /**
     * 加载模板配置
     */
    loadConfig() {
        const saved = localStorage.getItem('wechat_template_config');
        if (saved) {
            try {
                const config = JSON.parse(saved);
                this.enabledModules = config.enabled || ['follow', 'copyright'];

                // 更新各模块配置
                Object.keys(config.modules || {}).forEach(moduleName => {
                    if (this.modules[moduleName]) {
                        this.modules[moduleName].updateConfig(config.modules[moduleName]);
                    }
                });
            } catch (e) {
                console.error('Failed to load template config:', e);
            }
        }
    }

    /**
     * 保存模板配置
     */
    saveConfig() {
        const config = {
            enabled: this.enabledModules,
            modules: {}
        };

        Object.keys(this.modules).forEach(name => {
            config.modules[name] = this.modules[name].getConfig();
        });

        localStorage.setItem('wechat_template_config', JSON.stringify(config));
    }

    /**
     * 启用模块
     */
    enableModule(moduleName) {
        if (!this.enabledModules.includes(moduleName)) {
            this.enabledModules.push(moduleName);
            this.saveConfig();
        }
    }

    /**
     * 禁用模块
     */
    disableModule(moduleName) {
        this.enabledModules = this.enabledModules.filter(m => m !== moduleName);
        this.saveConfig();
    }

    /**
     * 切换模块状态
     */
    toggleModule(moduleName) {
        if (this.enabledModules.includes(moduleName)) {
            this.disableModule(moduleName);
            return false;
        } else {
            this.enableModule(moduleName);
            return true;
        }
    }

    /**
     * 更新模块配置
     */
    updateModuleConfig(moduleName, config) {
        if (this.modules[moduleName]) {
            this.modules[moduleName].updateConfig(config);
            this.saveConfig();
        }
    }

    /**
     * 生成完整的页脚 HTML
     */
    generateFooter() {
        let footer = '<div class="wechat-footer">\n';

        this.enabledModules.forEach(moduleName => {
            if (this.modules[moduleName]) {
                footer += this.modules[moduleName].generateHTML();
                footer += '\n';
            }
        });

        footer += '</div>';
        return footer;
    }

    /**
     * 生成单个模块的 HTML
     */
    generateModule(moduleName) {
        if (this.modules[moduleName]) {
            return this.modules[moduleName].generateHTML();
        }
        return '';
    }

    /**
     * 获取模块列表
     */
    getModuleList() {
        return Object.keys(this.modules).map(name => ({
            name,
            enabled: this.enabledModules.includes(name),
            config: this.modules[name].getConfig()
        }));
    }

    /**
     * 重置为默认配置
     */
    resetToDefault() {
        this.enabledModules = ['follow', 'copyright'];
        localStorage.removeItem('wechat_template_config');

        // 重置所有模块配置
        this.modules.follow = new FollowModule();
        this.modules.reward = new RewardModule();
        this.modules.link = new LinkModule();
        this.modules.share = new ShareModule();
        this.modules.copyright = new CopyrightModule();
    }
}
