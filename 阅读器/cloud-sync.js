// 云同步模块
class CloudSyncManager {
    constructor() {
        this.syncStatus = 'disconnected'; // disconnected, syncing, synced, error
        this.lastSyncTime = null;
        this.syncInterval = 60000; // 60秒同步一次
        this.syncTimer = null;
        this.userId = null;
        this.deviceId = this.generateDeviceId();
        this.apiEndpoint = 'http://localhost:3001/api/sync';
        this.conflictResolution = 'latest'; // latest, manual, merge
        this.syncQueue = [];
        this.isOnline = navigator.onLine;
        
        // 延迟初始化到DOM加载完成后
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            // DOM已经加载完成
            this.init();
        }
    }
    
    init() {
        // 监听网络状态变化
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.showSyncStatus('网络已连接', 'success');
            this.startSync();
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.showSyncStatus('网络已断开', 'warning');
            this.stopSync();
        });
        
        // 加载用户设置
        this.loadUserSettings();
        
        // 初始化UI
        this.createSyncUI();
        
        // 启动同步
        if (this.isOnline && this.userId) {
            this.startSync();
        }
    }
    
    generateDeviceId() {
        let deviceId = localStorage.getItem('deviceId');
        if (!deviceId) {
            deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('deviceId', deviceId);
        }
        return deviceId;
    }
    
    loadUserSettings() {
        this.userId = localStorage.getItem('userId') || null;
        this.syncInterval = parseInt(localStorage.getItem('syncInterval')) || 60000;
        this.conflictResolution = localStorage.getItem('conflictResolution') || 'latest';
    }
    
    saveUserSettings() {
        localStorage.setItem('syncInterval', this.syncInterval.toString());
        localStorage.setItem('conflictResolution', this.conflictResolution);
    }
    
    createSyncUI() {
        // 创建同步状态指示器
        const syncStatus = document.createElement('div');
        syncStatus.id = 'cloud-sync-status';
        syncStatus.className = 'cloud-sync-status';
        syncStatus.innerHTML = `
            <div class="sync-indicator" id="syncIndicator">
                <div class="sync-icon" id="syncIcon">☁️</div>
                <div class="sync-text" id="syncText">未连接</div>
            </div>
            <div class="sync-controls" id="syncControls" style="display: none;">
                <button class="sync-btn" id="syncBtn" onclick="cloudSync.manualSync()">立即同步</button>
                <button class="sync-btn" id="settingsBtn" onclick="cloudSync.showSyncSettings()">⚙️</button>
            </div>
        `;
        
        // 添加样式
        const style = document.createElement('style');
        style.textContent = `
            .cloud-sync-status {
                position: fixed;
                top: 10px;
                right: 10px;
                z-index: 1000;
                background: rgba(255, 255, 255, 0.9);
                border-radius: 20px;
                padding: 8px 12px;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                display: flex;
                align-items: center;
                gap: 10px;
                font-size: 14px;
                transition: all 0.3s ease;
            }
            
            .sync-indicator {
                display: flex;
                align-items: center;
                gap: 5px;
            }
            
            .sync-icon {
                font-size: 16px;
            }
            
            .sync-text {
                font-weight: 500;
            }
            
            .sync-controls {
                display: flex;
                gap: 5px;
            }
            
            .sync-btn {
                background: none;
                border: none;
                cursor: pointer;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 12px;
                transition: background 0.2s ease;
            }
            
            .sync-btn:hover {
                background: rgba(0, 0, 0, 0.1);
            }
            
            .cloud-sync-status.syncing {
                background: rgba(255, 193, 7, 0.9);
            }
            
            .cloud-sync-status.synced {
                background: rgba(40, 167, 69, 0.9);
                color: white;
            }
            
            .cloud-sync-status.error {
                background: rgba(220, 53, 69, 0.9);
                color: white;
            }
            
            .sync-settings-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 2000;
            }
            
            .sync-settings-content {
                background: white;
                border-radius: 8px;
                padding: 20px;
                width: 400px;
                max-width: 90%;
            }
            
            .sync-settings-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
            }
            
            .sync-settings-group {
                margin-bottom: 15px;
            }
            
            .sync-settings-label {
                display: block;
                margin-bottom: 5px;
                font-weight: 500;
            }
            
            .sync-settings-input {
                width: 100%;
                padding: 8px;
                border: 1px solid #ddd;
                border-radius: 4px;
            }
            
            .sync-settings-buttons {
                display: flex;
                justify-content: flex-end;
                gap: 10px;
                margin-top: 20px;
            }
        `;
        
        document.head.appendChild(style);
        document.body.appendChild(syncStatus);
        
        // 如果已登录，显示控制按钮
        if (this.userId) {
            document.getElementById('syncControls').style.display = 'flex';
        }
    }
    
    updateSyncUI() {
        const indicator = document.getElementById('syncIndicator');
        const icon = document.getElementById('syncIcon');
        const text = document.getElementById('syncText');
        const status = document.getElementById('cloud-sync-status');
        
        // 移除所有状态类
        status.classList.remove('syncing', 'synced', 'error');
        
        switch (this.syncStatus) {
            case 'syncing':
                status.classList.add('syncing');
                icon.textContent = '🔄';
                text.textContent = '同步中...';
                break;
            case 'synced':
                status.classList.add('synced');
                icon.textContent = '✅';
                text.textContent = '已同步';
                if (this.lastSyncTime) {
                    text.textContent += ` (${this.formatTime(this.lastSyncTime)})`;
                }
                break;
            case 'error':
                status.classList.add('error');
                icon.textContent = '❌';
                text.textContent = '同步失败';
                break;
            default:
                icon.textContent = '☁️';
                text.textContent = '未连接';
        }
    }
    
    formatTime(date) {
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) {
            return '刚刚';
        } else if (diff < 3600000) {
            return `${Math.floor(diff / 60000)}分钟前`;
        } else if (diff < 86400000) {
            return `${Math.floor(diff / 3600000)}小时前`;
        } else {
            return date.toLocaleDateString();
        }
    }
    
    showSyncStatus(message, type = 'info') {
        // 可以扩展为显示通知
        console.log(`[云同步] ${message}`);
    }
    
    async login(userId, password) {
        try {
            const response = await fetch(`${this.apiEndpoint}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId,
                    password,
                    deviceId: this.deviceId
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.userId = userId;
                localStorage.setItem('userId', userId);
                localStorage.setItem('authToken', data.token);
                
                // 显示同步控制
                document.getElementById('syncControls').style.display = 'flex';
                
                this.showSyncStatus('登录成功', 'success');
                this.startSync();
                
                return true;
            } else {
                this.showSyncStatus(`登录失败: ${data.error}`, 'error');
                return false;
            }
        } catch (error) {
            this.showSyncStatus(`登录错误: ${error.message}`, 'error');
            return false;
        }
    }
    
    logout() {
        this.userId = null;
        localStorage.removeItem('userId');
        localStorage.removeItem('authToken');
        
        // 隐藏同步控制
        document.getElementById('syncControls').style.display = 'none';
        
        this.stopSync();
        this.updateSyncUI();
        this.showSyncStatus('已退出登录', 'info');
    }
    
    startSync() {
        if (!this.userId || !this.isOnline) {
            return;
        }
        
        // 立即执行一次同步
        this.manualSync();
        
        // 设置定期同步
        this.stopSync(); // 先停止之前的同步
        this.syncTimer = setInterval(() => {
            this.manualSync();
        }, this.syncInterval);
    }
    
    stopSync() {
        if (this.syncTimer) {
            clearInterval(this.syncTimer);
            this.syncTimer = null;
        }
    }
    
    async manualSync() {
        if (!this.userId || !this.isOnline) {
            this.showSyncStatus('无法同步：未登录或离线', 'warning');
            return;
        }
        
        this.syncStatus = 'syncing';
        this.updateSyncUI();
        
        try {
            // 获取本地数据
            const localData = this.collectLocalData();
            
            // 发送到服务器
            const response = await fetch(`${this.apiEndpoint}/sync`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify({
                    userId: this.userId,
                    deviceId: this.deviceId,
                    data: localData,
                    lastSyncTime: this.lastSyncTime
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                // 处理服务器返回的数据
                await this.processServerData(result.data);
                
                this.lastSyncTime = new Date();
                this.syncStatus = 'synced';
                this.showSyncStatus('同步完成', 'success');
            } else {
                this.syncStatus = 'error';
                this.showSyncStatus(`同步失败: ${result.error}`, 'error');
            }
        } catch (error) {
            this.syncStatus = 'error';
            this.showSyncStatus(`同步错误: ${error.message}`, 'error');
        }
        
        this.updateSyncUI();
    }
    
    collectLocalData() {
        const data = {
            notes: {},
            bookmarks: [],
            readingProgress: {},
            settings: {},
            timestamp: new Date().toISOString()
        };
        
        // 收集笔记
        const notes = localStorage.getItem('notes');
        if (notes) {
            try {
                data.notes = JSON.parse(notes);
            } catch (e) {
                console.error('解析笔记数据失败:', e);
            }
        }
        
        // 收集书签
        const bookmarks = localStorage.getItem('bookmarks');
        if (bookmarks) {
            try {
                data.bookmarks = JSON.parse(bookmarks);
            } catch (e) {
                console.error('解析书签数据失败:', e);
            }
        }
        
        // 收集阅读进度
        const readingProgress = localStorage.getItem('readingProgress');
        if (readingProgress) {
            try {
                data.readingProgress = JSON.parse(readingProgress);
            } catch (e) {
                console.error('解析阅读进度数据失败:', e);
            }
        }
        
        // 收集设置
        const settings = {
            theme: localStorage.getItem('theme'),
            fontSize: localStorage.getItem('fontSize'),
            fontFamily: localStorage.getItem('fontFamily'),
            lineHeight: localStorage.getItem('lineHeight'),
            bgColor: localStorage.getItem('bgColor'),
            textColor: localStorage.getItem('textColor')
        };
        
        // 过滤掉空值
        data.settings = Object.fromEntries(
            Object.entries(settings).filter(([key, value]) => value !== null)
        );
        
        return data;
    }
    
    async processServerData(serverData) {
        if (!serverData) return;
        
        // 处理笔记
        if (serverData.notes) {
            const localNotes = JSON.parse(localStorage.getItem('notes') || '{}');
            const mergedNotes = this.mergeData(localNotes, serverData.notes, 'notes');
            localStorage.setItem('notes', JSON.stringify(mergedNotes));
        }
        
        // 处理书签
        if (serverData.bookmarks) {
            const localBookmarks = JSON.parse(localStorage.getItem('bookmarks') || '[]');
            const mergedBookmarks = this.mergeData(localBookmarks, serverData.bookmarks, 'bookmarks');
            localStorage.setItem('bookmarks', JSON.stringify(mergedBookmarks));
        }
        
        // 处理阅读进度
        if (serverData.readingProgress) {
            const localProgress = JSON.parse(localStorage.getItem('readingProgress') || '{}');
            const mergedProgress = this.mergeData(localProgress, serverData.readingProgress, 'readingProgress');
            localStorage.setItem('readingProgress', JSON.stringify(mergedProgress));
        }
        
        // 处理设置
        if (serverData.settings) {
            const localSettings = {
                theme: localStorage.getItem('theme'),
                fontSize: localStorage.getItem('fontSize'),
                fontFamily: localStorage.getItem('fontFamily'),
                lineHeight: localStorage.getItem('lineHeight'),
                bgColor: localStorage.getItem('bgColor'),
                textColor: localStorage.getItem('textColor')
            };
            
            const mergedSettings = this.mergeData(localSettings, serverData.settings, 'settings');
            
            // 应用设置
            Object.entries(mergedSettings).forEach(([key, value]) => {
                if (value !== null) {
                    localStorage.setItem(key, value);
                }
            });
            
            // 触发UI更新
            if (typeof applySettings === 'function') {
                applySettings();
            }
        }
        
        // 刷新UI
        if (typeof refreshUI === 'function') {
            refreshUI();
        }
    }
    
    mergeData(localData, serverData, dataType) {
        // 根据冲突解决策略合并数据
        switch (this.conflictResolution) {
            case 'latest':
                return this.mergeByTimestamp(localData, serverData, dataType);
            case 'manual':
                // 这里可以实现手动冲突解决
                return this.mergeByTimestamp(localData, serverData, dataType);
            case 'merge':
                return this.smartMerge(localData, serverData, dataType);
            default:
                return this.mergeByTimestamp(localData, serverData, dataType);
        }
    }
    
    mergeByTimestamp(localData, serverData, dataType) {
        // 根据时间戳合并数据，保留最新的
        if (dataType === 'notes') {
            const result = { ...localData };
            
            Object.entries(serverData).forEach(([key, value]) => {
                if (!localData[key] || new Date(value.updatedAt) > new Date(localData[key].updatedAt)) {
                    result[key] = value;
                }
            });
            
            return result;
        } else if (dataType === 'bookmarks' || dataType === 'readingProgress') {
            // 对于数组和对象，简单地使用服务器数据覆盖本地数据
            return serverData;
        } else if (dataType === 'settings') {
            // 对于设置，使用服务器数据覆盖本地数据
            return { ...localData, ...serverData };
        }
        
        return serverData;
    }
    
    smartMerge(localData, serverData, dataType) {
        // 智能合并数据，尽量保留所有更改
        // 这里可以实现更复杂的合并逻辑
        return this.mergeByTimestamp(localData, serverData, dataType);
    }
    
    showSyncSettings() {
        // 创建设置模态框
        const modal = document.createElement('div');
        modal.className = 'sync-settings-modal';
        modal.innerHTML = `
            <div class="sync-settings-content">
                <div class="sync-settings-header">
                    <h3>云同步设置</h3>
                    <button onclick="this.closest('.sync-settings-modal').remove()">×</button>
                </div>
                
                <div class="sync-settings-group">
                    <label class="sync-settings-label">用户ID</label>
                    <input type="text" class="sync-settings-input" id="userIdInput" value="${this.userId || ''}" placeholder="输入用户ID">
                </div>
                
                <div class="sync-settings-group">
                    <label class="sync-settings-label">密码</label>
                    <input type="password" class="sync-settings-input" id="passwordInput" placeholder="输入密码">
                </div>
                
                <div class="sync-settings-group">
                    <label class="sync-settings-label">同步间隔 (秒)</label>
                    <input type="number" class="sync-settings-input" id="syncIntervalInput" value="${this.syncInterval / 1000}" min="10">
                </div>
                
                <div class="sync-settings-group">
                    <label class="sync-settings-label">冲突解决策略</label>
                    <select class="sync-settings-input" id="conflictResolutionInput">
                        <option value="latest" ${this.conflictResolution === 'latest' ? 'selected' : ''}>保留最新</option>
                        <option value="manual" ${this.conflictResolution === 'manual' ? 'selected' : ''}>手动解决</option>
                        <option value="merge" ${this.conflictResolution === 'merge' ? 'selected' : ''}>智能合并</option>
                    </select>
                </div>
                
                <div class="sync-settings-buttons">
                    <button class="btn" onclick="cloudSync.saveSyncSettings()">保存</button>
                    <button class="btn" onclick="cloudSync.logout()">退出登录</button>
                    <button onclick="this.closest('.sync-settings-modal').remove()">取消</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }
    
    async saveSyncSettings() {
        const userId = document.getElementById('userIdInput').value.trim();
        const password = document.getElementById('passwordInput').value;
        const syncInterval = parseInt(document.getElementById('syncIntervalInput').value) * 1000;
        const conflictResolution = document.getElementById('conflictResolutionInput').value;
        
        // 保存设置
        this.syncInterval = syncInterval;
        this.conflictResolution = conflictResolution;
        this.saveUserSettings();
        
        // 如果用户ID改变，重新登录
        if (userId && userId !== this.userId) {
            const success = await this.login(userId, password);
            if (success) {
                document.querySelector('.sync-settings-modal').remove();
            }
        } else {
            // 重启同步以应用新的间隔
            this.stopSync();
            this.startSync();
            document.querySelector('.sync-settings-modal').remove();
            this.showSyncStatus('设置已保存', 'success');
        }
    }
}

// 创建全局实例
const cloudSync = new CloudSyncManager();