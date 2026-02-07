// 虚拟滚动类
class VirtualScroller {
    constructor(containerId, itemHeight = 20) {
        this.container = document.getElementById(containerId);
        this.itemHeight = itemHeight;
        this.totalItems = 0;
        this.items = [];
        this.visibleStart = 0;
        this.visibleEnd = 0;
        this.renderedStart = 0;
        this.renderedEnd = 0;
        this.overScan = 5;
        this.scrollTop = 0;
        this.isInitialized = false;
    }
    
    // 初始化虚拟滚动
    init(items) {
        this.items = items;
        this.totalItems = items.length;
        this.container.innerHTML = '';
        
        // 创建虚拟滚动容器结构
        this.contentContainer = document.createElement('div');
        this.contentContainer.className = 'virtual-scroll-content';
        
        this.scroller = document.createElement('div');
        this.scroller.className = 'virtual-scroll-container';
        
        this.container.appendChild(this.scroller);
        this.scroller.appendChild(this.contentContainer);
        
        // 计算总高度
        this.totalHeight = this.totalItems * this.itemHeight;
        this.scroller.style.height = `${this.totalHeight}px`;
        
        // 绑定滚动事件
        this.scroller.addEventListener('scroll', () => this.handleScroll());
        
        // 初始渲染
        this.updateVisibleRange();
        this.renderItems();
        
        this.isInitialized = true;
    }
    
    // 更新可见范围
    updateVisibleRange() {
        this.scrollTop = this.scroller.scrollTop;
        this.visibleStart = Math.floor(this.scrollTop / this.itemHeight);
        this.visibleEnd = Math.min(
            this.totalItems - 1,
            Math.ceil((this.scrollTop + this.scroller.clientHeight) / this.itemHeight)
        );
        
        // 添加overScan以减少滚动时的重绘
        this.renderedStart = Math.max(0, this.visibleStart - this.overScan);
        this.renderedEnd = Math.min(this.totalItems - 1, this.visibleEnd + this.overScan);
    }
    
    // 渲染可见项目
    renderItems() {
        if (!this.isInitialized) return;
        
        const fragment = document.createDocumentFragment();
        
        // 清空当前内容
        this.contentContainer.innerHTML = '';
        
        // 计算偏移量
        const offsetY = this.renderedStart * this.itemHeight;
        this.contentContainer.style.transform = `translateY(${offsetY}px)`;
        
        // 渲染可见项目
        for (let i = this.renderedStart; i <= this.renderedEnd; i++) {
            const item = this.items[i];
            const itemElement = document.createElement('div');
            itemElement.className = 'virtual-scroll-item';
            itemElement.innerHTML = item;
            fragment.appendChild(itemElement);
        }
        
        this.contentContainer.appendChild(fragment);
    }
    
    // 处理滚动事件
    handleScroll() {
        const newScrollTop = this.scroller.scrollTop;
        if (Math.abs(newScrollTop - this.scrollTop) > this.itemHeight * 0.5) {
            this.updateVisibleRange();
            this.renderItems();
        }
    }
    
    // 滚动到指定位置
    scrollTo(itemIndex) {
        if (!this.isInitialized) return;
        
        const scrollTop = Math.min(itemIndex * this.itemHeight, this.totalHeight - this.scroller.clientHeight);
        this.scroller.scrollTop = scrollTop;
        this.handleScroll();
    }
    
    // 更新项目
    updateItems(items) {
        this.init(items);
    }
    
    // 销毁虚拟滚动
    destroy() {
        this.scroller.removeEventListener('scroll', () => this.handleScroll());
        this.container.innerHTML = '';
        this.isInitialized = false;
    }
}

// 阅读器核心功能
class Reader {
    constructor() {
        this.currentBook = null;
        this.currentChapterIndex = 0;
        this.scrollPosition = 0;
        this.fontSize = 16;
        this.theme = 'day';
        this.bookmarks = [];
        this.readingStartTime = null;
        this.totalReadingTime = 0;
        this.isReading = false;
        this.timer = null;
        this.virtualScroller = null;
        this.isVirtualScrolling = false;
    }

    // 初始化阅读器
    init() {
        this.loadSettings();
        this.bindEvents();
        this.startReadingTimer();
    }

    // 绑定事件
    bindEvents() {
        // 窗口滚动事件
        document.addEventListener('scroll', () => {
            if (this.isReading) {
                this.saveScrollPosition();
            }
        });

        // 窗口关闭事件
        window.addEventListener('beforeunload', () => {
            this.stopReadingTimer();
            this.saveProgress();
        });
    }

    // 加载书籍
    async loadBook(bookData) {
        this.currentBook = bookData;
        this.currentChapterIndex = 0;
        this.scrollPosition = 0;
        this.bookmarks = this.loadBookmarks(bookData.title) || [];
        this.totalReadingTime = this.loadReadingTime(bookData.title) || 0;
        
        // 加载上次阅读进度
        const savedProgress = this.loadProgress(bookData.title);
        if (savedProgress) {
            this.currentChapterIndex = savedProgress.chapterIndex;
            this.scrollPosition = savedProgress.scrollPosition;
        }
        
        this.renderBook();
        this.updateProgress();
        this.updateReadingStats();
    }

    // 渲染书籍
    renderBook() {
        const readerContent = document.getElementById('readerContent');
        const bookTitle = document.getElementById('bookTitle');
        
        bookTitle.textContent = this.currentBook.title;
        
        // 渲染当前章节
        this.renderChapter(this.currentChapterIndex);
        
        // 更新目录
        this.renderTOC();
    }

    // 渲染章节
    renderChapter(chapterIndex) {
        const readerContent = document.getElementById('readerContent');
        
        if (chapterIndex < 0 || chapterIndex >= this.currentBook.content.length) {
            return;
        }
        
        this.currentChapterIndex = chapterIndex;
        
        const chapter = this.currentBook.content[chapterIndex];
        const chapterTitle = this.currentBook.toc[chapterIndex]?.title || `第${chapterIndex + 1}章`;
        
        // 格式化内容
        const formattedContent = this.formatContent(chapter);
        
        // 检查内容大小，决定是否使用虚拟滚动
        const contentSize = formattedContent.length;
        this.isVirtualScrolling = contentSize > 10000;
        
        if (this.isVirtualScrolling) {
            // 使用虚拟滚动渲染
            this.renderWithVirtualScroll(readerContent, formattedContent, chapterTitle);
        } else {
            // 使用传统渲染
            readerContent.innerHTML = `
                <div class="chapter">
                    <h1 class="chapter-title">${chapterTitle}</h1>
                    <div class="chapter-content">${formattedContent}</div>
                </div>
            `;
            
            // 恢复滚动位置
            window.scrollTo(0, this.scrollPosition);
        }
        
        // 更新进度
        this.updateProgress();
        
        // 保存阅读记录
        this.saveProgress();
    }
    
    // 使用虚拟滚动渲染章节
    renderWithVirtualScroll(container, content, title) {
        // 销毁旧的虚拟滚动实例
        if (this.virtualScroller) {
            this.virtualScroller.destroy();
        }
        
        // 将内容按段落分割
        const paragraphs = content.split('</p>').map(p => p + '</p>').filter(p => p.trim());
        
        // 构建虚拟滚动项目
        const items = [
            `<h1 class="chapter-title">${title}</h1>`
        ].concat(paragraphs);
        
        // 初始化虚拟滚动
        this.virtualScroller = new VirtualScroller('readerContent');
        this.virtualScroller.init(items);
        
        // 保存虚拟滚动位置
        if (this.scrollPosition > 0) {
            this.virtualScroller.scrollTo(this.scrollPosition / 20); // 假设平均每行高度为20px
        }
    }

    // 格式化内容
    formatContent(content) {
        // 将文本内容转换为HTML格式
        return content
            .replace(/\n\n+/g, '</p><p>')
            .replace(/\n/g, '<br>')
            .replace(/^/, '<p>')
            .replace(/$/, '</p>');
    }

    // 渲染目录
    renderTOC() {
        const sidebarContent = document.getElementById('sidebarContent');
        
        sidebarContent.innerHTML = `
            <ul class="chapter-list">
                ${this.currentBook.toc.map((chapter, index) => `
                    <li class="chapter-item ${index === this.currentChapterIndex ? 'active' : ''}" data-index="${index}">
                        ${chapter.title}
                    </li>
                `).join('')}
            </ul>
        `;
        
        // 绑定目录点击事件
        document.querySelectorAll('.chapter-item').forEach(item => {
            item.addEventListener('click', () => {
                const index = parseInt(item.dataset.index);
                this.renderChapter(index);
                this.closeSidebar();
            });
        });
    }

    // 渲染书签
    renderBookmarks() {
        const sidebarContent = document.getElementById('sidebarContent');
        
        if (this.bookmarks.length === 0) {
            sidebarContent.innerHTML = '<p style="text-align: center; color: #999; margin-top: 1rem;">暂无书签</p>';
            return;
        }
        
        sidebarContent.innerHTML = `
            <ul class="bookmark-list">
                ${this.bookmarks.map((bookmark, index) => `
                    <li class="bookmark-item" data-index="${index}">
                        <div>${bookmark.chapterTitle}</div>
                        <div class="bookmark-time">${bookmark.timestamp}</div>
                    </li>
                `).join('')}
            </ul>
        `;
        
        // 绑定书签点击事件
        document.querySelectorAll('.bookmark-item').forEach(item => {
            item.addEventListener('click', () => {
                const index = parseInt(item.dataset.index);
                const bookmark = this.bookmarks[index];
                this.renderChapter(bookmark.chapterIndex);
                this.closeSidebar();
            });
        });
    }

    // 切换到上一章
    prevChapter() {
        if (this.currentChapterIndex > 0) {
            this.currentChapterIndex--;
            this.scrollPosition = 0;
            this.renderChapter(this.currentChapterIndex);
        }
    }

    // 切换到下一章
    nextChapter() {
        if (this.currentChapterIndex < this.currentBook.content.length - 1) {
            this.currentChapterIndex++;
            this.scrollPosition = 0;
            this.renderChapter(this.currentChapterIndex);
        }
    }

    // 添加/移除书签
    toggleBookmark() {
        if (!this.currentBook) return;
        
        const chapterTitle = this.currentBook.toc[this.currentChapterIndex]?.title || `第${this.currentChapterIndex + 1}章`;
        const timestamp = new Date().toLocaleString();
        
        // 检查是否已存在书签
        const existingIndex = this.bookmarks.findIndex(bookmark => 
            bookmark.chapterIndex === this.currentChapterIndex && 
            bookmark.bookTitle === this.currentBook.title
        );
        
        if (existingIndex >= 0) {
            // 移除书签
            this.bookmarks.splice(existingIndex, 1);
            this.showToast('书签已移除');
        } else {
            // 添加书签
            this.bookmarks.push({
                bookTitle: this.currentBook.title,
                chapterIndex: this.currentChapterIndex,
                chapterTitle: chapterTitle,
                scrollPosition: this.scrollPosition,
                timestamp: timestamp
            });
            this.showToast('书签已添加');
        }
        
        // 保存书签
        this.saveBookmarks();
    }

    // 更新阅读进度
    updateProgress() {
        const progressText = document.getElementById('progressText');
        const totalChapters = this.currentBook.content.length;
        const progress = Math.round(((this.currentChapterIndex + 1) / totalChapters) * 100);
        progressText.textContent = `${progress}%`;
    }

    // 保存滚动位置
    saveScrollPosition() {
        if (this.isVirtualScrolling && this.virtualScroller) {
            // 保存虚拟滚动位置
            this.scrollPosition = this.virtualScroller.scrollTop;
        } else {
            // 保存传统滚动位置
            this.scrollPosition = window.scrollY;
        }
    }

    // 保存阅读进度
    saveProgress() {
        if (!this.currentBook) return;
        
        const progress = {
            chapterIndex: this.currentChapterIndex,
            scrollPosition: this.scrollPosition,
            lastRead: new Date().toISOString()
        };
        
        localStorage.setItem(`progress_${this.currentBook.title}`, JSON.stringify(progress));
    }

    // 加载阅读进度
    loadProgress(bookTitle) {
        const progress = localStorage.getItem(`progress_${bookTitle}`);
        return progress ? JSON.parse(progress) : null;
    }

    // 保存书签
    saveBookmarks() {
        if (!this.currentBook) return;
        
        localStorage.setItem(`bookmarks_${this.currentBook.title}`, JSON.stringify(this.bookmarks));
    }

    // 加载书签
    loadBookmarks(bookTitle) {
        const bookmarks = localStorage.getItem(`bookmarks_${bookTitle}`);
        return bookmarks ? JSON.parse(bookmarks) : null;
    }

    // 保存阅读时长
    saveReadingTime() {
        if (!this.currentBook) return;
        
        localStorage.setItem(`readingTime_${this.currentBook.title}`, this.totalReadingTime.toString());
    }

    // 加载阅读时长
    loadReadingTime(bookTitle) {
        const readingTime = localStorage.getItem(`readingTime_${bookTitle}`);
        return readingTime ? parseInt(readingTime) : 0;
    }

    // 开始阅读计时器
    startReadingTimer() {
        this.isReading = true;
        this.readingStartTime = Date.now();
        
        this.timer = setInterval(() => {
            if (this.isReading) {
                this.updateReadingTime();
            }
        }, 60000); // 每分钟更新一次
    }

    // 停止阅读计时器
    stopReadingTimer() {
        this.isReading = false;
        this.updateReadingTime();
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    // 更新阅读时长
    updateReadingTime() {
        if (this.readingStartTime) {
            const elapsed = Math.floor((Date.now() - this.readingStartTime) / 60000);
            this.totalReadingTime += elapsed;
            this.readingStartTime = Date.now();
            this.saveReadingTime();
            this.updateReadingStats();
        }
    }

    // 更新阅读统计
    updateReadingStats() {
        const totalReadingTimeEl = document.getElementById('totalReadingTime');
        const currentReadingTimeEl = document.getElementById('currentReadingTime');
        
        if (totalReadingTimeEl && currentReadingTimeEl) {
            totalReadingTimeEl.textContent = this.totalReadingTime;
            // 当前阅读时长为会话时长
            const sessionTime = this.readingStartTime ? Math.floor((Date.now() - this.readingStartTime) / 60000) : 0;
            currentReadingTimeEl.textContent = sessionTime;
        }
    }

    // 调整字体大小
    adjustFontSize(delta) {
        this.fontSize += delta;
        // 限制字体大小范围
        this.fontSize = Math.max(12, Math.min(32, this.fontSize));
        
        document.documentElement.style.setProperty('--font-size', `${this.fontSize}px`);
        this.saveSettings();
        
        // 更新显示
        const fontSizeDisplay = document.getElementById('fontSizeDisplay');
        if (fontSizeDisplay) {
            fontSizeDisplay.textContent = this.fontSize;
        }
    }

    // 切换主题
    toggleTheme(theme) {
        this.theme = theme;
        document.body.className = theme === 'night' ? 'night-mode' : '';
        this.saveSettings();
    }

    // 保存设置
    saveSettings() {
        const settings = {
            fontSize: this.fontSize,
            theme: this.theme
        };
        localStorage.setItem('readerSettings', JSON.stringify(settings));
    }

    // 加载设置
    loadSettings() {
        const settings = localStorage.getItem('readerSettings');
        if (settings) {
            const parsedSettings = JSON.parse(settings);
            this.fontSize = parsedSettings.fontSize || 16;
            this.theme = parsedSettings.theme || 'day';
            
            // 应用设置
            document.documentElement.style.setProperty('--font-size', `${this.fontSize}px`);
            document.body.className = this.theme === 'night' ? 'night-mode' : '';
            
            // 更新UI
            const fontSizeDisplay = document.getElementById('fontSizeDisplay');
            if (fontSizeDisplay) {
                fontSizeDisplay.textContent = this.fontSize;
            }
            
            const dayModeBtn = document.getElementById('dayMode');
            const nightModeBtn = document.getElementById('nightMode');
            if (dayModeBtn && nightModeBtn) {
                dayModeBtn.classList.toggle('active', this.theme === 'day');
                nightModeBtn.classList.toggle('active', this.theme === 'night');
            }
        }
    }

    // 显示侧边栏
    showSidebar(type) {
        const sidebar = document.getElementById('sidebar');
        const sidebarTitle = document.getElementById('sidebarTitle');
        const overlay = document.getElementById('overlay');
        
        sidebarTitle.textContent = type === 'toc' ? '目录' : '书签';
        sidebar.classList.add('open');
        overlay.style.display = 'block';
        
        if (type === 'toc') {
            this.renderTOC();
        } else {
            this.renderBookmarks();
        }
    }

    // 关闭侧边栏
    closeSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('overlay');
        
        sidebar.classList.remove('open');
        overlay.style.display = 'none';
    }

    // 显示设置面板
    showSettings() {
        const settingsPanel = document.getElementById('settingsPanel');
        settingsPanel.classList.add('open');
    }

    // 关闭设置面板
    closeSettings() {
        const settingsPanel = document.getElementById('settingsPanel');
        settingsPanel.classList.remove('open');
    }

    // 显示提示消息
    showToast(message) {
        // 创建提示元素
        let toast = document.querySelector('.toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.className = 'toast';
            document.body.appendChild(toast);
        }
        
        toast.textContent = message;
        toast.classList.add('show');
        
        // 3秒后隐藏
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
}