/**
 * 文本高亮标记模块
 * 实现文本选择和多颜色高亮标记功能
 */

class TextHighlighter {
    constructor(container) {
        this.container = container;
        this.highlights = new Map(); // 存储高亮数据
        this.currentColor = '#ffff00'; // 默认黄色
        this.isHighlightMode = false;
        this.colors = [
            { name: '黄色', value: '#ffff00', class: 'highlight-yellow' },
            { name: '绿色', value: '#90ee90', class: 'highlight-green' },
            { name: '蓝色', value: '#87ceeb', class: 'highlight-blue' },
            { name: '粉色', value: '#ffb6c1', class: 'highlight-pink' },
            { name: '橙色', value: '#ffa500', class: 'highlight-orange' },
            { name: '紫色', value: '#dda0dd', class: 'highlight-purple' }
        ];
        
        this.init();
    }

    /**
     * 初始化高亮功能
     */
    init() {
        this.addStyles();
        this.setupEventListeners();
        this.createColorPalette();
        this.loadHighlights();
    }

    /**
     * 添加高亮样式
     */
    addStyles() {
        if (document.getElementById('text-highlighter-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'text-highlighter-styles';
        style.textContent = `
            .highlight-yellow {
                background-color: #ffff00;
                padding: 1px 2px;
                border-radius: 2px;
                cursor: pointer;
                position: relative;
            }
            
            .highlight-green {
                background-color: #90ee90;
                padding: 1px 2px;
                border-radius: 2px;
                cursor: pointer;
                position: relative;
            }
            
            .highlight-blue {
                background-color: #87ceeb;
                padding: 1px 2px;
                border-radius: 2px;
                cursor: pointer;
                position: relative;
            }
            
            .highlight-pink {
                background-color: #ffb6c1;
                padding: 1px 2px;
                border-radius: 2px;
                cursor: pointer;
                position: relative;
            }
            
            .highlight-orange {
                background-color: #ffa500;
                padding: 1px 2px;
                border-radius: 2px;
                cursor: pointer;
                position: relative;
            }
            
            .highlight-purple {
                background-color: #dda0dd;
                padding: 1px 2px;
                border-radius: 2px;
                cursor: pointer;
                position: relative;
            }
            
            .highlight-tooltip {
                position: absolute;
                top: -30px;
                left: 50%;
                transform: translateX(-50%);
                background: #333;
                color: white;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 12px;
                white-space: nowrap;
                z-index: 1000;
                opacity: 0;
                pointer-events: none;
                transition: opacity 0.2s ease;
            }
            
            .highlight-tooltip::after {
                content: '';
                position: absolute;
                top: 100%;
                left: 50%;
                transform: translateX(-50%);
                border: 4px solid transparent;
                border-top-color: #333;
            }
            
            .highlight-tooltip.show {
                opacity: 1;
            }
            
            .color-palette {
                position: fixed;
                background: white;
                border: 1px solid #ddd;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                padding: 8px;
                z-index: 10000;
                display: none;
                flex-wrap: wrap;
                gap: 4px;
                width: 200px;
            }
            
            .color-palette.show {
                display: flex;
            }
            
            .color-option {
                width: 24px;
                height: 24px;
                border-radius: 4px;
                cursor: pointer;
                border: 2px solid transparent;
                transition: all 0.2s ease;
                position: relative;
            }
            
            .color-option:hover {
                transform: scale(1.1);
                border-color: #333;
            }
            
            .color-option.active {
                border-color: #007acc;
                box-shadow: 0 0 0 2px rgba(0, 122, 204, 0.3);
            }
            
            .color-option::after {
                content: attr(data-name);
                position: absolute;
                top: -30px;
                left: 50%;
                transform: translateX(-50%);
                background: #333;
                color: white;
                padding: 2px 6px;
                border-radius: 3px;
                font-size: 10px;
                white-space: nowrap;
                opacity: 0;
                pointer-events: none;
                transition: opacity 0.2s ease;
            }
            
            .color-option:hover::after {
                opacity: 1;
            }
            
            .highlight-controls {
                position: fixed;
                top: 10px;
                right: 10px;
                background: white;
                border: 1px solid #ddd;
                border-radius: 6px;
                padding: 8px;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                z-index: 9999;
                display: flex;
                gap: 8px;
                align-items: center;
            }
            
            .highlight-btn {
                padding: 6px 12px;
                border: 1px solid #ddd;
                border-radius: 4px;
                background: white;
                cursor: pointer;
                font-size: 12px;
                transition: all 0.2s ease;
            }
            
            .highlight-btn:hover {
                background: #f5f5f5;
            }
            
            .highlight-btn.active {
                background: #007acc;
                color: white;
                border-color: #007acc;
            }
            
            .current-color {
                width: 20px;
                height: 20px;
                border-radius: 3px;
                border: 1px solid #ddd;
                cursor: pointer;
            }
            
            .highlight-mode-indicator {
                position: fixed;
                top: 50px;
                right: 10px;
                background: #007acc;
                color: white;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 12px;
                z-index: 9998;
                display: none;
            }
            
            .highlight-mode-indicator.show {
                display: block;
            }
        `;
        
        document.head.appendChild(style);
    }

    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 监听文本选择
        document.addEventListener('mouseup', (e) => {
            if (this.isHighlightMode) {
                this.handleTextSelection(e);
            }
        });

        // 监听高亮元素点击
        this.container.addEventListener('click', (e) => {
            if (e.target.classList.contains('text-highlight')) {
                this.showHighlightMenu(e.target, e);
            }
        });

        // 监听高亮元素悬停
        this.container.addEventListener('mouseover', (e) => {
            if (e.target.classList.contains('text-highlight')) {
                this.showTooltip(e.target);
            }
        });

        this.container.addEventListener('mouseout', (e) => {
            if (e.target.classList.contains('text-highlight')) {
                this.hideTooltip(e.target);
            }
        });

        // 监听键盘快捷键
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'h') {
                e.preventDefault();
                this.toggleHighlightMode();
            }
            if (e.key === 'Escape') {
                this.hideColorPalette();
                this.setHighlightMode(false);
            }
        });
    }

    /**
     * 创建颜色选择面板
     */
    createColorPalette() {
        const palette = document.createElement('div');
        palette.className = 'color-palette';
        palette.id = 'color-palette';
        
        this.colors.forEach(color => {
            const option = document.createElement('div');
            option.className = 'color-option';
            option.style.backgroundColor = color.value;
            option.dataset.color = color.value;
            option.dataset.class = color.class;
            option.dataset.name = color.name;
            
            if (color.value === this.currentColor) {
                option.classList.add('active');
            }
            
            option.addEventListener('click', () => {
                this.selectColor(color.value, color.class);
                this.hideColorPalette();
            });
            
            palette.appendChild(option);
        });
        
        document.body.appendChild(palette);
    }

    /**
     * 创建高亮控制面板
     */
    createHighlightControls() {
        if (document.getElementById('highlight-controls')) return;
        
        const controls = document.createElement('div');
        controls.className = 'highlight-controls';
        controls.id = 'highlight-controls';
        
        controls.innerHTML = `
            <button class="highlight-btn" id="toggle-highlight" title="切换高亮模式 (Ctrl+H)">
                🖍️ 高亮
            </button>
            <div class="current-color" id="current-color" title="选择颜色"></div>
            <button class="highlight-btn" id="clear-highlights" title="清除所有高亮">
                🗑️ 清除
            </button>
        `;
        
        document.body.appendChild(controls);
        
        // 更新当前颜色显示
        this.updateCurrentColorDisplay();
        
        // 绑定事件
        document.getElementById('toggle-highlight').addEventListener('click', () => {
            this.toggleHighlightMode();
        });
        
        document.getElementById('current-color').addEventListener('click', (e) => {
            this.showColorPalette(e);
        });
        
        document.getElementById('clear-highlights').addEventListener('click', () => {
            this.clearAllHighlights();
        });
    }

    /**
     * 创建高亮模式指示器
     */
    createModeIndicator() {
        if (document.getElementById('highlight-mode-indicator')) return;
        
        const indicator = document.createElement('div');
        indicator.className = 'highlight-mode-indicator';
        indicator.id = 'highlight-mode-indicator';
        indicator.textContent = '高亮模式已启用 - 选择文本进行高亮';
        
        document.body.appendChild(indicator);
    }

    /**
     * 处理文本选择
     */
    handleTextSelection(e) {
        const selection = window.getSelection();
        if (selection.rangeCount === 0 || selection.isCollapsed) return;
        
        const range = selection.getRangeAt(0);
        const selectedText = selection.toString().trim();
        
        if (selectedText.length === 0) return;
        
        // 检查选择是否在容器内
        if (!this.container.contains(range.commonAncestorContainer)) return;
        
        this.createHighlight(range, selectedText);
        selection.removeAllRanges();
    }

    /**
     * 创建高亮
     */
    createHighlight(range, text) {
        try {
            const highlightId = this.generateHighlightId();
            const colorClass = this.getCurrentColorClass();
            
            // 创建高亮元素
            const highlight = document.createElement('span');
            highlight.className = `text-highlight ${colorClass}`;
            highlight.dataset.highlightId = highlightId;
            highlight.dataset.originalText = text;
            highlight.dataset.color = this.currentColor;
            highlight.dataset.timestamp = new Date().toISOString();
            
            // 包装选中的内容
            range.surroundContents(highlight);
            
            // 存储高亮数据
            this.highlights.set(highlightId, {
                id: highlightId,
                text: text,
                color: this.currentColor,
                colorClass: colorClass,
                timestamp: new Date().toISOString(),
                element: highlight
            });
            
            // 保存到本地存储
            this.saveHighlights();
            
            console.log('创建高亮:', { id: highlightId, text: text.substring(0, 50) + '...' });
        } catch (error) {
            console.error('创建高亮失败:', error);
            this.showNotification('高亮创建失败，请重新选择文本', 'error');
        }
    }

    /**
     * 显示颜色选择面板
     */
    showColorPalette(e) {
        const palette = document.getElementById('color-palette');
        if (!palette) return;
        
        palette.style.left = e.pageX + 'px';
        palette.style.top = (e.pageY + 10) + 'px';
        palette.classList.add('show');
        
        // 点击其他地方隐藏面板
        setTimeout(() => {
            document.addEventListener('click', this.hideColorPaletteHandler, { once: true });
        }, 100);
    }

    /**
     * 隐藏颜色选择面板
     */
    hideColorPalette() {
        const palette = document.getElementById('color-palette');
        if (palette) {
            palette.classList.remove('show');
        }
    }

    hideColorPaletteHandler = (e) => {
        const palette = document.getElementById('color-palette');
        if (palette && !palette.contains(e.target)) {
            this.hideColorPalette();
        }
    }

    /**
     * 选择颜色
     */
    selectColor(color, colorClass) {
        this.currentColor = color;
        this.currentColorClass = colorClass;
        
        // 更新颜色选项的激活状态
        document.querySelectorAll('.color-option').forEach(option => {
            option.classList.toggle('active', option.dataset.color === color);
        });
        
        this.updateCurrentColorDisplay();
    }

    /**
     * 更新当前颜色显示
     */
    updateCurrentColorDisplay() {
        const colorDisplay = document.getElementById('current-color');
        if (colorDisplay) {
            colorDisplay.style.backgroundColor = this.currentColor;
        }
    }

    /**
     * 获取当前颜色类名
     */
    getCurrentColorClass() {
        const colorObj = this.colors.find(c => c.value === this.currentColor);
        return colorObj ? colorObj.class : 'highlight-yellow';
    }

    /**
     * 切换高亮模式
     */
    toggleHighlightMode() {
        this.setHighlightMode(!this.isHighlightMode);
    }

    /**
     * 设置高亮模式
     */
    setHighlightMode(enabled) {
        this.isHighlightMode = enabled;
        
        const toggleBtn = document.getElementById('toggle-highlight');
        const indicator = document.getElementById('highlight-mode-indicator');
        
        if (toggleBtn) {
            toggleBtn.classList.toggle('active', enabled);
        }
        
        if (indicator) {
            indicator.classList.toggle('show', enabled);
        }
        
        // 改变鼠标样式
        this.container.style.cursor = enabled ? 'crosshair' : 'default';
        
        this.showNotification(
            enabled ? '高亮模式已启用' : '高亮模式已关闭',
            'info'
        );
    }

    /**
     * 显示高亮菜单
     */
    showHighlightMenu(highlightElement, e) {
        e.preventDefault();
        e.stopPropagation();
        
        const highlightId = highlightElement.dataset.highlightId;
        const highlight = this.highlights.get(highlightId);
        
        if (!highlight) return;
        
        // 创建上下文菜单
        this.createContextMenu(e.pageX, e.pageY, highlight);
    }

    /**
     * 创建上下文菜单
     */
    createContextMenu(x, y, highlight) {
        // 移除现有菜单
        const existingMenu = document.getElementById('highlight-context-menu');
        if (existingMenu) {
            existingMenu.remove();
        }
        
        const menu = document.createElement('div');
        menu.id = 'highlight-context-menu';
        menu.style.cssText = `
            position: fixed;
            left: ${x}px;
            top: ${y}px;
            background: white;
            border: 1px solid #ddd;
            border-radius: 4px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 10001;
            min-width: 120px;
        `;
        
        menu.innerHTML = `
            <div class="menu-item" data-action="change-color">🎨 更改颜色</div>
            <div class="menu-item" data-action="add-note">📝 添加笔记</div>
            <div class="menu-item" data-action="copy-text">📋 复制文本</div>
            <div class="menu-item" data-action="delete" style="color: #dc3545;">🗑️ 删除高亮</div>
        `;
        
        // 添加菜单样式
        const style = document.createElement('style');
        style.textContent = `
            .menu-item {
                padding: 8px 12px;
                cursor: pointer;
                font-size: 14px;
                border-bottom: 1px solid #eee;
            }
            .menu-item:last-child {
                border-bottom: none;
            }
            .menu-item:hover {
                background: #f5f5f5;
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(menu);
        
        // 绑定菜单事件
        menu.addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            this.handleMenuAction(action, highlight);
            menu.remove();
        });
        
        // 点击其他地方关闭菜单
        setTimeout(() => {
            document.addEventListener('click', () => menu.remove(), { once: true });
        }, 100);
    }

    /**
     * 处理菜单操作
     */
    handleMenuAction(action, highlight) {
        switch (action) {
            case 'change-color':
                this.changeHighlightColor(highlight);
                break;
            case 'add-note':
                this.addNoteToHighlight(highlight);
                break;
            case 'copy-text':
                this.copyHighlightText(highlight);
                break;
            case 'delete':
                this.deleteHighlight(highlight.id);
                break;
        }
    }

    /**
     * 更改高亮颜色
     */
    changeHighlightColor(highlight) {
        // 显示颜色选择器
        const colorPicker = document.createElement('div');
        colorPicker.style.cssText = `
            position: fixed;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            background: white;
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 16px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 10002;
        `;
        
        colorPicker.innerHTML = `
            <h4 style="margin: 0 0 12px 0;">选择新颜色</h4>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                ${this.colors.map(color => `
                    <div class="color-option" 
                         style="width: 32px; height: 32px; background: ${color.value}; border-radius: 4px; cursor: pointer; border: 2px solid ${color.value === highlight.color ? '#007acc' : 'transparent'};"
                         data-color="${color.value}" 
                         data-class="${color.class}">
                    </div>
                `).join('')}
            </div>
            <div style="margin-top: 12px; text-align: right;">
                <button id="cancel-color-change" style="margin-right: 8px; padding: 4px 8px; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer;">取消</button>
            </div>
        `;
        
        document.body.appendChild(colorPicker);
        
        // 绑定颜色选择事件
        colorPicker.addEventListener('click', (e) => {
            if (e.target.classList.contains('color-option')) {
                const newColor = e.target.dataset.color;
                const newColorClass = e.target.dataset.class;
                
                // 更新高亮颜色
                highlight.element.className = `text-highlight ${newColorClass}`;
                highlight.color = newColor;
                highlight.colorClass = newColorClass;
                highlight.element.dataset.color = newColor;
                
                // 更新存储的数据
                this.highlights.set(highlight.id, highlight);
                this.saveHighlights();
                
                colorPicker.remove();
                this.showNotification('高亮颜色已更改', 'success');
            } else if (e.target.id === 'cancel-color-change') {
                colorPicker.remove();
            }
        });
    }

    /**
     * 为高亮添加笔记
     */
    addNoteToHighlight(highlight) {
        // 如果存在悬浮笔记系统，创建关联笔记
        if (window.floatingNotes) {
            const noteOptions = {
                title: `高亮笔记: ${highlight.text.substring(0, 30)}...`,
                content: `关联高亮文本: "${highlight.text}"\n\n`,
                highlightId: highlight.id
            };
            window.floatingNotes.createNote(noteOptions);
        } else {
            this.showNotification('笔记功能不可用', 'error');
        }
    }

    /**
     * 复制高亮文本
     */
    copyHighlightText(highlight) {
        navigator.clipboard.writeText(highlight.text).then(() => {
            this.showNotification('文本已复制到剪贴板', 'success');
        }).catch(() => {
            this.showNotification('复制失败', 'error');
        });
    }

    /**
     * 删除高亮
     */
    deleteHighlight(highlightId) {
        const highlight = this.highlights.get(highlightId);
        if (!highlight) return;
        
        // 移除DOM元素，保留文本内容
        const element = highlight.element;
        const parent = element.parentNode;
        while (element.firstChild) {
            parent.insertBefore(element.firstChild, element);
        }
        parent.removeChild(element);
        
        // 从存储中删除
        this.highlights.delete(highlightId);
        this.saveHighlights();
        
        this.showNotification('高亮已删除', 'success');
    }

    /**
     * 清除所有高亮
     */
    clearAllHighlights() {
        if (this.highlights.size === 0) {
            this.showNotification('没有高亮需要清除', 'info');
            return;
        }
        
        if (confirm(`确定要清除所有 ${this.highlights.size} 个高亮吗？`)) {
            this.highlights.forEach(highlight => {
                const element = highlight.element;
                const parent = element.parentNode;
                while (element.firstChild) {
                    parent.insertBefore(element.firstChild, element);
                }
                parent.removeChild(element);
            });
            
            this.highlights.clear();
            this.saveHighlights();
            this.showNotification('所有高亮已清除', 'success');
        }
    }

    /**
     * 显示工具提示
     */
    showTooltip(element) {
        const tooltip = document.createElement('div');
        tooltip.className = 'highlight-tooltip show';
        tooltip.textContent = `创建时间: ${new Date(element.dataset.timestamp).toLocaleString()}`;
        
        element.appendChild(tooltip);
        
        setTimeout(() => {
            tooltip.classList.add('show');
        }, 100);
    }

    /**
     * 隐藏工具提示
     */
    hideTooltip(element) {
        const tooltip = element.querySelector('.highlight-tooltip');
        if (tooltip) {
            tooltip.remove();
        }
    }

    /**
     * 生成高亮ID
     */
    generateHighlightId() {
        return 'highlight_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * 保存高亮到本地存储
     */
    saveHighlights() {
        const highlightsData = Array.from(this.highlights.values()).map(highlight => ({
            id: highlight.id,
            text: highlight.text,
            color: highlight.color,
            colorClass: highlight.colorClass,
            timestamp: highlight.timestamp
        }));
        
        localStorage.setItem('text-highlights', JSON.stringify(highlightsData));
        
        // 触发云同步
        if (typeof cloudSync !== 'undefined' && cloudSync.userId) {
            cloudSync.manualSync();
        }
    }

    /**
     * 从本地存储加载高亮
     */
    loadHighlights() {
        try {
            const saved = localStorage.getItem('text-highlights');
            if (saved) {
                const highlightsData = JSON.parse(saved);
                // 注意：这里只加载数据，实际的DOM恢复需要在文档加载后进行
                console.log('加载了', highlightsData.length, '个保存的高亮');
            }
        } catch (error) {
            console.error('加载高亮失败:', error);
        }
    }

    /**
     * 显示通知
     */
    showNotification(message, type = 'info') {
        // 创建通知元素
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 16px;
            border-radius: 4px;
            color: white;
            font-size: 14px;
            z-index: 10003;
            max-width: 300px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        `;
        
        // 根据类型设置颜色
        switch (type) {
            case 'success':
                notification.style.background = '#28a745';
                break;
            case 'error':
                notification.style.background = '#dc3545';
                break;
            case 'warning':
                notification.style.background = '#ffc107';
                notification.style.color = '#333';
                break;
            default:
                notification.style.background = '#007acc';
        }
        
        notification.textContent = message;
        document.body.appendChild(notification);
        
        // 3秒后自动移除
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    /**
     * 获取高亮统计信息
     */
    getHighlightStats() {
        const stats = {
            total: this.highlights.size,
            byColor: {}
        };
        
        this.highlights.forEach(highlight => {
            const colorName = this.colors.find(c => c.value === highlight.color)?.name || '未知';
            stats.byColor[colorName] = (stats.byColor[colorName] || 0) + 1;
        });
        
        return stats;
    }

    /**
     * 导出高亮数据
     */
    exportHighlights() {
        const data = {
            highlights: Array.from(this.highlights.values()),
            exportTime: new Date().toISOString(),
            version: '1.0'
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `highlights_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
    }

    /**
     * 导入高亮数据
     */
    importHighlights(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (data.highlights && Array.isArray(data.highlights)) {
                    // 这里需要根据实际情况恢复高亮到DOM中
                    console.log('导入高亮数据:', data.highlights.length, '个高亮');
                    this.showNotification(`成功导入 ${data.highlights.length} 个高亮`, 'success');
                } else {
                    throw new Error('无效的高亮数据格式');
                }
            } catch (error) {
                console.error('导入高亮失败:', error);
                this.showNotification('导入高亮失败: ' + error.message, 'error');
            }
        };
        reader.readAsText(file);
    }

    /**
     * 销毁高亮器
     */
    destroy() {
        // 移除事件监听器
        document.removeEventListener('mouseup', this.handleTextSelection);
        document.removeEventListener('keydown', this.handleKeydown);
        
        // 移除UI元素
        const elements = [
            'highlight-controls',
            'highlight-mode-indicator',
            'color-palette',
            'highlight-context-menu'
        ];
        
        elements.forEach(id => {
            const element = document.getElementById(id);
            if (element) element.remove();
        });
        
        // 清除数据
        this.highlights.clear();
    }
}

// 导出类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TextHighlighter;
} else {
    window.TextHighlighter = TextHighlighter;
}