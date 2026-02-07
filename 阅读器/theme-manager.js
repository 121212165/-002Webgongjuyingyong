class ThemeManager {
    constructor() {
        this.themes = new Map();
        this.currentTheme = 'light';
        this.customSettings = {
            backgroundColor: '#ffffff',
            textColor: '#333333',
            linkColor: '#007bff',
            borderColor: '#dee2e6',
            shadowColor: 'rgba(0, 0, 0, 0.1)',
            brightness: 100,
            contrast: 100,
            sepia: 0,
            blur: 0
        };
        this.init();
    }

    async init() {
        this.initializeDefaultThemes();
        await this.loadThemeSettings();
        this.createThemePanel();
        this.bindEvents();
        this.applyTheme(this.currentTheme);
    }

    // 初始化默认主题
    initializeDefaultThemes() {
        // 浅色主题
        this.themes.set('light', {
            name: '浅色主题',
            backgroundColor: '#ffffff',
            textColor: '#333333',
            linkColor: '#007bff',
            borderColor: '#dee2e6',
            shadowColor: 'rgba(0, 0, 0, 0.1)',
            panelBackground: '#f8f9fa',
            buttonBackground: '#007bff',
            buttonText: '#ffffff',
            inputBackground: '#ffffff',
            inputBorder: '#ced4da'
        });

        // 深色主题
        this.themes.set('dark', {
            name: '深色主题',
            backgroundColor: '#1a1a1a',
            textColor: '#e0e0e0',
            linkColor: '#4dabf7',
            borderColor: '#404040',
            shadowColor: 'rgba(0, 0, 0, 0.3)',
            panelBackground: '#2d2d2d',
            buttonBackground: '#4dabf7',
            buttonText: '#ffffff',
            inputBackground: '#404040',
            inputBorder: '#606060'
        });

        // 护眼主题
        this.themes.set('sepia', {
            name: '护眼主题',
            backgroundColor: '#f4f3e8',
            textColor: '#5c4b37',
            linkColor: '#8b4513',
            borderColor: '#d4c5a9',
            shadowColor: 'rgba(92, 75, 55, 0.1)',
            panelBackground: '#ede8d3',
            buttonBackground: '#8b4513',
            buttonText: '#ffffff',
            inputBackground: '#f9f6eb',
            inputBorder: '#d4c5a9'
        });

        // 高对比度主题
        this.themes.set('high-contrast', {
            name: '高对比度',
            backgroundColor: '#000000',
            textColor: '#ffffff',
            linkColor: '#ffff00',
            borderColor: '#ffffff',
            shadowColor: 'rgba(255, 255, 255, 0.2)',
            panelBackground: '#1a1a1a',
            buttonBackground: '#ffffff',
            buttonText: '#000000',
            inputBackground: '#333333',
            inputBorder: '#ffffff'
        });

        // 蓝光过滤主题
        this.themes.set('blue-light-filter', {
            name: '蓝光过滤',
            backgroundColor: '#fff8e1',
            textColor: '#5d4037',
            linkColor: '#ff6f00',
            borderColor: '#ffcc02',
            shadowColor: 'rgba(93, 64, 55, 0.1)',
            panelBackground: '#fff3c4',
            buttonBackground: '#ff6f00',
            buttonText: '#ffffff',
            inputBackground: '#fffde7',
            inputBorder: '#ffcc02'
        });
    }

    // 创建主题控制面板
    createThemePanel() {
        const panel = document.createElement('div');
        panel.id = 'theme-panel';
        panel.className = 'theme-panel';
        panel.innerHTML = `
            <div class="theme-panel-header">
                <h3>主题设置</h3>
                <button class="close-btn" id="closeThemePanel">&times;</button>
            </div>
            <div class="theme-panel-content">
                <div class="theme-section">
                    <label>预设主题:</label>
                    <div class="theme-grid">
                        ${Array.from(this.themes.entries()).map(([key, theme]) => `
                            <div class="theme-card" data-theme="${key}">
                                <div class="theme-preview" style="background: ${theme.backgroundColor}; color: ${theme.textColor}; border: 2px solid ${theme.borderColor}">
                                    <div class="preview-text">Aa</div>
                                </div>
                                <div class="theme-name">${theme.name}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="theme-section">
                    <label>自定义颜色:</label>
                    <div class="color-controls">
                        <div class="color-control">
                            <label>背景色:</label>
                            <input type="color" id="backgroundColorPicker" value="${this.customSettings.backgroundColor}">
                        </div>
                        <div class="color-control">
                            <label>文字色:</label>
                            <input type="color" id="textColorPicker" value="${this.customSettings.textColor}">
                        </div>
                        <div class="color-control">
                            <label>链接色:</label>
                            <input type="color" id="linkColorPicker" value="${this.customSettings.linkColor}">
                        </div>
                        <div class="color-control">
                            <label>边框色:</label>
                            <input type="color" id="borderColorPicker" value="${this.customSettings.borderColor}">
                        </div>
                    </div>
                </div>
                
                <div class="theme-section">
                    <label>视觉效果:</label>
                    <div class="effect-controls">
                        <div class="effect-control">
                            <label>亮度: <span id="brightnessValue">${this.customSettings.brightness}%</span></label>
                            <input type="range" id="brightnessSlider" min="50" max="150" value="${this.customSettings.brightness}">
                        </div>
                        <div class="effect-control">
                            <label>对比度: <span id="contrastValue">${this.customSettings.contrast}%</span></label>
                            <input type="range" id="contrastSlider" min="50" max="200" value="${this.customSettings.contrast}">
                        </div>
                        <div class="effect-control">
                            <label>褐色滤镜: <span id="sepiaValue">${this.customSettings.sepia}%</span></label>
                            <input type="range" id="sepiaSlider" min="0" max="100" value="${this.customSettings.sepia}">
                        </div>
                        <div class="effect-control">
                            <label>模糊: <span id="blurValue">${this.customSettings.blur}px</span></label>
                            <input type="range" id="blurSlider" min="0" max="5" step="0.1" value="${this.customSettings.blur}">
                        </div>
                    </div>
                </div>
                
                <div class="theme-section">
                    <label>阅读模式:</label>
                    <div class="reading-modes">
                        <button class="mode-btn" id="focusMode">专注模式</button>
                        <button class="mode-btn" id="fullscreenMode">全屏模式</button>
                        <button class="mode-btn" id="nightMode">夜间模式</button>
                        <button class="mode-btn" id="eyeCareMode">护眼模式</button>
                    </div>
                </div>
                
                <div class="theme-preview-section">
                    <label>预览:</label>
                    <div id="themePreview" class="theme-preview-area">
                        <h4>标题预览</h4>
                        <p>这是正文内容的预览。Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
                        <a href="#">这是链接样式预览</a>
                        <div class="preview-panel">
                            <button>按钮预览</button>
                            <input type="text" placeholder="输入框预览" readonly>
                        </div>
                    </div>
                </div>
                
                <div class="theme-actions">
                    <button id="applyThemeBtn" class="apply-btn">应用主题</button>
                    <button id="saveCustomThemeBtn" class="save-btn">保存自定义</button>
                    <button id="resetThemeBtn" class="reset-btn">重置默认</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(panel);
    }

    // 绑定事件
    bindEvents() {
        // 关闭面板
        document.getElementById('closeThemePanel').addEventListener('click', () => {
            this.hideThemePanel();
        });

        // 主题卡片选择
        document.querySelectorAll('.theme-card').forEach(card => {
            card.addEventListener('click', () => {
                const themeName = card.dataset.theme;
                this.selectTheme(themeName);
            });
        });

        // 颜色选择器
        document.getElementById('backgroundColorPicker').addEventListener('change', (e) => {
            this.customSettings.backgroundColor = e.target.value;
            this.updatePreview();
        });

        document.getElementById('textColorPicker').addEventListener('change', (e) => {
            this.customSettings.textColor = e.target.value;
            this.updatePreview();
        });

        document.getElementById('linkColorPicker').addEventListener('change', (e) => {
            this.customSettings.linkColor = e.target.value;
            this.updatePreview();
        });

        document.getElementById('borderColorPicker').addEventListener('change', (e) => {
            this.customSettings.borderColor = e.target.value;
            this.updatePreview();
        });

        // 效果滑块
        this.bindSlider('brightness', 'brightnessSlider', 'brightnessValue', '%');
        this.bindSlider('contrast', 'contrastSlider', 'contrastValue', '%');
        this.bindSlider('sepia', 'sepiaSlider', 'sepiaValue', '%');
        this.bindSlider('blur', 'blurSlider', 'blurValue', 'px');

        // 阅读模式按钮
        document.getElementById('focusMode').addEventListener('click', () => {
            this.toggleFocusMode();
        });

        document.getElementById('fullscreenMode').addEventListener('click', () => {
            this.toggleFullscreenMode();
        });

        document.getElementById('nightMode').addEventListener('click', () => {
            this.applyTheme('dark');
        });

        document.getElementById('eyeCareMode').addEventListener('click', () => {
            this.applyTheme('sepia');
        });

        // 操作按钮
        document.getElementById('applyThemeBtn').addEventListener('click', () => {
            this.applyCurrentSettings();
        });

        document.getElementById('saveCustomThemeBtn').addEventListener('click', () => {
            this.saveCustomTheme();
        });

        document.getElementById('resetThemeBtn').addEventListener('click', () => {
            this.resetToDefault();
        });
    }

    // 绑定滑块事件
    bindSlider(property, sliderId, valueId, unit) {
        const slider = document.getElementById(sliderId);
        const valueSpan = document.getElementById(valueId);
        
        slider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            this.customSettings[property] = value;
            valueSpan.textContent = value + unit;
            this.updatePreview();
        });
    }

    // 选择主题
    selectTheme(themeName) {
        // 移除之前的选中状态
        document.querySelectorAll('.theme-card').forEach(card => {
            card.classList.remove('selected');
        });
        
        // 添加选中状态
        const selectedCard = document.querySelector(`[data-theme="${themeName}"]`);
        if (selectedCard) {
            selectedCard.classList.add('selected');
        }
        
        this.currentTheme = themeName;
        this.updatePreview();
    }

    // 更新预览
    updatePreview() {
        const preview = document.getElementById('themePreview');
        let theme;
        
        if (this.themes.has(this.currentTheme)) {
            theme = this.themes.get(this.currentTheme);
        } else {
            theme = this.customSettings;
        }
        
        preview.style.backgroundColor = theme.backgroundColor;
        preview.style.color = theme.textColor;
        preview.style.borderColor = theme.borderColor;
        
        const link = preview.querySelector('a');
        if (link) {
            link.style.color = theme.linkColor;
        }
        
        const button = preview.querySelector('button');
        if (button && theme.buttonBackground) {
            button.style.backgroundColor = theme.buttonBackground;
            button.style.color = theme.buttonText;
        }
        
        const input = preview.querySelector('input');
        if (input && theme.inputBackground) {
            input.style.backgroundColor = theme.inputBackground;
            input.style.borderColor = theme.inputBorder;
        }
        
        // 应用视觉效果
        const filters = [
            `brightness(${this.customSettings.brightness}%)`,
            `contrast(${this.customSettings.contrast}%)`,
            `sepia(${this.customSettings.sepia}%)`,
            `blur(${this.customSettings.blur}px)`
        ];
        
        preview.style.filter = filters.join(' ');
    }

    // 应用主题
    applyTheme(themeName) {
        this.currentTheme = themeName;
        
        let theme;
        if (this.themes.has(themeName)) {
            theme = this.themes.get(themeName);
        } else {
            theme = this.customSettings;
        }
        
        // 应用到根元素
        const root = document.documentElement;
        root.style.setProperty('--bg-color', theme.backgroundColor);
        root.style.setProperty('--text-color', theme.textColor);
        root.style.setProperty('--link-color', theme.linkColor);
        root.style.setProperty('--border-color', theme.borderColor);
        root.style.setProperty('--shadow-color', theme.shadowColor);
        
        if (theme.panelBackground) {
            root.style.setProperty('--panel-bg', theme.panelBackground);
        }
        
        if (theme.buttonBackground) {
            root.style.setProperty('--button-bg', theme.buttonBackground);
            root.style.setProperty('--button-text', theme.buttonText);
        }
        
        if (theme.inputBackground) {
            root.style.setProperty('--input-bg', theme.inputBackground);
            root.style.setProperty('--input-border', theme.inputBorder);
        }
        
        // 应用视觉效果到阅读器容器
        const readerContainer = document.getElementById('reader-container');
        if (readerContainer) {
            const filters = [
                `brightness(${this.customSettings.brightness}%)`,
                `contrast(${this.customSettings.contrast}%)`,
                `sepia(${this.customSettings.sepia}%)`,
                `blur(${this.customSettings.blur}px)`
            ];
            
            readerContainer.style.filter = filters.join(' ');
        }
        
        // 更新body类名
        document.body.className = document.body.className.replace(/theme-\w+/g, '');
        document.body.classList.add(`theme-${themeName}`);
        
        this.saveThemeSettings();
    }

    // 应用当前设置
    applyCurrentSettings() {
        this.applyTheme(this.currentTheme);
        alert('主题已应用');
    }

    // 保存自定义主题
    async saveCustomTheme() {
        const name = prompt('请输入自定义主题名称:');
        if (name && name.trim()) {
            const customTheme = { ...this.customSettings };
            customTheme.name = name.trim();
            
            this.themes.set(`custom-${Date.now()}`, customTheme);
            
            try {
                await this.saveThemeSettings();
                alert('自定义主题保存成功');
                this.recreateThemeGrid();
            } catch (error) {
                console.error('保存自定义主题失败:', error);
                alert('保存失败');
            }
        }
    }

    // 重新创建主题网格
    recreateThemeGrid() {
        const grid = document.querySelector('.theme-grid');
        grid.innerHTML = Array.from(this.themes.entries()).map(([key, theme]) => `
            <div class="theme-card" data-theme="${key}">
                <div class="theme-preview" style="background: ${theme.backgroundColor}; color: ${theme.textColor}; border: 2px solid ${theme.borderColor}">
                    <div class="preview-text">Aa</div>
                </div>
                <div class="theme-name">${theme.name}</div>
            </div>
        `).join('');
        
        // 重新绑定事件
        document.querySelectorAll('.theme-card').forEach(card => {
            card.addEventListener('click', () => {
                const themeName = card.dataset.theme;
                this.selectTheme(themeName);
            });
        });
    }

    // 重置为默认
    resetToDefault() {
        this.currentTheme = 'light';
        this.customSettings = {
            backgroundColor: '#ffffff',
            textColor: '#333333',
            linkColor: '#007bff',
            borderColor: '#dee2e6',
            shadowColor: 'rgba(0, 0, 0, 0.1)',
            brightness: 100,
            contrast: 100,
            sepia: 0,
            blur: 0
        };
        
        this.applyTheme('light');
        this.updateColorPickers();
        this.updateSliders();
        this.selectTheme('light');
    }

    // 更新颜色选择器
    updateColorPickers() {
        document.getElementById('backgroundColorPicker').value = this.customSettings.backgroundColor;
        document.getElementById('textColorPicker').value = this.customSettings.textColor;
        document.getElementById('linkColorPicker').value = this.customSettings.linkColor;
        document.getElementById('borderColorPicker').value = this.customSettings.borderColor;
    }

    // 更新滑块
    updateSliders() {
        document.getElementById('brightnessSlider').value = this.customSettings.brightness;
        document.getElementById('contrastSlider').value = this.customSettings.contrast;
        document.getElementById('sepiaSlider').value = this.customSettings.sepia;
        document.getElementById('blurSlider').value = this.customSettings.blur;
        
        document.getElementById('brightnessValue').textContent = this.customSettings.brightness + '%';
        document.getElementById('contrastValue').textContent = this.customSettings.contrast + '%';
        document.getElementById('sepiaValue').textContent = this.customSettings.sepia + '%';
        document.getElementById('blurValue').textContent = this.customSettings.blur + 'px';
    }

    // 切换专注模式
    toggleFocusMode() {
        document.body.classList.toggle('focus-mode');
        const isActive = document.body.classList.contains('focus-mode');
        
        if (isActive) {
            // 隐藏不必要的UI元素
            const elementsToHide = document.querySelectorAll('.sidebar, .toolbar, .status-bar');
            elementsToHide.forEach(el => el.style.display = 'none');
        } else {
            // 恢复UI元素
            const elementsToShow = document.querySelectorAll('.sidebar, .toolbar, .status-bar');
            elementsToShow.forEach(el => el.style.display = '');
        }
    }

    // 切换全屏模式
    toggleFullscreenMode() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    }

    // 保存主题设置
    async saveThemeSettings() {
        const settings = {
            currentTheme: this.currentTheme,
            customSettings: this.customSettings,
            customThemes: {}
        };
        
        // 保存自定义主题
        this.themes.forEach((theme, key) => {
            if (key.startsWith('custom-')) {
                settings.customThemes[key] = theme;
            }
        });
        
        try {
            await window.electronAPI.invoke('save-theme-settings', settings);
        } catch (error) {
            console.error('保存主题设置失败:', error);
        }
    }

    // 加载主题设置
    async loadThemeSettings() {
        try {
            const result = await window.electronAPI.invoke('load-theme-settings');
            if (result.success && result.settings) {
                const settings = result.settings;
                
                this.currentTheme = settings.currentTheme || 'light';
                this.customSettings = { ...this.customSettings, ...settings.customSettings };
                
                // 加载自定义主题
                if (settings.customThemes) {
                    Object.entries(settings.customThemes).forEach(([key, theme]) => {
                        this.themes.set(key, theme);
                    });
                }
            }
        } catch (error) {
            console.error('加载主题设置失败:', error);
        }
    }

    // 显示主题面板
    showThemePanel() {
        const panel = document.getElementById('theme-panel');
        panel.style.display = 'block';
        this.selectTheme(this.currentTheme);
        this.updatePreview();
    }

    // 隐藏主题面板
    hideThemePanel() {
        const panel = document.getElementById('theme-panel');
        panel.style.display = 'none';
    }

    // 切换主题面板显示状态
    toggleThemePanel() {
        const panel = document.getElementById('theme-panel');
        if (panel.style.display === 'none' || !panel.style.display) {
            this.showThemePanel();
        } else {
            this.hideThemePanel();
        }
    }

    // 快速切换主题
    quickSwitchTheme() {
        const themes = Array.from(this.themes.keys());
        const currentIndex = themes.indexOf(this.currentTheme);
        const nextIndex = (currentIndex + 1) % themes.length;
        const nextTheme = themes[nextIndex];
        
        this.applyTheme(nextTheme);
        return nextTheme;
    }
}

// 主题面板样式
const themePanelStyles = `
:root {
    --bg-color: #ffffff;
    --text-color: #333333;
    --link-color: #007bff;
    --border-color: #dee2e6;
    --shadow-color: rgba(0, 0, 0, 0.1);
    --panel-bg: #f8f9fa;
    --button-bg: #007bff;
    --button-text: #ffffff;
    --input-bg: #ffffff;
    --input-border: #ced4da;
}

body {
    background-color: var(--bg-color);
    color: var(--text-color);
    transition: background-color 0.3s, color 0.3s;
}

.theme-panel {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 600px;
    max-height: 90vh;
    background: var(--bg-color);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    box-shadow: 0 8px 32px var(--shadow-color);
    z-index: 10000;
    display: none;
    overflow-y: auto;
}

.theme-panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 25px;
    border-bottom: 1px solid var(--border-color);
    background: var(--panel-bg);
    border-radius: 12px 12px 0 0;
}

.theme-panel-header h3 {
    margin: 0;
    color: var(--text-color);
    font-size: 20px;
    font-weight: 600;
}

.close-btn {
    background: none;
    border: none;
    font-size: 28px;
    cursor: pointer;
    color: #666;
    padding: 0;
    width: 35px;
    height: 35px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: all 0.2s;
}

.close-btn:hover {
    background-color: #f0f0f0;
    color: #333;
}

.theme-panel-content {
    padding: 25px;
}

.theme-section {
    margin-bottom: 30px;
}

.theme-section > label {
    display: block;
    margin-bottom: 15px;
    font-weight: 600;
    color: var(--text-color);
    font-size: 16px;
}

.theme-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 15px;
    margin-bottom: 20px;
}

.theme-card {
    cursor: pointer;
    border: 2px solid transparent;
    border-radius: 8px;
    padding: 10px;
    transition: all 0.2s;
    text-align: center;
}

.theme-card:hover {
    border-color: var(--link-color);
    transform: translateY(-2px);
}

.theme-card.selected {
    border-color: var(--link-color);
    background-color: rgba(0, 123, 255, 0.1);
}

.theme-preview {
    width: 100%;
    height: 60px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 8px;
    font-weight: bold;
    font-size: 18px;
}

.theme-name {
    font-size: 12px;
    color: var(--text-color);
    font-weight: 500;
}

.color-controls {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 15px;
}

.color-control {
    display: flex;
    align-items: center;
    gap: 10px;
}

.color-control label {
    min-width: 60px;
    font-size: 14px;
    color: var(--text-color);
}

.color-control input[type="color"] {
    width: 50px;
    height: 35px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
}

.effect-controls {
    display: grid;
    gap: 20px;
}

.effect-control {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.effect-control label {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 14px;
    color: var(--text-color);
}

.effect-control input[type="range"] {
    width: 100%;
    height: 6px;
    border-radius: 3px;
    background: var(--border-color);
    outline: none;
    cursor: pointer;
}

.reading-modes {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 10px;
}

.mode-btn {
    padding: 12px 16px;
    background: var(--panel-bg);
    color: var(--text-color);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s;
}

.mode-btn:hover {
    background: var(--button-bg);
    color: var(--button-text);
}

.theme-preview-section {
    margin: 25px 0;
}

.theme-preview-area {
    padding: 20px;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    background: var(--bg-color);
    color: var(--text-color);
}

.theme-preview-area h4 {
    margin: 0 0 15px 0;
    color: var(--text-color);
}

.theme-preview-area p {
    margin: 10px 0;
    line-height: 1.6;
}

.theme-preview-area a {
    color: var(--link-color);
    text-decoration: none;
}

.preview-panel {
    margin-top: 15px;
    padding: 15px;
    background: var(--panel-bg);
    border-radius: 6px;
    display: flex;
    gap: 10px;
    align-items: center;
}

.preview-panel button {
    padding: 8px 16px;
    background: var(--button-bg);
    color: var(--button-text);
    border: none;
    border-radius: 4px;
    cursor: pointer;
}

.preview-panel input {
    padding: 8px 12px;
    background: var(--input-bg);
    border: 1px solid var(--input-border);
    border-radius: 4px;
    color: var(--text-color);
}

.theme-actions {
    display: flex;
    gap: 15px;
    margin-top: 30px;
    padding-top: 25px;
    border-top: 1px solid var(--border-color);
}

.apply-btn,
.save-btn,
.reset-btn {
    flex: 1;
    padding: 14px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 16px;
    font-weight: 600;
    transition: all 0.2s;
}

.apply-btn {
    background: #28a745;
    color: white;
}

.apply-btn:hover {
    background: #218838;
}

.save-btn {
    background: #17a2b8;
    color: white;
}

.save-btn:hover {
    background: #138496;
}

.reset-btn {
    background: #6c757d;
    color: white;
}

.reset-btn:hover {
    background: #5a6268;
}

/* 专注模式样式 */
body.focus-mode {
    background: var(--bg-color);
}

body.focus-mode .sidebar,
body.focus-mode .toolbar,
body.focus-mode .status-bar {
    display: none !important;
}

/* 主题特定样式 */
body.theme-dark {
    --bg-color: #1a1a1a;
    --text-color: #e0e0e0;
    --link-color: #4dabf7;
    --border-color: #404040;
    --panel-bg: #2d2d2d;
}

body.theme-sepia {
    --bg-color: #f4f3e8;
    --text-color: #5c4b37;
    --link-color: #8b4513;
    --border-color: #d4c5a9;
    --panel-bg: #ede8d3;
}

body.theme-high-contrast {
    --bg-color: #000000;
    --text-color: #ffffff;
    --link-color: #ffff00;
    --border-color: #ffffff;
    --panel-bg: #1a1a1a;
}

body.theme-blue-light-filter {
    --bg-color: #fff8e1;
    --text-color: #5d4037;
    --link-color: #ff6f00;
    --border-color: #ffcc02;
    --panel-bg: #fff3c4;
}
`;

// 添加样式到页面
if (!document.getElementById('theme-panel-styles')) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'theme-panel-styles';
    styleSheet.textContent = themePanelStyles;
    document.head.appendChild(styleSheet);
}

// 导出ThemeManager类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ThemeManager;
}