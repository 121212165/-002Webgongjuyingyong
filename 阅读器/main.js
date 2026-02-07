const { app, BrowserWindow, Menu, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store');

// 初始化配置存储
const store = new Store();

// 保持对窗口对象的全局引用
let mainWindow;
let noteWindow;

// 开发模式检测
const isDev = process.argv.includes('--dev');

function createMainWindow() {
  // 创建浏览器窗口
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      webSecurity: false // 允许加载本地文件
    },
    icon: path.join(__dirname, 'favicon.ico'),
    show: false, // 先不显示，等加载完成后再显示
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default'
  });

  // 加载应用的 index.html
  const startUrl = isDev 
    ? 'http://localhost:3001' 
    : `file://${path.join(__dirname, 'index.html')}`;
  
  mainWindow.loadURL(startUrl);

  // 窗口准备好后显示
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // 开发模式下打开开发者工具
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });

  // 当窗口被关闭时发出事件
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // 处理外部链接
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// 创建悬浮笔记窗口
function createNoteWindow() {
  noteWindow = new BrowserWindow({
    width: 400,
    height: 600,
    minWidth: 300,
    minHeight: 400,
    parent: mainWindow,
    modal: false,
    resizable: true,
    movable: true,
    alwaysOnTop: true,
    frame: false, // 无边框窗口
    transparent: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    show: false
  });

  noteWindow.loadFile('floating-notes.html');

  noteWindow.on('closed', () => {
    noteWindow = null;
  });

  return noteWindow;
}

// 应用程序菜单
function createMenu() {
  const template = [
    {
      label: '文件',
      submenu: [
        {
          label: '打开文件',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            const result = await dialog.showOpenDialog(mainWindow, {
              properties: ['openFile'],
              filters: [
                { name: 'All Supported', extensions: ['pdf', 'epub', 'txt', 'md'] },
                { name: 'PDF Files', extensions: ['pdf'] },
                { name: 'EPUB Files', extensions: ['epub'] },
                { name: 'Text Files', extensions: ['txt', 'md'] }
              ]
            });
            
            if (!result.canceled && result.filePaths.length > 0) {
              mainWindow.webContents.send('file-opened', result.filePaths[0]);
            }
          }
        },
        { type: 'separator' },
        {
          label: '退出',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: '编辑',
      submenu: [
        { label: '撤销', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
        { label: '重做', accelerator: 'Shift+CmdOrCtrl+Z', role: 'redo' },
        { type: 'separator' },
        { label: '剪切', accelerator: 'CmdOrCtrl+X', role: 'cut' },
        { label: '复制', accelerator: 'CmdOrCtrl+C', role: 'copy' },
        { label: '粘贴', accelerator: 'CmdOrCtrl+V', role: 'paste' }
      ]
    },
    {
      label: '视图',
      submenu: [
        {
          label: '显示悬浮笔记',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            if (!noteWindow) {
              createNoteWindow();
            }
            noteWindow.show();
          }
        },
        { type: 'separator' },
        { label: '重新加载', accelerator: 'CmdOrCtrl+R', role: 'reload' },
        { label: '强制重新加载', accelerator: 'CmdOrCtrl+Shift+R', role: 'forceReload' },
        { label: '切换开发者工具', accelerator: 'F12', role: 'toggleDevTools' },
        { type: 'separator' },
        { label: '实际大小', accelerator: 'CmdOrCtrl+0', role: 'resetZoom' },
        { label: '放大', accelerator: 'CmdOrCtrl+Plus', role: 'zoomIn' },
        { label: '缩小', accelerator: 'CmdOrCtrl+-', role: 'zoomOut' },
        { type: 'separator' },
        { label: '切换全屏', accelerator: 'F11', role: 'togglefullscreen' }
      ]
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '关于深度阅读器',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: '关于深度阅读器',
              message: '深度阅读器 v1.0.0',
              detail: '专注深度思考的跨平台阅读器\n支持PDF、EPUB、TXT格式\n集成Git版本管理的智能笔记系统'
            });
          }
        }
      ]
    }
  ];

  // macOS 特殊处理
  if (process.platform === 'darwin') {
    template.unshift({
      label: app.getName(),
      submenu: [
        { label: '关于 ' + app.getName(), role: 'about' },
        { type: 'separator' },
        { label: '服务', role: 'services', submenu: [] },
        { type: 'separator' },
        { label: '隐藏 ' + app.getName(), accelerator: 'Command+H', role: 'hide' },
        { label: '隐藏其他', accelerator: 'Command+Shift+H', role: 'hideothers' },
        { label: '显示全部', role: 'unhide' },
        { type: 'separator' },
        { label: '退出', accelerator: 'Command+Q', click: () => app.quit() }
      ]
    });
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// IPC 事件处理
ipcMain.handle('show-floating-notes', () => {
  if (noteWindow) {
    noteWindow.show();
    noteWindow.focus();
  } else {
    createNoteWindow();
  }
});

ipcMain.handle('create-floating-note', (event, options) => {
  if (noteWindow) {
    noteWindow.webContents.send('create-note', options);
  }
});

ipcMain.handle('save-notes', (event, notesData) => {
  // 保存笔记数据到本地存储
  const userDataPath = app.getPath('userData');
  const notesPath = path.join(userDataPath, 'notes.json');
  
  try {
    fs.writeFileSync(notesPath, JSON.stringify(notesData, null, 2));
    return { success: true };
  } catch (error) {
    console.error('保存笔记失败:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('load-notes', () => {
    const userDataPath = app.getPath('userData');
    const notesPath = path.join(userDataPath, 'notes.json');
    
    try {
        if (fs.existsSync(notesPath)) {
            const notesData = fs.readFileSync(notesPath, 'utf8');
            return { success: true, data: JSON.parse(notesData) };
        }
        return { success: true, data: [] };
    } catch (error) {
        console.error('加载笔记失败:', error);
        return { success: false, error: error.message };
    }
});

// Git版本管理相关IPC处理
const GitManager = require('./git-manager');
let gitManager = null;

ipcMain.handle('git-init', async (event, repoPath) => {
    try {
        if (!gitManager) {
            gitManager = new GitManager();
        }
        const result = await gitManager.initialize(repoPath || app.getPath('userData'));
        return result;
    } catch (error) {
        console.error('Git初始化失败:', error);
        return { success: false, error: error.message };
    }
});

// 文本高亮相关IPC处理
ipcMain.handle('save-highlights', async (event, highlights) => {
  try {
    const highlightsPath = path.join(app.getPath('userData'), 'highlights.json');
    fs.writeFileSync(highlightsPath, JSON.stringify(highlights, null, 2));
    return { success: true };
  } catch (error) {
    console.error('保存高亮失败:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('load-highlights', async () => {
  try {
    const highlightsPath = path.join(app.getPath('userData'), 'highlights.json');
    if (fs.existsSync(highlightsPath)) {
      const data = fs.readFileSync(highlightsPath, 'utf8');
      return { success: true, highlights: JSON.parse(data) };
    }
    return { success: true, highlights: [] };
  } catch (error) {
    console.error('加载高亮失败:', error);
    return { success: false, error: error.message };
  }
});

// 字体管理相关IPC处理
ipcMain.handle('save-font', async (event, fontData) => {
  try {
    const fontsDir = path.join(app.getPath('userData'), 'fonts');
    if (!fs.existsSync(fontsDir)) {
      fs.mkdirSync(fontsDir, { recursive: true });
    }
    
    const fontPath = path.join(fontsDir, fontData.filename);
    const buffer = Buffer.from(fontData.data);
    fs.writeFileSync(fontPath, buffer);
    
    // 保存字体信息
    const fontsInfoPath = path.join(app.getPath('userData'), 'fonts.json');
    let fontsInfo = [];
    if (fs.existsSync(fontsInfoPath)) {
      fontsInfo = JSON.parse(fs.readFileSync(fontsInfoPath, 'utf8'));
    }
    
    const fontInfo = {
      name: fontData.name,
      filename: fontData.filename,
      path: fontPath
    };
    
    // 检查是否已存在同名字体
    const existingIndex = fontsInfo.findIndex(f => f.name === fontData.name);
    if (existingIndex >= 0) {
      fontsInfo[existingIndex] = fontInfo;
    } else {
      fontsInfo.push(fontInfo);
    }
    
    fs.writeFileSync(fontsInfoPath, JSON.stringify(fontsInfo, null, 2));
    
    return { success: true, path: fontPath };
  } catch (error) {
    console.error('保存字体失败:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('load-fonts', async () => {
  try {
    const fontsInfoPath = path.join(app.getPath('userData'), 'fonts.json');
    if (fs.existsSync(fontsInfoPath)) {
      const fontsInfo = JSON.parse(fs.readFileSync(fontsInfoPath, 'utf8'));
      return { success: true, fonts: fontsInfo };
    }
    return { success: true, fonts: [] };
  } catch (error) {
    console.error('加载字体失败:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-font', async (event, fontName) => {
  try {
    const fontsInfoPath = path.join(app.getPath('userData'), 'fonts.json');
    if (!fs.existsSync(fontsInfoPath)) {
      return { success: false, error: '字体信息文件不存在' };
    }
    
    let fontsInfo = JSON.parse(fs.readFileSync(fontsInfoPath, 'utf8'));
    const fontIndex = fontsInfo.findIndex(f => f.name === fontName);
    
    if (fontIndex === -1) {
      return { success: false, error: '字体不存在' };
    }
    
    const font = fontsInfo[fontIndex];
    
    // 删除字体文件
    if (fs.existsSync(font.path)) {
      fs.unlinkSync(font.path);
    }
    
    // 从字体信息中移除
    fontsInfo.splice(fontIndex, 1);
    fs.writeFileSync(fontsInfoPath, JSON.stringify(fontsInfo, null, 2));
    
    return { success: true };
  } catch (error) {
    console.error('删除字体失败:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('save-font-settings', async (event, settings) => {
  try {
    const settingsPath = path.join(app.getPath('userData'), 'font-settings.json');
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    return { success: true };
  } catch (error) {
    console.error('保存字体设置失败:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('load-font-settings', async () => {
  try {
    const settingsPath = path.join(app.getPath('userData'), 'font-settings.json');
    if (fs.existsSync(settingsPath)) {
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      return { success: true, settings };
    }
    return { success: true, settings: null };
  } catch (error) {
    console.error('加载字体设置失败:', error);
    return { success: false, error: error.message };
  }
});

// 主题管理相关IPC处理
ipcMain.handle('save-theme-settings', async (event, settings) => {
  try {
    const settingsPath = path.join(app.getPath('userData'), 'theme-settings.json');
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    return { success: true };
  } catch (error) {
    console.error('保存主题设置失败:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('load-theme-settings', async () => {
  try {
    const settingsPath = path.join(app.getPath('userData'), 'theme-settings.json');
    if (fs.existsSync(settingsPath)) {
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      return { success: true, settings };
    }
    return { success: true, settings: null };
  } catch (error) {
    console.error('加载主题设置失败:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('git-commit', async (event, message, author) => {
    try {
        if (!gitManager) {
            return { success: false, error: 'Git未初始化' };
        }
        const result = await gitManager.commit(message, author);
        return result;
    } catch (error) {
        console.error('Git提交失败:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('git-history', async (event, limit) => {
    try {
        if (!gitManager) {
            return { success: false, error: 'Git未初始化' };
        }
        const result = await gitManager.getCommitHistory(limit);
        return result;
    } catch (error) {
        console.error('获取Git历史失败:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('git-status', async () => {
    try {
        if (!gitManager) {
            return { success: false, error: 'Git未初始化' };
        }
        const result = await gitManager.getStatus();
        return result;
    } catch (error) {
        console.error('获取Git状态失败:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('git-save-note', async (event, noteId, noteData) => {
    try {
        if (!gitManager) {
            return { success: false, error: 'Git未初始化' };
        }
        const result = await gitManager.saveNoteWithCommit(noteId, noteData);
        return result;
    } catch (error) {
        console.error('Git保存笔记失败:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('git-restore-note', async (event, noteId, commitSha) => {
    try {
        if (!gitManager) {
            return { success: false, error: 'Git未初始化' };
        }
        const result = await gitManager.restoreNoteVersion(noteId, commitSha);
        return result;
    } catch (error) {
        console.error('Git恢复笔记失败:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('get-user-data-path', () => {
  return app.getPath('userData');
});

ipcMain.handle('show-save-dialog', async (event, options) => {
  const result = await dialog.showSaveDialog(mainWindow, options);
  return result;
});

ipcMain.handle('show-open-dialog', async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, options);
  return result;
});

ipcMain.handle('store-get', (event, key) => {
  return store.get(key);
});

ipcMain.handle('store-set', (event, key, value) => {
  store.set(key, value);
});

ipcMain.handle('store-delete', (event, key) => {
  store.delete(key);
});

// 应用程序事件处理
app.whenReady().then(() => {
  createMainWindow();
  createMenu();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  // 保存应用状态
  if (mainWindow) {
    const bounds = mainWindow.getBounds();
    store.set('windowBounds', bounds);
  }
});

// 安全设置
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    shell.openExternal(navigationUrl);
  });
});

// 错误处理
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});