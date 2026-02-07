// EPUB解析器
class EpubParser {
    constructor() {
        this.book = null;
        this.spine = [];
        this.toc = [];
        this.contentMap = new Map();
        this.errors = [];
        this.warnings = [];
        this.progress = 0;
        this.progressCallback = null;
        this.cache = new Map();
    }
    
    // 检查缓存
    checkCache(file) {
        // 使用文件的唯一标识符作为缓存键
        const cacheKey = `${file.name}_${file.size}_${file.lastModified}`;
        return this.cache.get(cacheKey);
    }
    
    // 保存到缓存
    saveToCache(file, result) {
        const cacheKey = `${file.name}_${file.size}_${file.lastModified}`;
        // 只缓存元数据和目录，不缓存完整内容以节省内存
        const cacheData = {
            title: result.title,
            author: result.author,
            toc: result.toc,
            version: result.version,
            metadata: result.metadata,
            timestamp: Date.now()
        };
        this.cache.set(cacheKey, cacheData);
        return cacheKey;
    }
    
    // 清除旧缓存
    clearOldCache(maxAge = 7 * 24 * 60 * 60 * 1000) { // 默认缓存7天
        const now = Date.now();
        for (const [key, data] of this.cache.entries()) {
            if (now - data.timestamp > maxAge) {
                this.cache.delete(key);
            }
        }
    }
    
    // 设置进度回调
    setProgressCallback(callback) {
        this.progressCallback = callback;
    }
    
    // 更新进度
    updateProgress(progress, message = '') {
        this.progress = Math.min(100, Math.max(0, progress));
        if (this.progressCallback) {
            this.progressCallback({
                progress: this.progress,
                message: message,
                timestamp: new Date().toISOString()
            });
        }
    }
    
    // 记录错误
    logError(message, error = null) {
        const errorObj = {
            message: message,
            error: error ? error.toString() : null,
            timestamp: new Date().toISOString()
        };
        this.errors.push(errorObj);
        console.error(`EPUB解析错误: ${message}`, error);
    }
    
    // 记录警告
    logWarning(message) {
        const warningObj = {
            message: message,
            timestamp: new Date().toISOString()
        };
        this.warnings.push(warningObj);
        console.warn(`EPUB解析警告: ${message}`);
    }
    
    // 获取所有错误
    getErrors() {
        return this.errors;
    }
    
    // 获取所有警告
    getWarnings() {
        return this.warnings;
    }
    
    // 清除错误和警告
    clearLogs() {
        this.errors = [];
        this.warnings = [];
    }

    // 解析EPUB文件
    async parse(file) {
        // 清除旧缓存
        this.clearOldCache();
        
        // 检查缓存
        const cachedResult = this.checkCache(file);
        if (cachedResult) {
            this.updateProgress(100, '从缓存加载');
            return {
                title: cachedResult.title,
                author: cachedResult.author,
                toc: cachedResult.toc,
                content: [], // 内容将在需要时延迟加载
                metadata: cachedResult.metadata,
                errors: this.errors,
                warnings: this.warnings
            };
        }
        
        // 清除之前的错误和警告
        this.clearLogs();
        this.progress = 0;
        
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const arrayBuffer = e.target.result;
                    
                    // 检查文件大小，避免过大文件导致性能问题
                    if (arrayBuffer.byteLength > 100 * 1024 * 1024) { // 限制在100MB以内
                        this.logWarning('文件大小超过100MB，可能导致解析性能问题');
                    }
                    
                    this.updateProgress(10, '开始解析ZIP文件');
                    await this.unzipEPUB(arrayBuffer);
                    
                    this.updateProgress(40, '解析OPF文件');
                    await this.parseOPF();
                    
                    this.updateProgress(60, '解析目录');
                    await this.parseTOC();
                    
                    this.updateProgress(80, '提取内容');
                    await this.extractContent();
                    
                    this.updateProgress(100, '解析完成');
                    
                    // 如果有错误，添加到返回结果中
                    const result = {
                        title: this.book.metadata.title || '未知书名',
                        author: this.book.metadata.creator || '未知作者',
                        toc: this.toc,
                        content: Array.from(this.contentMap.values()),
                        version: this.book.version || '2.0',
                        metadata: this.book.metadata,
                        errors: this.getErrors(),
                        warnings: this.getWarnings()
                    };
                    
                    // 保存到缓存
                    this.saveToCache(file, result);
                    
                    resolve(result);
                } catch (error) {
                    this.logError('EPUB解析失败，尝试作为文本文件处理', error);
                    this.updateProgress(50, 'EPUB解析失败，尝试作为文本文件处理');
                    // 如果EPUB解析失败，尝试作为文本文件处理
                    reader.readAsText(file, 'utf-8');
                }
            };
            
            // 如果EPUB解析失败，尝试作为文本文件处理
            reader.onloadend = (e) => {
                if (typeof e.target.result === 'string') {
                    try {
                        const content = e.target.result;
                        const title = file.name.replace(/\.[^/.]+$/, "");
                        
                        // 将文本内容按章节划分
                        const chapters = this.splitIntoChapters(content);
                        
                        resolve({
                            title: title,
                            author: '未知作者',
                            toc: chapters.map((chapter, index) => ({
                                id: index,
                                title: `第${index + 1}章`,
                                href: `chapter-${index}`
                            })),
                            content: chapters,
                            errors: this.getErrors(),
                            warnings: this.getWarnings()
                        });
                    } catch (error) {
                        this.logError('文本文件解析失败', error);
                        reject(new Error(`文件解析失败: ${error.message}`));
                    }
                }
            };
            
            reader.onerror = (error) => {
                this.logError('文件读取失败', error);
                reject(new Error(`文件读取失败: ${error.message}`));
            };
            
            // 设置读取超时
            const timeoutId = setTimeout(() => {
                reader.abort();
                this.logError('文件读取超时');
                reject(new Error('文件读取超时'));
            }, 30000); // 30秒超时
            
            // 在成功或失败时清除超时定时器
            reader.onload = async (e) => {
                clearTimeout(timeoutId);
                try {
                    const arrayBuffer = e.target.result;
                    
                    // 检查文件大小，避免过大文件导致性能问题
                    if (arrayBuffer.byteLength > 100 * 1024 * 1024) { // 限制在100MB以内
                        this.logWarning('文件大小超过100MB，可能导致解析性能问题');
                    }
                    
                    this.updateProgress(10, '开始解析ZIP文件');
                    await this.unzipEPUB(arrayBuffer);
                    
                    this.updateProgress(40, '解析OPF文件');
                    await this.parseOPF();
                    
                    this.updateProgress(60, '解析目录');
                    await this.parseTOC();
                    
                    this.updateProgress(80, '提取内容');
                    await this.extractContent();
                    
                    this.updateProgress(100, '解析完成');
                    
                    // 如果有错误，添加到返回结果中
                    const result = {
                        title: this.book.metadata.title || '未知书名',
                        author: this.book.metadata.creator || '未知作者',
                        toc: this.toc,
                        content: Array.from(this.contentMap.values()),
                        version: this.book.version || '2.0',
                        metadata: this.book.metadata,
                        errors: this.getErrors(),
                        warnings: this.getWarnings()
                    };
                    
                    // 保存到缓存
                    this.saveToCache(file, result);
                    
                    resolve(result);
                } catch (error) {
                    this.logError('EPUB解析失败，尝试作为文本文件处理', error);
                    this.updateProgress(50, 'EPUB解析失败，尝试作为文本文件处理');
                    // 如果EPUB解析失败，尝试作为文本文件处理
                    reader.readAsText(file, 'utf-8');
                }
            };
            
            // 重置onloadend事件，确保超时定时器被清除
            reader.onloadend = (e) => {
                clearTimeout(timeoutId);
                if (typeof e.target.result === 'string') {
                    try {
                        const content = e.target.result;
                        const title = file.name.replace(/\.[^/.]+$/, "");
                        
                        // 将文本内容按章节划分
                        const chapters = this.splitIntoChapters(content);
                        
                        resolve({
                            title: title,
                            author: '未知作者',
                            toc: chapters.map((chapter, index) => ({
                                id: index,
                                title: `第${index + 1}章`,
                                href: `chapter-${index}`
                            })),
                            content: chapters,
                            errors: this.getErrors(),
                        warnings: this.getWarnings()
                        });
                    } catch (error) {
                        this.logError('文本文件解析失败', error);
                        reject(new Error(`文件解析失败: ${error.message}`));
                    }
                }
            };
            
            // 重置onerror事件，确保超时定时器被清除
            reader.onerror = (error) => {
                clearTimeout(timeoutId);
                this.logError('文件读取失败', error);
                reject(new Error(`文件读取失败: ${error.message}`));
            };
            
            reader.readAsArrayBuffer(file);
        });
    }

    // 解压EPUB文件（完整实现）
    async unzipEPUB(arrayBuffer) {
        // 创建书籍对象
        this.book = {
            metadata: {
                title: '未知书名',
                creator: '未知作者'
            },
            opfPath: '',
            tocPath: '',
            spine: [],
            manifest: new Map(),
            files: new Map(),
            htmlFiles: [],
            allFiles: [], // 保存所有文件引用，用于延迟加载
            version: '2.0'
        };
        
        // 尝试解析ZIP文件结构
        try {
            const zipFiles = this.parseZipFile(arrayBuffer);
            this.book.allFiles = zipFiles;
            
            if (zipFiles.length === 0) {
                this.logWarning('ZIP文件中未找到任何文件，可能是格式问题');
                return this.book;
            }
            
            // 更新进度
            this.updateProgress(20, '解析ZIP文件结构');
            
            // 查找并提取META-INF/container.xml文件
            const containerFile = zipFiles.find(file => file.name === 'META-INF/container.xml');
            if (containerFile) {
                containerFile.content = this.extractFileContent(containerFile.dataView, containerFile);
            }
            
            // 查找并提取OPF文件
            const opfFile = this.findOPFFile(zipFiles);
            if (opfFile) {
                this.book.opfPath = opfFile.name;
                opfFile.content = this.extractFileContent(opfFile.dataView, opfFile);
                this.book.opfContent = opfFile.content;
            } else {
                this.logError('未找到OPF文件，使用默认数据');
            }
            
            // 解析OPF文件以获取其他关键文件路径
            await this.parseOPF();
            
            // 更新进度
            this.updateProgress(35, '解析OPF文件');
            
            // 查找并提取NCX/TOC文件
            const tocFile = this.findTOCFile(zipFiles);
            if (tocFile) {
                this.book.tocPath = tocFile.name;
                tocFile.content = this.extractFileContent(tocFile.dataView, tocFile);
                this.book.ncxContent = tocFile.content;
            } else {
                this.logWarning('未找到TOC文件，将使用默认目录');
            }
            
            // 提取HTML文件信息（仅元数据，不提取内容）
            this.extractHTMLFilesMetadata(zipFiles);
            
            // 更新进度
            this.updateProgress(50, '提取文件元数据');
            
            if (this.book.htmlFiles.length === 0) {
                this.logWarning('未找到HTML内容文件，可能是EPUB格式问题');
            }
            
        } catch (error) {
            this.logError('ZIP解析失败，使用默认值', error);
            // 解析失败时继续执行，使用默认值
        }
        
        return this.book;
    }
    
    // 解析ZIP文件 - 优化内存管理版本
    parseZipFile(arrayBuffer) {
        const files = [];
        const dataView = new DataView(arrayBuffer);
        const endOfCentralDirectorySignature = 0x06054b50;
        
        try {
            // 检查文件大小
            if (dataView.byteLength < 22) {
                this.logError('文件太小，无法解析为ZIP文件');
                return files;
            }
            
            // 查找中央目录结束记录
            let eocdOffset = this.findEndOfCentralDirectory(dataView);
            if (eocdOffset === -1) {
                this.logError('无法找到ZIP中央目录结束记录，可能是ZIP格式损坏');
                return files;
            }
            
            // 解析中央目录结束记录
            const centralDirectoryEntries = dataView.getUint16(eocdOffset + 10, true);
            const centralDirectoryOffset = dataView.getUint32(eocdOffset + 16, true);
            
            if (centralDirectoryEntries === 0) {
                this.logWarning('ZIP文件中没有中央目录记录');
                return files;
            }
            
            // 解析中央目录记录 - 只解析元数据，不立即提取内容
            let centralDirOffset = centralDirectoryOffset;
            for (let i = 0; i < centralDirectoryEntries; i++) {
                try {
                    const file = this.parseCentralDirectoryRecord(dataView, centralDirOffset);
                    if (file) {
                        // 保存数据视图引用和偏移量，而不是立即提取内容
                        file.dataView = dataView;
                        files.push(file);
                        centralDirOffset += 46 + file.fileNameLength + file.extraFieldLength + file.fileCommentLength;
                    }
                } catch (error) {
                    this.logWarning(`解析第${i + 1}个文件记录时出错，跳过该文件`, error);
                    // 跳过损坏的记录，继续解析其他文件
                    centralDirOffset += 46; // 至少跳过中央目录记录头
                }
            }
            
            // 更新进度
            this.updateProgress(25, `找到${files.length}个文件`);
            
            return files;
            
        } catch (error) {
            this.logError('ZIP文件解析错误', error);
            return files;
        }
    }
    
    // 查找中央目录结束记录
    findEndOfCentralDirectory(dataView) {
        const signature = 0x06054b50;
        // 从文件末尾开始查找
        for (let offset = dataView.byteLength - 22; offset >= 0; offset--) {
            if (dataView.getUint32(offset, true) === signature) {
                return offset;
            }
        }
        return -1;
    }
    
    // 解析中央目录记录
    parseCentralDirectoryRecord(dataView, offset) {
        // 检查中央目录记录签名
        const signature = dataView.getUint32(offset, true);
        if (signature !== 0x02014b50) {
            return null;
        }
        
        const compressedSize = dataView.getUint32(offset + 20, true);
        const fileNameLength = dataView.getUint16(offset + 28, true);
        const extraFieldLength = dataView.getUint16(offset + 30, true);
        const fileCommentLength = dataView.getUint16(offset + 32, true);
        const localFileHeaderOffset = dataView.getUint32(offset + 42, true);
        
        // 读取文件名
        const fileNameBytes = new Uint8Array(dataView.buffer, offset + 46, fileNameLength);
        const fileName = new TextDecoder().decode(fileNameBytes);
        
        // 跳过目录
        if (fileName.endsWith('/')) {
            return null;
        }
        
        return {
            name: fileName,
            compressedSize: compressedSize,
            fileNameLength: fileNameLength,
            extraFieldLength: extraFieldLength,
            fileCommentLength: fileCommentLength,
            localFileHeaderOffset: localFileHeaderOffset,
            content: null
        };
    }
    
    // 提取文件内容
    extractFileContent(dataView, file) {
        // 解析本地文件头
        const localHeaderOffset = file.localFileHeaderOffset;
        
        // 检查本地文件头签名
        if (dataView.getUint32(localHeaderOffset, true) !== 0x04034b50) {
            return null;
        }
        
        const bitFlag = dataView.getUint16(localHeaderOffset + 6, true);
        const compressionMethod = dataView.getUint16(localHeaderOffset + 8, true);
        const fileNameLength = dataView.getUint16(localHeaderOffset + 26, true);
        const extraFieldLength = dataView.getUint16(localHeaderOffset + 28, true);
        
        // 计算文件数据偏移量
        const fileDataOffset = localHeaderOffset + 30 + fileNameLength + extraFieldLength;
        
        // 读取文件内容
        let content = '';
        
        // 处理非压缩文件（压缩方法为0）
        if (compressionMethod === 0) {
            try {
                // 计算文件大小
                const uncompressedSize = dataView.getUint32(localHeaderOffset + 18, true);
                
                // 确保文件大小合理
                if (uncompressedSize > 0 && fileDataOffset + uncompressedSize <= dataView.byteLength) {
                    const fileDataBytes = new Uint8Array(dataView.buffer, fileDataOffset, uncompressedSize);
                    content = new TextDecoder().decode(fileDataBytes);
                } else {
                    this.logWarning(`文件 ${file.name} 大小不合理，跳过读取`);
                }
            } catch (error) {
                this.logWarning(`读取文件 ${file.name} 时出错: ${error.message}`);
            }
        } else {
            // 处理压缩文件（目前不支持压缩，返回提示信息）
            this.logWarning(`文件 ${file.name} 已压缩，目前不支持压缩内容解析`);
            content = `[压缩内容 - 目前不支持]\n\n文件 ${file.name} 采用了压缩格式，当前版本的解析器暂不支持压缩内容的解析。`;
        }
        
        return content;
    }
    
    // 延迟提取文件内容 - 只在需要时提取
    async extractFileContentOnDemand(file) {
        if (file.content) {
            return file.content;
        }
        
        const content = this.extractFileContent(file.dataView, file);
        file.content = content;
        return content;
    }
    
    // 查找OPF文件
    findOPFFile(zipFiles) {
        // 首先查找META-INF/container.xml文件以确定OPF文件位置
        const containerFile = zipFiles.find(file => file.name === 'META-INF/container.xml');
        if (containerFile && containerFile.content) {
            try {
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(containerFile.content, 'text/xml');
                const rootfileElement = xmlDoc.querySelector('rootfile');
                if (rootfileElement) {
                    const opfPath = rootfileElement.getAttribute('full-path');
                    return zipFiles.find(file => file.name === opfPath);
                }
            } catch (error) {
                console.error('解析container.xml失败:', error);
            }
        }
        
        // 如果找不到container.xml，尝试直接查找OPF文件
        return zipFiles.find(file => file.name.endsWith('.opf'));
    }
    
    // 查找TOC文件
    findTOCFile(zipFiles) {
        // 首先从OPF文件中查找NCX文件
        if (this.book.manifest.size > 0) {
            for (const [id, item] of this.book.manifest) {
                if (item.mediaType === 'application/x-dtbncx+xml') {
                    const tocPath = this.resolvePath(this.book.opfPath, item.href);
                    return zipFiles.find(file => file.name === tocPath);
                }
            }
        }
        
        // 如果找不到NCX文件，尝试直接查找常见的TOC文件
        const tocFiles = zipFiles.filter(file => 
            file.name.endsWith('.ncx') || 
            file.name.includes('toc') || 
            file.name.includes('TOC')
        );
        
        return tocFiles[0] || null;
    }
    
    // 提取HTML文件元数据（仅提取元数据，不提取完整内容）
    extractHTMLFilesMetadata(zipFiles) {
        // 从spine中提取HTML文件
        if (this.spine.length > 0 && this.book.manifest.size > 0) {
            for (const itemId of this.spine) {
                const item = this.book.manifest.get(itemId);
                if (item && (item.mediaType === 'application/xhtml+xml' || item.mediaType === 'text/html')) {
                    const htmlPath = this.resolvePath(this.book.opfPath, item.href);
                    const htmlFile = zipFiles.find(file => file.name === htmlPath);
                    if (htmlFile) {
                        // 只保存文件引用，不立即提取内容
                        this.book.htmlFiles.push(htmlFile);
                    }
                }
            }
        } else {
            // 如果没有spine信息，直接查找所有HTML文件
            const htmlFiles = zipFiles.filter(file => 
                file.name.endsWith('.html') || file.name.endsWith('.xhtml')
            );
            
            // 只保存文件引用，不立即提取内容
            this.book.htmlFiles = htmlFiles;
        }
    }
    
    // 提取HTML内容文件（延迟加载实现）
    async extractHTMLContent() {
        const contentMap = new Map();
        
        for (let i = 0; i < this.book.htmlFiles.length; i++) {
            const htmlFile = this.book.htmlFiles[i];
            
            // 更新进度
            this.updateProgress(50 + (i / this.book.htmlFiles.length) * 30, `提取第${i + 1}/${this.book.htmlFiles.length}章内容`);
            
            // 延迟提取内容
            const content = await this.extractFileContentOnDemand(htmlFile);
            if (content) {
                const textContent = this.extractTextFromHTML(content);
                contentMap.set(i, textContent);
            }
        }
        
        return contentMap;
    }
    
    // 解析路径
    resolvePath(basePath, relativePath) {
        if (relativePath.startsWith('/')) {
            return relativePath.substring(1);
        }
        
        const baseDir = basePath.substring(0, basePath.lastIndexOf('/') + 1);
        return baseDir + relativePath;
    }

    // 解析OPF文件
    async parseOPF() {
        if (this.book.opfContent) {
            try {
                // 使用DOMParser解析XML
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(this.book.opfContent, 'text/xml');
                
                // 提取EPUB版本
                const packageElement = xmlDoc.querySelector('package');
                const epubVersion = packageElement ? packageElement.getAttribute('version') : '2.0';
                this.book.version = epubVersion;
                
                // 提取元数据（支持EPUB 2.0.1和3.2）
                this.extractMetadata(xmlDoc, epubVersion);
                
                // 提取spine信息
                const spineItems = xmlDoc.querySelectorAll('spine itemref');
                this.spine = Array.from(spineItems).map(item => item.getAttribute('idref'));
                
                // 提取manifest信息
                const manifestItems = xmlDoc.querySelectorAll('manifest item');
                Array.from(manifestItems).forEach(item => {
                    this.book.manifest.set(item.getAttribute('id'), {
                        href: item.getAttribute('href'),
                        mediaType: item.getAttribute('media-type')
                    });
                });
                
            } catch (error) {
                console.error('OPF解析失败:', error);
                // 解析失败时使用默认值
                this.book.metadata.title = '未知书名';
                this.book.metadata.creator = '未知作者';
                this.book.version = '2.0';
            }
        } else {
            // 使用默认值
            this.book.metadata.title = '未知书名';
            this.book.metadata.creator = '未知作者';
            this.book.version = '2.0';
        }
    }
    
    // 提取元数据 - 改进版本，支持多种命名空间和元数据格式
    extractMetadata(xmlDoc, epubVersion) {
        // 定义常见的元数据命名空间
        const namespaces = {
            dc: 'http://purl.org/dc/elements/1.1/',
            opf: 'http://www.idpf.org/2007/opf',
            epub: 'http://www.idpf.org/2007/ops'
        };
        
        // 提取标题
        let title = '未知书名';
        const titleSelectors = ['title', 'dc\:title', 'dc:title'];
        for (const selector of titleSelectors) {
            const titleElement = xmlDoc.querySelector(selector);
            if (titleElement && titleElement.textContent.trim()) {
                title = titleElement.textContent.trim();
                break;
            }
        }
        
        // 提取作者
        let creator = '未知作者';
        const creatorSelectors = ['creator', 'dc\:creator', 'dc:creator', 'author', 'dc\:author', 'dc:author'];
        for (const selector of creatorSelectors) {
            const creatorElement = xmlDoc.querySelector(selector);
            if (creatorElement && creatorElement.textContent.trim()) {
                creator = creatorElement.textContent.trim();
                break;
            }
        }
        
        // 提取出版商
        let publisher = '';
        const publisherSelectors = ['publisher', 'dc\:publisher', 'dc:publisher'];
        for (const selector of publisherSelectors) {
            const publisherElement = xmlDoc.querySelector(selector);
            if (publisherElement && publisherElement.textContent.trim()) {
                publisher = publisherElement.textContent.trim();
                break;
            }
        }
        
        // 提取出版日期
        let date = '';
        const dateSelectors = ['date', 'dc\:date', 'dc:date', 'pubdate'];
        for (const selector of dateSelectors) {
            const dateElement = xmlDoc.querySelector(selector);
            if (dateElement && dateElement.textContent.trim()) {
                date = dateElement.textContent.trim();
                break;
            }
        }
        
        // 提取语言
        let language = '';
        const languageSelectors = ['language', 'dc\:language', 'dc:language'];
        for (const selector of languageSelectors) {
            const languageElement = xmlDoc.querySelector(selector);
            if (languageElement && languageElement.textContent.trim()) {
                language = languageElement.textContent.trim();
                break;
            }
        }
        
        // 提取主题
        const subjects = [];
        const subjectSelectors = ['subject', 'dc\:subject', 'dc:subject', 'category'];
        for (const selector of subjectSelectors) {
            const subjectElements = xmlDoc.querySelectorAll(selector);
            Array.from(subjectElements).forEach(element => {
                if (element.textContent.trim()) {
                    subjects.push(element.textContent.trim());
                }
            });
        }
        
        // 构建标准化的元数据对象
        this.book.metadata = {
            title: title,
            creator: creator,
            author: creator, // 兼容不同的字段名
            publisher: publisher,
            date: date,
            language: language,
            subjects: subjects,
            genres: subjects, // 兼容不同的字段名
            version: epubVersion
        };
        
        // 提取其他元数据，确保不覆盖核心字段
        try {
            const metadataElements = xmlDoc.querySelectorAll('metadata > *');
            Array.from(metadataElements).forEach(element => {
                const tagName = element.tagName.replace(/^.*:/, '').toLowerCase();
                const content = element.textContent.trim();
                if (content && !this.book.metadata[tagName]) {
                    this.book.metadata[tagName] = content;
                }
            });
        } catch (error) {
            this.logWarning('提取其他元数据时出错', error);
        }
    }

    // 解析目录（支持EPUB 2.0.1和3.2）
    async parseTOC() {
        // 尝试从NCX文件解析目录（EPUB 2.0.1）
        if (this.book.ncxContent) {
            try {
                this.parseNCX(this.book.ncxContent);
                return;
            } catch (error) {
                console.error('NCX解析失败:', error);
            }
        }
        
        // 尝试从OPF文件中的nav文档解析目录（EPUB 3.2）
        if (this.book.opfContent && this.book.version === '3.2') {
            try {
                this.parseNavDocument();
                return;
            } catch (error) {
                console.error('Nav文档解析失败:', error);
            }
        }
        
        // 如果都失败，使用默认目录
        this.toc = [{ id: 0, title: '正文', href: 'chapter-0' }];
    }
    
    // 解析NCX文件（EPUB 2.0.1）
    parseNCX(ncxContent) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(ncxContent, 'text/xml');
        
        // 提取目录项
        const navPoints = xmlDoc.querySelectorAll('navMap navPoint');
        this.toc = Array.from(navPoints).map((point, index) => {
            const textElement = point.querySelector('navLabel text');
            const contentElement = point.querySelector('content');
            
            return {
                id: index,
                title: textElement ? textElement.textContent : `第${index + 1}章`,
                href: contentElement ? contentElement.getAttribute('src') : `chapter-${index}`
            };
        });
    }
    
    // 解析Nav文档（EPUB 3.2）
    parseNavDocument() {
        // 从manifest中查找nav文档
        for (const [id, item] of this.book.manifest) {
            if (item.mediaType === 'application/xhtml+xml' && 
                (item.href.includes('nav') || item.href.includes('toc'))) {
                // 查找对应的HTML文件
                const navPath = this.resolvePath(this.book.opfPath, item.href);
                const navFile = this.book.htmlFiles.find(file => file.name === navPath);
                
                if (navFile) {
                    const parser = new DOMParser();
                    const htmlDoc = parser.parseFromString(navFile.content, 'text/html');
                    
                    // 提取导航项
                    const navItems = htmlDoc.querySelectorAll('nav[role="doc-toc"] li a, nav#toc li a');
                    this.toc = Array.from(navItems).map((item, index) => {
                        return {
                            id: index,
                            title: item.textContent.trim(),
                            href: item.getAttribute('href')
                        };
                    });
                    return;
                }
            }
        }
    }

    // 提取内容（延迟加载实现）
    async extractContent() {
        if (this.book.htmlFiles && this.book.htmlFiles.length > 0) {
            // 使用延迟加载方式提取HTML内容
            this.contentMap = await this.extractHTMLContent();
        } else {
            // 如果没有HTML文件，使用默认内容
            this.contentMap.set(0, 'EPUB内容解析功能已改进...\n\n现在可以解析基本的EPUB文件结构，提取书籍元数据和目录。\n\n对于复杂的EPUB文件，建议使用专业的EPUB阅读器。');
        }
    }
    
    // 从HTML中提取纯文本
    extractTextFromHTML(html) {
        // 使用DOMParser解析HTML
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // 直接获取body的文本内容，不过滤标题
        let text = doc.body.textContent || '';
        
        // 清理文本格式
        text = text.replace(/\s+/g, ' ').trim();
        
        // 如果文本为空，返回默认内容
        if (!text) {
            text = '当前章节没有可用内容。\n\n这可能是因为EPUB文件格式问题，或者章节内容为空。';
        }
        
        return text;
    }
    
    // 将文本内容按章节划分
    splitIntoChapters(content) {
        // 简单的章节划分逻辑：按多个空行或特定标记
        const chapters = content.split(/\n\s*\n\s*\n/).filter(chapter => chapter.trim());
        
        // 如果没有划分出章节，整个内容作为一章
        if (chapters.length === 0) {
            return [content];
        }
        
        return chapters;
    }
}

// 文本文件解析器
class TextParser {
    constructor() {
        this.metadata = {};
        this.errors = [];
        this.warnings = [];
        this.progressCallback = null;
    }
    
    // 设置进度回调
    setProgressCallback(callback) {
        this.progressCallback = callback;
    }
    
    // 更新进度
    updateProgress(progress, message = '') {
        if (this.progressCallback) {
            this.progressCallback({
                progress: progress,
                message: message,
                timestamp: new Date().toISOString()
            });
        }
    }
    
    // 解析文本文件
    async parse(file) {
        this.updateProgress(0, '开始解析文本文件');
        
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const content = e.target.result;
                    
                    this.updateProgress(30, '提取文本元数据');
                    
                    // 提取元数据
                    const metadata = this.extractMetadata(content);
                    
                    // 使用文件名作为默认标题，或从内容中提取
                    const title = metadata.title || file.name.replace(/\.[^/.]+$/, "");
                    
                    this.updateProgress(60, '划分文本章节');
                    
                    // 将文本内容按章节划分
                    const chapters = this.splitIntoChapters(content, metadata);
                    
                    this.updateProgress(90, '生成目录');
                    
                    // 生成目录
                    const toc = chapters.map((chapter, index) => ({
                        id: index,
                        title: chapter.title || `第${index + 1}章`,
                        href: `chapter-${index}`
                    }));
                    
                    this.updateProgress(100, '文本解析完成');
                    
                    resolve({
                        title: title,
                        author: metadata.author || '未知作者',
                        toc: toc,
                        content: chapters.map(chapter => chapter.content),
                        metadata: metadata,
                        errors: this.errors,
                        warnings: this.warnings
                    });
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = (error) => reject(error);
            
            // 尝试使用多种编码读取
            const encodings = ['utf-8', 'gbk', 'gb2312', 'big5', 'utf-16'];
            let currentEncodingIndex = 0;
            
            const readWithEncoding = (encoding) => {
                reader.readAsText(file, encoding);
            };
            
            reader.onloadend = (e) => {
                if (e.target.readyState === FileReader.DONE) {
                    if (e.target.error && currentEncodingIndex < encodings.length - 1) {
                        // 尝试下一种编码
                        currentEncodingIndex++;
                        readWithEncoding(encodings[currentEncodingIndex]);
                    }
                }
            };
            
            readWithEncoding(encodings[currentEncodingIndex]);
        });
    }
    
    // 提取元数据
    extractMetadata(content) {
        const metadata = {
            title: '',
            author: '',
            date: '',
            subject: ''
        };
        
        // 尝试从文本开头提取元数据
        const firstFewLines = content.split('\n').slice(0, 50).join('\n');
        
        // 尝试提取标题
        const titleMatches = [
            // 匹配"标题："模式
            /标题[:：]\s*([^\n]+)/i,
            // 匹配"Title:"模式
            /Title[:：]\s*([^\n]+)/i,
            // 匹配第一行作为标题
            /^([^\n]+)\n/, 
            // 匹配章节标题
            /(第一章|Chapter\s+1)\s*([^\n]+)/i
        ];
        
        for (const match of titleMatches) {
            const result = firstFewLines.match(match);
            if (result && !metadata.title) {
                metadata.title = result[1]?.trim() || result[0]?.trim();
                break;
            }
        }
        
        // 尝试提取作者
        const authorMatches = [
            /作者[:：]\s*([^\n]+)/i,
            /Author[:：]\s*([^\n]+)/i,
            /著者[:：]\s*([^\n]+)/i,
            /By[:：]\s*([^\n]+)/i
        ];
        
        for (const match of authorMatches) {
            const result = firstFewLines.match(match);
            if (result) {
                metadata.author = result[1]?.trim();
                break;
            }
        }
        
        // 尝试提取日期
        const dateMatches = [
            /日期[:：]\s*([^\n]+)/i,
            /Date[:：]\s*([^\n]+)/i,
            /出版日期[:：]\s*([^\n]+)/i
        ];
        
        for (const match of dateMatches) {
            const result = firstFewLines.match(match);
            if (result) {
                metadata.date = result[1]?.trim();
                break;
            }
        }
        
        return metadata;
    }
    
    // 将文本内容按章节划分
    splitIntoChapters(content, metadata = {}) {
        // 更智能的章节划分逻辑
        const chapters = [];
        
        // 常见的章节分隔模式
        const chapterPatterns = [
            /(第[^\s]+章|Chapter\s+\d+|\d+\s*\.|\d+\s*\-|\d+\s*—)\s*([^\n]+)/gi,
            /\n\s*\n\s*(第[^\s]+章|Chapter\s+\d+|\d+\s*\.|\d+\s*\-|\d+\s*—)\s*([^\n]+)\s*\n\s*\n/gi
        ];
        
        let chapterText = content;
        let currentPosition = 0;
        let chapterId = 0;
        
        // 尝试使用正则表达式划分章节
        for (const pattern of chapterPatterns) {
            let match;
            while ((match = pattern.exec(content)) !== null) {
                const chapterStart = match.index;
                const chapterEnd = pattern.lastIndex;
                
                // 提取前一章的内容
                if (chapterStart > currentPosition) {
                    const prevChapterContent = content.substring(currentPosition, chapterStart).trim();
                    if (prevChapterContent.length > 0) {
                        chapters.push({
                            id: chapterId++,
                            title: `第${chapterId}章`,
                            content: prevChapterContent
                        });
                    }
                }
                
                // 提取当前章节标题
                const chapterTitle = (match[1] + ' ' + (match[2] || '')).trim();
                
                currentPosition = chapterEnd;
            }
        }
        
        // 添加最后一章
        if (currentPosition < content.length) {
            const lastChapterContent = content.substring(currentPosition).trim();
            if (lastChapterContent.length > 0) {
                chapters.push({
                    id: chapterId,
                    title: `第${chapterId + 1}章`,
                    content: lastChapterContent
                });
            }
        }
        
        // 如果没有划分出章节，使用传统方法
        if (chapters.length === 0) {
            const paragraphs = content.split(/\n\s*\n\s*\n/).filter(p => p.trim().length > 0);
            return paragraphs.map((para, index) => ({
                id: index,
                title: `第${index + 1}部分`,
                content: para
            }));
        }
        
        return chapters;
    }
}

// PDF文件解析器
class PDFParser {
    constructor() {
        this.metadata = {};
        this.toc = [];
        this.content = [];
        this.errors = [];
        this.warnings = [];
        this.progressCallback = null;
    }
    
    // 设置进度回调
    setProgressCallback(callback) {
        this.progressCallback = callback;
    }
    
    // 更新进度
    updateProgress(progress, message = '') {
        if (this.progressCallback) {
            this.progressCallback({
                progress: progress,
                message: message,
                timestamp: new Date().toISOString()
            });
        }
    }
    
    // 记录错误
    logError(message, error = null) {
        this.errors.push({
            message: message,
            error: error ? error.toString() : null,
            timestamp: new Date().toISOString()
        });
        console.error(`PDF解析错误: ${message}`, error);
    }
    
    // 记录警告
    logWarning(message) {
        this.warnings.push({
            message: message,
            timestamp: new Date().toISOString()
        });
        console.warn(`PDF解析警告: ${message}`);
    }
    
    // 解析PDF文件
    async parse(file) {
        this.updateProgress(0, '开始解析PDF文件');
        
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = async (e) => {
                try {
                    const arrayBuffer = e.target.result;
                    const pdfContent = new TextDecoder('utf-8', { fatal: false }).decode(arrayBuffer);
                    
                    this.updateProgress(10, '读取PDF文件内容');
                    
                    // 检查是否为有效的PDF文件
                    if (!pdfContent.startsWith('%PDF-')) {
                        this.logError('无效的PDF文件格式');
                        reject(new Error('无效的PDF文件格式'));
                        return;
                    }
                    
                    // 提取PDF版本
                    const versionMatch = pdfContent.match(/%PDF-([0-9\.]+)/);
                    const version = versionMatch ? versionMatch[1] : '1.0';
                    
                    this.updateProgress(20, '解析PDF版本信息');
                    
                    // 提取XREF表和trailer
                    const xrefMatch = pdfContent.match(/xref[\s\S]*?trailer[\s\S]*?\}/);
                    if (!xrefMatch) {
                        this.logWarning('未找到有效的XREF表和trailer，使用简化模式解析');
                        // 使用简化模式解析
                        await this.simplifiedParse(pdfContent, file);
                    } else {
                        // 使用完整模式解析
                        await this.fullParse(pdfContent, file);
                    }
                    
                    // 构建结果
                    const result = {
                        title: this.metadata.title || file.name.replace(/\.[^/.]+$/, ""),
                        author: this.metadata.author || '未知作者',
                        toc: this.toc.length > 0 ? this.toc : [{ id: 0, title: '正文', href: 'chapter-0' }],
                        content: this.content.length > 0 ? this.content : ['PDF内容解析功能正在开发中...\n\n目前仅支持文本文件的完整解析，PDF文件将被作为文本处理。'],
                        metadata: this.metadata,
                        version: version,
                        errors: this.errors,
                        warnings: this.warnings
                    };
                    
                    this.updateProgress(100, 'PDF解析完成');
                    resolve(result);
                } catch (error) {
                    this.logError('PDF解析失败', error);
                    reject(new Error(`PDF解析失败: ${error.message}`));
                }
            };
            
            reader.onerror = (error) => {
                this.logError('文件读取失败', error);
                reject(new Error(`文件读取失败: ${error.message}`));
            };
            
            reader.readAsArrayBuffer(file);
        });
    }
    
    // 简化解析模式（适用于无法找到XREF表的情况）
    async simplifiedParse(pdfContent, file) {
        this.updateProgress(30, '使用简化模式解析PDF');
        
        // 提取标题
        const titleMatch = pdfContent.match(/\/Title\s*\(([^)]+)\)/i);
        if (titleMatch) {
            this.metadata.title = this.decodePDFString(titleMatch[1]);
        }
        
        // 提取作者
        const authorMatch = pdfContent.match(/\/Author\s*\(([^)]+)\)/i);
        if (authorMatch) {
            this.metadata.author = this.decodePDFString(authorMatch[1]);
        }
        
        // 提取文本内容（简化模式，仅提取部分文本）
        let textContent = '';
        const textMatches = pdfContent.match(/\(([^)]+)\)/g);
        if (textMatches) {
            textContent = textMatches.map(match => this.decodePDFString(match.slice(1, -1))).join('\n');
            // 限制文本长度，避免内存问题
            if (textContent.length > 100000) {
                textContent = textContent.substring(0, 100000) + '\n\n[内容已截断]';
            }
        }
        
        this.content = [textContent];
        this.toc = [{ id: 0, title: '正文', href: 'chapter-0' }];
        
        this.updateProgress(70, '简化模式解析完成');
    }
    
    // 完整解析模式
    async fullParse(pdfContent, file) {
        this.updateProgress(30, '解析PDF文档结构');
        
        // 提取trailer
        const trailerMatch = pdfContent.match(/trailer[\s\S]*?\}/);
        if (trailerMatch) {
            const trailer = trailerMatch[0];
            
            // 提取Root对象引用
            const rootMatch = trailer.match(/\/Root\s*R\s*(\d+)\s*(\d+)/);
            if (rootMatch) {
                const rootObjNum = parseInt(rootMatch[1]);
                const rootGenNum = parseInt(rootMatch[2]);
                // 在实际实现中，我们需要根据XREF表找到Root对象的位置
                // 这里简化处理，直接提取元数据
                this.extractMetadata(pdfContent);
            }
        }
        
        this.updateProgress(50, '提取PDF元数据');
        
        // 提取文本内容
        this.extractTextContent(pdfContent);
        
        this.updateProgress(70, '提取PDF文本内容');
        
        // 提取目录
        this.extractTOC(pdfContent);
        
        this.updateProgress(90, '提取PDF目录');
    }
    
    // 提取元数据
    extractMetadata(pdfContent) {
        // 提取标题
        const titleMatch = pdfContent.match(/\/Title\s*\(([^)]+)\)/i) || 
                          pdfContent.match(/\/Title\s*<([^>]+)>/i);
        if (titleMatch) {
            this.metadata.title = this.decodePDFString(titleMatch[1]);
        }
        
        // 提取作者
        const authorMatch = pdfContent.match(/\/Author\s*\(([^)]+)\)/i) || 
                           pdfContent.match(/\/Author\s*<([^>]+)>/i);
        if (authorMatch) {
            this.metadata.author = this.decodePDFString(authorMatch[1]);
        }
        
        // 提取主题
        const subjectMatch = pdfContent.match(/\/Subject\s*\(([^)]+)\)/i) || 
                            pdfContent.match(/\/Subject\s*<([^>]+)>/i);
        if (subjectMatch) {
            this.metadata.subject = this.decodePDFString(subjectMatch[1]);
        }
        
        // 提取关键字
        const keywordsMatch = pdfContent.match(/\/Keywords\s*\(([^)]+)\)/i) || 
                             pdfContent.match(/\/Keywords\s*<([^>]+)>/i);
        if (keywordsMatch) {
            this.metadata.keywords = this.decodePDFString(keywordsMatch[1]);
        }
        
        // 提取创建者
        const creatorMatch = pdfContent.match(/\/Creator\s*\(([^)]+)\)/i) || 
                            pdfContent.match(/\/Creator\s*<([^>]+)>/i);
        if (creatorMatch) {
            this.metadata.creator = this.decodePDFString(creatorMatch[1]);
        }
        
        // 提取生产者
        const producerMatch = pdfContent.match(/\/Producer\s*\(([^)]+)\)/i) || 
                             pdfContent.match(/\/Producer\s*<([^>]+)>/i);
        if (producerMatch) {
            this.metadata.producer = this.decodePDFString(producerMatch[1]);
        }
        
        // 提取创建日期
        const creationDateMatch = pdfContent.match(/\/CreationDate\s*\(([^)]+)\)/i) || 
                                 pdfContent.match(/\/CreationDate\s*<([^>]+)>/i);
        if (creationDateMatch) {
            this.metadata.creationDate = this.decodePDFString(creationDateMatch[1]);
        }
    }
    
    // 提取文本内容
    extractTextContent(pdfContent) {
        // 简化的文本提取，实际PDF文本提取需要解析内容流
        let textContent = '';
        
        // 提取所有文本字符串
        const textRegex = /\(([^)]+)\)/g;
        let match;
        while ((match = textRegex.exec(pdfContent)) !== null) {
            const text = this.decodePDFString(match[1]);
            if (text.length > 10 && !text.includes('<<') && !text.includes('>>')) {
                textContent += text + '\n';
            }
        }
        
        // 清理文本内容
        textContent = textContent.replace(/\s+/g, ' ').trim();
        
        // 按章节划分
        if (textContent.length > 0) {
            // 简化的章节划分，实际应根据PDF结构划分
            const chapters = this.splitIntoChapters(textContent);
            this.content = chapters;
        } else {
            this.content = ['未提取到文本内容'];
        }
    }
    
    // 提取目录
    extractTOC(pdfContent) {
        // 简化的目录提取，实际需要解析PDF的Outline字典
        this.toc = [{ id: 0, title: '正文', href: 'chapter-0' }];
        
        // 尝试提取一些可能的章节标题
        const headingRegex = /(Chapter|第[^\s]+章|\d+\s*\.)\s+([^\n]+)/gi;
        let match;
        let chapterId = 1;
        while ((match = headingRegex.exec(pdfContent)) !== null && this.toc.length < 20) {
            const title = match[0].trim();
            this.toc.push({
                id: chapterId,
                title: title,
                href: `chapter-${chapterId}`
            });
            chapterId++;
        }
    }
    
    // 解码PDF字符串
    decodePDFString(str) {
        // 简化的PDF字符串解码，实际需要处理各种编码和转义序列
        return str
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, '\r')
            .replace(/\\t/g, '\t')
            .replace(/\\\(/g, '(')
            .replace(/\\\)/g, ')')
            .replace(/\\([0-7]{3})/g, (match, octal) => String.fromCharCode(parseInt(octal, 8)))
            .replace(/\\x([0-9a-fA-F]{2})/g, (match, hex) => String.fromCharCode(parseInt(hex, 16)));
    }
    
    // 将文本内容按章节划分
    splitIntoChapters(content) {
        // 简单的章节划分逻辑：按多个空行或特定标记
        const chapters = content.split(/\n\s*\n\s*\n/).filter(chapter => chapter.trim());
        
        // 如果没有划分出章节，整个内容作为一章
        if (chapters.length === 0) {
            return [content];
        }
        
        return chapters;
    }
}

// MOBI文件解析器
class MOBIParser {
    constructor() {
        this.metadata = {};
        this.toc = [];
        this.content = [];
        this.errors = [];
        this.warnings = [];
        this.progressCallback = null;
    }
    
    // 设置进度回调
    setProgressCallback(callback) {
        this.progressCallback = callback;
    }
    
    // 更新进度
    updateProgress(progress, message = '') {
        if (this.progressCallback) {
            this.progressCallback({
                progress: progress,
                message: message,
                timestamp: new Date().toISOString()
            });
        }
    }
    
    // 记录错误
    logError(message, error = null) {
        this.errors.push({
            message: message,
            error: error ? error.toString() : null,
            timestamp: new Date().toISOString()
        });
        console.error(`MOBI解析错误: ${message}`, error);
    }
    
    // 记录警告
    logWarning(message) {
        this.warnings.push({
            message: message,
            timestamp: new Date().toISOString()
        });
        console.warn(`MOBI解析警告: ${message}`);
    }
    
    // 解析MOBI文件
    async parse(file) {
        this.updateProgress(0, '开始解析MOBI文件');
        
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = async (e) => {
                try {
                    const arrayBuffer = e.target.result;
                    const dataView = new DataView(arrayBuffer);
                    
                    this.updateProgress(10, '读取MOBI文件内容');
                    
                    // 检查是否为有效的MOBI文件
                    if (!this.isValidMOBI(dataView)) {
                        this.logError('无效的MOBI文件格式');
                        reject(new Error('无效的MOBI文件格式'));
                        return;
                    }
                    
                    // 提取MOBI元数据
                    this.extractMetadata(dataView);
                    
                    this.updateProgress(40, '提取MOBI元数据');
                    
                    // 提取MOBI文本内容
                    this.extractContent(dataView);
                    
                    this.updateProgress(70, '提取MOBI文本内容');
                    
                    // 提取MOBI目录
                    this.extractTOC(dataView);
                    
                    this.updateProgress(90, '提取MOBI目录');
                    
                    // 构建结果
                    const result = {
                        title: this.metadata.title || file.name.replace(/\.[^/.]+$/, ""),
                        author: this.metadata.creator || this.metadata.author || '未知作者',
                        toc: this.toc.length > 0 ? this.toc : [{ id: 0, title: '正文', href: 'chapter-0' }],
                        content: this.content.length > 0 ? this.content : ['未提取到文本内容'],
                        metadata: this.metadata,
                        version: this.metadata.version || '2.0',
                        errors: this.errors,
                        warnings: this.warnings
                    };
                    
                    this.updateProgress(100, 'MOBI解析完成');
                    resolve(result);
                } catch (error) {
                    this.logError('MOBI解析失败', error);
                    reject(new Error(`MOBI解析失败: ${error.message}`));
                }
            };
            
            reader.onerror = (error) => {
                this.logError('文件读取失败', error);
                reject(new Error(`文件读取失败: ${error.message}`));
            };
            
            reader.readAsArrayBuffer(file);
        });
    }
    
    // 检查是否为有效的MOBI文件
    isValidMOBI(dataView) {
        // 检查MOBI文件头签名
        const signature = String.fromCharCode(
            dataView.getUint8(0),
            dataView.getUint8(1),
            dataView.getUint8(2),
            dataView.getUint8(3)
        );
        // MOBI文件通常以"BOOKMOBI"或其他签名开头
        return signature === 'BOOK' || signature === 'TPZ ' || signature === 'MOBI';
    }
    
    // 提取元数据
    extractMetadata(dataView) {
        // 简化的MOBI元数据提取，实际需要解析EXTH头
        this.metadata = {
            title: '未知书名',
            author: '未知作者',
            version: '2.0'
        };
        
        // 尝试提取一些基本信息
        try {
            // 搜索可能的标题
            const titleOffset = this.searchString(dataView, 'Title');
            if (titleOffset !== -1) {
                this.metadata.title = this.extractString(dataView, titleOffset + 6);
            }
            
            // 搜索可能的作者
            const authorOffset = this.searchString(dataView, 'Author');
            if (authorOffset !== -1) {
                this.metadata.author = this.extractString(dataView, authorOffset + 7);
            }
        } catch (error) {
            this.logWarning('提取MOBI元数据时出错', error);
        }
    }
    
    // 提取文本内容
    extractContent(dataView) {
        // 简化的MOBI内容提取，实际需要解析PalmDB和MOBI数据
        let textContent = '';
        
        // 尝试提取一些文本
        for (let i = 0; i < dataView.byteLength && textContent.length < 100000; i += 1000) {
            const chunk = this.extractString(dataView, i, 1000);
            if (chunk.length > 0 && /[a-zA-Z\u4e00-\u9fa5]/.test(chunk)) {
                textContent += chunk + '\n';
            }
        }
        
        // 清理文本内容
        textContent = textContent.replace(/\s+/g, ' ').trim();
        
        // 按章节划分
        if (textContent.length > 0) {
            const chapters = this.splitIntoChapters(textContent);
            this.content = chapters;
        } else {
            this.content = ['未提取到文本内容'];
        }
    }
    
    // 提取目录
    extractTOC(dataView) {
        // 简化的目录提取
        this.toc = [{ id: 0, title: '正文', href: 'chapter-0' }];
    }
    
    // 搜索字符串
    searchString(dataView, searchStr) {
        for (let i = 0; i < dataView.byteLength - searchStr.length; i++) {
            let match = true;
            for (let j = 0; j < searchStr.length; j++) {
                if (dataView.getUint8(i + j) !== searchStr.charCodeAt(j)) {
                    match = false;
                    break;
                }
            }
            if (match) {
                return i;
            }
        }
        return -1;
    }
    
    // 提取字符串
    extractString(dataView, offset, maxLength = 100) {
        const chars = [];
        for (let i = 0; i < maxLength && offset + i < dataView.byteLength; i++) {
            const byte = dataView.getUint8(offset + i);
            if (byte === 0) break;
            chars.push(String.fromCharCode(byte));
        }
        return chars.join('');
    }
    
    // 按章节划分
    splitIntoChapters(content) {
        // 简单的章节划分逻辑
        const chapters = content.split(/\n\s*\n\s*\n/).filter(chapter => chapter.trim());
        return chapters.length > 0 ? chapters : [content];
    }
}

// 文件解析工厂
class FileParserFactory {
    static getParser(file) {
        const extension = file.name.split('.').pop().toLowerCase();
        if (extension === 'epub') {
            return new EpubParser();
        } else if (extension === 'txt') {
            return new TextParser();
        } else if (extension === 'pdf') {
            return new PDFParser();
        } else if (extension === 'mobi' || extension === 'azw' || extension === 'azw3') {
            return new MOBIParser();
        } else {
            throw new Error('不支持的文件格式');
        }
    }
}