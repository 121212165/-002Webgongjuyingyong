/**
 * 引导关注模块
 * 包含二维码和关注文案
 */
export class FollowModule {
    constructor(config = {}) {
        this.qrCode = config.qrCode || '';
        this.text = config.text || '欢迎关注我的公众号';
        this.description = config.description || '获取更多精彩内容';
    }

    generateMarkdown() {
        return `
<div class="wechat-follow-module">
    <div class="follow-container">
        <div class="follow-content">
            <div class="follow-text">
                <p class="follow-title">${this.text}</p>
                <p class="follow-desc">${this.description}</p>
            </div>
            ${this.qrCode ? `
            <div class="follow-qrcode">
                <img src="${this.qrCode}" alt="公众号二维码">
                <p class="qrcode-tip">长按识别二维码关注</p>
            </div>
            ` : ''}
        </div>
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
            qrCode: this.qrCode,
            text: this.text,
            description: this.description
        };
    }
}
