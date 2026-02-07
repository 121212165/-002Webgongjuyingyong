# 灵感挖掘机 - 浏览器插件

一个个人创意需求分析工具，支持可视化思维导图和AI辅助扩展。

## 功能特性

- 🎨 **可视化思维导图** - 创建、连接、拖拽节点
- 🔍 **深度挖掘** - 通过引导问题深入分析想法
- ⚡ **随机火花** - 随机生成关键词和场景刺激创意
- 🌳 **分支扩张** - 快速扩展思维分支
- 🤖 **AI智能扩展** - 使用AI生成相关想法（需配置API）
- 💾 **数据持久化** - 自动保存到浏览器本地存储
- 📤 **数据导出** - 导出为JSON格式

## 安装方法

### Chrome/Edge 浏览器

1. 下载或克隆此项目到本地
2. 打开浏览器，访问 `chrome://extensions/`（Edge为 `edge://extensions/`）
3. 开启右上角的"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择 `extension` 文件夹
6. 插件安装完成！

## AI 配置

插件支持多种AI服务提供商，包括：

### OpenAI
- **API端点**: `https://api.openai.com/v1/chat/completions`
- **模型**: `gpt-3.5-turbo` 或 `gpt-4`
- **获取密钥**: https://platform.openai.com/api-keys

### Anthropic Claude
- **API端点**: `https://api.anthropic.com/v1/messages`
- **模型**: `claude-3-haiku-20240307` 或其他Claude模型
- **获取密钥**: https://console.anthropic.com/

### DeepSeek
- **API端点**: `https://api.deepseek.com/v1/chat/completions`
- **模型**: `deepseek-chat`
- **获取密钥**: https://platform.deepseek.com/

### Ollama (本地)
- **API端点**: `http://localhost:11434/v1/chat/completions`
- **模型**: `llama2` 或其他已下载的模型
- **无需密钥**: 本地运行，安全私密

### 自定义API
支持任何兼容OpenAI格式的API端点。

## 使用说明

### 基本操作

- **新建节点**: 双击画布空白处
- **移动节点**: 拖拽节点
- **连接节点**: 按住Shift拖拽节点到另一个节点
- **删除节点**: 选中节点后按Delete键
- **编辑内容**: 点击节点文字直接编辑

### 工具箱功能

1. **深度挖掘** - 选中节点后点击，选择引导问题来深入分析
2. **随机火花** - 随机生成关键词或场景
3. **分支扩张** - 为当前节点快速添加子节点
4. **AI扩展** - 使用AI智能生成相关想法

### 数据管理

- **保存进度**: 点击顶部"保存进度"按钮导出数据
- **清空画布**: 点击"清空画布"删除所有节点
- **自动保存**: 所有操作自动保存到浏览器存储

## 文件结构

```
extension/
├── manifest.json       # 插件配置文件
├── popup.html         # 主界面
├── options.html       # 设置页面
├── styles.css         # 样式文件
├── app.js            # 主应用逻辑
├── ai-service.js     # AI服务封装
└── icons/           # 图标资源
```

## 开发说明

### 技术栈

- 纯HTML/CSS/JavaScript
- Chrome Extension Manifest V3
- Chrome Storage API
- Fetch API (用于AI调用)

### 扩展AI功能

在 `ai-service.js` 中可以添加新的AI功能方法：

```javascript
async generateCustomFeature(input) {
    const prompt = `你的提示词: ${input}`;
    return await this.callAI(prompt);
}
```

然后在 `app.js` 中调用：

```javascript
async function customFeature() {
    const result = await aiService.generateCustomFeature('输入内容');
    // 处理结果
}
```

## 隐私说明

- 所有数据存储在浏览器本地，不会上传到任何服务器
- API密钥安全存储在浏览器本地存储中
- AI调用直接发送到您配置的API端点，不经过任何中间服务器

## 许可证

MIT License

## 更新日志

### v1.0.0
- 初始版本发布
- 支持基础思维导图功能
- 集成AI扩展功能
- 支持多种AI服务提供商
