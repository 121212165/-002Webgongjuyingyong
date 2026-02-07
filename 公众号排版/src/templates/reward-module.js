/**
 * 赞赏模块
 * 包含赞赏引导和赞赏码
 */
export class RewardModule {
    constructor(config = {}) {
        this.qrCode = config.qrCode || '';
        this.text = config.text || '如果这篇文章对您有帮助，欢迎赞赏支持';
        this.amount = config.amount || '随心';
    }

    generateMarkdown() {
        return `
<div class="wechat-reward-module">
    <div class="reward-container">
        <div class="reward-line">
            <div class="reward-line-text">${this.text}</div>
        </div>
        ${this.qrCode ? `
        <div class="reward-qrcode">
            <img src="${this.qrCode}" alt="赞赏码">
            <p class="reward-amount">赞赏金额：${this.amount}</p>
            <p class="reward-tip">长按识别二维码赞赏</p>
        </div>
        ` : ''}
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
            amount: this.amount
        };
    }
}
