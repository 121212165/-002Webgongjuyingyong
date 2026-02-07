const app = (() => {
    const state = {
        nodes: [],
        connections: [],
        nextId: 1,
        selectedNodeId: null,
        isDragging: false,
        dragNodeId: null,
        dragOffset: { x: 0, y: 0 },
        isConnecting: false,
        connectSourceId: null,
        scale: 1,
        currentQuestion: null,
        currentModal: null
    };

    const container = document.getElementById('canvas-container');
    const svgLayer = document.getElementById('svg-layer');
    const selectedInfo = document.getElementById('selected-node-info');
    const deleteBtn = document.getElementById('delete-btn');

    const aiService = new AIService();

    const inspirationData = {
        sparkWords: ["未来主义", "极简主义", "自然共生", "虚拟现实", "复古风潮", "社区连接", "可持续性", "游戏化", "情感化设计", "自动化"],
        sparkScenes: ["在拥挤的地铁里", "下雨的午后咖啡馆", "深夜的办公室", "充满绿植的阳台", "极客的桌面", "混乱的厨房"],
        questions: [
            "这个创意的核心痛点是什么？",
            "如果完全不考虑技术限制，它会是什么样？",
            "谁会最需要这个？他们是什么样的人？",
            "这个想法的反面是什么？",
            "如何让它比现在简单十倍？",
            "如果把它的某个特征放大，会发生什么？",
            "用户在使用时的情绪如何？",
            "三年后，这个想法还有价值吗？",
            "它可能带来什么意想不到的副作用？",
            "有没有比这个更笨的解决方案？"
        ]
    };

    function init() {
        registerAIToolHandlers();
        loadData();
        setupEventListeners();
        render();
        window.addEventListener('resize', renderLines);
    }

    function registerAIToolHandlers() {
        aiService.registerToolHandler('create_node', (args) => {
            const { text, x, y, parent_id } = args;
            let nodeX = x;
            let nodeY = y;

            if (nodeX === undefined || nodeY === undefined) {
                if (parent_id) {
                    const parentNode = state.nodes.find(n => n.id === parent_id);
                    if (parentNode) {
                        nodeX = parentNode.x + 150 + Math.random() * 50;
                        nodeY = parentNode.y + Math.random() * 100 - 50;
                    } else {
                        nodeX = 100 + Math.random() * 300;
                        nodeY = 100 + Math.random() * 300;
                    }
                } else {
                    nodeX = 100 + Math.random() * 300;
                    nodeY = 100 + Math.random() * 300;
                }
            }

            const node = createNode(nodeX, nodeY, text);
            
            if (parent_id) {
                toggleConnection(parent_id, node.id);
            }

            return { success: true, node_id: node.id, text: node.text };
        });

        aiService.registerToolHandler('connect_nodes', (args) => {
            const { from_id, to_id } = args;
            const fromNode = state.nodes.find(n => n.id === from_id);
            const toNode = state.nodes.find(n => n.id === to_id);

            if (!fromNode || !toNode) {
                return { success: false, error: '节点不存在' };
            }

            const existingIndex = state.connections.findIndex(
                c => (c.from === from_id && c.to === to_id) || (c.from === to_id && c.to === from_id)
            );

            if (existingIndex >= 0) {
                return { success: true, message: '连接已存在' };
            }

            state.connections.push({ from: from_id, to: to_id });
            renderLines();
            saveData();

            return { success: true, message: '连接已创建' };
        });

        aiService.registerToolHandler('update_node', (args) => {
            const { id, text } = args;
            const node = state.nodes.find(n => n.id === id);

            if (!node) {
                return { success: false, error: '节点不存在' };
            }

            node.text = text;
            const el = document.querySelector(`.node[data-id="${id}"]`);
            if (el) {
                const content = el.querySelector('.node-content');
                if (content) {
                    content.textContent = text;
                }
            }
            saveData();

            return { success: true, node_id: id, text: text };
        });

        aiService.registerToolHandler('delete_node', (args) => {
            const { id } = args;
            const node = state.nodes.find(n => n.id === id);

            if (!node) {
                return { success: false, error: '节点不存在' };
            }

            state.nodes = state.nodes.filter(n => n.id !== id);
            state.connections = state.connections.filter(c => 
                c.from !== id && c.to !== id
            );

            const el = document.querySelector(`.node[data-id="${id}"]`);
            if (el) el.remove();

            if (state.selectedNodeId === id) {
                deselectNode();
            }

            renderLines();
            saveData();

            return { success: true, node_id: id };
        });

        aiService.registerToolHandler('get_nodes', () => {
            return {
                success: true,
                nodes: state.nodes.map(n => ({
                    id: n.id,
                    text: n.text,
                    x: n.x,
                    y: n.y
                })),
                connections: state.connections
            };
        });
    }

    function loadData() {
        chrome.storage.local.get(['inspirationNodes', 'inspirationConnections', 'nextId'], (result) => {
            if (result.inspirationNodes) {
                state.nodes = result.inspirationNodes;
            }
            if (result.inspirationConnections) {
                state.connections = result.inspirationConnections;
            }
            if (result.nextId) {
                state.nextId = result.nextId;
            }
            render();
        });
    }

    function saveData() {
        chrome.storage.local.set({
            inspirationNodes: state.nodes,
            inspirationConnections: state.connections,
            nextId: state.nextId
        });
    }

    function setupEventListeners() {
        container.addEventListener('mousedown', (e) => {
            if (e.target === container || e.target === svgLayer) {
                if (!e.shiftKey) {
                    deselectNode();
                }
            }
        });

        container.addEventListener('dblclick', (e) => {
            if (e.target === container || e.target === svgLayer) {
                openCreateModal(e.offsetX, e.offsetY);
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Delete' || e.key === 'Backspace') {
                if (document.activeElement.tagName !== 'TEXTAREA' && state.selectedNodeId) {
                    deleteSelectedNode();
                }
            }
        });

        container.addEventListener('mousemove', (e) => {
            if (state.isDragging && state.dragNodeId) {
                const node = state.nodes.find(n => n.id === state.dragNodeId);
                if (node) {
                    node.x = e.clientX - state.dragOffset.x;
                    node.y = e.clientY - state.dragOffset.y;
                    updateNodePosition(node);
                    renderLines();
                }
            } else if (state.isConnecting && state.connectSourceId) {
                renderTempLine(e.clientX, e.clientY);
            }
        });

        container.addEventListener('mouseup', (e) => {
            if (state.isConnecting) {
                const targetNodeEl = e.target.closest('.node');
                if (targetNodeEl) {
                    const targetId = parseInt(targetNodeEl.dataset.id);
                    if (targetId !== state.connectSourceId) {
                        toggleConnection(state.connectSourceId, targetId);
                    }
                }
                const tempLine = document.getElementById('temp-line');
                if(tempLine) tempLine.remove();
                state.isConnecting = false;
                state.connectSourceId = null;
                container.style.cursor = 'default';
            }
            state.isDragging = false;
            state.dragNodeId = null;
        });
    }

    function createNode(x, y, text = "新想法") {
        const node = {
            id: state.nextId++,
            x: x,
            y: y,
            text: text,
            type: 'default',
            createdAt: new Date().toISOString()
        };
        state.nodes.push(node);
        renderNode(node);
        saveData();
        showToast("节点已创建");
        return node;
    }

    function renderNode(node) {
        const div = document.createElement('div');
        div.className = 'node';
        div.dataset.id = node.id;
        div.style.left = `${node.x}px`;
        div.style.top = `${node.y}px`;
        
        const colors = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6'];
        const color = colors[node.id % colors.length];
        div.style.borderLeftColor = color;

        div.innerHTML = `
            <div class="node-content" contenteditable="true" spellcheck="false">${node.text}</div>
        `;

        div.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return;
            e.stopPropagation();

            if (e.shiftKey) {
                state.isConnecting = true;
                state.connectSourceId = node.id;
                const source = getNodeCenter(node);
                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                path.id = 'temp-line';
                path.setAttribute('d', `M${source.x},${source.y} L${source.x},${source.y}`);
                path.style.stroke = color;
                svgLayer.appendChild(path);
                container.style.cursor = 'crosshair';
            } else {
                selectNode(node.id);
                state.isDragging = true;
                state.dragNodeId = node.id;
                state.dragOffset = {
                    x: e.clientX - node.x,
                    y: e.clientY - node.y
                };
            }
        });

        const content = div.querySelector('.node-content');
        content.addEventListener('input', () => {
            node.text = content.textContent;
            saveData();
        });

        content.addEventListener('blur', () => {
            if (!content.textContent.trim()) {
                content.textContent = node.text;
            }
        });

        container.appendChild(div);
    }

    function getNodeCenter(node) {
        const el = document.querySelector(`.node[data-id="${node.id}"]`);
        if (!el) return { x: node.x, y: node.y };
        return {
            x: node.x + el.offsetWidth / 2,
            y: node.y + el.offsetHeight / 2
        };
    }

    function updateNodePosition(node) {
        const el = document.querySelector(`.node[data-id="${node.id}"]`);
        if (el) {
            el.style.left = `${node.x}px`;
            el.style.top = `${node.y}px`;
        }
    }

    function selectNode(id) {
        state.selectedNodeId = id;
        document.querySelectorAll('.node').forEach(el => {
            el.classList.remove('selected');
            if (parseInt(el.dataset.id) === id) {
                el.classList.add('selected');
            }
        });

        const node = state.nodes.find(n => n.id === id);
        if (node) {
            selectedInfo.innerHTML = `<strong>${node.text}</strong>`;
            deleteBtn.style.display = 'block';
        }
    }

    function deselectNode() {
        state.selectedNodeId = null;
        document.querySelectorAll('.node').forEach(el => el.classList.remove('selected'));
        selectedInfo.innerHTML = '未选择任何节点';
        deleteBtn.style.display = 'none';
    }

    function deleteSelectedNode() {
        if (!state.selectedNodeId) return;
        
        state.nodes = state.nodes.filter(n => n.id !== state.selectedNodeId);
        state.connections = state.connections.filter(c => 
            c.from !== state.selectedNodeId && c.to !== state.selectedNodeId
        );
        
        const el = document.querySelector(`.node[data-id="${state.selectedNodeId}"]`);
        if (el) el.remove();
        
        deselectNode();
        renderLines();
        saveData();
        showToast("节点已删除");
    }

    function toggleConnection(fromId, toId) {
        const existingIndex = state.connections.findIndex(
            c => (c.from === fromId && c.to === toId) || (c.from === toId && c.to === fromId)
        );
        
        if (existingIndex >= 0) {
            state.connections.splice(existingIndex, 1);
            showToast("连接已移除");
        } else {
            state.connections.push({ from: fromId, to: toId });
            showToast("连接已创建");
        }
        
        renderLines();
        saveData();
    }

    function renderLines() {
        svgLayer.innerHTML = '';
        
        state.connections.forEach(conn => {
            const fromNode = state.nodes.find(n => n.id === conn.from);
            const toNode = state.nodes.find(n => n.id === conn.to);
            
            if (!fromNode || !toNode) return;
            
            const from = getNodeCenter(fromNode);
            const to = getNodeCenter(toNode);
            
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            const midX = (from.x + to.x) / 2;
            const midY = (from.y + to.y) / 2;
            const dx = to.x - from.x;
            const dy = to.y - from.y;
            const controlX = midX - dy * 0.2;
            const controlY = midY + dx * 0.2;
            
            path.setAttribute('d', `M${from.x},${from.y} Q${controlX},${controlY} ${to.x},${to.y}`);
            svgLayer.appendChild(path);
        });
    }

    function renderTempLine(mouseX, mouseY) {
        const tempLine = document.getElementById('temp-line');
        if (!tempLine) return;
        
        const sourceNode = state.nodes.find(n => n.id === state.connectSourceId);
        if (!sourceNode) return;
        
        const source = getNodeCenter(sourceNode);
        const midX = (source.x + mouseX) / 2;
        const midY = (source.y + mouseY) / 2;
        const dx = mouseX - source.x;
        const dy = mouseY - source.y;
        const controlX = midX - dy * 0.2;
        const controlY = midY + dx * 0.2;
        
        tempLine.setAttribute('d', `M${source.x},${source.y} Q${controlX},${controlY} ${mouseX},${mouseY}`);
    }

    function render() {
        container.querySelectorAll('.node').forEach(el => el.remove());
        state.nodes.forEach(node => renderNode(node));
        renderLines();
    }

    function openCreateModal(x, y) {
        state.currentModal = { type: 'create', x, y };
        document.getElementById('create-input').value = '';
        openModal('create-modal');
        setTimeout(() => document.getElementById('create-input').focus(), 100);
    }

    function submitCreateNode() {
        const text = document.getElementById('create-input').value.trim();
        if (!text) return;
        
        createNode(state.currentModal.x, state.currentModal.y, text);
        closeModal('create-modal');
    }

    function showDeepDiveModal() {
        const node = state.nodes.find(n => n.id === state.selectedNodeId);
        if (!node) {
            showToast("请先选择一个节点");
            return;
        }

        document.getElementById('modal-node-title').textContent = node.text;
        const questionList = document.getElementById('question-list');
        questionList.innerHTML = '';

        const questions = inspirationData.questions.sort(() => Math.random() - 0.5).slice(0, 5);
        
        questions.forEach(q => {
            const option = document.createElement('div');
            option.className = 'question-option';
            option.textContent = q;
            option.onclick = () => {
                state.currentQuestion = q;
                openAnswerModal(q);
            };
            questionList.appendChild(option);
        });

        openModal('deep-dive-modal');
    }

    function openAnswerModal(question) {
        document.getElementById('answer-question-title').textContent = question;
        document.getElementById('answer-input').value = '';
        closeModal('deep-dive-modal');
        openModal('answer-modal');
        setTimeout(() => document.getElementById('answer-input').focus(), 100);
    }

    function submitAnswer() {
        const answer = document.getElementById('answer-input').value.trim();
        if (!answer) return;

        const sourceNode = state.nodes.find(n => n.id === state.selectedNodeId);
        if (sourceNode) {
            const newNode = createNode(
                sourceNode.x + 150 + Math.random() * 50,
                sourceNode.y + Math.random() * 100 - 50,
                answer
            );
            toggleConnection(sourceNode.id, newNode.id);
        }

        closeModal('answer-modal');
    }

    function randomSpark() {
        const isWord = Math.random() > 0.5;
        const sparks = isWord ? inspirationData.sparkWords : inspirationData.sparkScenes;
        const spark = sparks[Math.floor(Math.random() * sparks.length)];
        
        const x = 100 + Math.random() * 300;
        const y = 100 + Math.random() * 300;
        
        createNode(x, y, spark);
        showToast(`随机火花: ${spark}`);
    }

    function expandNode() {
        const node = state.nodes.find(n => n.id === state.selectedNodeId);
        if (!node) {
            showToast("请先选择一个节点");
            return;
        }

        const newNode = createNode(
            node.x + 150 + Math.random() * 50,
            node.y + Math.random() * 100 - 50,
            "新想法"
        );
        toggleConnection(node.id, newNode.id);
    }

    async function aiExpand() {
        const node = state.nodes.find(n => n.id === state.selectedNodeId);
        if (!node) {
            showToast("请先选择一个节点");
            return;
        }

        if (!aiService.isConfigured()) {
            showToast("请先在设置中配置AI API");
            openSettings();
            return;
        }

        document.getElementById('ai-modal-title').textContent = '🤖 AI智能扩展';
        document.getElementById('ai-loading').style.display = 'block';
        document.getElementById('ai-results').style.display = 'none';
        openModal('ai-modal');

        try {
            const result = await aiService.generateIdeaExpansion(node.text);
            const ideas = result.split('\n').filter(line => line.trim()).slice(0, 5);

            document.getElementById('ai-loading').style.display = 'none';
            document.getElementById('ai-results').style.display = 'flex';

            const resultsDiv = document.getElementById('ai-results');
            resultsDiv.innerHTML = '';

            ideas.forEach(idea => {
                const option = document.createElement('div');
                option.className = 'question-option';
                option.innerHTML = `<span class="ai-indicator"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5"></path></svg>AI生成</span>${idea}`;
                option.onclick = () => {
                    const newNode = createNode(
                        node.x + 150 + Math.random() * 50,
                        node.y + Math.random() * 100 - 50,
                        idea
                    );
                    toggleConnection(node.id, newNode.id);
                    closeModal('ai-modal');
                };
                resultsDiv.appendChild(option);
            });
        } catch (error) {
            document.getElementById('ai-loading').style.display = 'none';
            showToast(`AI调用失败: ${error.message}`);
        }
    }

    function openModal(modalId) {
        document.getElementById(modalId).classList.add('active');
    }

    function closeModal(modalId) {
        document.getElementById(modalId).classList.remove('active');
    }

    function showToast(message) {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2000);
    }

    function clearCanvas() {
        if (confirm('确定要清空画布吗？所有数据将被删除。')) {
            state.nodes = [];
            state.connections = [];
            state.nextId = 1;
            state.selectedNodeId = null;
            render();
            saveData();
            showToast("画布已清空");
        }
    }

    function exportData() {
        const data = {
            nodes: state.nodes,
            connections: state.connections,
            exportedAt: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `灵感挖掘机_${new Date().toLocaleDateString()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast("数据已导出");
    }

    function openSettings() {
        chrome.runtime.openOptionsPage();
    }

    init();

    return {
        clearCanvas,
        exportData,
        showDeepDiveModal,
        randomSpark,
        expandNode,
        aiExpand,
        deleteSelectedNode,
        submitCreateNode,
        submitAnswer,
        closeModal,
        openSettings
    };
})();
