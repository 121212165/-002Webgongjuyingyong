const { ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

// 全局变量
let currentFile = null;
let currentZoom = 100;
let fileList = [];
let floatingNotes = null;
let textHighlighter = null;
let fontManager = null;
let themeManager = null;

// DOM 元素
const elements = {
    fileList: document.getElementById('fileList'),
    readingContent: document.getElementById('readingContent'),
    currentFileName: document.getElementById('currentFileName'),
    zoomLevel: document.getElementById('zoomLevel'),
    statusText: document.getElementById('statusText'),
    pageInfo: document.getElementById('pageInfo'),
    wordCount: document.getElementById('wordCount'),
    loadingOverlay: document.getElementById('loadingOverlay'),
    notification: document.getElementById('notification'),
    uploadZone: document.getElementById('uploadZone')
};

// 初始化应用
async function initialize() {
    setupEventListeners();
    loadRecentFiles();
    initializeFloatingNotes();
    initializeTextHighlighter();
    initializeFontManager();
    initializeThemeManager();
    await initializeGit();
    updateStatus('应用已就绪');
}

// 初始化悬浮笔记
function initializeFloatingNotes() {
    try {
        floatingNotes = new FloatingNotesWindow();
        console.log('悬浮笔记初始化成功');
    } catch (error) {
        console.error('悬浮笔记初始化失败:', error);
    }
}

// 初始化文本高亮
function initializeTextHighlighter() {
    try {
        textHighlighter = new TextHighlighter();
        console.log('文本高亮初始化成功');
    } catch (error) {
        console.error('文本高亮初始化失败:', error);
    }
}

// 初始化字体管理// 初始化字体管理器
function initializeFontManager() {
    try {
        fontManager = new FontManager();
        console.log('字体管理器初始化成功');
    } catch (error) {
        console.error('字体管理器初始化失败:', error);
    }
}

// 初始化主题管理器
function initializeThemeManager() {
    try {
        themeManager = new ThemeManager();
        console.log('主题管理器初始化成功');
    } catch (error) {
        console.error('主题管理器初始化失败:', error);
    }
} 初始化Git版本管理
async function initializeGit() {
    try {
        if (window.electronAPI) {
            const result = await window.electronAPI.invoke('git-init');
            if (result.success) {
                console.log('Git版本管理初始化成功');
            } else {
                console.warn('Git版本管理初始化失败:', result.error);
            }
        }
    } catch (error) {
        console.error('Git版本管理初始化失败:', error);
    }
}

// 设置事件监听器
function setupEventListeners() {
    // 文件操作按钮
    document.getElementById('openFileBtn').addEventListener('click', openFileDialog);
    document.getElementById('notesBtn').addEventListener('click', openNotesWindow);
    document.getElementById('settingsBtn').addEventListener('click', openSettings);
    
    // 缩放控制
    document.getElementById('zoomInBtn').addEventListener('click', () => changeZoom(10));
    document.getElementById('zoomOutBtn').addEventListener('click', () => changeZoom(-10));
    
    // 悬浮笔记控制
    document.getElementById('newNote').addEventListener('click', () => {
        if (floatingNotes) {
            floatingNotes.createNote();
        }
    });
    
    document.getElementById('toggleNotes').addEventListener('click', () => {
        if (floatingNotes) {
            floatingNotes.toggleVisibility();
        }
    });
    
    // 文本高亮控制
    document.getElementById('toggleHighlight').addEventListener('click', () => {
        if (textHighlighter) {
            textHighlighter.toggleHighlightMode();
        }
    });
    
    document.getElementById('clearHighlights').addEventListener('click', () => {
        if (textHighlighter) {
            textHighlighter.clearAllHighlights();
        }
    });
    
    // 字体设置控制
    document.getElementById('fontSettings').addEventListener('click', () => {
        if (fontManager) {
            fontManager.toggleFontPanel();
        }
    });
    
    // 主题设置控制
    document.getElementById('themeSettings').addEventListener('click', () => {
        if (themeManager) {
            themeManager.toggleThemePanel();
        }
    });
    
    // 工具按钮
    document.getElementById('highlightBtn').addEventListener('click', toggleHighlight);
    document.getElementById('noteBtn').addEventListener('click', addNote);
    
    // 拖拽上传
    setupDragAndDrop();
    
    // 键盘快捷键
    document.addEventListener('keydown', handleKeyboardShortcuts);
    
    // IPC 事件监听
    ipcRenderer.on('file-opened', (event, filePath) => {
        loadFile(filePath);
    });
}

// 设置拖拽上传
function setupDragAndDrop() {
    const uploadZone = elements.uploadZone;
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadZone.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });
    
    ['dragenter', 'dragover'].forEach(eventName => {
        uploadZone.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        uploadZone.addEventListener(eventName, unhighlight, false);
    });
    
    uploadZone.addEventListener('drop', handleDrop, false);
    uploadZone.addEventListener('click', openFileDialog);
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    function highlight(e) {
        uploadZone.classList.add('dragover');
    }
    
    function unhighlight(e) {
        uploadZone.classList.remove('dragover');
    }
    
    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        
        if (files.length > 0) {
            const file = files[0];
            loadFile(file.path);
        }
    }
}

// 打开文件对话框
async function openFileDialog() {
    try {
        const result = await ipcRenderer.invoke('show-open-dialog', {
            properties: ['openFile'],
            filters: [
                { name: 'All Supported', extensions: ['pdf', 'epub', 'txt', 'md'] },
                { name: 'PDF Files', extensions: ['pdf'] },
                { name: 'EPUB Files', extensions: ['epub'] },
                { name: 'Text Files', extensions: ['txt', 'md'] }
            ]
        });
        
        if (!result.canceled && result.filePaths.length > 0) {
            loadFile(result.filePaths[0]);
        }
    } catch (error) {
        showNotification('打开文件失败: ' + error.message, 'error');
    }
}

// 加载文件
async function loadFile(filePath) {
    if (!fs.existsSync(filePath)) {
        showNotification('文件不存在', 'error');
        return;
    }
    
    showLoading(true);
    updateStatus('正在加载文件...');
    
    try {
        const fileExt = path.extname(filePath).toLowerCase();
        const fileName = path.basename(filePath);
        
        currentFile = {
            path: filePath,
            name: fileName,
            ext: fileExt,
            size: fs.statSync(filePath).size
        };
        
        // 根据文件类型加载
        switch (fileExt) {
            case '.pdf':
                await loadPDF(filePath);
                break;
            case '.epub':
                await loadEPUB(filePath);
                break;
            case '.txt':
            case '.md':
                await loadTextFile(filePath);
                break;
            default:
                throw new Error('不支持的文件格式');
        }
        
        // 更新界面
        elements.currentFileName.textContent = fileName;
        addToRecentFiles(currentFile);
        updateFileList();
        updateStatus(`已加载: ${fileName}`);
        showNotification('文件加载成功', 'success');
        
    } catch (error) {
        console.error('加载文件失败:', error);
        showNotification('加载文件失败: ' + error.message, 'error');
        updateStatus('加载失败');
    } finally {
        showLoading(false);
    }
}

// 加载PDF文件
async function loadPDF(filePath) {
    try {
        // 清空内容区域
        elements.readingContent.innerHTML = '';
        
        // 创建PDF渲染器
        const PDFRenderer = require('./pdf-renderer.js');
        const pdfRenderer = new PDFRenderer(elements.readingContent);
        
        // 加载PDF文件
        const result = await pdfRenderer.loadPDF(filePath);
        
        // 更新页面信息
        elements.pageInfo.textContent = `第 1 页，共 ${result.totalPages} 页`;
        updateWordCount(`PDF文档 (${result.totalPages} 页)`);
        
        // 保存渲染器实例以供后续使用
        currentFile.renderer = pdfRenderer;
        
        // 初始化文本高亮
        if (textHighlighter) {
            textHighlighter.initializeForDocument(filePath, 'pdf');
        }
        
        return result;
        
    } catch (error) {
        console.error('PDF加载失败:', error);
        elements.readingContent.innerHTML = `
            <div class="error-message" style="text-align: center; padding: 2rem; color: #e74c3c;">
                <h3>PDF加载失败</h3>
                <p>${error.message}</p>
                <p style="font-size: 0.9rem; opacity: 0.7; margin-top: 1rem;">文件路径: ${filePath}</p>
            </div>
        `;
        throw error;
    }
}

// 加载EPUB文件
async function loadEPUB(filePath) {
    console.log('加载EPUB文件:', filePath);
    
    try {
        // 创建EPUB渲染器实例
        if (window.epubRenderer) {
            window.epubRenderer.destroy();
        }
        
        const EPUBRenderer = require('./epub-renderer.js');
        window.epubRenderer = new EPUBRenderer(elements.readingContent);
        
        // 加载EPUB文件
        const result = await window.epubRenderer.loadEPUB(filePath);
        
        console.log('EPUB加载成功:', result);
        
        // 更新页面信息
        elements.pageInfo.textContent = `第 1 章，共 ${result.totalChapters} 章`;
        updateWordCount(`EPUB文档 (${result.totalChapters} 章)`);
        
        // 保存渲染器实例以供后续使用
        currentFile.renderer = window.epubRenderer;
        
        // 初始化文本高亮
        if (textHighlighter) {
            textHighlighter.initializeForDocument(filePath, 'epub');
        }
        
        return result;
        
    } catch (error) {
        console.error('EPUB加载失败:', error);
        elements.readingContent.innerHTML = `
            <div class="error-message" style="text-align: center; padding: 2rem; color: #e74c3c;">
                <h3>EPUB加载失败</h3>
                <p>${error.message}</p>
                <p style="font-size: 0.9rem; opacity: 0.7; margin-top: 1rem;">文件路径: ${filePath}</p>
            </div>
        `;
        throw error;
    }
}

// 加载文本文件
async function loadTextFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const isMarkdown = path.extname(filePath).toLowerCase() === '.md';
    
    let htmlContent;
    if (isMarkdown) {
        // 简单的Markdown渲染（后续可以集成更完整的Markdown解析器）
        htmlContent = content
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br>');
    } else {
        htmlContent = content.replace(/\n/g, '<br>');
    }
    
    elements.readingContent.innerHTML = `
        <div class="text-content" style="line-height: 1.8; font-size: 16px; max-width: 800px; margin: 0 auto;">
            ${htmlContent}
        </div>
    `;
    
    const wordCount = content.length;
    updateWordCount(`${wordCount} 字符`);
}

// 缩放控制
function changeZoom(delta) {
    currentZoom = Math.max(50, Math.min(200, currentZoom + delta));
    elements.zoomLevel.textContent = currentZoom + '%';
    
    const content = elements.readingContent.querySelector('.text-content, .pdf-container, .epub-container');
    if (content) {
        content.style.transform = `scale(${currentZoom / 100})`;
        content.style.transformOrigin = 'top left';
    }
}

// 切换高亮模式
function toggleHighlight() {
    // 实现文本高亮功能
    showNotification('高亮功能开发中...', 'warning');
}

// 添加笔记
function addNote() {
    // 打开笔记窗口
    openNotesWindow();
}

// 打开笔记窗口
function openNotesWindow() {
    // 通过IPC请求主进程创建笔记窗口
    showNotification('笔记功能开发中...', 'warning');
}

// 打开设置
function openSettings() {
    showNotification('设置功能开发中...', 'warning');
}

// 键盘快捷键处理
function handleKeyboardShortcuts(e) {
    if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
            case 'o':
                e.preventDefault();
                openFileDialog();
                break;
            case '=':
            case '+':
                e.preventDefault();
                changeZoom(10);
                break;
            case '-':
                e.preventDefault();
                changeZoom(-10);
                break;
            case '0':
                e.preventDefault();
                currentZoom = 100;
                changeZoom(0);
                break;
        }
    }
}

// 最近文件管理
function addToRecentFiles(file) {
    // 移除重复项
    fileList = fileList.filter(f => f.path !== file.path);
    // 添加到开头
    fileList.unshift(file);
    // 限制数量
    fileList = fileList.slice(0, 10);
    
    // 保存到本地存储
    ipcRenderer.invoke('store-set', 'recentFiles', fileList);
}

async function loadRecentFiles() {
    try {
        const recent = await ipcRenderer.invoke('store-get', 'recentFiles');
        if (recent && Array.isArray(recent)) {
            fileList = recent.filter(file => fs.existsSync(file.path));
            updateFileList();
        }
    } catch (error) {
        console.error('加载最近文件失败:', error);
    }
}

// 更新文件列表显示
function updateFileList() {
    elements.fileList.innerHTML = '';
    
    if (fileList.length === 0) {
        elements.fileList.innerHTML = '<li style="padding: 1rem; text-align: center; color: #999;">暂无最近文件</li>';
        return;
    }
    
    fileList.forEach((file, index) => {
        const li = document.createElement('li');
        li.className = 'file-item';
        if (currentFile && currentFile.path === file.path) {
            li.classList.add('active');
        }
        
        li.innerHTML = `
            <div class="file-name">${file.name}</div>
            <div class="file-meta">${formatFileSize(file.size)} • ${file.ext.toUpperCase()}</div>
        `;
        
        li.addEventListener('click', () => {
            loadFile(file.path);
        });
        
        elements.fileList.appendChild(li);
    });
}

// 工具函数
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function updateStatus(text) {
    elements.statusText.textContent = text;
}

function updateWordCount(text) {
    elements.wordCount.textContent = text;
}

function showLoading(show) {
    elements.loadingOverlay.style.display = show ? 'flex' : 'none';
}

function showNotification(message, type = 'info') {
    const notification = elements.notification;
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// 应用启动
document.addEventListener('DOMContentLoaded', initApp);

// 导出供其他模块使用
window.ReaderApp = {
    loadFile,
    currentFile,
    showNotification,
    updateStatus
};