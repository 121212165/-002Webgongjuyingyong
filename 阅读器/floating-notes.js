// 悬浮笔记窗口组件
class FloatingNotesWindow {
    constructor() {
        this.notes = new Map();
        this.activeNote = null;
        this.noteCounter = 0;
        this.isDragging = false;
        this.isResizing = false;
        this.dragOffset = { x: 0, y: 0 };
        this.resizeHandle = null;
        
        this.init();
    }
    
    init() {
        this.createNotesContainer();
        this.setupEventListeners();
        this.loadNotesFromStorage();
    }
    
    createNotesContainer() {
        // 创建笔记容器
        this.container = document.createElement('div');
        this.container.id = 'floating-notes-container';
        this.container.className = 'floating-notes-container';
        document.body.appendChild(this.container);
        
        // 添加样式
        this.addStyles();
    }
    
    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .floating-notes-container {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
                z-index: 10000;
            }
            
            .floating-note {
                position: absolute;
                min-width: 250px;
                min-height: 150px;
                max-width: 600px;
                max-height: 500px;
                background: #fff;
                border: 1px solid #ddd;
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
                pointer-events: auto;
                display: flex;
                flex-direction: column;
                overflow: hidden;
                transition: box-shadow 0.2s ease;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            
            .floating-note:hover {
                box-shadow: 0 6px 25px rgba(0, 0, 0, 0.2);
            }
            
            .floating-note.active {
                border-color: #007acc;
                box-shadow: 0 6px 25px rgba(0, 122, 204, 0.3);
            }
            
            .floating-note.dragging {
                transform: rotate(2deg);
                box-shadow: 0 8px 30px rgba(0, 0, 0, 0.3);
                z-index: 10001;
            }
            
            .note-header {
                background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
                padding: 8px 12px;
                border-bottom: 1px solid #dee2e6;
                cursor: move;
                display: flex;
                justify-content: space-between;
                align-items: center;
                user-select: none;
                min-height: 36px;
            }
            
            .note-title {
                font-size: 0.9rem;
                font-weight: 600;
                color: #495057;
                flex: 1;
                margin-right: 8px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
            
            .note-controls {
                display: flex;
                gap: 4px;
                align-items: center;
            }
            
            .note-btn {
                width: 20px;
                height: 20px;
                border: none;
                background: none;
                cursor: pointer;
                border-radius: 3px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                color: #6c757d;
                transition: all 0.2s ease;
            }
            
            .note-btn:hover {
                background: rgba(0, 0, 0, 0.1);
                color: #495057;
            }
            
            .note-btn.minimize {
                color: #ffc107;
            }
            
            .note-btn.close {
                color: #dc3545;
            }
            
            .note-btn.close:hover {
                background: #dc3545;
                color: white;
            }
            
            .note-content {
                flex: 1;
                display: flex;
                flex-direction: column;
                overflow: hidden;
            }
            
            .note-textarea {
                flex: 1;
                border: none;
                outline: none;
                padding: 12px;
                font-size: 0.9rem;
                line-height: 1.5;
                resize: none;
                background: transparent;
                color: #212529;
                font-family: inherit;
            }
            
            .note-textarea::placeholder {
                color: #adb5bd;
            }
            
            .note-footer {
                padding: 8px 12px;
                background: #f8f9fa;
                border-top: 1px solid #dee2e6;
                font-size: 0.75rem;
                color: #6c757d;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .note-timestamp {
                font-size: 0.7rem;
            }
            
            .note-word-count {
                font-size: 0.7rem;
            }
            
            .resize-handle {
                position: absolute;
                width: 12px;
                height: 12px;
                background: #007acc;
                border-radius: 2px;
                opacity: 0;
                transition: opacity 0.2s ease;
            }
            
            .floating-note:hover .resize-handle {
                opacity: 0.6;
            }
            
            .resize-handle:hover {
                opacity: 1 !important;
            }
            
            .resize-handle.se {
                bottom: 2px;
                right: 2px;
                cursor: se-resize;
            }
            
            .resize-handle.sw {
                bottom: 2px;
                left: 2px;
                cursor: sw-resize;
            }
            
            .resize-handle.ne {
                top: 2px;
                right: 2px;
                cursor: ne-resize;
            }
            
            .resize-handle.nw {
                top: 2px;
                left: 2px;
                cursor: nw-resize;
            }
            
            .floating-note.minimized {
                height: 44px !important;
                min-height: 44px;
            }
            
            .floating-note.minimized .note-content,
            .floating-note.minimized .note-footer,
            .floating-note.minimized .resize-handle {
                display: none;
            }
            
            .notes-toolbar {
                position: fixed;
                top: 20px;
                right: 20px;
                background: white;
                border: 1px solid #ddd;
                border-radius: 6px;
                padding: 8px;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                display: flex;
                gap: 8px;
                z-index: 10002;
                pointer-events: auto;
            }
            
            .toolbar-btn {
                padding: 6px 12px;
                border: 1px solid #ddd;
                background: white;
                border-radius: 4px;
                cursor: pointer;
                font-size: 0.8rem;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                gap: 4px;
            }
            
            .toolbar-btn:hover {
                background: #f8f9fa;
                border-color: #007acc;
            }
            
            .toolbar-btn.active {
                background: #007acc;
                color: white;
                border-color: #007acc;
            }
            
            /* 颜色主题 */
            .floating-note.theme-yellow {
                background: #fff9c4;
            }
            
            .floating-note.theme-yellow .note-header {
                background: linear-gradient(135deg, #fff59d 0%, #ffeb3b 100%);
            }
            
            .floating-note.theme-green {
                background: #e8f5e8;
            }
            
            .floating-note.theme-green .note-header {
                background: linear-gradient(135deg, #c8e6c9 0%, #4caf50 100%);
                color: white;
            }
            
            .floating-note.theme-blue {
                background: #e3f2fd;
            }
            
            .floating-note.theme-blue .note-header {
                background: linear-gradient(135deg, #90caf9 0%, #2196f3 100%);
                color: white;
            }
            
            .floating-note.theme-pink {
                background: #fce4ec;
            }
            
            .floating-note.theme-pink .note-header {
                background: linear-gradient(135deg, #f8bbd9 0%, #e91e63 100%);
                color: white;
            }
            
            /* 动画效果 */
            @keyframes noteAppear {
                from {
                    opacity: 0;
                    transform: scale(0.8) translateY(-20px);
                }
                to {
                    opacity: 1;
                    transform: scale(1) translateY(0);
                }
            }
            
            .floating-note.appearing {
                animation: noteAppear 0.3s ease-out;
            }
            
            @keyframes noteDisappear {
                from {
                    opacity: 1;
                    transform: scale(1);
                }
                to {
                    opacity: 0;
                    transform: scale(0.8);
                }
            }
            
            .floating-note.disappearing {
                animation: noteDisappear 0.2s ease-in;
            }
        `;
        document.head.appendChild(style);
    }
    
    setupEventListeners() {
        // 全局鼠标事件
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
        document.addEventListener('mouseup', this.handleMouseUp.bind(this));
        
        // 键盘快捷键
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        
        // 创建工具栏
        this.createToolbar();
    }
    
    createToolbar() {
        const toolbar = document.createElement('div');
        toolbar.className = 'notes-toolbar';
        toolbar.innerHTML = `
            <button class="toolbar-btn" id="newNote">
                <span>📝</span> 新建笔记
            </button>
            <button class="toolbar-btn" id="toggleNotes">
                <span>👁️</span> 显示/隐藏
            </button>
            <button class="toolbar-btn" id="saveNotes">
                <span>💾</span> 保存
            </button>
            <button class="toolbar-btn" id="gitHistory">
                <span>📚</span> 版本历史
            </button>
        `;
        
        document.body.appendChild(toolbar);
        
        // 工具栏事件
        toolbar.addEventListener('click', (e) => {
            const target = e.target.closest('.toolbar-btn');
            if (!target) return;
            
            switch (target.id) {
                case 'newNote':
                    this.createNote();
                    break;
                case 'toggleNotes':
                    this.toggleAllNotes();
                    break;
                case 'saveNotes':
                    this.saveNotesToStorage();
                    break;
                case 'gitHistory':
                    this.showGitHistoryDialog();
                    break;
            }
        });
    }

    /**
     * 防抖处理Git保存
     * @param {string} noteId - 笔记ID
     */
    debounceGitSave(noteId) {
        if (!this.gitSaveTimers) {
            this.gitSaveTimers = new Map();
        }
        
        // 清除之前的定时器
        if (this.gitSaveTimers.has(noteId)) {
            clearTimeout(this.gitSaveTimers.get(noteId));
        }
        
        // 设置新的定时器，2秒后保存
        const timer = setTimeout(() => {
            this.saveNoteToGit(noteId);
            this.gitSaveTimers.delete(noteId);
        }, 2000);
        
        this.gitSaveTimers.set(noteId, timer);
    }

    /**
     * 显示Git历史对话框
     */
    async showGitHistoryDialog() {
        if (!this.activeNote) {
            this.showToast('请先选择一个笔记');
            return;
        }
        
        const history = await this.getNoteHistory(this.activeNote);
        if (history.length === 0) {
            this.showToast('没有找到版本历史');
            return;
        }
        
        // 创建历史对话框
        const dialog = document.createElement('div');
        dialog.className = 'git-history-dialog';
        dialog.innerHTML = `
            <div class="dialog-overlay"></div>
            <div class="dialog-content">
                <div class="dialog-header">
                    <h3>版本历史</h3>
                    <button class="dialog-close">×</button>
                </div>
                <div class="dialog-body">
                    <div class="history-list">
                        ${history.map(commit => `
                            <div class="history-item" data-sha="${commit.sha}">
                                <div class="commit-info">
                                    <div class="commit-message">${commit.message}</div>
                                    <div class="commit-meta">
                                        <span class="commit-date">${this.formatDate(commit.date)}</span>
                                        <span class="commit-author">${commit.author}</span>
                                    </div>
                                </div>
                                <button class="restore-btn" data-sha="${commit.sha}">恢复</button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        
        // 添加样式
        this.addGitHistoryStyles();
        
        document.body.appendChild(dialog);
        
        // 事件处理
        dialog.addEventListener('click', async (e) => {
            if (e.target.classList.contains('dialog-close') || e.target.classList.contains('dialog-overlay')) {
                dialog.remove();
            } else if (e.target.classList.contains('restore-btn')) {
                const sha = e.target.dataset.sha;
                await this.restoreNoteVersion(this.activeNote, sha);
                dialog.remove();
            }
        });
    }

    /**
     * 添加Git历史对话框样式
     */
    addGitHistoryStyles() {
        if (document.getElementById('git-history-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'git-history-styles';
        style.textContent = `
            .git-history-dialog {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 10004;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .dialog-overlay {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
            }
            
            .dialog-content {
                position: relative;
                background: white;
                border-radius: 8px;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
                width: 90%;
                max-width: 600px;
                max-height: 80%;
                display: flex;
                flex-direction: column;
            }
            
            .dialog-header {
                padding: 16px 20px;
                border-bottom: 1px solid #dee2e6;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .dialog-header h3 {
                margin: 0;
                font-size: 1.2rem;
                color: #333;
            }
            
            .dialog-close {
                background: none;
                border: none;
                font-size: 1.5rem;
                cursor: pointer;
                color: #666;
                padding: 0;
                width: 30px;
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 4px;
            }
            
            .dialog-close:hover {
                background: #f8f9fa;
                color: #333;
            }
            
            .dialog-body {
                flex: 1;
                overflow: auto;
                padding: 16px 20px;
            }
            
            .history-list {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }
            
            .history-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px;
                border: 1px solid #dee2e6;
                border-radius: 6px;
                background: #f8f9fa;
            }
            
            .commit-info {
                flex: 1;
            }
            
            .commit-message {
                font-weight: 500;
                color: #333;
                margin-bottom: 4px;
            }
            
            .commit-meta {
                font-size: 0.8rem;
                color: #666;
                display: flex;
                gap: 12px;
            }
            
            .restore-btn {
                padding: 6px 12px;
                background: #007acc;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 0.8rem;
                transition: background 0.2s ease;
            }
            
            .restore-btn:hover {
                background: #005a9e;
            }
        `;
        
        document.head.appendChild(style);
    }
    
    createNote(options = {}) {
        const noteId = 'note_' + (++this.noteCounter);
        const note = {
            id: noteId,
            title: options.title || '新建笔记',
            content: options.content || '',
            x: options.x || Math.random() * (window.innerWidth - 300) + 50,
            y: options.y || Math.random() * (window.innerHeight - 200) + 50,
            width: options.width || 300,
            height: options.height || 200,
            theme: options.theme || 'default',
            minimized: options.minimized || false,
            created: options.created || new Date().toISOString(),
            modified: new Date().toISOString()
        };
        
        this.notes.set(noteId, note);
        this.renderNote(note);
        this.setActiveNote(noteId);
        
        return noteId;
    }
    
    renderNote(note) {
        const noteElement = document.createElement('div');
        noteElement.className = `floating-note appearing ${note.theme ? 'theme-' + note.theme : ''} ${note.minimized ? 'minimized' : ''}`;
        noteElement.id = note.id;
        noteElement.style.left = note.x + 'px';
        noteElement.style.top = note.y + 'px';
        noteElement.style.width = note.width + 'px';
        noteElement.style.height = note.height + 'px';
        
        noteElement.innerHTML = `
            <div class="note-header">
                <div class="note-title" contenteditable="true">${note.title}</div>
                <div class="note-controls">
                    <button class="note-btn minimize" title="最小化">−</button>
                    <button class="note-btn close" title="关闭">×</button>
                </div>
            </div>
            <div class="note-content">
                <textarea class="note-textarea" placeholder="在这里输入笔记内容...">${note.content}</textarea>
            </div>
            <div class="note-footer">
                <span class="note-timestamp">${this.formatDate(note.modified)}</span>
                <span class="note-word-count">${this.getWordCount(note.content)} 字</span>
            </div>
            <div class="resize-handle se"></div>
            <div class="resize-handle sw"></div>
            <div class="resize-handle ne"></div>
            <div class="resize-handle nw"></div>
        `;
        
        this.container.appendChild(noteElement);
        this.setupNoteEvents(noteElement, note);
        
        // 移除出现动画类
        setTimeout(() => {
            noteElement.classList.remove('appearing');
        }, 300);
    }
    
    setupNoteEvents(noteElement, note) {
        const header = noteElement.querySelector('.note-header');
        const textarea = noteElement.querySelector('.note-textarea');
        const titleElement = noteElement.querySelector('.note-title');
        const minimizeBtn = noteElement.querySelector('.minimize');
        const closeBtn = noteElement.querySelector('.close');
        const resizeHandles = noteElement.querySelectorAll('.resize-handle');
        
        // 拖拽事件
        header.addEventListener('mousedown', (e) => {
            if (e.target.closest('.note-controls')) return;
            this.startDragging(noteElement, e);
        });
        
        // 点击激活
        noteElement.addEventListener('mousedown', () => {
            this.setActiveNote(note.id);
        });
        
        // 内容变化
        textarea.addEventListener('input', () => {
            note.content = textarea.value;
            note.modified = new Date().toISOString();
            this.updateNoteFooter(noteElement, note);
            
            // 自动保存到Git（防抖处理）
            this.debounceGitSave(note.id);
        });
        
        // 标题变化
        titleElement.addEventListener('input', () => {
            note.title = titleElement.textContent;
            note.modified = new Date().toISOString();
            
            // 自动保存到Git（防抖处理）
            this.debounceGitSave(note.id);
        });
        
        // 最小化
        minimizeBtn.addEventListener('click', () => {
            this.toggleMinimize(note.id);
        });
        
        // 关闭
        closeBtn.addEventListener('click', () => {
            this.closeNote(note.id);
        });
        
        // 调整大小
        resizeHandles.forEach(handle => {
            handle.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                this.startResizing(noteElement, e, handle.className.split(' ')[1]);
            });
        });
    }
    
    startDragging(noteElement, e) {
        this.isDragging = true;
        this.activeElement = noteElement;
        this.dragOffset.x = e.clientX - noteElement.offsetLeft;
        this.dragOffset.y = e.clientY - noteElement.offsetTop;
        
        noteElement.classList.add('dragging');
        document.body.style.userSelect = 'none';
    }
    
    startResizing(noteElement, e, direction) {
        this.isResizing = true;
        this.activeElement = noteElement;
        this.resizeDirection = direction;
        this.resizeStart = {
            x: e.clientX,
            y: e.clientY,
            width: noteElement.offsetWidth,
            height: noteElement.offsetHeight,
            left: noteElement.offsetLeft,
            top: noteElement.offsetTop
        };
        
        document.body.style.userSelect = 'none';
    }
    
    handleMouseMove(e) {
        if (this.isDragging && this.activeElement) {
            const x = e.clientX - this.dragOffset.x;
            const y = e.clientY - this.dragOffset.y;
            
            // 边界检查
            const maxX = window.innerWidth - this.activeElement.offsetWidth;
            const maxY = window.innerHeight - this.activeElement.offsetHeight;
            
            this.activeElement.style.left = Math.max(0, Math.min(maxX, x)) + 'px';
            this.activeElement.style.top = Math.max(0, Math.min(maxY, y)) + 'px';
            
            // 更新笔记数据
            const note = this.notes.get(this.activeElement.id);
            if (note) {
                note.x = parseInt(this.activeElement.style.left);
                note.y = parseInt(this.activeElement.style.top);
            }
        }
        
        if (this.isResizing && this.activeElement) {
            const deltaX = e.clientX - this.resizeStart.x;
            const deltaY = e.clientY - this.resizeStart.y;
            
            let newWidth = this.resizeStart.width;
            let newHeight = this.resizeStart.height;
            let newLeft = this.resizeStart.left;
            let newTop = this.resizeStart.top;
            
            switch (this.resizeDirection) {
                case 'se':
                    newWidth += deltaX;
                    newHeight += deltaY;
                    break;
                case 'sw':
                    newWidth -= deltaX;
                    newHeight += deltaY;
                    newLeft += deltaX;
                    break;
                case 'ne':
                    newWidth += deltaX;
                    newHeight -= deltaY;
                    newTop += deltaY;
                    break;
                case 'nw':
                    newWidth -= deltaX;
                    newHeight -= deltaY;
                    newLeft += deltaX;
                    newTop += deltaY;
                    break;
            }
            
            // 最小尺寸限制
            newWidth = Math.max(250, newWidth);
            newHeight = Math.max(150, newHeight);
            
            // 最大尺寸限制
            newWidth = Math.min(600, newWidth);
            newHeight = Math.min(500, newHeight);
            
            this.activeElement.style.width = newWidth + 'px';
            this.activeElement.style.height = newHeight + 'px';
            this.activeElement.style.left = newLeft + 'px';
            this.activeElement.style.top = newTop + 'px';
            
            // 更新笔记数据
            const note = this.notes.get(this.activeElement.id);
            if (note) {
                note.width = newWidth;
                note.height = newHeight;
                note.x = newLeft;
                note.y = newTop;
            }
        }
    }
    
    handleMouseUp() {
        if (this.isDragging) {
            this.isDragging = false;
            if (this.activeElement) {
                this.activeElement.classList.remove('dragging');
                this.activeElement = null;
            }
        }
        
        if (this.isResizing) {
            this.isResizing = false;
            this.activeElement = null;
            this.resizeDirection = null;
        }
        
        document.body.style.userSelect = '';
    }
    
    handleKeyDown(e) {
        // Ctrl+N: 新建笔记
        if (e.ctrlKey && e.key === 'n') {
            e.preventDefault();
            this.createNote();
        }
        
        // Ctrl+S: 保存笔记
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            this.saveNotesToStorage();
        }
        
        // Escape: 取消当前操作
        if (e.key === 'Escape') {
            if (this.isDragging || this.isResizing) {
                this.handleMouseUp();
            }
        }
    }
    
    setActiveNote(noteId) {
        // 移除所有活动状态
        document.querySelectorAll('.floating-note.active').forEach(note => {
            note.classList.remove('active');
        });
        
        // 设置新的活动笔记
        const noteElement = document.getElementById(noteId);
        if (noteElement) {
            noteElement.classList.add('active');
            this.activeNote = noteId;
        }
    }
    
    toggleMinimize(noteId) {
        const note = this.notes.get(noteId);
        const noteElement = document.getElementById(noteId);
        
        if (note && noteElement) {
            note.minimized = !note.minimized;
            noteElement.classList.toggle('minimized', note.minimized);
            
            const minimizeBtn = noteElement.querySelector('.minimize');
            minimizeBtn.textContent = note.minimized ? '+' : '−';
            minimizeBtn.title = note.minimized ? '展开' : '最小化';
        }
    }
    
    closeNote(noteId) {
        const noteElement = document.getElementById(noteId);
        if (noteElement) {
            noteElement.classList.add('disappearing');
            setTimeout(() => {
                noteElement.remove();
                this.notes.delete(noteId);
                if (this.activeNote === noteId) {
                    this.activeNote = null;
                }
            }, 200);
        }
    }
    
    toggleAllNotes() {
        const allNotes = document.querySelectorAll('.floating-note');
        const isVisible = allNotes.length > 0 && allNotes[0].style.display !== 'none';
        
        allNotes.forEach(note => {
            note.style.display = isVisible ? 'none' : 'flex';
        });
    }
    
    updateNoteFooter(noteElement, note) {
        const timestamp = noteElement.querySelector('.note-timestamp');
        const wordCount = noteElement.querySelector('.note-word-count');
        
        if (timestamp) {
            timestamp.textContent = this.formatDate(note.modified);
        }
        
        if (wordCount) {
            wordCount.textContent = this.getWordCount(note.content) + ' 字';
        }
    }
    
    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) { // 1分钟内
            return '刚刚';
        } else if (diff < 3600000) { // 1小时内
            return Math.floor(diff / 60000) + '分钟前';
        } else if (diff < 86400000) { // 24小时内
            return Math.floor(diff / 3600000) + '小时前';
        } else {
            return date.toLocaleDateString();
        }
    }
    
    getWordCount(text) {
        return text.trim().length;
    }
    
    // 存储相关方法
    async saveNotesToStorage() {
        const notesData = Array.from(this.notes.values());
        localStorage.setItem('floating-notes', JSON.stringify(notesData));
        
        // 同时保存到Git版本控制
        try {
            if (window.electronAPI) {
                const result = await window.electronAPI.invoke('git-save-notes', notesData);
                if (result.success) {
                    this.showToast('笔记已保存并提交到版本控制');
                } else {
                    this.showToast('笔记已保存，但版本控制提交失败');
                }
            } else {
                this.showToast('笔记已保存');
            }
        } catch (error) {
            console.error('Git保存失败:', error);
            this.showToast('笔记已保存');
        }
        
        // 触发云同步
        if (typeof cloudSync !== 'undefined' && cloudSync.userId) {
            cloudSync.manualSync();
        }
    }

    /**
     * 保存单个笔记到Git版本控制
     * @param {string} noteId - 笔记ID
     */
    async saveNoteToGit(noteId) {
        const note = this.notes.get(noteId);
        if (!note || !window.electronAPI) return;

        try {
            const result = await window.electronAPI.invoke('git-save-note', noteId, note);
            if (result.success) {
                console.log('笔记已保存到Git版本控制');
            } else {
                console.warn('Git保存失败:', result.error);
            }
        } catch (error) {
            console.error('Git保存笔记失败:', error);
        }
    }

    /**
     * 获取笔记的版本历史
     * @param {string} noteId - 笔记ID
     */
    async getNoteHistory(noteId) {
        if (!window.electronAPI) return [];
        
        try {
            const result = await window.electronAPI.invoke('git-history', 20);
            if (result.success) {
                // 过滤出与该笔记相关的提交
                const noteCommits = result.commits.filter(commit => 
                    commit.message.includes(noteId) || 
                    commit.message.includes('笔记')
                );
                return noteCommits;
            }
            return [];
        } catch (error) {
            console.error('获取笔记历史失败:', error);
            return [];
        }
    }

    /**
     * 恢复笔记到指定版本
     * @param {string} noteId - 笔记ID
     * @param {string} commitSha - 提交SHA
     */
    async restoreNoteVersion(noteId, commitSha) {
        if (!window.electronAPI) return;
        
        try {
            const result = await window.electronAPI.invoke('git-restore-note', noteId, commitSha);
            if (result.success) {
                // 更新当前笔记数据
                const note = this.notes.get(noteId);
                if (note) {
                    Object.assign(note, result.data);
                    const noteElement = document.getElementById(noteId);
                    if (noteElement) {
                        this.updateNoteElement(noteElement, note);
                    }
                    this.showToast('笔记已恢复到指定版本');
                }
            } else {
                this.showToast('恢复笔记版本失败: ' + result.error);
            }
        } catch (error) {
            console.error('恢复笔记版本失败:', error);
            this.showToast('恢复笔记版本失败');
        }
    }

    /**
     * 更新笔记元素内容
     * @param {HTMLElement} noteElement - 笔记DOM元素
     * @param {Object} note - 笔记数据
     */
    updateNoteElement(noteElement, note) {
        const titleElement = noteElement.querySelector('.note-title');
        const textarea = noteElement.querySelector('.note-textarea');
        
        if (titleElement) {
            titleElement.textContent = note.title;
        }
        if (textarea) {
            textarea.value = note.content;
        }
        
        this.updateNoteFooter(noteElement, note);
    }
    
    loadNotesFromStorage() {
        try {
            const savedNotes = localStorage.getItem('floating-notes');
            if (savedNotes) {
                const notesData = JSON.parse(savedNotes);
                notesData.forEach(noteData => {
                    this.noteCounter = Math.max(this.noteCounter, parseInt(noteData.id.split('_')[1]) || 0);
                    this.notes.set(noteData.id, noteData);
                    this.renderNote(noteData);
                });
            }
        } catch (error) {
            console.error('加载笔记失败:', error);
        }
    }
    
    showToast(message) {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #333;
            color: white;
            padding: 12px 24px;
            border-radius: 6px;
            z-index: 10003;
            font-size: 0.9rem;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => toast.style.opacity = '1', 10);
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }
    
    // 公共API
    createNoteAt(x, y, content = '') {
        return this.createNote({ x, y, content });
    }
    
    getNoteById(noteId) {
        return this.notes.get(noteId);
    }
    
    getAllNotes() {
        return Array.from(this.notes.values());
    }
    
    clearAllNotes() {
        this.notes.forEach((note, id) => {
            this.closeNote(id);
        });
    }
    
    destroy() {
        this.clearAllNotes();
        if (this.container) {
            this.container.remove();
        }
        
        // 清除Git保存定时器
        if (this.gitSaveTimers) {
            this.gitSaveTimers.forEach(timer => clearTimeout(timer));
            this.gitSaveTimers.clear();
        }
        
        // 移除事件监听
        document.removeEventListener('mousemove', this.handleMouseMove);
        document.removeEventListener('mouseup', this.handleMouseUp);
        document.removeEventListener('keydown', this.handleKeyDown);
    }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FloatingNotesWindow;
} else {
    window.FloatingNotesWindow = FloatingNotesWindow;
}