# 本地阅读应用 - EPUB解析器

一个基于纯JavaScript的EPUB解析器，用于本地阅读应用，支持EPUB 2.0.1和EPUB 3.2规范。

## 功能特性

### 核心功能
- **完整的ZIP文件解析**：能够解析EPUB文件的ZIP结构
- **支持EPUB 2.0.1和3.2规范**：兼容不同版本的EPUB格式
- **元数据提取**：提取书名、作者等书籍元数据
- **目录生成**：支持从NCX文件或Nav文档生成目录
- **内容提取**：将HTML内容转换为纯文本
- **错误处理**：详细的错误日志和警告信息
- **进度跟踪**：实时返回解析进度

### 支持的文件格式
- 文本文件 (.txt)
- EPUB文件 (.epub)
- PDF文件 (.pdf) - 基本支持

## 技术实现

### 核心类

#### EpubParser
EPUB文件的主要解析器类

```javascript
const parser = new EpubParser();
```

#### TextParser
文本文件解析器

#### PDFParser
PDF文件解析器（基本支持）

#### FileParserFactory
工厂类，根据文件类型返回相应的解析器

```javascript
const parser = FileParserFactory.getParser(file);
```

### API 文档

#### EpubParser 类

##### 构造函数
```javascript
new EpubParser()
```

##### 方法

1. **setProgressCallback(callback)**
   - 设置进度回调函数
   - 参数：callback - 回调函数，接收进度信息对象

2. **async parse(file)**
   - 解析EPUB文件
   - 参数：file - File对象
   - 返回：解析结果对象

3. **getErrors()**
   - 获取解析过程中的错误列表
   - 返回：错误对象数组

4. **getWarnings()**
   - 获取解析过程中的警告列表
   - 返回：警告对象数组

#### 解析结果格式

```javascript
{
  title: string,        // 书籍标题
  author: string,       // 书籍作者
  toc: Array<{
    id: number,         // 目录项ID
    title: string,      // 目录项标题
    href: string        // 目录项链接
  }>,
  content: Array<string>, // 章节内容数组
  version: string,      // EPUB版本
  errors: Array<{
    message: string,    // 错误信息
    error: string,      // 错误对象字符串
    timestamp: string   // 错误发生时间
  }>,
  warnings: Array<{
    message: string,    // 警告信息
    timestamp: string   // 警告发生时间
  }>
}
```

## 使用示例

### 基本用法

```javascript
// 获取文件对象
const file = document.getElementById('fileInput').files[0];

// 获取解析器
const parser = FileParserFactory.getParser(file);

// 设置进度回调
parser.setProgressCallback(progressInfo => {
  console.log(`解析进度: ${progressInfo.progress}% - ${progressInfo.message}`);
});

// 解析文件
parser.parse(file)
  .then(result => {
    console.log('解析结果:', result);
    // 处理解析结果
  })
  .catch(error => {
    console.error('解析失败:', error);
  });
```

### 集成到应用中

```javascript
class ReaderApp {
  async processFile(file) {
    try {
      const parser = FileParserFactory.getParser(file);
      
      parser.setProgressCallback(progressInfo => {
        this.updateProgressUI(progressInfo);
      });
      
      const bookData = await parser.parse(file);
      this.loadBook(bookData);
    } catch (error) {
      this.showError(error.message);
    }
  }
}
```

## 错误处理

解析器会捕获并记录解析过程中的错误和警告，包括：
- ZIP文件格式错误
- OPF文件解析错误
- NCX/Nav文档解析错误
- HTML内容提取错误

错误信息包含：
- 错误描述
- 原始错误对象
- 错误发生时间

## 性能优化

- 限制文件大小在100MB以内
- 跳过损坏的文件记录
- 只提取必要的文件内容
- 异步解析设计

## 浏览器兼容性

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## 测试

应用包含一个测试页面 `test.html`，可以用于测试EPUB解析器的功能：

1. 打开 `test.html`
2. 选择要测试的EPUB文件
3. 点击"开始测试"
4. 查看测试结果和解析输出

## 改进方向

1. 增强PDF解析功能
2. 添加更高级的文本格式化选项
3. 支持更多的EPUB扩展功能
4. 优化大型EPUB文件的解析性能

## 许可证

MIT License

## 贡献

欢迎提交Issue和Pull Request，帮助改进这个EPUB解析器。
