import { setTheme, loadSavedTheme, getCurrentTheme } from './utils/theme.js';
import { simpleHash, debounce, throttle, countWords, countParagraphs, countHeadings, countImages, estimateReadTime, copyToClipboard, downloadFile, wrapText } from './utils/helpers.js';
import { initDB, saveToLocalStorage, loadFromLocalStorage } from './utils/storage.js';
import { TemplateManager } from './templates/template-manager.js';
import { AI } from './ai/ai.js';

class WeChatEditor {
    constructor() {
        this.editor = document.getElementById('editor');
        this.preview = document.getElementById('preview');
        this.articleTitle = document.getElementById('articleTitle');
        this.articleAuthor = document.getElementById('articleAuthor');

        this.currentTheme = 'simple';
        this.currentPreviewMode = 'desktop';
        this.autoSaveTimer = null;
        this.currentHash = '';

        this.isScrolling = false;
        this.scrollTimeout = null;

        // 初始化模板管理器
        this.templateManager = new TemplateManager();
        
        this.markdownSyntax = {
            bold: { prefix: '**', suffix: '**' },
            italic: { prefix: '*', suffix: '*' },
            underline: { prefix: '<u>', suffix: '</u>' },
            strikethrough: { prefix: '~~', suffix: '~~' },
            h1: { prefix: '# ', suffix: '' },
            h2: { prefix: '## ', suffix: '' },
            h3: { prefix: '### ', suffix: '' },
            h4: { prefix: '#### ', suffix: '' },
            ul: { prefix: '- ', suffix: '' },
            ol: { prefix: '1. ', suffix: '' },
            quote: { prefix: '> ', suffix: '' },
            code: { prefix: '```\n', suffix: '\n```' },
            inlineCode: { prefix: '`', suffix: '`' },
            link: { prefix: '[', suffix: '](url)' },
            image: { prefix: '![alt](', suffix: ')' },
            divider: { prefix: '\n---\n', suffix: '' }
        };
        
        this.markedOptions = {
            breaks: true,
            gfm: true,
            headerIds: true,
            mangle: false
        };
        
        this.init();
    }
    
    async init() {
        this.setupMarked();
        this.bindEvents();
        this.initTemplateUI();
        await this.loadContent();
        this.renderMarkdown();
    }
    
    setupMarked() {
        marked.setOptions(this.markedOptions);
    }
    
    bindEvents() {
        document.querySelector('.toolbar').addEventListener('click', (e) => this.handleToolbarClick(e));
        document.querySelector('.theme-buttons').addEventListener('click', (e) => this.handleThemeClick(e));
        document.querySelector('.preview-mode-buttons').addEventListener('click', (e) => this.handlePreviewModeClick(e));
        document.querySelector('.version-buttons').addEventListener('click', (e) => this.handleVersionClick(e));
        document.querySelector('.export-buttons').addEventListener('click', (e) => this.handleExportClick(e));
        document.querySelector('.action-buttons').addEventListener('click', (e) => this.handleActionClick(e));

        // 模板相关事件
        document.querySelector('.template-toggles').addEventListener('change', (e) => this.handleTemplateToggle(e));
        document.getElementById('configTemplates').addEventListener('click', () => this.openTemplateModal());

        // AI 相关事件
        document.querySelector('.toolbar').addEventListener('click', (e) => this.handleAIClick(e));
        document.getElementById('closeAIPanel').addEventListener('click', () => AI.closePanel());
        document.getElementById('optimizeTitleBtn').addEventListener('click', () => this.handleOptimizeTitle());
        document.getElementById('checkQualityBtn').addEventListener('click', () => this.handleCheckQuality());
        document.getElementById('configAIBtn').addEventListener('click', () => AI.showConfig());

        document.querySelector('.modal-close').addEventListener('click', () => this.closeVersionModal());
        document.getElementById('versionModal').addEventListener('click', (e) => {
            if (e.target.id === 'versionModal') this.closeVersionModal();
        });
        document.getElementById('versionList').addEventListener('click', (e) => this.handleVersionListClick(e));

        this.editor.addEventListener('input', () => this.handleEditorInput());
        this.editor.addEventListener('keydown', (e) => this.handleKeyDown(e));
        this.editor.addEventListener('paste', (e) => this.handlePaste(e));
        this.editor.addEventListener('scroll', () => this.syncScroll(this.editor, this.preview));
        this.preview.addEventListener('scroll', () => this.syncScroll(this.preview, this.editor));
        this.articleTitle.addEventListener('input', () => this.triggerAutoSave());
        this.articleAuthor.addEventListener('input', () => this.triggerAutoSave());
    }
    
    handleToolbarClick(e) {
        const btn = e.target.closest('.toolbar-btn');
        if (!btn) return;
        
        const action = btn.dataset.action;
        if (action === 'undo') {
            document.execCommand('undo');
        } else if (action === 'redo') {
            document.execCommand('redo');
        } else {
            this.wrapSelection(action);
        }
    }
    
    handleThemeClick(e) {
        const btn = e.target.closest('.theme-btn');
        if (!btn) return;
        
        setTheme(btn.dataset.theme);
    }
    
    handlePreviewModeClick(e) {
        const btn = e.target.closest('.preview-mode-btn');
        if (!btn) return;
        
        document.querySelectorAll('.preview-mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        this.currentPreviewMode = btn.dataset.mode;
        
        if (this.currentPreviewMode === 'mobile') {
            this.preview.style.maxWidth = '375px';
            this.preview.style.margin = '0 auto';
        } else {
            this.preview.style.maxWidth = '100%';
            this.preview.style.margin = '0';
        }
    }
    
    handleVersionClick(e) {
        if (e.target.id === 'saveVersion') this.saveVersion();
        if (e.target.id === 'showVersions') this.showVersions();
    }
    
    handleExportClick(e) {
        if (e.target.id === 'exportMd') this.exportMarkdown();
        if (e.target.id === 'exportPdf') this.exportPdf();
        if (e.target.id === 'exportWechat') this.exportWechat();
    }
    
    handleActionClick(e) {
        if (e.target.id === 'clearContent') this.clearContent();
        if (e.target.id === 'resetTheme') this.resetTheme();
    }
    
    handleVersionListClick(e) {
        if (e.target.classList.contains('version-restore')) {
            this.restoreVersion(parseInt(e.target.dataset.id));
        }
        if (e.target.classList.contains('version-delete')) {
            this.deleteVersion(parseInt(e.target.dataset.id));
        }
    }
    
    handleEditorInput() {
        this.renderMarkdown();
        this.triggerAutoSave();
    }
    
    handleKeyDown(e) {
        if (e.ctrlKey || e.metaKey) {
            switch (e.key.toLowerCase()) {
                case 'b':
                    e.preventDefault();
                    this.wrapSelection('bold');
                    break;
                case 'i':
                    e.preventDefault();
                    this.wrapSelection('italic');
                    break;
                case 'u':
                    e.preventDefault();
                    this.wrapSelection('underline');
                    break;
                case 'k':
                    e.preventDefault();
                    this.wrapSelection('link');
                    break;
                case '1':
                    e.preventDefault();
                    this.wrapSelection('h1');
                    break;
                case '2':
                    e.preventDefault();
                    this.wrapSelection('h2');
                    break;
                case '3':
                    e.preventDefault();
                    this.wrapSelection('h3');
                    break;
                case '4':
                    e.preventDefault();
                    this.wrapSelection('h4');
                    break;
            }
        }
        
        if (e.key === 'Tab') {
            e.preventDefault();
            const start = this.editor.selectionStart;
            const end = this.editor.selectionEnd;
            const selectedText = this.editor.value.substring(start, end);
            
            if (e.shiftKey) {
                this.editor.value = this.editor.value.substring(0, start) + 
                    selectedText.replace(/^(\s*)/gm, (match, spaces) => spaces.slice(0, -2)) + 
                    this.editor.value.substring(end);
            } else {
                this.editor.value = this.editor.value.substring(0, start) + 
                    selectedText.replace(/^/gm, '  ') + 
                    this.editor.value.substring(end);
            }
            
            this.renderMarkdown();
        }
    }
    
    async handlePaste(e) {
        e.preventDefault();
        
        const items = (e.clipboardData || e.originalEvent.clipboardData).items;
        let hasImage = false;
        
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                hasImage = true;
                const blob = items[i].getAsFile();
                const reader = new FileReader();
                
                reader.onload = async (event) => {
                    try {
                        const base64 = event.target.result;
                        this.insertImage(base64);
                    } catch (error) {
                        console.error('Failed to save image:', error);
                        this.insertImage(event.target.result);
                    }
                };
                
                reader.readAsDataURL(blob);
                break;
            }
        }
        
        if (!hasImage) {
            const text = (e.clipboardData || e.originalEvent.clipboardData).getData('text/plain');
            document.execCommand('insertText', false, text);
        }
    }
    
    wrapSelection(action) {
        const syntax = this.markdownSyntax[action];
        if (!syntax) return;
        
        const start = this.editor.selectionStart;
        const end = this.editor.selectionEnd;
        const selectedText = this.editor.value.substring(start, end);
        
        if (action === 'link') {
            const url = prompt('请输入链接地址:', 'https://');
            if (url) {
                const newText = `[${selectedText || '链接文字'}](${url})`;
                this.editor.value = this.editor.value.substring(0, start) + newText + this.editor.value.substring(end);
            }
        } else if (action === 'image') {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = async (e) => {
                const file = e.target.files[0];
                if (file) {
                    try {
                        const { uploadImage } = await import('./utils/storage.js');
                        const result = await uploadImage(file);
                        const alt = prompt('请输入图片描述:', '图片');
                        const newText = `![${alt || '图片'}](data:image;base64,${result.data.split(',')[1]})`;
                        this.editor.value = this.editor.value.substring(0, start) + newText + this.editor.value.substring(end);
                        this.renderMarkdown();
                        this.triggerAutoSave();
                    } catch (error) {
                        alert('图片上传失败: ' + error.message);
                    }
                }
            };
            input.click();
        } else if (action === 'table') {
            const tableText = `
| 列1 | 列2 | 列3 |
|-----|-----|-----|
| 内容1 | 内容2 | 内容3 |
| 内容4 | 内容5 | 内容6 |
`;
            this.editor.value = this.editor.value.substring(0, start) + tableText + this.editor.value.substring(end);
        } else {
            const newText = syntax.prefix + selectedText + syntax.suffix;
            this.editor.value = this.editor.value.substring(0, start) + newText + this.editor.value.substring(end);
        }
        
        this.renderMarkdown();
        this.triggerAutoSave();
    }
    
    insertImage(src) {
        const start = this.editor.selectionStart;
        const end = this.editor.selectionEnd;
        const imageMarkdown = `![图片](${src})`;
        
        this.editor.value = this.editor.value.substring(0, start) + imageMarkdown + this.editor.value.substring(end);
        this.renderMarkdown();
        this.triggerAutoSave();
    }
    
    syncScroll(source, target) {
        if (this.isScrolling) return;
        
        this.isScrolling = true;
        
        const sourceScrollPercentage = source.scrollTop / (source.scrollHeight - source.clientHeight);
        target.scrollTop = sourceScrollPercentage * (target.scrollHeight - target.clientHeight);
        
        clearTimeout(this.scrollTimeout);
        this.scrollTimeout = setTimeout(() => {
            this.isScrolling = false;
        }, 50);
    }
    
    renderMarkdown() {
        const markdown = this.editor.value;
        const html = marked.parse(markdown);
        const footer = this.templateManager.generateFooter();
        this.preview.innerHTML = html + footer;
        this.updateStats();
    }
    
    updateStats() {
        const markdown = this.editor.value;
        
        const charCount = countWords(markdown);
        const paragraphCount = countParagraphs(markdown);
        const imageCount = countImages(markdown);
        const headingCount = countHeadings(markdown);
        const readTime = estimateReadTime(markdown);
        
        document.getElementById('charCount').textContent = charCount;
        document.getElementById('paragraphCount').textContent = paragraphCount;
        document.getElementById('imageCount').textContent = imageCount;
        document.getElementById('headingCount').textContent = headingCount;
        document.getElementById('readTime').textContent = `${readTime} 分钟`;
    }
    
    triggerAutoSave() {
        clearTimeout(this.autoSaveTimer);
        document.getElementById('saveStatus').textContent = '保存中...';
        
        this.autoSaveTimer = setTimeout(() => {
            this.saveContent();
        }, 1000);
    }
    
    saveContent() {
        const content = this.editor.value;
        const title = this.articleTitle.value;
        const author = this.articleAuthor.value;
        
        const hash = simpleHash(content + title + author);
        
        if (hash !== this.currentHash) {
            saveToLocalStorage('markdownContent', content);
            saveToLocalStorage('articleTitle', title);
            saveToLocalStorage('articleAuthor', author);
            saveToLocalStorage('contentHash', hash);
            
            this.currentHash = hash;
            document.getElementById('saveStatus').textContent = '已自动保存';
        } else {
            document.getElementById('saveStatus').textContent = '已自动保存';
        }
    }
    
    async loadContent() {
        const content = loadFromLocalStorage('markdownContent', '');
        const title = loadFromLocalStorage('articleTitle', '');
        const author = loadFromLocalStorage('articleAuthor', '');
        
        if (content) this.editor.value = content;
        if (title) this.articleTitle.value = title;
        if (author) this.articleAuthor.value = author;
        
        loadSavedTheme();
        
        this.currentHash = loadFromLocalStorage('contentHash', '');
    }
    
    saveVersion() {
        const versions = loadFromLocalStorage('versions', []);
        const version = {
            id: Date.now(),
            title: this.articleTitle.value || '未命名文章',
            content: this.editor.value,
            author: this.articleAuthor.value,
            timestamp: new Date().toLocaleString('zh-CN')
        };
        
        versions.unshift(version);
        if (versions.length > 10) versions.pop();
        
        saveToLocalStorage('versions', versions);
        alert('版本已保存');
    }
    
    showVersions() {
        const versions = loadFromLocalStorage('versions', []);
        const versionList = document.getElementById('versionList');
        
        if (versions.length === 0) {
            versionList.innerHTML = '<p>暂无历史版本</p>';
        } else {
            versionList.innerHTML = versions.map(v => `
                <div class="version-item">
                    <div class="version-title">${v.title}</div>
                    <div class="version-time">${v.timestamp}</div>
                    <div class="version-actions">
                        <button class="version-restore" data-id="${v.id}">恢复</button>
                        <button class="version-delete" data-id="${v.id}">删除</button>
                    </div>
                </div>
            `).join('');
        }
        
        document.getElementById('versionModal').classList.add('show');
    }
    
    closeVersionModal() {
        document.getElementById('versionModal').classList.remove('show');
    }
    
    restoreVersion(id) {
        const versions = loadFromLocalStorage('versions', []);
        const version = versions.find(v => v.id === id);
        
        if (version) {
            if (confirm('确定要恢复此版本吗？当前内容将被覆盖。')) {
                this.editor.value = version.content;
                this.articleTitle.value = version.title;
                this.articleAuthor.value = version.author;
                this.renderMarkdown();
                this.triggerAutoSave();
                this.closeVersionModal();
            }
        }
    }
    
    deleteVersion(id) {
        if (confirm('确定要删除此版本吗？')) {
            let versions = loadFromLocalStorage('versions', []);
            versions = versions.filter(v => v.id !== id);
            saveToLocalStorage('versions', versions);
            this.showVersions();
        }
    }
    
    exportMarkdown() {
        const title = this.articleTitle.value || '未命名文章';
        const content = this.editor.value;
        
        const markdown = `# ${title}\n\n${this.articleAuthor.value ? `作者：${this.articleAuthor.value}\n\n` : ''}${content}`;
        
        downloadFile(markdown, `${title}.md`, 'text/markdown');
    }
    
    exportPdf() {
        const title = this.articleTitle.value || '未命名文章';
        const content = this.editor.value;
        const html = marked.parse(content);
        
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html lang="zh-CN">
            <head>
                <meta charset="UTF-8">
                <title>${title}</title>
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
                        max-width: 800px;
                        margin: 0 auto;
                        padding: 40px 20px;
                        line-height: 1.8;
                        color: #333;
                    }
                    h1, h2, h3, h4, h5, h6 { margin-top: 1.5em; margin-bottom: 0.5em; color: #1a1a1a; }
                    h1 { font-size: 2em; border-bottom: 2px solid #e0e0e0; padding-bottom: 0.3em; }
                    p { margin: 1em 0; }
                    code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; font-family: 'Courier New', monospace; }
                    pre { background: #f4f4f4; padding: 16px; border-radius: 8px; overflow-x: auto; }
                    pre code { background: none; padding: 0; }
                    blockquote { border-left: 4px solid #007aff; padding-left: 16px; margin: 1em 0; color: #666; background: #f8f9fa; padding: 12px 16px; }
                    img { max-width: 100%; height: auto; display: block; margin: 20px auto; }
                    table { border-collapse: collapse; width: 100%; margin: 20px 0; }
                    th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
                    th { background: #f4f4f4; }
                    hr { border: none; border-top: 2px solid #e0e0e0; margin: 30px 0; }
                    a { color: #007aff; text-decoration: none; }
                    a:hover { text-decoration: underline; }
                </style>
            </head>
            <body>
                <h1>${title}</h1>
                ${this.articleAuthor.value ? `<p style="color: #666; margin-bottom: 30px;">作者：${this.articleAuthor.value}</p>` : ''}
                ${html}
            </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
    }
    
    exportWechat() {
        const title = this.articleTitle.value || '未命名文章';
        const content = this.editor.value;
        const html = marked.parse(content);
        
        const wechatHtml = `
            <section style="max-width: 677px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;">
                <h1 style="font-size: 22px; font-weight: bold; color: #1a1a1a; margin-bottom: 20px; text-align: left;">${title}</h1>
                ${this.articleAuthor.value ? `<p style="color: #888; font-size: 14px; margin-bottom: 30px;">作者：${this.articleAuthor.value}</p>` : ''}
                <section style="font-size: 16px; line-height: 1.8; color: #333;">
                    ${html}
                </section>
            </section>
        `;
        
        copyToClipboard(wechatHtml).then(() => {
            alert('已复制到剪贴板，可以直接粘贴到公众号编辑器中');
        }).catch(() => {
            alert('已复制到剪贴板，可以直接粘贴到公众号编辑器中');
        });
    }
    
    clearContent() {
        if (confirm('确定要清空所有内容吗？此操作不可撤销。')) {
            this.editor.value = '';
            this.articleTitle.value = '';
            this.articleAuthor.value = '';
            this.renderMarkdown();
            this.triggerAutoSave();
        }
    }
    
    resetTheme() {
        setTheme('simple');
    }

    // ========== 模板相关方法 ==========

    /**
     * 初始化模板 UI
     */
    initTemplateUI() {
        const moduleList = this.templateManager.getModuleList();

        // 设置 toggle 状态
        moduleList.forEach(module => {
            const checkbox = document.getElementById(`toggle${this.capitalize(module.name)}`);
            if (checkbox) {
                checkbox.checked = module.enabled;
            }
        });

        // 添加模板模态框事件
        const templateModal = document.getElementById('templateModal');
        templateModal.addEventListener('click', (e) => {
            if (e.target.id === 'templateModal') this.closeTemplateModal();
        });

        templateModal.querySelector('.modal-close').addEventListener('click', () => this.closeTemplateModal());

        document.getElementById('saveTemplateConfig').addEventListener('click', () => this.saveTemplateConfig());
        document.getElementById('resetTemplates').addEventListener('click', () => this.resetTemplates());

        // 更新版权模块的作者
        const copyrightAuthor = document.getElementById('articleAuthor').value;
        if (copyrightAuthor) {
            this.templateManager.updateModuleConfig('copyright', { author: copyrightAuthor });
        }
    }

    /**
     * 处理模板切换
     */
    handleTemplateToggle(e) {
        if (!e.target.type || e.target.type !== 'checkbox') return;

        const moduleName = this.getModuleNameFromId(e.target.id);
        if (moduleName) {
            this.templateManager.toggleModule(moduleName);
            this.renderMarkdown();
        }
    }

    /**
     * 打开模板配置模态框
     */
    openTemplateModal() {
        const modal = document.getElementById('templateModal');
        this.loadTemplateConfigToUI();
        modal.style.display = 'block';
    }

    /**
     * 关闭模板配置模态框
     */
    closeTemplateModal() {
        document.getElementById('templateModal').style.display = 'none';
    }

    /**
     * 加载模板配置到 UI
     */
    loadTemplateConfigToUI() {
        const modules = this.templateManager.modules;

        // 引导关注
        document.getElementById('followText').value = modules.follow.text;
        document.getElementById('followDesc').value = modules.follow.description;
        document.getElementById('followQrCode').value = modules.follow.qrCode;

        // 赞赏
        document.getElementById('rewardText').value = modules.reward.text;
        document.getElementById('rewardAmount').value = modules.reward.amount;
        document.getElementById('rewardQrCode').value = modules.reward.qrCode;

        // 原文链接
        document.getElementById('linkText').value = modules.link.text;
        document.getElementById('linkDesc').value = modules.link.description;
        document.getElementById('linkUrl').value = modules.link.url;

        // 分享引导
        document.getElementById('shareTitle').value = modules.share.title;
        document.getElementById('shareText').value = modules.share.text;
        document.getElementById('shareStyle').value = modules.share.style;

        // 版权信息
        document.getElementById('copyrightAuthor').value = modules.copyright.author;
        document.getElementById('copyrightSource').value = modules.copyright.source;
        document.getElementById('copyrightLicense').value = modules.copyright.license;
        document.getElementById('copyrightNotice').value = modules.copyright.notice;
    }

    /**
     * 保存模板配置
     */
    saveTemplateConfig() {
        // 引导关注
        this.templateManager.updateModuleConfig('follow', {
            text: document.getElementById('followText').value,
            description: document.getElementById('followDesc').value,
            qrCode: document.getElementById('followQrCode').value
        });

        // 赞赏
        this.templateManager.updateModuleConfig('reward', {
            text: document.getElementById('rewardText').value,
            amount: document.getElementById('rewardAmount').value,
            qrCode: document.getElementById('rewardQrCode').value
        });

        // 原文链接
        this.templateManager.updateModuleConfig('link', {
            text: document.getElementById('linkText').value,
            description: document.getElementById('linkDesc').value,
            url: document.getElementById('linkUrl').value
        });

        // 分享引导
        this.templateManager.updateModuleConfig('share', {
            title: document.getElementById('shareTitle').value,
            text: document.getElementById('shareText').value,
            style: document.getElementById('shareStyle').value
        });

        // 版权信息
        this.templateManager.updateModuleConfig('copyright', {
            author: document.getElementById('copyrightAuthor').value,
            source: document.getElementById('copyrightSource').value,
            license: document.getElementById('copyrightLicense').value,
            notice: document.getElementById('copyrightNotice').value
        });

        this.renderMarkdown();
        this.closeTemplateModal();
        alert('模板配置已保存');
    }

    /**
     * 重置模板配置
     */
    resetTemplates() {
        if (confirm('确定要重置所有模板配置吗？')) {
            this.templateManager.resetToDefault();
            this.loadTemplateConfigToUI();
            this.initTemplateUI();
            this.renderMarkdown();
        }
    }

    /**
     * 从 checkbox ID 获取模块名
     */
    getModuleNameFromId(id) {
        const mapping = {
            'toggleFollow': 'follow',
            'toggleReward': 'reward',
            'toggleLink': 'link',
            'toggleShare': 'share',
            'toggleCopyright': 'copyright'
        };
        return mapping[id];
    }

    /**
     * 首字母大写
     */
    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    // ========== AI 相关方法 ==========

    /**
     * 处理工具栏 AI 按钮点击
     */
    handleAIClick(e) {
        const btn = e.target.closest('.ai-trigger-btn');
        if (!btn) return;

        AI.openPanel();
    }

    /**
     * 处理 AI 标题优化
     */
    async handleOptimizeTitle() {
        const title = this.articleTitle.value.trim();

        if (!title) {
            alert('请先输入文章标题');
            this.articleTitle.focus();
            return;
        }

        const content = this.editor.value;

        try {
            await AI.optimizeTitle(title, content);
        } catch (error) {
            console.error('Title optimization failed:', error);
            // AI.showConfig() 会在 optimizeTitle 中调用
        }
    }

    /**
     * 处理质量检测
     */
    handleCheckQuality() {
        const title = this.articleTitle.value.trim();

        if (!title) {
            alert('请先输入文章标题');
            this.articleTitle.focus();
            return;
        }

        const content = this.editor.value;

        try {
            AI.checkQuality(title, content);
        } catch (error) {
            console.error('Quality check failed:', error);
            alert('质量检测失败: ' + error.message);
        }
    }
}

async function initApp() {
    try {
        await initDB();
        new WeChatEditor();
        console.log('WeChat Editor initialized successfully');
    } catch (error) {
        console.error('Failed to initialize app:', error);
        new WeChatEditor();
    }
}

initApp();
