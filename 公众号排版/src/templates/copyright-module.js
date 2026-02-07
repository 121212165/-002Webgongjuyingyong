/**
 * 版权信息模块
 * 显示文章版权信息
 */
export class CopyrightModule {
    constructor(config = {}) {
        this.author = config.author || '';
        this.date = config.date || new Date().toLocaleDateString('zh-CN');
        this.source = config.source || '原创';
        this.notice = config.notice || '本文为原创内容，转载请注明出处';
        this.showLicense = config.showLicense !== false;
        this.license = config.license || 'CC BY-NC-SA 4.0';
    }

    generateMarkdown() {
        return `
<div class="wechat-copyright-module">
    <div class="copyright-container">
        <div class="copyright-line"></div>
        <div class="copyright-content">
            <div class="copyright-info">
                ${this.author ? `<p class="copyright-item"><strong>作者：</strong>${this.author}</p>` : ''}
                <p class="copyright-item"><strong>日期：</strong>${this.date}</p>
                <p class="copyright-item"><strong>来源：</strong>${this.source}</p>
                ${this.showLicense ? `<p class="copyright-item"><strong>许可：</strong>${this.license}</p>` : ''}
            </div>
            <p class="copyright-notice">${this.notice}</p>
        </div>
        <div class="copyright-line"></div>
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
            author: this.author,
            date: this.date,
            source: this.source,
            notice: this.notice,
            showLicense: this.showLicense,
            license: this.license
        };
    }
}
