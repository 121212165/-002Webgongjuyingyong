// EPUB渲染器模块
const ePub = require('epubjs');
const path = require('path');
const fs = require('fs');

class EPUBRenderer {
    constructor(container) {
        this.container = container;
        this.book = null;
        this.rendition = null;
        this.currentLocation = null;
        this.toc = [];
        this.bookmarks = [];
        this.highlights = [];
        
        this.setupContainer();
    }
    
    setupContainer() {
        this.container.innerHTML = `
            <div class="epub-viewer">
                <div class="epub-toolbar">
                    <div class="epub-nav">
                        <button id="prevChapter" class="epub-btn">上一章</button>
                        <button id="prevPage" class="epub-btn">上一页</button>
                        <span class="location-info">
                            <span id="currentChapter">-</span>
                            <span> | </span>
                            <span id="readingProgress">0%</span>
                        </span>
                        <button id="nextPage" class="epub-btn">下一页</button>
                        <button id="nextChapter" class="epub-btn">下一章</button>
                    </div>
                    <div class="epub-controls">
                        <button id="decreaseFont" class="epub-btn">A-</button>
                        <span id="fontSize" class="font-size">16px</span>
                        <button id="increaseFont" class="epub-btn">A+</button>
                        <button id="toggleTheme" class="epub-btn">🌙</button>
                        <button id="showToc" class="epub-btn">目录</button>
                        <button id="showBookmarks" class="epub-btn">书签</button>
                    </div>
                </div>
                <div class="epub-content">
                    <div class="epub-sidebar" id="epubSidebar" style="display: none;">
                        <div class="sidebar-header">
                            <h3 id="sidebarTitle">目录</h3>
                            <button id="closeSidebar" class="close-btn">×</button>
                        </div>
                        <div class="sidebar-content" id="sidebarContent">
                            <!-- 动态内容 -->
                        </div>
                    </div>
                    <div class="epub-reader" id="epubReader">
                        <!-- EPUB内容将在这里渲染 -->
                    </div>
                </div>
                <div class="epub-loading" id="epubLoading" style="display: none;">
                    <div class="loading-spinner"></div>
                    <p>正在加载EPUB...</p>
                </div>
            </div>
        `;
        
        this.setupEventListeners();
        this.addStyles();
    }
    
    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .epub-viewer {
                display: flex;
                flex-direction: column;
                height: 100%;
                background: #f9f9f9;
            }
            
            .epub-toolbar {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 0.5rem 1rem;
                background: white;
                border-bottom: 1px solid #ddd;
                flex-shrink: 0;
            }
            
            .epub-nav, .epub-controls {
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }
            
            .epub-btn {
                padding: 0.25rem 0.75rem;
                border: 1px solid #ddd;
                background: white;
                border-radius: 3px;
                cursor: pointer;
                font-size: 0.9rem;
                transition: all 0.2s;
            }
            
            .epub-btn:hover:not(:disabled) {
                background: #f0f0f0;
                border-color: #999;
            }
            
            .epub-btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }
            
            .location-info {
                display: flex;
                align-items: center;
                gap: 0.25rem;
                font-size: 0.9rem;
                margin: 0 1rem;
            }
            
            .font-size {
                min-width: 40px;
                text-align: center;
                font-size: 0.9rem;
                font-weight: 500;
            }
            
            .epub-content {
                flex: 1;
                display: flex;
                overflow: hidden;
                position: relative;
            }
            
            .epub-sidebar {
                width: 300px;
                background: white;
                border-right: 1px solid #ddd;
                display: flex;
                flex-direction: column;
                box-shadow: 2px 0 10px rgba(0,0,0,0.1);
                z-index: 100;
            }
            
            .sidebar-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 1rem;
                border-bottom: 1px solid #ddd;
                background: #f8f9fa;
            }
            
            .sidebar-header h3 {
                margin: 0;
                font-size: 1.1rem;
            }
            
            .close-btn {
                background: none;
                border: none;
                font-size: 1.5rem;
                cursor: pointer;
                padding: 0;
                width: 30px;
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
            }
            
            .close-btn:hover {
                background: #e9ecef;
            }
            
            .sidebar-content {
                flex: 1;
                overflow-y: auto;
                padding: 1rem;
            }
            
            .toc-item {
                padding: 0.5rem 0;
                cursor: pointer;
                border-bottom: 1px solid #f0f0f0;
                transition: background 0.2s;
            }
            
            .toc-item:hover {
                background: #f8f9fa;
            }
            
            .toc-item.active {
                background: #e3f2fd;
                color: #1976d2;
                font-weight: 500;
            }
            
            .toc-label {
                display: block;
                font-size: 0.9rem;
                line-height: 1.4;
            }
            
            .toc-level-1 { padding-left: 0; }
            .toc-level-2 { padding-left: 1rem; }
            .toc-level-3 { padding-left: 2rem; }
            
            .epub-reader {
                flex: 1;
                background: white;
                position: relative;
                overflow: hidden;
            }
            
            .epub-loading {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                text-align: center;
                background: rgba(255,255,255,0.9);
                padding: 2rem;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                z-index: 1000;
            }
            
            .loading-spinner {
                width: 40px;
                height: 40px;
                border: 4px solid #f3f3f3;
                border-top: 4px solid #3498db;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 0 auto 1rem;
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            .bookmark-item {
                padding: 0.75rem;
                border-bottom: 1px solid #f0f0f0;
                cursor: pointer;
                transition: background 0.2s;
            }
            
            .bookmark-item:hover {
                background: #f8f9fa;
            }
            
            .bookmark-title {
                font-weight: 500;
                margin-bottom: 0.25rem;
                font-size: 0.9rem;
            }
            
            .bookmark-excerpt {
                font-size: 0.8rem;
                color: #666;
                line-height: 1.3;
            }
            
            .bookmark-date {
                font-size: 0.7rem;
                color: #999;
                margin-top: 0.25rem;
            }
        `;
        document.head.appendChild(style);
    }
    
    setupEventListeners() {
        this.container.addEventListener('click', (e) => {
            const target = e.target;
            
            switch (target.id) {
                case 'prevPage':
                    this.previousPage();
                    break;
                case 'nextPage':
                    this.nextPage();
                    break;
                case 'prevChapter':
                    this.previousChapter();
                    break;
                case 'nextChapter':
                    this.nextChapter();
                    break;
                case 'increaseFont':
                    this.changeFontSize(2);
                    break;
                case 'decreaseFont':
                    this.changeFontSize(-2);
                    break;
                case 'toggleTheme':
                    this.toggleTheme();
                    break;
                case 'showToc':
                    this.showTOC();
                    break;
                case 'showBookmarks':
                    this.showBookmarks();
                    break;
                case 'closeSidebar':
                    this.closeSidebar();
                    break;
            }
        });
        
        // 键盘快捷键
        document.addEventListener('keydown', (e) => {
            if (!this.rendition) return;
            
            switch (e.key) {
                case 'ArrowLeft':
                    e.preventDefault();
                    this.previousPage();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.nextPage();
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    this.previousChapter();
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    this.nextChapter();
                    break;
            }
        });
    }
    
    async loadEPUB(filePath) {
        try {
            this.showLoading(true);
            
            // 创建EPUB书籍对象
            this.book = ePub(filePath);
            
            // 获取书籍元数据
            const metadata = await this.book.loaded.metadata;
            const navigation = await this.book.loaded.navigation;
            
            // 设置渲染区域
            const readerElement = this.container.querySelector('#epubReader');
            this.rendition = this.book.renderTo(readerElement, {
                width: '100%',
                height: '100%',
                spread: 'none'
            });
            
            // 显示第一章
            await this.rendition.display();
            
            // 设置样式
            this.setupReaderStyles();
            
            // 加载目录
            this.loadTOC(navigation.toc);
            
            // 设置事件监听
            this.setupReaderEvents();
            
            this.showLoading(false);
            
            return {
                success: true,
                title: metadata.title,
                author: metadata.creator,
                chapters: navigation.toc.length
            };
            
        } catch (error) {
            this.showLoading(false);
            console.error('EPUB加载失败:', error);
            throw new Error('EPUB文件加载失败: ' + error.message);
        }
    }
    
    setupReaderStyles() {
        // 设置默认样式
        this.rendition.themes.default({
            'body': {
                'font-family': 'Georgia, serif',
                'font-size': '16px',
                'line-height': '1.6',
                'margin': '0',
                'padding': '2rem'
            },
            'p': {
                'margin-bottom': '1em'
            },
            'h1, h2, h3, h4, h5, h6': {
                'margin-top': '1.5em',
                'margin-bottom': '0.5em',
                'line-height': '1.2'
            }
        });
        
        // 夜间主题
        this.rendition.themes.register('dark', {
            'body': {
                'background': '#1a1a1a',
                'color': '#e0e0e0'
            },
            'a': {
                'color': '#4fc3f7'
            }
        });
    }
    
    setupReaderEvents() {
        // 位置变化事件
        this.rendition.on('relocated', (location) => {
            this.currentLocation = location;
            this.updateProgress();
        });
        
        // 选择文本事件
        this.rendition.on('selected', (cfiRange, contents) => {
            this.handleTextSelection(cfiRange, contents);
        });
        
        // 点击事件
        this.rendition.on('click', (event) => {
            // 可以在这里处理点击事件
        });
    }
    
    loadTOC(tocItems) {
        this.toc = tocItems;
    }
    
    // 导航方法
    nextPage() {
        if (this.rendition) {
            this.rendition.next();
        }
    }
    
    previousPage() {
        if (this.rendition) {
            this.rendition.prev();
        }
    }
    
    nextChapter() {
        if (this.book && this.currentLocation) {
            const spine = this.book.spine;
            const currentIndex = spine.get(this.currentLocation.start.cfi).index;
            if (currentIndex < spine.length - 1) {
                const nextItem = spine.get(currentIndex + 1);
                this.rendition.display(nextItem.href);
            }
        }
    }
    
    previousChapter() {
        if (this.book && this.currentLocation) {
            const spine = this.book.spine;
            const currentIndex = spine.get(this.currentLocation.start.cfi).index;
            if (currentIndex > 0) {
                const prevItem = spine.get(currentIndex - 1);
                this.rendition.display(prevItem.href);
            }
        }
    }
    
    goToChapter(href) {
        if (this.rendition) {
            this.rendition.display(href);
            this.closeSidebar();
        }
    }
    
    // 字体大小控制
    changeFontSize(delta) {
        if (!this.rendition) return;
        
        const currentSize = parseInt(this.container.querySelector('#fontSize').textContent);
        const newSize = Math.max(12, Math.min(24, currentSize + delta));
        
        this.rendition.themes.fontSize(newSize + 'px');
        this.container.querySelector('#fontSize').textContent = newSize + 'px';
    }
    
    // 主题切换
    toggleTheme() {
        if (!this.rendition) return;
        
        const button = this.container.querySelector('#toggleTheme');
        const isDark = button.textContent === '☀️';
        
        if (isDark) {
            this.rendition.themes.select('default');
            button.textContent = '🌙';
        } else {
            this.rendition.themes.select('dark');
            button.textContent = '☀️';
        }
    }
    
    // 显示目录
    showTOC() {
        const sidebar = this.container.querySelector('#epubSidebar');
        const title = this.container.querySelector('#sidebarTitle');
        const content = this.container.querySelector('#sidebarContent');
        
        title.textContent = '目录';
        content.innerHTML = '';
        
        this.toc.forEach((item, index) => {
            const div = document.createElement('div');
            div.className = 'toc-item toc-level-' + (item.level || 1);
            div.innerHTML = `<span class="toc-label">${item.label}</span>`;
            div.addEventListener('click', () => this.goToChapter(item.href));
            content.appendChild(div);
        });
        
        sidebar.style.display = 'flex';
    }
    
    // 显示书签
    showBookmarks() {
        const sidebar = this.container.querySelector('#epubSidebar');
        const title = this.container.querySelector('#sidebarTitle');
        const content = this.container.querySelector('#sidebarContent');
        
        title.textContent = '书签';
        content.innerHTML = '';
        
        if (this.bookmarks.length === 0) {
            content.innerHTML = '<p style="text-align: center; color: #999; padding: 2rem;">暂无书签</p>';
        } else {
            this.bookmarks.forEach((bookmark) => {
                const div = document.createElement('div');
                div.className = 'bookmark-item';
                div.innerHTML = `
                    <div class="bookmark-title">${bookmark.title}</div>
                    <div class="bookmark-excerpt">${bookmark.excerpt}</div>
                    <div class="bookmark-date">${bookmark.date}</div>
                `;
                div.addEventListener('click', () => {
                    this.rendition.display(bookmark.cfi);
                    this.closeSidebar();
                });
                content.appendChild(div);
            });
        }
        
        sidebar.style.display = 'flex';
    }
    
    // 关闭侧边栏
    closeSidebar() {
        const sidebar = this.container.querySelector('#epubSidebar');
        sidebar.style.display = 'none';
    }
    
    // 文本选择处理
    handleTextSelection(cfiRange, contents) {
        // 可以在这里实现高亮、笔记等功能
        console.log('文本选择:', cfiRange);
    }
    
    // 更新进度
    updateProgress() {
        if (!this.currentLocation || !this.book) return;
        
        const progress = this.book.locations.percentageFromCfi(this.currentLocation.start.cfi);
        const progressElement = this.container.querySelector('#readingProgress');
        if (progressElement) {
            progressElement.textContent = Math.round(progress * 100) + '%';
        }
        
        // 更新当前章节
        const currentChapter = this.container.querySelector('#currentChapter');
        if (currentChapter && this.currentLocation.start.displayed.page) {
            currentChapter.textContent = `第 ${this.currentLocation.start.displayed.page} 页`;
        }
    }
    
    showLoading(show) {
        const loading = this.container.querySelector('#epubLoading');
        if (loading) {
            loading.style.display = show ? 'block' : 'none';
        }
    }
    
    // 清理资源
    destroy() {
        if (this.rendition) {
            this.rendition.destroy();
        }
        if (this.book) {
            this.book.destroy();
        }
    }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EPUBRenderer;
} else {
    window.EPUBRenderer = EPUBRenderer;
}