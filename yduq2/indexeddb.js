// IndexedDB管理类 - 用于电子书索引和存储
class IndexedDBManager {
    constructor() {
        this.dbName = 'EBookLibrary';
        this.dbVersion = 1;
        this.db = null;
    }
    
    // 打开或创建数据库
    async openDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = (event) => {
                console.error('IndexedDB打开失败:', event.target.error);
                reject(event.target.error);
            };
            
            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve(this.db);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // 创建存储对象
                if (!db.objectStoreNames.contains('books')) {
                    const bookStore = db.createObjectStore('books', {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    
                    // 创建索引
                    bookStore.createIndex('title', 'title', { unique: false });
                    bookStore.createIndex('author', 'author', { unique: false });
                    bookStore.createIndex('fileType', 'fileType', { unique: false });
                    bookStore.createIndex('addedDate', 'addedDate', { unique: false });
                    bookStore.createIndex('lastRead', 'lastRead', { unique: false });
                    bookStore.createIndex('fileName', 'fileName', { unique: false });
                }
                
                if (!db.objectStoreNames.contains('readingProgress')) {
                    const progressStore = db.createObjectStore('readingProgress', {
                        keyPath: 'bookId',
                        unique: true
                    });
                }
            };
        });
    }
    
    // 确保数据库已打开
    async ensureDB() {
        if (!this.db) {
            await this.openDB();
        }
        return this.db;
    }
    
    // 添加书籍
    async addBook(book) {
        const db = await this.ensureDB();
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['books'], 'readwrite');
            const store = transaction.objectStore('books');
            
            const request = store.add(book);
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
            
            request.onsuccess = (event) => {
                resolve(event.target.result);
            };
        });
    }
    
    // 获取所有书籍
    async getAllBooks() {
        const db = await this.ensureDB();
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['books'], 'readonly');
            const store = transaction.objectStore('books');
            
            const request = store.getAll();
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
            
            request.onsuccess = (event) => {
                resolve(event.target.result);
            };
        });
    }
    
    // 根据ID获取书籍
    async getBookById(id) {
        const db = await this.ensureDB();
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['books'], 'readonly');
            const store = transaction.objectStore('books');
            
            const request = store.get(id);
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
            
            request.onsuccess = (event) => {
                resolve(event.target.result);
            };
        });
    }
    
    // 更新书籍
    async updateBook(book) {
        const db = await this.ensureDB();
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['books'], 'readwrite');
            const store = transaction.objectStore('books');
            
            const request = store.put(book);
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
            
            request.onsuccess = (event) => {
                resolve(event.target.result);
            };
        });
    }
    
    // 删除书籍
    async deleteBook(id) {
        const db = await this.ensureDB();
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['books', 'readingProgress'], 'readwrite');
            
            // 删除书籍
            const bookStore = transaction.objectStore('books');
            const bookRequest = bookStore.delete(id);
            
            bookRequest.onerror = (event) => {
                reject(event.target.error);
            };
            
            // 删除相关的阅读进度
            const progressStore = transaction.objectStore('readingProgress');
            const progressRequest = progressStore.delete(id);
            
            progressRequest.onerror = (event) => {
                reject(event.target.error);
            };
            
            transaction.oncomplete = () => {
                resolve(true);
            };
        });
    }
    
    // 搜索书籍
    async searchBooks(searchTerm) {
        const db = await this.ensureDB();
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['books'], 'readonly');
            const store = transaction.objectStore('books');
            
            // 全文搜索实现
            const results = [];
            const request = store.openCursor();
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
            
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    const book = cursor.value;
                    if (book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        book.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        book.metadata?.subject?.toLowerCase().includes(searchTerm.toLowerCase())) {
                        results.push(book);
                    }
                    cursor.continue();
                } else {
                    resolve(results);
                }
            };
        });
    }
    
    // 根据标题和作者查找书籍
    async findBookByTitleAndAuthor(title, author) {
        const db = await this.ensureDB();
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['books'], 'readonly');
            const store = transaction.objectStore('books');
            
            const request = store.openCursor();
            let foundBook = null;
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
            
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    const book = cursor.value;
                    if (book.title === title && book.author === author) {
                        foundBook = book;
                    } else {
                        cursor.continue();
                        return;
                    }
                }
                resolve(foundBook);
            };
        });
    }
    
    // 保存阅读进度
    async saveReadingProgress(bookId, progress) {
        const db = await this.ensureDB();
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['readingProgress'], 'readwrite');
            const store = transaction.objectStore('readingProgress');
            
            const progressData = {
                bookId: bookId,
                ...progress,
                updatedAt: new Date().toISOString()
            };
            
            const request = store.put(progressData);
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
            
            request.onsuccess = (event) => {
                resolve(event.target.result);
            };
        });
    }
    
    // 获取阅读进度
    async getReadingProgress(bookId) {
        const db = await this.ensureDB();
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['readingProgress'], 'readonly');
            const store = transaction.objectStore('readingProgress');
            
            const request = store.get(bookId);
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
            
            request.onsuccess = (event) => {
                resolve(event.target.result);
            };
        });
    }
    
    // 删除阅读进度
    async deleteReadingProgress(bookId) {
        const db = await this.ensureDB();
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['readingProgress'], 'readwrite');
            const store = transaction.objectStore('readingProgress');
            
            const request = store.delete(bookId);
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
            
            request.onsuccess = (event) => {
                resolve(true);
            };
        });
    }
    
    // 关闭数据库
    closeDB() {
        if (this.db) {
            this.db.close();
            this.db = null;
        }
    }
    
    // 清除所有数据
    async clearAll() {
        const db = await this.ensureDB();
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['books', 'readingProgress'], 'readwrite');
            const bookStore = transaction.objectStore('books');
            const progressStore = transaction.objectStore('readingProgress');
            
            const bookRequest = bookStore.clear();
            const progressRequest = progressStore.clear();
            
            bookRequest.onerror = (event) => {
                reject(event.target.error);
            };
            
            progressRequest.onerror = (event) => {
                reject(event.target.error);
            };
            
            transaction.oncomplete = () => {
                resolve(true);
            };
        });
    }
}

// 导出单例实例
const dbManager = new IndexedDBManager();
