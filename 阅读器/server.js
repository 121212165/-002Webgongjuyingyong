const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');

const app = express();
const PORT = 3001;

// 中间件配置
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// 处理favicon.ico请求
app.get('/favicon.ico', (req, res) => {
  res.status(204).end(); // 返回204 No Content，避免404错误
});

// 处理根路径请求，重定向到主页面
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'reader.html'));
});

// 配置文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = './uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // 保持原文件名，添加时间戳避免冲突
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}_${timestamp}${ext}`);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    // 只允许特定文件类型
    const allowedTypes = ['.pdf', '.epub', '.txt', '.md'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件类型'), false);
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB限制
  }
});

// 文件解析器类
class FileParser {
  // 验证文件路径和权限
  static async validateFile(filePath) {
    try {
      // 检查文件是否存在
      if (!fs.existsSync(filePath)) {
        throw new Error(`文件不存在: ${filePath}`);
      }

      // 检查是否为文件（不是目录）
      const stats = fs.statSync(filePath);
      if (!stats.isFile()) {
        throw new Error(`路径不是文件: ${filePath}`);
      }

      // 检查文件权限（可读性）
      try {
        fs.accessSync(filePath, fs.constants.R_OK);
      } catch (error) {
        throw new Error(`文件无读取权限: ${filePath}`);
      }

      // 检查文件是否被占用
      try {
        const fd = fs.openSync(filePath, 'r');
        fs.closeSync(fd);
      } catch (error) {
        if (error.code === 'EBUSY' || error.code === 'EACCES') {
          throw new Error(`文件正被其他程序占用: ${filePath}`);
        }
        throw error;
      }

      return true;
    } catch (error) {
      console.error('文件验证失败:', error.message);
      throw error;
    }
  }

  static async parseFile(filePath, fileType) {
    try {
      // 首先验证文件
      await this.validateFile(filePath);

      switch (fileType) {
        case '.txt':
        case '.md':
          return await this.parseTextFile(filePath);
        case '.pdf':
          return await this.parsePDFFile(filePath);
        case '.epub':
          return await this.parseEPUBFile(filePath);
        default:
          throw new Error(`不支持的文件类型: ${fileType}`);
      }
    } catch (error) {
      console.error('文件解析错误:', error.message);
      throw error;
    }
  }

  static async parseTextFile(filePath) {
    try {
      // 尝试不同的编码格式
      let content;
      let encoding = 'utf-8';
      
      try {
        content = fs.readFileSync(filePath, 'utf-8');
      } catch (error) {
        // 如果UTF-8失败，尝试其他编码
        try {
          content = fs.readFileSync(filePath, 'gbk');
          encoding = 'gbk';
        } catch (error2) {
          content = fs.readFileSync(filePath, 'latin1');
          encoding = 'latin1';
        }
      }

      const lines = content.split('\n');
      const stats = fs.statSync(filePath);
      
      return {
        type: path.extname(filePath).toLowerCase() === '.md' ? 'md' : 'text',
        title: path.basename(filePath, path.extname(filePath)),
        content: content,
        metadata: {
          lines: lines.length,
          characters: content.length,
          words: content.split(/\s+/).filter(word => word.length > 0).length,
          encoding: encoding,
          fileSize: stats.size,
          created: stats.birthtime,
          modified: stats.mtime
        },
        structure: this.generateTextStructure(lines)
      };
    } catch (error) {
      throw new Error(`文本文件解析失败: ${error.message}`);
    }
  }

  static async parsePDFFile(filePath) {
    try {
      const stats = fs.statSync(filePath);
      
      // 检查PDF文件头
      const buffer = fs.readFileSync(filePath, { start: 0, end: 4 });
      const header = buffer.toString('ascii');
      
      if (!header.startsWith('%PDF')) {
        throw new Error('文件不是有效的PDF格式');
      }
      
      // 使用pdf-parse解析PDF内容
      const dataBuffer = fs.readFileSync(filePath);
      const pdfData = await pdfParse(dataBuffer);
      
      // 提取文本内容并格式化
      const content = pdfData.text || '无法提取PDF文本内容';
      
      // 生成页面结构
      const structure = [];
      const pageCount = pdfData.numpages || 1;
      
      for (let i = 1; i <= pageCount; i++) {
        structure.push({
          type: 'page',
          number: i,
          title: `第 ${i} 页`
        });
      }
      
      // 如果有标题信息，添加到结构中
      if (pdfData.info && pdfData.info.Title) {
        structure.unshift({
          type: 'title',
          title: pdfData.info.Title
        });
      }
      
      return {
        type: 'pdf',
        title: (pdfData.info && pdfData.info.Title) || path.basename(filePath, path.extname(filePath)),
        content: content,
        metadata: {
          fileSize: stats.size,
          pages: pageCount,
          created: stats.birthtime,
          modified: stats.mtime,
          type: 'PDF文档',
          author: pdfData.info?.Author || '未知',
          subject: pdfData.info?.Subject || '',
          creator: pdfData.info?.Creator || '',
          producer: pdfData.info?.Producer || '',
          creationDate: pdfData.info?.CreationDate || null,
          modificationDate: pdfData.info?.ModDate || null
        },
        structure: structure,
        rawPdfData: {
          version: pdfData.version,
          info: pdfData.info,
          metadata: pdfData.metadata
        }
      };
    } catch (error) {
      throw new Error(`PDF文件解析失败: ${error.message}`);
    }
  }

  static async parseEPUBFile(filePath) {
    try {
      const stats = fs.statSync(filePath);
      
      // 检查EPUB文件（实际上是ZIP文件）
      const buffer = fs.readFileSync(filePath, { start: 0, end: 4 });
      const header = buffer.toString('hex');
      
      // ZIP文件头: 504b0304
      if (!header.startsWith('504b0304')) {
        throw new Error('文件不是有效的EPUB格式（ZIP结构）');
      }
      
      return {
        type: 'epub',
        title: path.basename(filePath, path.extname(filePath)),
        content: `EPUB电子书已成功加载。\n\n文件名: ${path.basename(filePath)}\n文件大小: ${this.formatFileSize(stats.size)}\n\n注意: 当前版本使用占位符内容。要查看完整EPUB内容，请安装epub2库并更新解析逻辑。`,
        metadata: {
          fileSize: stats.size,
          chapters: 'unknown', // 需要EPUB解析库来获取
          author: 'unknown',
          publisher: 'unknown',
          created: stats.birthtime,
          modified: stats.mtime,
          type: 'EPUB电子书'
        },
        structure: [
          { type: 'chapter', number: 1, title: 'Chapter 1' }
        ]
      };
    } catch (error) {
      throw new Error(`EPUB文件解析失败: ${error.message}`);
    }
  }

  static generateTextStructure(lines) {
    const structure = [];
    let currentSection = null;
    
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      
      // 检测标题（以#开头的Markdown标题或全大写行）
      if (trimmed.startsWith('#') || (trimmed.length > 0 && trimmed === trimmed.toUpperCase() && trimmed.length < 100)) {
        if (currentSection) {
          structure.push(currentSection);
        }
        currentSection = {
          type: 'section',
          title: trimmed.replace(/^#+\s*/, ''),
          startLine: index + 1,
          endLine: index + 1
        };
      } else if (currentSection && trimmed.length > 0) {
        currentSection.endLine = index + 1;
      }
    });
    
    if (currentSection) {
      structure.push(currentSection);
    }
    
    return structure.length > 0 ? structure : [{ type: 'content', title: '全文', startLine: 1, endLine: lines.length }];
  }

  // 格式化文件大小的辅助方法
  static formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// API路由

// 文件上传接口
app.post('/api/upload', (req, res) => {
  upload.single('file')(req, res, async (err) => {
    try {
      // 处理multer错误
      if (err) {
        console.error('文件上传错误:', err);
        return res.status(400).json({ 
          success: false,
          error: err.message || '文件上传失败'
        });
      }

      if (!req.file) {
        return res.status(400).json({ 
          success: false,
          error: '没有上传文件' 
        });
      }

      const filePath = req.file.path;
      const fileType = path.extname(req.file.originalname).toLowerCase();
      
      console.log(`开始解析文件: ${req.file.originalname} (${fileType})`);
      
      // 解析文件
      const parsedData = await FileParser.parseFile(filePath, fileType);
      
      // 保存解析结果到JSON文件
      const resultPath = filePath.replace(path.extname(filePath), '.json');
      fs.writeFileSync(resultPath, JSON.stringify(parsedData, null, 2));
      
      res.json({
        success: true,
        fileId: path.basename(filePath, path.extname(filePath)),
        originalName: req.file.originalname,
        parsedData: parsedData,
        message: '文件上传并解析成功'
      });
      
    } catch (error) {
      console.error('文件处理错误:', error);
      res.status(500).json({ 
        success: false,
        error: '文件处理失败', 
        details: error.message 
      });
    }
  });
});

// 获取已上传文件列表
app.get('/api/files', (req, res) => {
  try {
    const uploadDir = './uploads';
    if (!fs.existsSync(uploadDir)) {
      return res.json({ files: [] });
    }
    
    const files = fs.readdirSync(uploadDir)
      .filter(file => !file.endsWith('.json'))
      .map(file => {
        const filePath = path.join(uploadDir, file);
        const stats = fs.statSync(filePath);
        const ext = path.extname(file).toLowerCase();
        
        return {
          id: path.basename(file, path.extname(file)),
          name: file,
          type: ext,
          size: stats.size,
          uploaded: stats.birthtime,
          modified: stats.mtime
        };
      });
    
    res.json({ files });
  } catch (error) {
    console.error('获取文件列表错误:', error);
    res.status(500).json({ error: '获取文件列表失败' });
  }
});

// 获取特定文件的解析数据 - 支持分块加载
app.get('/api/files/:fileId', async (req, res) => {
  try {
    const fileId = req.params.fileId;
    const { chunk, chunkSize } = req.query; // 分块参数
    const uploadDir = './uploads';
    const jsonPath = path.join(uploadDir, `${fileId}.json`);
    
    // 验证文件ID格式
    if (!fileId || fileId.includes('..') || fileId.includes('/') || fileId.includes('\\')) {
      return res.status(400).json({ error: '无效的文件ID' });
    }
    
    // 检查uploads目录是否存在
    if (!fs.existsSync(uploadDir)) {
      return res.status(500).json({ error: '上传目录不存在' });
    }
    
    // 检查JSON文件是否存在
    if (!fs.existsSync(jsonPath)) {
      return res.status(404).json({ 
        error: '文件不存在或未解析',
        details: `找不到文件: ${fileId}.json`
      });
    }
    
    // 检查JSON文件权限
    try {
      fs.accessSync(jsonPath, fs.constants.R_OK);
    } catch (error) {
      return res.status(403).json({ 
        error: '文件无读取权限',
        details: error.message
      });
    }
    
    // 读取并解析JSON数据
    try {
      const fileData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
      
      // 如果是分块请求，只返回部分内容
      if (chunk !== undefined && chunkSize) {
        const chunkIndex = parseInt(chunk);
        const size = parseInt(chunkSize);
        const totalChunks = Math.ceil(fileData.content.length / size);
        
        const start = chunkIndex * size;
        const end = Math.min(start + size, fileData.content.length);
        const contentChunk = fileData.content.substring(start, end);
        
        return res.json({
          ...fileData,
          content: contentChunk,
          chunk: {
            index: chunkIndex,
            total: totalChunks,
            size: size,
            isLast: chunkIndex >= totalChunks - 1
          }
        });
      }
      
      // 检查文件大小，如果是大文件则返回元数据和分块信息
      const jsonStats = fs.statSync(jsonPath);
      const fileSizeInMB = jsonStats.size / (1024 * 1024);
      
      if (fileSizeInMB > 20) {
        // 大文件处理：返回元数据和分块信息，不返回内容
        return res.json({
          ...fileData,
          content: '', // 不返回完整内容
          isLargeFile: true,
          fileSize: jsonStats.size,
          suggestedChunkSize: 100000, // 建议的块大小（字符数）
          totalChunks: Math.ceil(fileData.content.length / 100000)
        });
      }
      
      res.json(fileData);
    } catch (parseError) {
      console.error('JSON解析错误:', parseError);
      return res.status(500).json({ 
        error: '文件数据损坏',
        details: '无法解析JSON文件'
      });
    }
    
  } catch (error) {
    console.error('获取文件数据错误:', error);
    res.status(500).json({ 
      error: '获取文件数据失败',
      details: error.message
    });
  }
});

// 删除文件
app.delete('/api/files/:fileId', (req, res) => {
  try {
    const fileId = req.params.fileId;
    const uploadDir = './uploads';
    
    // 验证文件ID格式
    if (!fileId || fileId.includes('..') || fileId.includes('/') || fileId.includes('\\')) {
      return res.status(400).json({ error: '无效的文件ID' });
    }
    
    // 检查uploads目录是否存在
    if (!fs.existsSync(uploadDir)) {
      return res.status(404).json({ error: '上传目录不存在' });
    }
    
    // 查找并删除原文件和JSON文件
    const files = fs.readdirSync(uploadDir);
    const targetFiles = files.filter(file => file.startsWith(fileId));
    
    if (targetFiles.length === 0) {
      return res.status(404).json({ error: '找不到要删除的文件' });
    }
    
    let deletedCount = 0;
    const errors = [];
    
    targetFiles.forEach(file => {
      const filePath = path.join(uploadDir, file);
      try {
        // 检查文件是否被占用
        const fd = fs.openSync(filePath, 'r');
        fs.closeSync(fd);
        
        fs.unlinkSync(filePath);
        deletedCount++;
      } catch (error) {
        if (error.code === 'EBUSY' || error.code === 'EACCES') {
          errors.push(`文件被占用: ${file}`);
        } else {
          errors.push(`删除失败: ${file} - ${error.message}`);
        }
      }
    });
    
    if (errors.length > 0) {
      return res.status(500).json({ 
        success: false,
        error: '部分文件删除失败',
        details: errors,
        deletedCount: deletedCount
      });
    }
    
    res.json({ 
      success: true, 
      message: '文件删除成功',
      deletedCount: deletedCount
    });
    
  } catch (error) {
    console.error('删除文件错误:', error);
    res.status(500).json({ 
      error: '删除文件失败',
      details: error.message
    });
  }
});

// 获取原始文件（用于PDF.js等直接文件访问）- 支持流式传输
app.get('/api/files/:fileId/raw', (req, res) => {
  try {
    const fileId = req.params.fileId;
    const uploadDir = './uploads';
    
    // 验证文件ID格式
    if (!fileId || fileId.includes('..') || fileId.includes('/') || fileId.includes('\\')) {
      return res.status(400).json({ error: '无效的文件ID' });
    }
    
    // 检查uploads目录是否存在
    if (!fs.existsSync(uploadDir)) {
      return res.status(404).json({ error: '上传目录不存在' });
    }
    
    // 查找原始文件（非.json文件）
    const files = fs.readdirSync(uploadDir);
    const originalFile = files.find(file => 
      file.startsWith(fileId) && !file.endsWith('.json')
    );
    
    if (!originalFile) {
      return res.status(404).json({ error: '文件不存在' });
    }
    
    const filePath = path.join(uploadDir, originalFile);
    
    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: '文件不存在' });
    }
    
    // 获取文件扩展名以设置正确的Content-Type
    const ext = path.extname(originalFile).toLowerCase();
    let contentType = 'application/octet-stream';
    
    switch (ext) {
      case '.pdf':
        contentType = 'application/pdf';
        break;
      case '.txt':
        contentType = 'text/plain';
        break;
      case '.md':
        contentType = 'text/markdown';
        break;
      case '.epub':
        contentType = 'application/epub+zip';
        break;
    }
    
    // 设置响应头
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${originalFile}"`);
    res.setHeader('Cache-Control', 'public, max-age=3600'); // 缓存1小时
    
    // 对于大文件，使用流式传输
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
    fileStream.on('error', (error) => {
      console.error('文件流错误:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: '文件读取失败' });
      }
    });
    
  } catch (error) {
    console.error('获取原始文件错误:', error);
    res.status(500).json({ 
      error: '获取原始文件失败',
      details: error.message
    });
  }
});

// 云同步数据存储
const syncDataPath = './sync-data';
if (!fs.existsSync(syncDataPath)) {
  fs.mkdirSync(syncDataPath, { recursive: true });
}

// 简单的用户数据存储（生产环境应使用数据库）
const usersPath = path.join(syncDataPath, 'users.json');
let users = {};

// 加载用户数据
if (fs.existsSync(usersPath)) {
  try {
    users = JSON.parse(fs.readFileSync(usersPath, 'utf-8'));
  } catch (error) {
    console.error('加载用户数据失败:', error);
    users = {};
  }
}

// 保存用户数据
function saveUsers() {
  try {
    fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));
  } catch (error) {
    console.error('保存用户数据失败:', error);
  }
}

// 生成JWT令牌的简单函数（生产环境应使用专业库）
function generateToken(userId) {
  const payload = {
    userId: userId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24小时过期
  };
  
  // 简单的Base64编码（生产环境应使用专业JWT库）
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

// 验证JWT令牌的简单函数（生产环境应使用专业库）
function verifyToken(token) {
  try {
    const payload = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
    
    // 检查过期时间
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    
    return payload;
  } catch (error) {
    return null;
  }
}

// 身份验证中间件
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      success: false,
      error: '缺少认证令牌' 
    });
  }
  
  const token = authHeader.substring(7);
  const payload = verifyToken(token);
  
  if (!payload) {
    return res.status(401).json({ 
      success: false,
      error: '无效或过期的认证令牌' 
    });
  }
  
  req.userId = payload.userId;
  next();
}

// 云同步API路由

// 用户登录
app.post('/api/sync/login', (req, res) => {
  try {
    const { userId, password, deviceId } = req.body;
    
    if (!userId || !password) {
      return res.status(400).json({ 
        success: false,
        error: '用户ID和密码不能为空' 
      });
    }
    
    // 检查用户是否存在
    if (!users[userId]) {
      // 创建新用户
      users[userId] = {
        password: password, // 生产环境应使用哈希加密
        devices: {},
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString()
      };
    } else {
      // 验证密码
      if (users[userId].password !== password) {
        return res.status(401).json({ 
          success: false,
          error: '密码错误' 
        });
      }
      
      // 更新最后登录时间
      users[userId].lastLogin = new Date().toISOString();
    }
    
    // 记录设备信息
    if (deviceId) {
      users[userId].devices[deviceId] = {
        lastSeen: new Date().toISOString()
      };
    }
    
    // 保存用户数据
    saveUsers();
    
    // 生成令牌
    const token = generateToken(userId);
    
    res.json({
      success: true,
      token: token,
      message: '登录成功'
    });
    
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({ 
      success: false,
      error: '登录失败',
      details: error.message
    });
  }
});

// 数据同步
app.post('/api/sync/sync', authenticate, (req, res) => {
  try {
    const { userId, deviceId, data, lastSyncTime } = req.body;
    
    if (!userId || !deviceId || !data) {
      return res.status(400).json({ 
        success: false,
        error: '缺少必要参数' 
      });
    }
    
    // 确保用户ID与令牌匹配
    if (userId !== req.userId) {
      return res.status(403).json({ 
        success: false,
        error: '用户ID不匹配' 
      });
    }
    
    // 更新设备信息
    if (users[userId] && users[userId].devices) {
      users[userId].devices[deviceId] = {
        lastSeen: new Date().toISOString()
      };
      saveUsers();
    }
    
    // 获取用户同步数据路径
    const userSyncPath = path.join(syncDataPath, `${userId}.json`);
    let serverData = null;
    
    // 加载服务器数据
    if (fs.existsSync(userSyncPath)) {
      try {
        serverData = JSON.parse(fs.readFileSync(userSyncPath, 'utf-8'));
      } catch (error) {
        console.error('加载用户同步数据失败:', error);
        serverData = {
          notes: {},
          bookmarks: [],
          readingProgress: {},
          settings: {},
          lastModified: new Date().toISOString()
        };
      }
    } else {
      serverData = {
        notes: {},
        bookmarks: [],
        readingProgress: {},
        settings: {},
        lastModified: new Date().toISOString()
      };
    }
    
    // 合并数据
    const mergedData = mergeSyncData(serverData, data, lastSyncTime);
    
    // 保存合并后的数据
    mergedData.lastModified = new Date().toISOString();
    fs.writeFileSync(userSyncPath, JSON.stringify(mergedData, null, 2));
    
    res.json({
      success: true,
      data: serverData, // 返回服务器原始数据，让客户端处理合并
      message: '同步成功'
    });
    
  } catch (error) {
    console.error('同步错误:', error);
    res.status(500).json({ 
      success: false,
      error: '同步失败',
      details: error.message
    });
  }
});

// 合并同步数据
function mergeSyncData(serverData, clientData, lastSyncTime) {
  const result = { ...serverData };
  
  // 如果是首次同步或没有上次同步时间，使用客户端数据
  if (!lastSyncTime) {
    return {
      ...serverData,
      ...clientData,
      lastModified: new Date().toISOString()
    };
  }
  
  // 合并笔记
  if (clientData.notes) {
    result.notes = result.notes || {};
    Object.entries(clientData.notes).forEach(([key, note]) => {
      if (!result.notes[key] || new Date(note.updatedAt) > new Date(result.notes[key].updatedAt)) {
        result.notes[key] = note;
      }
    });
  }
  
  // 合并书签
  if (clientData.bookmarks) {
    result.bookmarks = clientData.bookmarks;
  }
  
  // 合并阅读进度
  if (clientData.readingProgress) {
    result.readingProgress = { ...result.readingProgress, ...clientData.readingProgress };
  }
  
  // 合并设置
  if (clientData.settings) {
    result.settings = { ...result.settings, ...clientData.settings };
  }
  
  return result;
}

// 获取同步状态
app.get('/api/sync/status', authenticate, (req, res) => {
  try {
    const userId = req.userId;
    
    // 获取用户同步数据路径
    const userSyncPath = path.join(syncDataPath, `${userId}.json`);
    let lastModified = null;
    
    if (fs.existsSync(userSyncPath)) {
      try {
        const userData = JSON.parse(fs.readFileSync(userSyncPath, 'utf-8'));
        lastModified = userData.lastModified;
      } catch (error) {
        console.error('获取用户同步数据失败:', error);
      }
    }
    
    res.json({
      success: true,
      userId: userId,
      lastModified: lastModified,
      message: '获取同步状态成功'
    });
    
  } catch (error) {
    console.error('获取同步状态错误:', error);
    res.status(500).json({ 
      success: false,
      error: '获取同步状态失败',
      details: error.message
    });
  }
});

// 健康检查接口
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: '1.0.0'
  });
});

// 全局错误处理中间件
app.use((err, req, res, next) => {
  console.error('未捕获的错误:', err);
  res.status(500).json({
    success: false,
    error: '服务器内部错误',
    details: err.message
  });
});

// 404处理
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: '接口不存在',
    path: req.path
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 深度阅读器服务器启动成功!`);
  console.log(`📡 服务地址: http://localhost:${PORT}`);
  console.log(`📁 文件上传目录: ./uploads`);
  console.log(`🔄 云同步数据目录: ./sync-data`);
  console.log(`🔧 支持的文件类型: PDF, EPUB, TXT, MD`);
  console.log(`📊 API端点:`);
  console.log(`   POST /api/upload - 文件上传`);
  console.log(`   GET  /api/files - 文件列表`);
  console.log(`   GET  /api/files/:id - 文件详情`);
  console.log(`   DELETE /api/files/:id - 删除文件`);
  console.log(`   POST /api/sync/login - 用户登录`);
  console.log(`   POST /api/sync/sync - 数据同步`);
  console.log(`   GET  /api/sync/status - 同步状态`);
  console.log(`   GET  /api/health - 健康检查`);
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n🛑 正在关闭服务器...');
  process.exit(0);
});

module.exports = app;