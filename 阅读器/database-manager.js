const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const Datastore = require('nedb');

class DatabaseManager {
    constructor() {
        this.databases = {};
        this.dbDir = null;
        this.isInitialized = false;
        this.init();
    }

    // 初始化数据库
    async init() {
        try {
            const userDataPath = app.getPath('userData');
            this.dbDir = userDataPath;
            
            // 确保数据目录存在
            if (!fs.existsSync(this.dbDir)) {
                fs.mkdirSync(this.dbDir, { recursive: true });
            }
            
            await this.connect();
            await this.createTables();
            this.isInitialized = true;
            
            console.log('NeDB数据库初始化成功:', this.dbDir);
        } catch (error) {
            console.error('数据库初始化失败:', error);
            throw error;
        }
    }

    // 连接数据库
    connect() {
        return new Promise((resolve, reject) => {
            try {
                // 初始化各个数据库文件
                this.databases.documents = new Datastore({ 
                    filename: path.join(this.dbDir, 'documents.db'), 
                    autoload: true 
                });
                this.databases.notes = new Datastore({ 
                    filename: path.join(this.dbDir, 'notes.db'), 
                    autoload: true 
                });
                this.databases.highlights = new Datastore({ 
                    filename: path.join(this.dbDir, 'highlights.db'), 
                    autoload: true 
                });
                this.databases.bookmarks = new Datastore({ 
                    filename: path.join(this.dbDir, 'bookmarks.db'), 
                    autoload: true 
                });
                this.databases.reading_progress = new Datastore({ 
                    filename: path.join(this.dbDir, 'reading_progress.db'), 
                    autoload: true 
                });
                this.databases.user_settings = new Datastore({ 
                    filename: path.join(this.dbDir, 'user_settings.db'), 
                    autoload: true 
                });
                this.databases.search_history = new Datastore({ 
                    filename: path.join(this.dbDir, 'search_history.db'), 
                    autoload: true 
                });
                this.databases.tags = new Datastore({ 
                    filename: path.join(this.dbDir, 'tags.db'), 
                    autoload: true 
                });
                this.databases.document_tags = new Datastore({ 
                    filename: path.join(this.dbDir, 'document_tags.db'), 
                    autoload: true 
                });
                this.databases.favorites = new Datastore({ 
                    filename: path.join(this.dbDir, 'favorites.db'), 
                    autoload: true 
                });
                
                console.log('NeDB数据库连接成功');
                resolve();
            } catch (err) {
                console.error('数据库连接失败:', err);
                reject(err);
            }
        });
    }

    // 创建数据表（NeDB不需要预定义表结构）
    async createTables() {
        // NeDB是无模式数据库，不需要预定义表结构
        // 直接创建索引即可
        await this.createIndexes();
    }

    // 创建索引
    async createIndexes() {
        try {
            // 为文档数据库创建索引
            this.databases.documents.ensureIndex({ fieldName: 'filepath', unique: true });
            this.databases.documents.ensureIndex({ fieldName: 'filetype' });
            this.databases.documents.ensureIndex({ fieldName: 'last_opened' });
            
            // 为笔记数据库创建索引
            this.databases.notes.ensureIndex({ fieldName: 'document_id' });
            
            // 为高亮数据库创建索引
            this.databases.highlights.ensureIndex({ fieldName: 'document_id' });
            
            // 为书签数据库创建索引
            this.databases.bookmarks.ensureIndex({ fieldName: 'document_id' });
            
            // 为阅读进度数据库创建索引
            this.databases.reading_progress.ensureIndex({ fieldName: 'document_id', unique: true });
            
            // 为用户设置数据库创建索引
            this.databases.user_settings.ensureIndex({ fieldName: 'setting_key', unique: true });
            
            // 为搜索历史数据库创建索引
            this.databases.search_history.ensureIndex({ fieldName: 'query' });
            
            // 为标签数据库创建索引
            this.databases.tags.ensureIndex({ fieldName: 'name', unique: true });
            
            console.log('数据库索引创建成功');
        } catch (error) {
            console.error('创建索引失败:', error);
        }
    }

    // NeDB操作方法
    insert(collection, doc) {
        return new Promise((resolve, reject) => {
            this.databases[collection].insert(doc, (err, newDoc) => {
                if (err) {
                    console.error('插入失败:', err);
                    reject(err);
                } else {
                    resolve(newDoc);
                }
            });
        });
    }

    // 查询单条记录
    findOne(collection, query = {}) {
        return new Promise((resolve, reject) => {
            this.databases[collection].findOne(query, (err, doc) => {
                if (err) {
                    console.error('查询失败:', err);
                    reject(err);
                } else {
                    resolve(doc);
                }
            });
        });
    }

    // 查询多条记录
    find(collection, query = {}, sort = {}) {
        return new Promise((resolve, reject) => {
            let cursor = this.databases[collection].find(query);
            if (Object.keys(sort).length > 0) {
                cursor = cursor.sort(sort);
            }
            cursor.exec((err, docs) => {
                if (err) {
                    console.error('查询失败:', err);
                    reject(err);
                } else {
                    resolve(docs || []);
                }
            });
        });
    }

    // 更新记录
    update(collection, query, update, options = {}) {
        return new Promise((resolve, reject) => {
            this.databases[collection].update(query, update, options, (err, numReplaced) => {
                if (err) {
                    console.error('更新失败:', err);
                    reject(err);
                } else {
                    resolve({ numReplaced });
                }
            });
        });
    }

    // 删除记录
    remove(collection, query, options = {}) {
        return new Promise((resolve, reject) => {
            this.databases[collection].remove(query, options, (err, numRemoved) => {
                if (err) {
                    console.error('删除失败:', err);
                    reject(err);
                } else {
                    resolve({ numRemoved });
                }
            });
        });
    }

    // 文档相关操作
    async addDocument(docData) {
        const doc = {
            filename: docData.filename,
            filepath: docData.filepath,
            filetype: docData.filetype,
            filesize: docData.filesize || 0,
            title: docData.title || docData.filename,
            author: docData.author || '',
            description: docData.description || '',
            tags: docData.tags || [],
            last_opened: new Date(),
            created_at: new Date(),
            updated_at: new Date()
        };
        
        return await this.insert('documents', doc);
    }

    async getDocument(filepath) {
        return await this.findOne('documents', { filepath: filepath });
    }

    async updateDocumentLastOpened(filepath) {
        return await this.update('documents', { filepath: filepath }, { $set: { last_opened: new Date() } });
    }

    async getRecentDocuments(limit = 10) {
        const docs = await this.find('documents', { last_opened: { $exists: true } }, { last_opened: -1 });
        return docs.slice(0, limit);
    }

    async searchDocuments(query) {
        const regex = new RegExp(query, 'i');
        return await this.find('documents', {
            $or: [
                { filename: regex },
                { title: regex },
                { author: regex },
                { description: regex }
            ]
        }, { last_opened: -1 });
    }

    // 笔记相关操作
    async addNote(noteData) {
        const note = {
            document_id: noteData.document_id,
            title: noteData.title,
            content: noteData.content,
            position_x: noteData.position_x,
            position_y: noteData.position_y,
            width: noteData.width,
            height: noteData.height,
            page_number: noteData.page_number,
            selection_text: noteData.selection_text,
            selection_range: noteData.selection_range,
            color: noteData.color || '#ffeb3b',
            is_pinned: noteData.is_pinned || false,
            created_at: new Date(),
            updated_at: new Date()
        };
        
        return await this.insert('notes', note);
    }

    async updateNote(noteId, noteData) {
        const update = {
            title: noteData.title,
            content: noteData.content,
            position_x: noteData.position_x,
            position_y: noteData.position_y,
            width: noteData.width,
            height: noteData.height,
            color: noteData.color,
            is_pinned: noteData.is_pinned,
            updated_at: new Date()
        };
        
        return await this.update('notes', { _id: noteId }, { $set: update });
    }

    async deleteNote(noteId) {
        return await this.remove('notes', { _id: noteId });
    }

    async getDocumentNotes(documentId) {
        return await this.find('notes', { document_id: documentId }, { created_at: -1 });
    }

    // 高亮相关操作
    async addHighlight(highlightData) {
        const highlight = {
            document_id: highlightData.document_id,
            text: highlightData.text,
            color: highlightData.color || '#ffff00',
            page_number: highlightData.page_number,
            start_offset: highlightData.start_offset,
            end_offset: highlightData.end_offset,
            selection_range: highlightData.selection_range,
            note: highlightData.note || '',
            created_at: new Date(),
            updated_at: new Date()
        };
        
        return await this.insert('highlights', highlight);
    }

    async deleteHighlight(highlightId) {
        return await this.remove('highlights', { _id: highlightId });
    }

    async getDocumentHighlights(documentId) {
        return await this.find('highlights', { document_id: documentId }, { page_number: 1, start_offset: 1 });
    }

    // 书签相关操作
    async addBookmark(bookmarkData) {
        const bookmark = {
            document_id: bookmarkData.document_id,
            title: bookmarkData.title,
            page_number: bookmarkData.page_number,
            position: bookmarkData.position,
            description: bookmarkData.description || '',
            created_at: new Date(),
            updated_at: new Date()
        };
        
        return await this.insert('bookmarks', bookmark);
    }

    async deleteBookmark(bookmarkId) {
        return await this.remove('bookmarks', { _id: bookmarkId });
    }

    async getDocumentBookmarks(documentId) {
        return await this.find('bookmarks', { document_id: documentId }, { page_number: 1 });
    }

    // 阅读进度相关操作
    async updateReadingProgress(documentId, progressData) {
        const progress = {
            document_id: documentId,
            current_page: progressData.current_page,
            total_pages: progressData.total_pages,
            progress_percentage: progressData.progress_percentage,
            reading_time: progressData.reading_time || 0,
            last_position: progressData.last_position,
            updated_at: new Date()
        };
        
        const existing = await this.findOne('reading_progress', { document_id: documentId });
        if (existing) {
            return await this.update('reading_progress', { document_id: documentId }, { $set: progress });
        } else {
            progress.created_at = new Date();
            return await this.insert('reading_progress', progress);
        }
    }

    async getReadingProgress(documentId) {
        return await this.findOne('reading_progress', { document_id: documentId });
    }

    // 用户设置相关操作
    async setSetting(key, value, type = 'string') {
        const setting = {
            setting_key: key,
            setting_value: typeof value === 'object' ? JSON.stringify(value) : String(value),
            setting_type: type,
            updated_at: new Date()
        };
        
        const existing = await this.findOne('user_settings', { setting_key: key });
        if (existing) {
            return await this.update('user_settings', { setting_key: key }, { $set: setting });
        } else {
            setting.created_at = new Date();
            return await this.insert('user_settings', setting);
        }
    }

    async getSetting(key, defaultValue = null) {
        const result = await this.findOne('user_settings', { setting_key: key });
        
        if (!result) {
            return defaultValue;
        }
        
        try {
            switch (result.setting_type) {
                case 'json':
                    return JSON.parse(result.setting_value);
                case 'number':
                    return Number(result.setting_value);
                case 'boolean':
                    return result.setting_value === 'true';
                default:
                    return result.setting_value;
            }
        } catch (error) {
            console.error('解析设置值失败:', error);
            return defaultValue;
        }
    }

    async getAllSettings() {
        const rows = await this.find('user_settings', {}, { setting_key: 1 });
        
        const settings = {};
        for (const row of rows) {
            try {
                switch (row.setting_type) {
                    case 'json':
                        settings[row.setting_key] = JSON.parse(row.setting_value);
                        break;
                    case 'number':
                        settings[row.setting_key] = Number(row.setting_value);
                        break;
                    case 'boolean':
                        settings[row.setting_key] = row.setting_value === 'true';
                        break;
                    default:
                        settings[row.setting_key] = row.setting_value;
                }
            } catch (error) {
                console.error('解析设置值失败:', error);
                settings[row.setting_key] = row.setting_value;
            }
        }
        
        return settings;
    }

    // 搜索历史相关操作
    async addSearchHistory(query, documentId = null, resultsCount = 0) {
        const searchHistory = {
            query: query,
            document_id: documentId,
            results_count: resultsCount,
            created_at: new Date()
        };
        
        return await this.insert('search_history', searchHistory);
    }

    async getSearchHistory(limit = 20) {
        const allHistory = await this.find('search_history', {}, { created_at: -1 });
        
        // Group by query and get the latest entry for each
        const uniqueQueries = new Map();
        for (const item of allHistory) {
            if (!uniqueQueries.has(item.query) || uniqueQueries.get(item.query).created_at < item.created_at) {
                uniqueQueries.set(item.query, { query: item.query, last_used: item.created_at });
            }
        }
        
        return Array.from(uniqueQueries.values())
            .sort((a, b) => new Date(b.last_used) - new Date(a.last_used))
            .slice(0, limit);
    }

    async clearSearchHistory() {
        return await this.remove('search_history', {}, { multi: true });
    }

    // 标签相关操作
    async addTag(name, color = '#007bff', description = '') {
        const existing = await this.findOne('tags', { name: name });
        if (existing) {
            return existing;
        }
        
        const tag = {
            name: name,
            color: color,
            description: description,
            created_at: new Date(),
            updated_at: new Date()
        };
        
        return await this.insert('tags', tag);
    }

    async getAllTags() {
        return await this.find('tags', {}, { name: 1 });
    }

    async addDocumentTag(documentId, tagId) {
        const existing = await this.findOne('document_tags', { document_id: documentId, tag_id: tagId });
        if (existing) {
            return existing;
        }
        
        const docTag = {
            document_id: documentId,
            tag_id: tagId,
            created_at: new Date()
        };
        
        return await this.insert('document_tags', docTag);
    }

    async removeDocumentTag(documentId, tagId) {
        return await this.remove('document_tags', { document_id: documentId, tag_id: tagId });
    }

    async getDocumentTags(documentId) {
        const docTags = await this.find('document_tags', { document_id: documentId });
        const tags = [];
        
        for (const docTag of docTags) {
            const tag = await this.findOne('tags', { _id: docTag.tag_id });
            if (tag) {
                tags.push(tag);
            }
        }
        
        return tags.sort((a, b) => a.name.localeCompare(b.name));
    }

    // 收藏夹相关操作
    async addToFavorites(documentId) {
        const existing = await this.findOne('favorites', { document_id: documentId });
        if (existing) {
            return existing;
        }
        
        const favorite = {
            document_id: documentId,
            created_at: new Date()
        };
        
        return await this.insert('favorites', favorite);
    }

    async removeFromFavorites(documentId) {
        return await this.remove('favorites', { document_id: documentId });
    }

    async getFavoriteDocuments() {
        const favorites = await this.find('favorites', {}, { created_at: -1 });
        const documents = [];
        
        for (const favorite of favorites) {
            const doc = await this.findOne('documents', { _id: favorite.document_id });
            if (doc) {
                documents.push(doc);
            }
        }
        
        return documents;
    }

    async isFavorite(documentId) {
        const result = await this.findOne('favorites', { document_id: documentId });
        return !!result;
    }

    // 统计信息
    async getStatistics() {
        const stats = {};
        
        // 文档统计
        const documents = await this.find('documents');
        stats.totalDocuments = documents.length;
        
        // 笔记统计
        const notes = await this.find('notes');
        stats.totalNotes = notes.length;
        
        // 高亮统计
        const highlights = await this.find('highlights');
        stats.totalHighlights = highlights.length;
        
        // 书签统计
        const bookmarks = await this.find('bookmarks');
        stats.totalBookmarks = bookmarks.length;
        
        // 收藏统计
        const favorites = await this.find('favorites');
        stats.totalFavorites = favorites.length;
        
        // 阅读时间统计
        const readingProgress = await this.find('reading_progress');
        stats.totalReadingTime = readingProgress.reduce((total, progress) => total + (progress.reading_time || 0), 0);
        
        return stats;
    }

    // 数据库维护
    async vacuum() {
        // NeDB doesn't need vacuum, but we can compact all databases
        const promises = Object.keys(this.databases).map(key => {
            return new Promise((resolve) => {
                this.databases[key].persistence.compactDatafile();
                resolve();
            });
        });
        return Promise.all(promises);
    }

    async backup(backupPath) {
        const fs = require('fs');
        const path = require('path');
        
        // Ensure backup directory exists
        if (!fs.existsSync(backupPath)) {
            fs.mkdirSync(backupPath, { recursive: true });
        }
        
        // Copy all database files
        const promises = Object.keys(this.databases).map(key => {
            return new Promise((resolve, reject) => {
                const sourceFile = path.join(this.dbDir, `${key}.db`);
                const targetFile = path.join(backupPath, `${key}.db`);
                
                if (fs.existsSync(sourceFile)) {
                    fs.copyFile(sourceFile, targetFile, (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                } else {
                    resolve();
                }
            });
        });
        
        return Promise.all(promises);
    }

    // 关闭数据库连接
    close() {
        return new Promise((resolve) => {
            // NeDB doesn't require explicit closing
            console.log('数据库连接已关闭');
            this.databases = {};
            resolve();
        });
    }
}

module.exports = DatabaseManager;