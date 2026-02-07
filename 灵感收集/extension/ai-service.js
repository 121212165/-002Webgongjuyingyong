class AIService {
    constructor() {
        this.config = {
            apiKey: '',
            apiEndpoint: '',
            model: '',
            provider: 'openai'
        };
        this.tools = [];
        this.toolHandlers = {};
        this.loadConfig();
        this.initTools();
    }

    initTools() {
        this.tools = [
            {
                type: 'function',
                function: {
                    name: 'create_node',
                    description: '创建一个新的思维导图节点',
                    parameters: {
                        type: 'object',
                        properties: {
                            text: {
                                type: 'string',
                                description: '节点的内容文本'
                            },
                            x: {
                                type: 'number',
                                description: '节点的X坐标（可选，不指定则自动计算）'
                            },
                            y: {
                                type: 'number',
                                description: '节点的Y坐标（可选，不指定则自动计算）'
                            },
                            parent_id: {
                                type: 'number',
                                description: '父节点ID（可选，指定则自动连接到父节点）'
                            }
                        },
                        required: ['text']
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'connect_nodes',
                    description: '连接两个节点',
                    parameters: {
                        type: 'object',
                        properties: {
                            from_id: {
                                type: 'number',
                                description: '起始节点ID'
                            },
                            to_id: {
                                type: 'number',
                                description: '目标节点ID'
                            }
                        },
                        required: ['from_id', 'to_id']
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'update_node',
                    description: '更新节点的内容',
                    parameters: {
                        type: 'object',
                        properties: {
                            id: {
                                type: 'number',
                                description: '节点ID'
                            },
                            text: {
                                type: 'string',
                                description: '新的节点内容'
                            }
                        },
                        required: ['id', 'text']
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'delete_node',
                    description: '删除一个节点',
                    parameters: {
                        type: 'object',
                        properties: {
                            id: {
                                type: 'number',
                                description: '要删除的节点ID'
                            }
                        },
                        required: ['id']
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'get_nodes',
                    description: '获取所有节点的信息',
                    parameters: {
                        type: 'object',
                        properties: {}
                    }
                }
            }
        ];
    }

    registerToolHandler(toolName, handler) {
        this.toolHandlers[toolName] = handler;
    }

    async loadConfig() {
        return new Promise((resolve) => {
            chrome.storage.local.get(['aiConfig'], (result) => {
                if (result.aiConfig) {
                    this.config = { ...this.config, ...result.aiConfig };
                }
                resolve(this.config);
            });
        });
    }

    async saveConfig(config) {
        this.config = { ...this.config, ...config };
        return new Promise((resolve) => {
            chrome.storage.local.set({ aiConfig: this.config }, () => {
                resolve(this.config);
            });
        });
    }

    isConfigured() {
        return !!(this.config.apiKey && this.config.apiEndpoint);
    }

    async generateDeepDiveQuestions(nodeText, contextNodes = []) {
        if (!this.isConfigured()) {
            throw new Error('AI未配置，请先在设置中配置API密钥');
        }

        const context = contextNodes.length > 0 
            ? `\n相关节点：${contextNodes.map(n => n.text).join('、')}`
            : '';

        const prompt = `我正在做一个创意思维导图，当前的核心想法是："${nodeText}"${context}

请帮我生成5个深度挖掘问题，用于启发对这个想法的深入思考。要求：
1. 问题要具体且有启发性
2. 从不同角度提问：痛点、用户、场景、价值、可能性等
3. 每个问题简短有力，不超过20字
4. 只返回问题列表，每行一个问题，不要其他内容`;

        return await this.callAI(prompt);
    }

    async generateIdeaExpansion(nodeText, direction = 'expand') {
        if (!this.isConfigured()) {
            throw new Error('AI未配置，请先在设置中配置API密钥');
        }

        const prompts = {
            expand: `基于想法"${nodeText}"，请生成3个相关的子想法或延伸方向。要求：每个想法简短（10-20字），每行一个，不要其他内容。`,
            contrast: `基于想法"${nodeText}"，请生成3个相反或对立的想法。要求：每个想法简短（10-20字），每行一个，不要其他内容。`,
            scenario: `基于想法"${nodeText}"，请生成3个具体的应用场景。要求：每个场景简短（10-20字），每行一个，不要其他内容。`
        };

        return await this.callAI(prompts[direction] || prompts.expand);
    }

    async analyzeConnections(nodes) {
        if (!this.isConfigured()) {
            throw new Error('AI未配置，请先在设置中配置API密钥');
        }

        const nodeTexts = nodes.map(n => n.text).join('、');
        const prompt = `我有这些想法：${nodeTexts}

请分析它们之间可能存在的3个有意义的连接关系。要求：
1. 每个连接说明两个想法之间的关系
2. 格式为：想法A -> 想法B：关系说明
3. 每行一个连接，不要其他内容`;

        return await this.callAI(prompt);
    }

    async callAIWithTools(messages, onToolCall) {
        const { apiKey, apiEndpoint, model, provider } = this.config;

        let requestBody, headers;

        if (provider === 'openai' || apiEndpoint.includes('openai') || apiEndpoint.includes('bigmodel')) {
            requestBody = {
                model: model || 'glm-4.7',
                messages: messages,
                tools: this.tools,
                tool_choice: 'auto',
                temperature: 0.7,
                max_tokens: 2000
            };
            headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            };
        } else if (provider === 'anthropic' || apiEndpoint.includes('anthropic')) {
            requestBody = {
                model: model || 'claude-3-haiku-20240307',
                max_tokens: 2000,
                messages: messages,
                tools: this.tools
            };
            headers = {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            };
        } else {
            requestBody = {
                model: model,
                messages: messages,
                tools: this.tools,
                tool_choice: 'auto',
                temperature: 0.7,
                max_tokens: 2000
            };
            headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            };
        }

        try {
            const response = await fetch(apiEndpoint, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`API请求失败: ${response.status} - ${errorData.error?.message || response.statusText}`);
            }

            const data = await response.json();

            let assistantMessage;
            if (provider === 'anthropic' || apiEndpoint.includes('anthropic')) {
                assistantMessage = {
                    role: 'assistant',
                    content: data.content[0].text
                };
            } else {
                assistantMessage = data.choices[0].message;
            }

            messages.push(assistantMessage);

            const toolCalls = assistantMessage.tool_calls;
            if (toolCalls && toolCalls.length > 0) {
                for (const toolCall of toolCalls) {
                    const functionName = toolCall.function.name;
                    const functionArgs = JSON.parse(toolCall.function.arguments);

                    if (this.toolHandlers[functionName]) {
                        const result = await this.toolHandlers[functionName](functionArgs);
                        
                        messages.push({
                            role: 'tool',
                            tool_call_id: toolCall.id,
                            content: JSON.stringify(result)
                        });

                        if (onToolCall) {
                            onToolCall(functionName, functionArgs, result);
                        }
                    }
                }

                return await this.callAIWithTools(messages, onToolCall);
            }

            return assistantMessage.content;
        } catch (error) {
            console.error('AI调用错误:', error);
            throw error;
        }
    }

    async chatWithAI(userMessage, nodes = [], onToolCall) {
        const contextInfo = nodes.length > 0 
            ? `\n当前思维导图中的节点：\n${nodes.map(n => `ID:${n.id} - ${n.text}`).join('\n')}`
            : '\n当前思维导图为空';

        const messages = [
            { 
                role: 'system', 
                content: `你是一个创意思维助手，可以帮助用户创建和管理思维导图。你可以使用工具来创建节点、连接节点、更新节点内容等。

当用户要求你：
- 创建想法时，使用 create_node 工具
- 连接想法时，使用 connect_nodes 工具
- 修改想法时，使用 update_node 工具
- 删除想法时，使用 delete_node 工具
- 查看所有节点时，使用 get_nodes 工具

在创建节点时，尽量根据上下文智能计算位置，避免重叠。`
            },
            { 
                role: 'user', 
                content: userMessage + contextInfo
            }
        ];

        return await this.callAIWithTools(messages, onToolCall);
    }

    async callAI(prompt) {
        const { apiKey, apiEndpoint, model, provider } = this.config;

        let requestBody, headers;

        if (provider === 'openai' || apiEndpoint.includes('openai')) {
            requestBody = {
                model: model || 'gpt-3.5-turbo',
                messages: [
                    { role: 'system', content: '你是一个创意思维助手，擅长启发式提问和创意发散。' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.8,
                max_tokens: 500
            };
            headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            };
        } else if (provider === 'anthropic' || apiEndpoint.includes('anthropic')) {
            requestBody = {
                model: model || 'claude-3-haiku-20240307',
                max_tokens: 500,
                messages: [
                    { role: 'user', content: prompt }
                ]
            };
            headers = {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            };
        } else {
            requestBody = {
                model: model,
                messages: [
                    { role: 'system', content: '你是一个创意思维助手，擅长启发式提问和创意发散。' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.8,
                max_tokens: 500
            };
            headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            };
        }

        try {
            const response = await fetch(apiEndpoint, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`API请求失败: ${response.status} - ${errorData.error?.message || response.statusText}`);
            }

            const data = await response.json();

            if (provider === 'anthropic' || apiEndpoint.includes('anthropic')) {
                return data.content[0].text.trim();
            }

            return data.choices[0].message.content.trim();
        } catch (error) {
            console.error('AI调用错误:', error);
            throw error;
        }
    }

    async testConnection() {
        if (!this.isConfigured()) {
            return { success: false, error: 'API未配置' };
        }

        try {
            const result = await this.callAI('请回复"连接成功"，不要其他内容');
            return { success: true, result };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = AIService;
}
