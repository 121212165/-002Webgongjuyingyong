class FontManager {
    constructor() {
        this.fonts = new Map();
        this.currentFont = 'default';
        this.fontSizes = [12, 14, 16, 18, 20, 22, 24, 28, 32, 36, 48];
        this.currentFontSize = 16;
        this.init();
    }

    async init() {
        await this.loadFonts();
        this.createFontPanel();
        this.bindEvents();
    }

    // 加载已保存的字体
    async loadFonts() {
        try {
            const result = await window.electronAPI.invoke('load-fonts');
            if (result.success) {
                result.fonts.forEach(font => {
                    this.fonts.set(font.name, font);
                    this.loadFontFace(font);
                });
            }
        } catch (error) {
            console.error('加载字体失败:', error);
        }
    }

    // 创建字体控制面板
    createFontPanel() {
        const panel = document.createElement('div');
        panel.id = 'font-panel';
        panel.className = 'font-panel';
        panel.innerHTML = `
            <div class="font-panel-header">
                <h3>字体设置</h3>
                <button class="close-btn" id="closeFontPanel">&times;</button>
            </div>
            <div class="font-panel-content">
                <div class="font-section">
                    <label>字体族:</label>
                    <select id="fontFamilySelect">
                        <option value="default">默认字体</option>
                        <option value="serif">衬线字体</option>
                        <option value="sans-serif">无衬线字体</option>
                        <option value="monospace">等宽字体</option>
                    </select>
                </div>
                <div class="font-section">
                    <label>字体大小:</label>
                    <select id="fontSizeSelect">
                        ${this.fontSizes.map(size => 
                            `<option value="${size}" ${size === this.currentFontSize ? 'selected' : ''}>${size}px</option>`
                        ).join('')}
                    </select>
                </div>
                <div class="font-section">
                    <label>行高:</label>
                    <input type="range" id="lineHeightSlider" min="1" max="3" step="0.1" value="1.6">
                    <span id="lineHeightValue">1.6</span>
                </div>
                <div class="font-section">
                    <label>字间距:</label>
                    <input type="range" id="letterSpacingSlider" min="-2" max="5" step="0.1" value="0">
                    <span id="letterSpacingValue">0px</span>
                </div>
                <div class="font-section">
                    <label>上传自定义字体:</label>
                    <input type="file" id="fontUpload" accept=".ttf,.otf,.woff,.woff2" multiple>
                    <button id="uploadFontBtn">上传字体</button>
                </div>
                <div class="font-section">
                    <label>自定义字体:</label>
                    <select id="customFontSelect">
                        <option value="">选择自定义字体</option>
                    </select>
                    <button id="deleteFontBtn">删除字体</button>
                </div>
                <div class="font-preview">
                    <h4>预览:</h4>
                    <div id="fontPreview" class="preview-text">
                        这是字体预览文本。The quick brown fox jumps over the lazy dog.
                        这里包含中英文混合内容，用于测试字体效果。
                    </div>
                </div>
                <div class="font-actions">
                    <button id="applyFontBtn" class="apply-btn">应用设置</button>
                    <button id="resetFontBtn" class="reset-btn">重置默认</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(panel);
        this.updateCustomFontSelect();
    }

    // 绑定事件
    bindEvents() {
        // 关闭面板
        document.getElementById('closeFontPanel').addEventListener('click', () => {
            this.hideFontPanel();
        });

        // 字体族选择
        document.getElementById('fontFamilySelect').addEventListener('change', (e) => {
            this.currentFont = e.target.value;
            this.updatePreview();
        });

        // 字体大小选择
        document.getElementById('fontSizeSelect').addEventListener('change', (e) => {
            this.currentFontSize = parseInt(e.target.value);
            this.updatePreview();
        });

        // 行高调整
        const lineHeightSlider = document.getElementById('lineHeightSlider');
        const lineHeightValue = document.getElementById('lineHeightValue');
        lineHeightSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            lineHeightValue.textContent = value;
            this.updatePreview();
        });

        // 字间距调整
        const letterSpacingSlider = document.getElementById('letterSpacingSlider');
        const letterSpacingValue = document.getElementById('letterSpacingValue');
        letterSpacingSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            letterSpacingValue.textContent = value + 'px';
            this.updatePreview();
        });

        // 字体上传
        document.getElementById('uploadFontBtn').addEventListener('click', () => {
            this.uploadFonts();
        });

        // 自定义字体选择
        document.getElementById('customFontSelect').addEventListener('change', (e) => {
            if (e.target.value) {
                this.currentFont = e.target.value;
                this.updatePreview();
            }
        });

        // 删除字体
        document.getElementById('deleteFontBtn').addEventListener('click', () => {
            this.deleteSelectedFont();
        });

        // 应用设置
        document.getElementById('applyFontBtn').addEventListener('click', () => {
            this.applyFontSettings();
        });

        // 重置设置
        document.getElementById('resetFontBtn').addEventListener('click', () => {
            this.resetFontSettings();
        });
    }

    // 上传字体文件
    async uploadFonts() {
        const fileInput = document.getElementById('fontUpload');
        const files = fileInput.files;
        
        if (files.length === 0) {
            alert('请选择字体文件');
            return;
        }

        for (let file of files) {
            try {
                const fontData = await this.readFileAsArrayBuffer(file);
                const fontName = file.name.replace(/\.[^/.]+$/, "");
                
                const result = await window.electronAPI.invoke('save-font', {
                    name: fontName,
                    filename: file.name,
                    data: Array.from(new Uint8Array(fontData))
                });

                if (result.success) {
                    const font = {
                        name: fontName,
                        filename: file.name,
                        path: result.path
                    };
                    
                    this.fonts.set(fontName, font);
                    this.loadFontFace(font);
                    this.updateCustomFontSelect();
                    
                    console.log(`字体 ${fontName} 上传成功`);
                } else {
                    console.error(`字体 ${fontName} 上传失败:`, result.error);
                }
            } catch (error) {
                console.error(`处理字体文件 ${file.name} 失败:`, error);
            }
        }
        
        fileInput.value = ''; // 清空文件选择
    }

    // 读取文件为ArrayBuffer
    readFileAsArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }

    // 加载字体到CSS
    loadFontFace(font) {
        const fontFace = new FontFace(font.name, `url(${font.path})`);
        fontFace.load().then(() => {
            document.fonts.add(fontFace);
            console.log(`字体 ${font.name} 加载成功`);
        }).catch(error => {
            console.error(`字体 ${font.name} 加载失败:`, error);
        });
    }

    // 更新自定义字体选择器
    updateCustomFontSelect() {
        const select = document.getElementById('customFontSelect');
        select.innerHTML = '<option value="">选择自定义字体</option>';
        
        this.fonts.forEach((font, name) => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            select.appendChild(option);
        });
    }

    // 删除选中的字体
    async deleteSelectedFont() {
        const select = document.getElementById('customFontSelect');
        const fontName = select.value;
        
        if (!fontName) {
            alert('请先选择要删除的字体');
            return;
        }

        if (confirm(`确定要删除字体 "${fontName}" 吗？`)) {
            try {
                const result = await window.electronAPI.invoke('delete-font', fontName);
                if (result.success) {
                    this.fonts.delete(fontName);
                    this.updateCustomFontSelect();
                    
                    // 如果当前使用的是被删除的字体，重置为默认
                    if (this.currentFont === fontName) {
                        this.currentFont = 'default';
                        document.getElementById('fontFamilySelect').value = 'default';
                        this.updatePreview();
                    }
                    
                    console.log(`字体 ${fontName} 删除成功`);
                } else {
                    alert(`删除字体失败: ${result.error}`);
                }
            } catch (error) {
                console.error('删除字体失败:', error);
                alert('删除字体失败');
            }
        }
    }

    // 更新预览
    updatePreview() {
        const preview = document.getElementById('fontPreview');
        const lineHeight = document.getElementById('lineHeightSlider').value;
        const letterSpacing = document.getElementById('letterSpacingSlider').value;
        
        let fontFamily = this.currentFont;
        if (this.fonts.has(this.currentFont)) {
            fontFamily = `"${this.currentFont}", sans-serif`;
        }
        
        preview.style.fontFamily = fontFamily;
        preview.style.fontSize = this.currentFontSize + 'px';
        preview.style.lineHeight = lineHeight;
        preview.style.letterSpacing = letterSpacing + 'px';
    }

    // 应用字体设置到阅读器
    applyFontSettings() {
        const readerContainer = document.getElementById('reader-container');
        const lineHeight = document.getElementById('lineHeightSlider').value;
        const letterSpacing = document.getElementById('letterSpacingSlider').value;
        
        if (readerContainer) {
            let fontFamily = this.currentFont;
            if (this.fonts.has(this.currentFont)) {
                fontFamily = `"${this.currentFont}", sans-serif`;
            }
            
            readerContainer.style.fontFamily = fontFamily;
            readerContainer.style.fontSize = this.currentFontSize + 'px';
            readerContainer.style.lineHeight = lineHeight;
            readerContainer.style.letterSpacing = letterSpacing + 'px';
            
            // 保存设置
            this.saveFontSettings();
            
            alert('字体设置已应用');
        }
    }

    // 重置字体设置
    resetFontSettings() {
        this.currentFont = 'default';
        this.currentFontSize = 16;
        
        document.getElementById('fontFamilySelect').value = 'default';
        document.getElementById('fontSizeSelect').value = '16';
        document.getElementById('lineHeightSlider').value = '1.6';
        document.getElementById('letterSpacingSlider').value = '0';
        document.getElementById('lineHeightValue').textContent = '1.6';
        document.getElementById('letterSpacingValue').textContent = '0px';
        document.getElementById('customFontSelect').value = '';
        
        this.updatePreview();
        this.applyFontSettings();
    }

    // 保存字体设置
    async saveFontSettings() {
        const settings = {
            fontFamily: this.currentFont,
            fontSize: this.currentFontSize,
            lineHeight: document.getElementById('lineHeightSlider').value,
            letterSpacing: document.getElementById('letterSpacingSlider').value
        };
        
        try {
            await window.electronAPI.invoke('save-font-settings', settings);
        } catch (error) {
            console.error('保存字体设置失败:', error);
        }
    }

    // 加载字体设置
    async loadFontSettings() {
        try {
            const result = await window.electronAPI.invoke('load-font-settings');
            if (result.success && result.settings) {
                const settings = result.settings;
                
                this.currentFont = settings.fontFamily || 'default';
                this.currentFontSize = settings.fontSize || 16;
                
                document.getElementById('fontFamilySelect').value = this.currentFont;
                document.getElementById('fontSizeSelect').value = this.currentFontSize;
                document.getElementById('lineHeightSlider').value = settings.lineHeight || '1.6';
                document.getElementById('letterSpacingSlider').value = settings.letterSpacing || '0';
                document.getElementById('lineHeightValue').textContent = settings.lineHeight || '1.6';
                document.getElementById('letterSpacingValue').textContent = (settings.letterSpacing || '0') + 'px';
                
                if (this.fonts.has(this.currentFont)) {
                    document.getElementById('customFontSelect').value = this.currentFont;
                }
                
                this.updatePreview();
                this.applyFontSettings();
            }
        } catch (error) {
            console.error('加载字体设置失败:', error);
        }
    }

    // 显示字体面板
    showFontPanel() {
        const panel = document.getElementById('font-panel');
        panel.style.display = 'block';
        this.loadFontSettings();
    }

    // 隐藏字体面板
    hideFontPanel() {
        const panel = document.getElementById('font-panel');
        panel.style.display = 'none';
    }

    // 切换字体面板显示状态
    toggleFontPanel() {
        const panel = document.getElementById('font-panel');
        if (panel.style.display === 'none' || !panel.style.display) {
            this.showFontPanel();
        } else {
            this.hideFontPanel();
        }
    }
}

// 字体面板样式
const fontPanelStyles = `
.font-panel {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 500px;
    max-height: 80vh;
    background: white;
    border: 1px solid #ddd;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    z-index: 10000;
    display: none;
    overflow-y: auto;
}

.font-panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 15px 20px;
    border-bottom: 1px solid #eee;
    background: #f8f9fa;
    border-radius: 8px 8px 0 0;
}

.font-panel-header h3 {
    margin: 0;
    color: #333;
    font-size: 18px;
}

.close-btn {
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: #666;
    padding: 0;
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: background-color 0.2s;
}

.close-btn:hover {
    background-color: #f0f0f0;
    color: #333;
}

.font-panel-content {
    padding: 20px;
}

.font-section {
    margin-bottom: 20px;
}

.font-section label {
    display: block;
    margin-bottom: 8px;
    font-weight: 500;
    color: #333;
}

.font-section select,
.font-section input[type="file"] {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 14px;
}

.font-section input[type="range"] {
    width: calc(100% - 60px);
    margin-right: 10px;
}

.font-section span {
    display: inline-block;
    width: 50px;
    text-align: right;
    font-size: 14px;
    color: #666;
}

#uploadFontBtn,
#deleteFontBtn {
    margin-top: 10px;
    padding: 8px 16px;
    background: #007bff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    transition: background-color 0.2s;
}

#uploadFontBtn:hover,
#deleteFontBtn:hover {
    background: #0056b3;
}

#deleteFontBtn {
    background: #dc3545;
    margin-left: 10px;
}

#deleteFontBtn:hover {
    background: #c82333;
}

.font-preview {
    margin: 20px 0;
    padding: 15px;
    border: 1px solid #eee;
    border-radius: 4px;
    background: #f9f9f9;
}

.font-preview h4 {
    margin: 0 0 10px 0;
    color: #333;
    font-size: 16px;
}

.preview-text {
    padding: 15px;
    background: white;
    border: 1px solid #ddd;
    border-radius: 4px;
    min-height: 80px;
    line-height: 1.6;
}

.font-actions {
    display: flex;
    gap: 10px;
    margin-top: 20px;
    padding-top: 20px;
    border-top: 1px solid #eee;
}

.apply-btn,
.reset-btn {
    flex: 1;
    padding: 12px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 16px;
    font-weight: 500;
    transition: background-color 0.2s;
}

.apply-btn {
    background: #28a745;
    color: white;
}

.apply-btn:hover {
    background: #218838;
}

.reset-btn {
    background: #6c757d;
    color: white;
}

.reset-btn:hover {
    background: #5a6268;
}
`;

// 添加样式到页面
if (!document.getElementById('font-panel-styles')) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'font-panel-styles';
    styleSheet.textContent = fontPanelStyles;
    document.head.appendChild(styleSheet);
}

// 导出FontManager类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FontManager;
}