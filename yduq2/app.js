// 主应用逻辑
class ReaderApp {
    constructor() {
        this.reader = new Reader();
        this.recentBooks = [];
        this.library = [];
        this.init();
    }

    // 初始化应用
    async init() {
        this.bindEvents();
        this.loadRecentBooks();
        await this.loadLibrary();
        await this.renderLibrary();
        this.renderRecentBooks();
    }

    // 绑定事件
    bindEvents() {
        // 文件输入事件
        const fileInput = document.getElementById('fileInput');
        fileInput.addEventListener('change', (e) => this.handleFileSelect(e));

        // 目录输入事件
        const directoryInput = document.getElementById('directoryInput');
        directoryInput.addEventListener('change', (e) => this.handleDirectorySelect(e));

        // 拖拽事件
        const dragArea = document.getElementById('dragArea');
        dragArea.addEventListener('dragover', (e) => this.handleDragOver(e));
        dragArea.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        dragArea.addEventListener('drop', (e) => this.handleDrop(e));

        // 扫描目录按钮事件
        const scanDirectoryBtn = document.getElementById('scanDirectoryBtn');
        if (scanDirectoryBtn) {
            scanDirectoryBtn.addEventListener('click', () => this.scanDirectory());
        }

        // 搜索事件
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.handleSearch(e));
        }

        // 排序事件
        const sortSelect = document.getElementById('sortSelect');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => this.handleSort(e));
        }

        // 按钮事件
        const backBtn = document.getElementById('backBtn');
        if (backBtn) {
            backBtn.addEventListener('click', () => this.goBack());
        }

        const menuBtn = document.getElementById('menuBtn');
        if (menuBtn) {
            menuBtn.addEventListener('click', () => this.reader.showSidebar('toc'));
        }

        const bookmarkBtn = document.getElementById('bookmarkBtn');
        if (bookmarkBtn) {
            bookmarkBtn.addEventListener('click', () => {
                this.reader.toggleBookmark();
                bookmarkBtn.classList.toggle('active');
            });
        }

        const prevBtn = document.getElementById('prevBtn');
        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.reader.prevChapter());
        }

        const nextBtn = document.getElementById('nextBtn');
        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.reader.nextChapter());
        }

        const settingsBtn = document.getElementById('settingsBtn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => this.reader.showSettings());
        }

        // 侧边栏关闭事件
        const closeSidebar = document.getElementById('closeSidebar');
        if (closeSidebar) {
            closeSidebar.addEventListener('click', () => this.reader.closeSidebar());
        }

        const overlay = document.getElementById('overlay');
        if (overlay) {
            overlay.addEventListener('click', () => this.reader.closeSidebar());
        }

        // 设置面板事件
        const closeSettings = document.getElementById('closeSettings');
        if (closeSettings) {
            closeSettings.addEventListener('click', () => this.reader.closeSettings());
        }

        // 主题切换事件
        const dayModeBtn = document.getElementById('dayMode');
        const nightModeBtn = document.getElementById('nightMode');
        if (dayModeBtn && nightModeBtn) {
            dayModeBtn.addEventListener('click', () => this.reader.toggleTheme('day'));
            nightModeBtn.addEventListener('click', () => this.reader.toggleTheme('night'));
        }

        // 字体大小调整事件
        const decreaseFont = document.getElementById('decreaseFont');
        const increaseFont = document.getElementById('increaseFont');
        if (decreaseFont && increaseFont) {
            decreaseFont.addEventListener('click', () => this.reader.adjustFontSize(-1));
            increaseFont.addEventListener('click', () => this.reader.adjustFontSize(1));
        }
    }

    // 处理文件选择
    async handleFileSelect(event) {
        const file = event.target.files[0];
        if (file) {
            await this.processFile(file);
        }
    }
    
    // 处理目录选择
    async handleDirectorySelect(event) {
        const files = Array.from(event.target.files);
        if (files.length > 0) {
            await this.processDirectory(files);
        }
    }
    
    // 扫描目录
    scanDirectory() {
        const directoryInput = document.getElementById('directoryInput');
        directoryInput.click();
    }
    
    // 处理目录文件
    async processDirectory(files) {
        const ebookFiles = files.filter(file => {
            const ext = file.name.split('.').pop().toLowerCase();
            return ['.txt', '.epub', '.pdf', '.mobi', '.azw', '.azw3'].includes('.' + ext);
        });
        
        this.showToast(`开始处理 ${ebookFiles.length} 个文件...`);
        
        for (let i = 0; i < ebookFiles.length; i++) {
            const file = ebookFiles[i];
            try {
                await this.processFile(file, false); // 不立即切换到阅读器
                this.showToast(`处理完成 ${i + 1}/${ebookFiles.length} - ${file.name}`);
            } catch (error) {
                console.error(`处理文件 ${file.name} 失败:`, error);
                this.showToast(`处理失败 ${i + 1}/${ebookFiles.length} - ${file.name}`);
            }
        }
        
        this.showToast(`全部处理完成！共处理 ${ebookFiles.length} 个文件。`);
    }
    
    // 处理搜索
    handleSearch(event) {
        const searchTerm = event.target.value.toLowerCase();
        this.renderLibrary(searchTerm);
    }
    
    // 处理排序
    handleSort(event) {
        const sortBy = event.target.value;
        this.renderLibrary('', sortBy);
    }
    
    // 添加到图书馆
    async addToLibrary(bookData, file) {
        try {
            // 检查是否已存在
            const existingBook = await dbManager.findBookByTitleAndAuthor(bookData.title, bookData.author || '未知作者');
            
            if (!existingBook) {
                const book = {
                    id: Date.now(),
                    title: bookData.title,
                    author: bookData.author || '未知作者',
                    fileName: file.name,
                    fileSize: file.size,
                    lastModified: file.lastModified,
                    fileType: file.name.split('.').pop().toLowerCase(),
                    metadata: bookData.metadata || {},
                    addedDate: new Date().toISOString(),
                    lastRead: null
                };
                
                await dbManager.addBook(book);
            }
        } catch (error) {
            console.error('添加到图书馆失败:', error);
        }
    }
    
    // 加载图书馆
    async loadLibrary() {
        try {
            this.library = await dbManager.getAllBooks();
        } catch (error) {
            console.error('加载图书馆失败:', error);
            this.library = [];
        }
    }
    
    // 渲染图书馆
    async renderLibrary(searchTerm = '', sortBy = 'title') {
        const bookLibrary = document.getElementById('bookLibrary');
        if (!bookLibrary) return;
        
        // 从IndexedDB加载最新数据
        await this.loadLibrary();
        
        // 过滤和排序
        let filteredBooks = this.library;
        
        if (searchTerm) {
            filteredBooks = await dbManager.searchBooks(searchTerm);
        }
        
        // 排序
        filteredBooks.sort((a, b) => {
            switch (sortBy) {
                case 'title':
                    return a.title.localeCompare(b.title);
                case 'author':
                    return a.author.localeCompare(b.author);
                case 'date':
                    return new Date(b.addedDate) - new Date(a.addedDate);
                default:
                    return 0;
            }
        });
        
        if (filteredBooks.length === 0) {
            bookLibrary.innerHTML = '<div class="empty-state">暂无书籍</div>';
            return;
        }
        
        bookLibrary.innerHTML = filteredBooks.map(book => `
            <div class="book-item" data-id="${book.id}" data-title="${book.title}">
                <div class="book-cover"></div>
                <h3>${book.title}</h3>
                <p class="book-meta">
                    <small>${book.author}</small><br>
                    <small>${book.fileSize} bytes</small><br>
                    <small>${new Date(book.addedDate).toLocaleDateString()}</small>
                </p>
            </div>
        `).join('');
        
        // 绑定点击事件
        document.querySelectorAll('.book-item').forEach(item => {
            item.addEventListener('click', () => {
                const bookId = item.dataset.id;
                this.openLibraryBook(bookId);
            });
        });
    }

    // 处理拖拽事件
    handleDragOver(event) {
        event.preventDefault();
        const dragArea = document.getElementById('dragArea');
        dragArea.classList.add('dragover');
    }

    // 处理拖拽离开事件
    handleDragLeave(event) {
        event.preventDefault();
        const dragArea = document.getElementById('dragArea');
        dragArea.classList.remove('dragover');
    }

    // 处理文件放下事件
    async handleDrop(event) {
        event.preventDefault();
        const dragArea = document.getElementById('dragArea');
        dragArea.classList.remove('dragover');

        const file = event.dataTransfer.files[0];
        if (file) {
            await this.processFile(file);
        }
    }

    // 处理文件
    async processFile(file, switchToReader = true) {
        try {
            // 显示加载状态
            this.showLoading();

            // 根据文件类型选择解析器
            const parser = FileParserFactory.getParser(file);
            
            // 设置进度回调
            if (parser.setProgressCallback) {
                parser.setProgressCallback(progressInfo => {
                    console.log(`解析进度: ${progressInfo.progress}% - ${progressInfo.message}`);
                    // 可以在这里添加进度显示UI
                });
            }
            
            const bookData = await parser.parse(file);

            // 添加到图书馆
            this.addToLibrary(bookData, file);
            
            // 保存到最近阅读
            this.addToRecentBooks(bookData.title, file.name);
            
            if (switchToReader) {
                // 切换到阅读器页面
                this.switchToReader();

                // 初始化阅读器
                this.reader.init();
                
                // 加载书籍
                await this.reader.loadBook(bookData);
            }
            
            // 显示解析结果信息
            if (bookData.errors && bookData.errors.length > 0) {
                console.warn(`解析过程中出现 ${bookData.errors.length} 个错误`);
            }
            if (bookData.warnings && bookData.warnings.length > 0) {
                console.warn(`解析过程中出现 ${bookData.warnings.length} 个警告`);
            }
            
            // 更新图书馆显示
            this.renderLibrary();
            this.renderRecentBooks();
        } catch (error) {
            console.error('文件处理失败:', error);
            this.showError('文件处理失败，请检查文件格式是否正确');
        } finally {
            // 隐藏加载状态
            this.hideLoading();
        }
    }
    
    // 打开图书馆中的书籍
    async openLibraryBook(bookId) {
        try {
            const book = await dbManager.getBookById(parseInt(bookId));
            if (book) {
                // 在实际应用中，我们可以考虑将书籍内容缓存到IndexedDB
                // 但由于IndexedDB容量限制，这里我们采用重新选择文件的方式
                this.showToast(`请选择 ${book.fileName} 文件以打开书籍`);
                const fileInput = document.getElementById('fileInput');
                fileInput.addEventListener('change', async (e) => {
                    const file = e.target.files[0];
                    if (file) {
                        await this.processFile(file);
                    }
                }, { once: true });
                fileInput.click();
            }
        } catch (error) {
            console.error('打开图书馆书籍失败:', error);
            this.showToast('打开书籍失败');
        }
    }

    // 显示加载状态
    showLoading() {
        const readerContent = document.getElementById('readerContent');
        if (readerContent) {
            readerContent.innerHTML = '<div class="loading">加载中</div>';
        }
    }

    // 隐藏加载状态
    hideLoading() {
        // 加载状态会在renderBook时被替换
    }

    // 显示错误信息
    showError(message) {
        this.showToast(message);
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

    // 切换到阅读器页面
    switchToReader() {
        const importPage = document.getElementById('importPage');
        const readerPage = document.getElementById('readerPage');
        
        importPage.style.display = 'none';
        readerPage.style.display = 'block';
    }

    // 返回导入页面
    goBack() {
        const importPage = document.getElementById('importPage');
        const readerPage = document.getElementById('readerPage');
        
        // 保存当前阅读进度
        this.reader.saveProgress();
        this.reader.stopReadingTimer();
        
        importPage.style.display = 'block';
        readerPage.style.display = 'none';
        
        // 更新最近阅读列表
        this.loadRecentBooks();
        this.renderRecentBooks();
    }

    // 添加到最近阅读
    addToRecentBooks(bookTitle, fileName) {
        // 移除已存在的相同书籍
        this.recentBooks = this.recentBooks.filter(book => book.title !== bookTitle);
        
        // 添加到列表开头
        this.recentBooks.unshift({
            title: bookTitle,
            fileName: fileName,
            lastRead: new Date().toISOString()
        });
        
        // 限制最近阅读数量为10本
        if (this.recentBooks.length > 10) {
            this.recentBooks = this.recentBooks.slice(0, 10);
        }
        
        // 保存到本地存储
        this.saveRecentBooks();
    }

    // 保存最近阅读
    saveRecentBooks() {
        localStorage.setItem('recentBooks', JSON.stringify(this.recentBooks));
    }

    // 加载最近阅读
    loadRecentBooks() {
        const recentBooks = localStorage.getItem('recentBooks');
        if (recentBooks) {
            this.recentBooks = JSON.parse(recentBooks);
        } else {
            this.recentBooks = [];
        }
    }

    // 渲染最近阅读
    renderRecentBooks() {
        const bookList = document.getElementById('bookList');
        if (!bookList) return;
        
        if (this.recentBooks.length === 0) {
            bookList.innerHTML = '<p style="text-align: center; color: #999; margin-top: 1rem;">暂无最近阅读记录</p>';
            return;
        }
        
        bookList.innerHTML = this.recentBooks.map(book => `
            <div class="book-item" data-title="${book.title}">
                <h3>${book.title}</h3>
                <p class="book-meta">
                    <small>${book.fileName}</small><br>
                    <small>最近阅读: ${new Date(book.lastRead).toLocaleString()}</small>
                </p>
            </div>
        `).join('');
        
        // 绑定点击事件
        document.querySelectorAll('.book-item').forEach(item => {
            item.addEventListener('click', () => {
                const bookTitle = item.dataset.title;
                this.openRecentBook(bookTitle);
            });
        });
    }

    // 打开最近阅读的书籍
    async openRecentBook(bookTitle) {
        // 在实际应用中，我们可以考虑将书籍内容保存到localStorage或IndexDB
        // 但由于localStorage容量限制，这里我们采用重新选择文件的方式
        // 对于大文件，建议使用IndexDB存储
        this.showToast('请重新选择文件以打开书籍');
        const fileInput = document.getElementById('fileInput');
        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                await this.processFile(file);
            }
        }, { once: true });
        fileInput.click();
    }
}

// 应用初始化
document.addEventListener('DOMContentLoaded', () => {
    new ReaderApp();
});