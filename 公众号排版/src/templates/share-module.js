/**
 * 分享引导模块
 * 引导用户分享文章
 */
export class ShareModule {
    constructor(config = {}) {
        this.title = config.title || '觉得不错，点个赞吧';
        this.text = config.text || '欢迎分享给朋友，让更多人看到';
        this.style = config.style || 'default'; // default, minimal, elegant
    }

    generateMarkdown() {
        const styles = {
            default: `
                <div class="share-icons">
                    <span class="share-icon">👍</span>
                    <span class="share-icon">🌟</span>
                    <span class="share-icon">💬</span>
                </div>
            `,
            minimal: `
                <div class="share-minimal">
                    <span class="share-text-minimal">${this.text}</span>
                </div>
            `,
            elegant: `
                <div class="share-elegant">
                    <div class="share-line-elegant"></div>
                    <span class="share-text-elegant">${this.text}</span>
                    <div class="share-line-elegant"></div>
                </div>
            `
        };

        return `
<div class="wechat-share-module share-style-${this.style}">
    <div class="share-container">
        <p class="share-title">${this.title}</p>
        ${styles[this.style] || styles.default}
    </div>
</div>
`;
    }

    generateHTML() {
        return this.generateMarkdown();
    }

    updateConfig(config) {
        Object.assign(this, config);
    }

    getConfig() {
        return {
            title: this.title,
            text: this.text,
            style: this.style
        };
    }
}
