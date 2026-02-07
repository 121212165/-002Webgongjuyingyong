/**
 * 原文链接模块
 * 引导用户查看原文
 */
export class LinkModule {
    constructor(config = {}) {
        this.url = config.url || '';
        this.text = config.text || '点击查看原文';
        this.description = config.description || '更多精彩内容，请点击阅读原文';
    }

    generateMarkdown() {
        const linkHtml = this.url
            ? `<a href="${this.url}" class="original-link" target="_blank">${this.text}</a>`
            : `<span class="original-link-placeholder">${this.text}</span>`;

        return `
<div class="wechat-link-module">
    <div class="link-container">
        <p class="link-description">${this.description}</p>
        <div class="link-button">${linkHtml}</div>
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
            url: this.url,
            text: this.text,
            description: this.description
        };
    }
}
