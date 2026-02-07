// PDF渲染器模块
// 注意：此文件在浏览器环境中运行，需要通过CDN加载PDF.js
// 在HTML中需要先加载：<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>

// 配置PDF.js worker（如果pdfjsLib可用）
if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

class PDFRenderer {
    constructor(container) {
        this.container = container;
        this.pdfDoc = null;
        this.currentPage = 1;
        this.totalPages = 0;
        this.scale = 1.0;
        this.rotation = 0;
        this.renderTask = null;
        
        this.setupContainer();
    }
    
    setupContainer() {
        this.container.innerHTML = `
            <div class="pdf-viewer">
                <div class="pdf-toolbar">
                    <div class="pdf-nav">
                        <button id="prevPage" class="pdf-btn" disabled>上一页</button>
                        <span class="page-info">
                            <input type="number" id="pageInput" value="1" min="1" class="page-input">
                            <span> / </span>
                            <span id="totalPages">0</span>
                        </span>
                        <button id="nextPage" class="pdf-btn" disabled>下一页</button>
                    </div>
                    <div class="pdf-controls">
                        <button id="zoomOut" class="pdf-btn">缩小</button>
                        <span id="scaleValue" class="scale-value">100%</span>
                        <button id="zoomIn" class="pdf-btn">放大</button>
                        <button id="fitWidth" class="pdf-btn">适应宽度</button>
                        <button id="fitPage" class="pdf-btn">适应页面</button>
                        <button id="rotateLeft" class="pdf-btn">↺</button>
                        <button id="rotateRight" class="pdf-btn">↻</button>
                    </div>
                </div>
                <div class="pdf-content">
                    <canvas id="pdfCanvas" class="pdf-canvas"></canvas>
                    <div id="textLayer" class="text-layer"></div>
                </div>
                <div class="pdf-loading" id="pdfLoading" style="display: none;">
                    <div class="loading-spinner"></div>
                    <p>正在加载PDF...</p>
                </div>
            </div>
        `;
        
        this.setupEventListeners();
        this.addStyles();
    }
    
    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .pdf-viewer {
                display: flex;
                flex-direction: column;
                height: 100%;
                background: #f5f5f5;
            }
            
            .pdf-toolbar {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 0.5rem 1rem;
                background: white;
                border-bottom: 1px solid #ddd;
                flex-shrink: 0;
            }
            
            .pdf-nav, .pdf-controls {
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }
            
            .pdf-btn {
                padding: 0.25rem 0.75rem;
                border: 1px solid #ddd;
                background: white;
                border-radius: 3px;
                cursor: pointer;
                font-size: 0.9rem;
                transition: all 0.2s;
            }
            
            .pdf-btn:hover:not(:disabled) {
                background: #f0f0f0;
                border-color: #999;
            }
            
            .pdf-btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }
            
            .page-info {
                display: flex;
                align-items: center;
                gap: 0.25rem;
                font-size: 0.9rem;
            }
            
            .page-input {
                width: 60px;
                padding: 0.25rem;
                border: 1px solid #ddd;
                border-radius: 3px;
                text-align: center;
                font-size: 0.9rem;
            }
            
            .scale-value {
                min-width: 50px;
                text-align: center;
                font-size: 0.9rem;
                font-weight: 500;
            }
            
            .pdf-content {
                flex: 1;
                overflow: auto;
                display: flex;
                justify-content: center;
                align-items: flex-start;
                padding: 1rem;
                position: relative;
            }
            
            .pdf-canvas {
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                background: white;
                max-width: 100%;
                height: auto;
            }
            
            .text-layer {
                position: absolute;
                left: 0;
                top: 0;
                right: 0;
                bottom: 0;
                overflow: hidden;
                opacity: 0.2;
                line-height: 1.0;
            }
            
            .text-layer > span {
                color: transparent;
                position: absolute;
                white-space: pre;
                cursor: text;
                transform-origin: 0% 0%;
            }
            
            .pdf-loading {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                text-align: center;
                background: rgba(255,255,255,0.9);
                padding: 2rem;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
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
        `;
        document.head.appendChild(style);
    }
    
    setupEventListeners() {
        // 页面导航
        this.container.addEventListener('click', (e) => {
            const target = e.target;
            
            if (target.id === 'prevPage') {
                this.previousPage();
            } else if (target.id === 'nextPage') {
                this.nextPage();
            } else if (target.id === 'zoomIn') {
                this.zoomIn();
            } else if (target.id === 'zoomOut') {
                this.zoomOut();
            } else if (target.id === 'fitWidth') {
                this.fitToWidth();
            } else if (target.id === 'fitPage') {
                this.fitToPage();
            } else if (target.id === 'rotateLeft') {
                this.rotate(-90);
            } else if (target.id === 'rotateRight') {
                this.rotate(90);
            }
        });
        
        // 页码输入
        this.container.addEventListener('change', (e) => {
            if (e.target.id === 'pageInput') {
                const pageNum = parseInt(e.target.value);
                if (pageNum >= 1 && pageNum <= this.totalPages) {
                    this.goToPage(pageNum);
                } else {
                    e.target.value = this.currentPage;
                }
            }
        });
        
        // 键盘快捷键
        document.addEventListener('keydown', (e) => {
            if (!this.pdfDoc) return;
            
            switch (e.key) {
                case 'ArrowLeft':
                case 'PageUp':
                    e.preventDefault();
                    this.previousPage();
                    break;
                case 'ArrowRight':
                case 'PageDown':
                    e.preventDefault();
                    this.nextPage();
                    break;
                case 'Home':
                    e.preventDefault();
                    this.goToPage(1);
                    break;
                case 'End':
                    e.preventDefault();
                    this.goToPage(this.totalPages);
                    break;
            }
        });
    }
    
    async loadPDF(filePath) {
        try {
            this.showLoading(true);
            
            // 读取PDF文件
            const data = new Uint8Array(fs.readFileSync(filePath));
            
            // 加载PDF文档
            const loadingTask = pdfjsLib.getDocument({ data });
            this.pdfDoc = await loadingTask.promise;
            
            this.totalPages = this.pdfDoc.numPages;
            this.currentPage = 1;
            
            // 更新界面
            this.updateUI();
            
            // 渲染第一页
            await this.renderPage(1);
            
            this.showLoading(false);
            
            return {
                success: true,
                totalPages: this.totalPages,
                title: await this.getPDFInfo()
            };
            
        } catch (error) {
            this.showLoading(false);
            console.error('PDF加载失败:', error);
            throw new Error('PDF文件加载失败: ' + error.message);
        }
    }
    
    async renderPage(pageNum) {
        if (!this.pdfDoc || pageNum < 1 || pageNum > this.totalPages) {
            return;
        }
        
        try {
            // 取消之前的渲染任务
            if (this.renderTask) {
                this.renderTask.cancel();
            }
            
            const page = await this.pdfDoc.getPage(pageNum);
            const canvas = this.container.querySelector('#pdfCanvas');
            const context = canvas.getContext('2d');
            
            // 计算视口
            let viewport = page.getViewport({ scale: this.scale, rotation: this.rotation });
            
            // 设置canvas尺寸
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            
            // 渲染页面
            const renderContext = {
                canvasContext: context,
                viewport: viewport
            };
            
            this.renderTask = page.render(renderContext);
            await this.renderTask.promise;
            
            // 渲染文本层（用于文本选择）
            await this.renderTextLayer(page, viewport);
            
            this.currentPage = pageNum;
            this.updateUI();
            
        } catch (error) {
            if (error.name !== 'RenderingCancelledException') {
                console.error('页面渲染失败:', error);
                throw error;
            }
        }
    }
    
    async renderTextLayer(page, viewport) {
        try {
            const textLayer = this.container.querySelector('#textLayer');
            textLayer.innerHTML = '';
            
            const textContent = await page.getTextContent();
            
            // 设置文本层尺寸和位置
            const canvas = this.container.querySelector('#pdfCanvas');
            const canvasRect = canvas.getBoundingClientRect();
            const containerRect = this.container.querySelector('.pdf-content').getBoundingClientRect();
            
            textLayer.style.left = (canvasRect.left - containerRect.left) + 'px';
            textLayer.style.top = (canvasRect.top - containerRect.top) + 'px';
            textLayer.style.width = canvas.width + 'px';
            textLayer.style.height = canvas.height + 'px';
            textLayer.style.transform = `scale(${canvas.offsetWidth / canvas.width})`;
            
            // 渲染文本项
            textContent.items.forEach((textItem) => {
                const tx = pdfjsLib.Util.transform(
                    pdfjsLib.Util.transform(viewport.transform, textItem.transform),
                    [1, 0, 0, -1, 0, 0]
                );
                
                const span = document.createElement('span');
                span.textContent = textItem.str;
                span.style.left = tx[4] + 'px';
                span.style.top = tx[5] + 'px';
                span.style.fontSize = Math.abs(tx[0]) + 'px';
                span.style.fontFamily = textItem.fontName;
                
                textLayer.appendChild(span);
            });
            
        } catch (error) {
            console.warn('文本层渲染失败:', error);
        }
    }
    
    async getPDFInfo() {
        if (!this.pdfDoc) return '';
        
        try {
            const metadata = await this.pdfDoc.getMetadata();
            return metadata.info.Title || '';
        } catch (error) {
            return '';
        }
    }
    
    // 导航方法
    nextPage() {
        if (this.currentPage < this.totalPages) {
            this.renderPage(this.currentPage + 1);
        }
    }
    
    previousPage() {
        if (this.currentPage > 1) {
            this.renderPage(this.currentPage - 1);
        }
    }
    
    goToPage(pageNum) {
        if (pageNum >= 1 && pageNum <= this.totalPages) {
            this.renderPage(pageNum);
        }
    }
    
    // 缩放方法
    zoomIn() {
        this.scale = Math.min(this.scale * 1.2, 3.0);
        this.renderPage(this.currentPage);
    }
    
    zoomOut() {
        this.scale = Math.max(this.scale / 1.2, 0.3);
        this.renderPage(this.currentPage);
    }
    
    fitToWidth() {
        if (!this.pdfDoc) return;
        
        const container = this.container.querySelector('.pdf-content');
        const containerWidth = container.clientWidth - 40; // 减去padding
        
        this.pdfDoc.getPage(this.currentPage).then(page => {
            const viewport = page.getViewport({ scale: 1.0 });
            this.scale = containerWidth / viewport.width;
            this.renderPage(this.currentPage);
        });
    }
    
    fitToPage() {
        if (!this.pdfDoc) return;
        
        const container = this.container.querySelector('.pdf-content');
        const containerWidth = container.clientWidth - 40;
        const containerHeight = container.clientHeight - 40;
        
        this.pdfDoc.getPage(this.currentPage).then(page => {
            const viewport = page.getViewport({ scale: 1.0 });
            const scaleX = containerWidth / viewport.width;
            const scaleY = containerHeight / viewport.height;
            this.scale = Math.min(scaleX, scaleY);
            this.renderPage(this.currentPage);
        });
    }
    
    // 旋转方法
    rotate(degrees) {
        this.rotation = (this.rotation + degrees) % 360;
        this.renderPage(this.currentPage);
    }
    
    // 界面更新
    updateUI() {
        const prevBtn = this.container.querySelector('#prevPage');
        const nextBtn = this.container.querySelector('#nextPage');
        const pageInput = this.container.querySelector('#pageInput');
        const totalPagesSpan = this.container.querySelector('#totalPages');
        const scaleValue = this.container.querySelector('#scaleValue');
        
        if (prevBtn) prevBtn.disabled = this.currentPage <= 1;
        if (nextBtn) nextBtn.disabled = this.currentPage >= this.totalPages;
        if (pageInput) {
            pageInput.value = this.currentPage;
            pageInput.max = this.totalPages;
        }
        if (totalPagesSpan) totalPagesSpan.textContent = this.totalPages;
        if (scaleValue) scaleValue.textContent = Math.round(this.scale * 100) + '%';
    }
    
    showLoading(show) {
        const loading = this.container.querySelector('#pdfLoading');
        if (loading) {
            loading.style.display = show ? 'block' : 'none';
        }
    }
    
    // 清理资源
    destroy() {
        if (this.renderTask) {
            this.renderTask.cancel();
        }
        if (this.pdfDoc) {
            this.pdfDoc.destroy();
        }
    }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PDFRenderer;
} else {
    window.PDFRenderer = PDFRenderer;
}