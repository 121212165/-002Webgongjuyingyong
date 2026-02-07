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

    loadConfig() {
        try {
            const stored = localStorage.getItem('aiConfig');
            if (stored) {
                const config = JSON.parse(stored);
                this.config = { ...this.config, ...config };
            }
        } catch (e) {
            console.error('Failed to load AI config:', e);
        }
    }

    saveConfig() {
        try {
            localStorage.setItem('aiConfig', JSON.stringify(this.config));
        } catch (e) {
            console.error('Failed to save AI config:', e);
        }
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
                    description: '更新节点的文本内容',
                    parameters: {
                        type: 'object',
                        properties: {
                            id: {
                                type: 'number',
                                description: '节点ID'
                            },
                            text: {
                                type: 'string',
                                description: '新的文本内容'
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
                    description: '删除节点及其连接',
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
                    description: '获取当前思维导图的所有节点信息',
                    parameters: {
                        type: 'object',
                        properties: {}
                    }
                }
            }
        ];
    }

    registerToolHandler(name, handler) {
        this.toolHandlers[name] = handler;
    }

    async callAIWithTools(messages, onToolCall) {
        if (!this.config.apiKey || !this.config.apiEndpoint || !this.config.model) {
            return { error: '请先配置AI服务参数' };
        }

        try {
            const response = await fetch(this.config.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.config.apiKey}`
                },
                body: JSON.stringify({
                    model: this.config.model,
                    messages: messages,
                    tools: this.tools,
                    tool_choice: 'auto',
                    temperature: 0.7
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                return { error: `API请求失败: ${response.status} - ${errorText}` };
            }

            const data = await response.json();

            if (data.choices && data.choices[0]) {
                const message = data.choices[0].message;

                if (message.tool_calls && message.tool_calls.length > 0) {
                    const toolCalls = message.tool_calls.map(tc => ({
                        id: tc.id,
                        name: tc.function.name,
                        arguments: JSON.parse(tc.function.arguments)
                    }));

                    const results = [];
                    for (const toolCall of toolCalls) {
                        if (this.toolHandlers[toolCall.name]) {
                            try {
                                const result = await this.toolHandlers[toolCall.name](toolCall.arguments);
                                results.push({
                                    tool_call_id: toolCall.id,
                                    name: toolCall.name,
                                    content: JSON.stringify(result)
                                });
                            } catch (error) {
                                results.push({
                                    tool_call_id: toolCall.id,
                                    name: toolCall.name,
                                    content: `执行失败: ${error.message}`
                                });
                            }
                        }
                    }

                    if (results.length > 0) {
                        messages.push(message);
                        messages.push({
                            role: 'tool',
                            content: results.map(r => `[${r.name}] ${r.content}`).join('\n'),
                            tool_results: results
                        });

                        const secondResponse = await fetch(this.config.apiEndpoint, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${this.config.apiKey}`
                            },
                            body: JSON.stringify({
                                model: this.config.model,
                                messages: messages,
                                temperature: 0.7
                            })
                        });

                        if (!secondResponse.ok) {
                            return { error: `二次调用失败: ${secondResponse.status}` };
                        }

                        const secondData = await secondResponse.json();
                        return { message: secondData.choices[0].message.content };
                    }

                    return { message: message.content };
                }

                return { message: message.content };
            }

            return { error: '无法解析API响应' };
        } catch (error) {
            return { error: `API调用失败: ${error.message}` };
        }
    }

    async chatWithAI(userMessage, nodes = [], onToolCall) {
        const nodesInfo = nodes.map(n =>
            `节点${n.id}: "${n.text}" (位置: ${n.x}, ${n.y})${n.isRoot ? ' [根节点]' : ''}${n.parentId ? ` 父节点: ${n.parentId}` : ''}`
        ).join('\n');

        const systemMessage = `你是一个思维导图助手，帮助用户创建、组织和扩展思维导图。
当前思维导图包含 ${nodes.length} 个节点：
${nodesInfo || '（空思维导图）'}

你的功能：
1. 理解用户需求，用自然语言回复
2. 通过调用工具来操作思维导图
3. 提供创意建议和改进方案

请始终用中文回复，并直接执行用户要求的操作。如果需要创建节点或进行其他操作，请调用相应工具。`;

        const messages = [
            { role: 'system', content: systemMessage },
            { role: 'user', content: userMessage }
        ];

        return await this.callAIWithTools(messages, onToolCall);
    }
}
