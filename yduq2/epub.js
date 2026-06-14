class EpubParser {
    constructor() {
        this.errors = [];
        this.warnings = [];
        this.progressCallback = null;
    }
    setProgressCallback(cb) { this.progressCallback = cb; }
    updateProgress(p, msg = '') { if (this.progressCallback) this.progressCallback({ progress: p, message: msg }); }
    logError(msg, err) { this.errors.push({ message: msg, error: err ? err.toString() : null }); console.error(msg, err); }
    logWarning(msg) { this.warnings.push({ message: msg }); console.warn(msg); }

    async parse(file) {
        this.errors = [];
        this.warnings = [];
        this.updateProgress(10, '读取文件');
        if (typeof ePub === 'undefined') {
            this.logWarning('epub.js 未加载，将作为文本文件处理');
            return this.parseAsText(file);
        }
        try {
            const arrayBuffer = await file.arrayBuffer();
            this.updateProgress(30, '解析EPUB');
            const book = ePub(arrayBuffer);
            const metadata = await book.loaded.metadata;
            const navigation = await book.loaded.navigation;
            const spine = await book.loaded.spine;
            this.updateProgress(60, '提取内容');
            const toc = navigation.toc.map((item, i) => ({ id: i, title: item.label.trim(), href: item.href }));
            const content = [];
            for (let i = 0; i < spine.items.length; i++) {
                const section = spine.items[i];
                try {
                    const doc = await section.load(book.load.bind(book));
                    const text = doc.body ? doc.body.textContent || '' : '';
                    content.push(text.trim());
                } catch (e) {
                    content.push('');
                }
            }
            this.updateProgress(90, '完成');
            book.destroy();
            this.updateProgress(100, '完成');
            return {
                title: metadata.title || file.name.replace(/\.[^/.]+$/, ''),
                author: metadata.creator || '未知作者',
                toc: toc.length ? toc : content.map((_, i) => ({ id: i, title: `第${i + 1}章`, href: '' })),
                content: content.length ? content : ['无法提取EPUB内容'],
                errors: this.errors,
                warnings: this.warnings
            };
        } catch (error) {
            this.logError('EPUB解析失败，尝试作为文本处理', error);
            return this.parseAsText(file);
        }
    }

    async parseAsText(file) {
        const text = await file.text();
        const title = file.name.replace(/\.[^/.]+$/, '');
        const chapters = text.split(/\n\s*\n\s*\n/).filter(c => c.trim());
        const content = chapters.length > 1 ? chapters : [text];
        return {
            title,
            author: '未知作者',
            toc: content.map((_, i) => ({ id: i, title: `第${i + 1}章`, href: '' })),
            content,
            errors: this.errors,
            warnings: this.warnings
        };
    }
}

class TextParser {
    constructor() {
        this.errors = [];
        this.warnings = [];
        this.progressCallback = null;
    }
    setProgressCallback(cb) { this.progressCallback = cb; }
    updateProgress(p, msg = '') { if (this.progressCallback) this.progressCallback({ progress: p, message: msg }); }

    async parse(file) {
        this.updateProgress(0, '读取文件');
        const text = await file.text();
        this.updateProgress(50, '解析内容');
        const title = file.name.replace(/\.[^/.]+$/, '');
        const chapters = text.split(/\n\s*\n\s*\n/).filter(c => c.trim());
        const content = chapters.length > 1 ? chapters : [text];
        this.updateProgress(100, '完成');
        return {
            title,
            author: '未知作者',
            toc: content.map((_, i) => ({ id: i, title: `第${i + 1}章`, href: '' })),
            content,
            errors: this.errors,
            warnings: this.warnings
        };
    }
}

class PDFParser {
    constructor() {
        this.errors = [];
        this.warnings = [];
        this.progressCallback = null;
    }
    setProgressCallback(cb) { this.progressCallback = cb; }
    updateProgress(p, msg = '') { if (this.progressCallback) this.progressCallback({ progress: p, message: msg }); }
    logError(msg, err) { this.errors.push({ message: msg }); console.error(msg, err); }

    async parse(file) {
        this.updateProgress(0, '读取PDF');
        try {
            const arrayBuffer = await file.arrayBuffer();
            const text = new TextDecoder('utf-8', { fatal: false }).decode(arrayBuffer);
            this.updateProgress(30, '解析内容');
            const titleMatch = text.match(/\/Title\s*\(([^)]+)\)/i);
            const title = titleMatch ? titleMatch[1] : file.name.replace(/\.[^/.]+$/, '');
            const textMatches = text.match(/\(([^)]+)\)/g);
            const content = textMatches ? textMatches.map(m => m.slice(1, -1)).join('\n').substring(0, 100000) : 'PDF内容解析需要专业PDF库支持。\n\n建议使用TXT或EPUB格式的文件。';
            this.updateProgress(100, '完成');
            return {
                title,
                author: '未知作者',
                toc: [{ id: 0, title: '正文', href: '' }],
                content: [content],
                errors: this.errors,
                warnings: this.warnings
            };
        } catch (error) {
            this.logError('PDF解析失败', error);
            return {
                title: file.name.replace(/\.[^/.]+$/, ''),
                author: '未知作者',
                toc: [{ id: 0, title: '正文', href: '' }],
                content: ['PDF解析失败，请使用TXT或EPUB格式。'],
                errors: this.errors,
                warnings: this.warnings
            };
        }
    }
}

class FileParserFactory {
    static getParser(file) {
        const ext = file.name.split('.').pop().toLowerCase();
        if (ext === 'epub') return new EpubParser();
        if (ext === 'pdf') return new PDFParser();
        return new TextParser();
    }
}
