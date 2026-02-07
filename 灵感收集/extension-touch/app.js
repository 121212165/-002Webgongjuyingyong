class MindMap {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.nodes = [];
    this.connections = [];
    this.selectedNode = null;
    this.connectingNode = null;
    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;
    this.isDragging = false;
    this.isPanning = false;
    this.lastTouchX = 0;
    this.lastTouchY = 0;
    this.lastTouchDistance = 0;
    this.longPressTimer = null;
    this.longPressDuration = 600;
    this.isLongPress = false;
    this.draggedNode = null;
    this.dragOffsetX = 0;
    this.dragOffsetY = 0;

    this.nodeWidth = 160;
    this.nodeHeight = 50;
    this.horizontalSpacing = 220;
    this.verticalSpacing = 100;

    this.initCanvas();
    this.bindEvents();
    this.loadFromStorage();
  }

  initCanvas() {
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  resizeCanvas() {
    const container = this.canvas.parentElement;
    this.canvas.width = container.clientWidth;
    this.canvas.height = container.clientHeight;
    this.render();
  }

  bindEvents() {
    this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
    this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
    this.canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });
    this.canvas.addEventListener('touchcancel', (e) => this.handleTouchEnd(e), { passive: false });

    this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
    this.canvas.addEventListener('wheel', (e) => this.handleWheel(e), { passive: false });

    document.addEventListener('keydown', (e) => this.handleKeyDown(e));
  }

  handleTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = this.canvas.getBoundingClientRect();
    const x = (touch.clientX - rect.left - this.offsetX) / this.scale;
    const y = (touch.clientY - rect.top - this.offsetY) / this.scale;

    if (e.touches.length === 1) {
      this.lastTouchX = touch.clientX;
      this.lastTouchY = touch.clientY;
      this.isLongPress = false;

      const node = this.getNodeAt(x, y);
      if (node) {
        this.longPressTimer = setTimeout(() => {
          this.isLongPress = true;
          this.showContextMenu(node, touch.clientX, touch.clientY);
        }, this.longPressDuration);
      }

      this.touchStartNode = node;
      this.touchStartX = x;
      this.touchStartY = y;
    } else if (e.touches.length === 2) {
      this.clearLongPressTimer();
      const touch2 = e.touches[1];
      this.lastTouchDistance = Math.hypot(
        touch.clientX - touch2.clientX,
        touch.clientY - touch2.clientY
      );
      this.isPanning = true;
    }
  }

  handleTouchMove(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = this.canvas.getBoundingClientRect();
    const x = (touch.clientX - rect.left - this.offsetX) / this.scale;
    const y = (touch.clientY - rect.top - this.offsetY) / this.scale;

    if (e.touches.length === 1) {
      if (this.isLongPress) return;

      const dx = touch.clientX - this.lastTouchX;
      const dy = touch.clientY - this.lastTouchY;

      if (this.draggedNode) {
        this.draggedNode.x = x - this.dragOffsetX;
        this.draggedNode.y = y - this.dragOffsetY;
        this.render();
      } else if (Math.hypot(dx, dy) > 10) {
        this.clearLongPressTimer();
        this.isPanning = true;
        this.offsetX += dx;
        this.offsetY += dy;
        this.render();
      }

      this.lastTouchX = touch.clientX;
      this.lastTouchY = touch.clientY;
    } else if (e.touches.length === 2) {
      this.clearLongPressTimer();
      const touch2 = e.touches[1];
      const currentDistance = Math.hypot(
        touch.clientX - touch2.clientX,
        touch.clientY - touch2.clientY
      );

      const scaleDelta = currentDistance / this.lastTouchDistance;
      const newScale = Math.min(Math.max(0.3, this.scale * scaleDelta), 3);
      const centerX = (touch.clientX + touch2.clientX) / 2;
      const centerY = (touch.clientY + touch2.clientY) / 2;

      this.scale = newScale;

      const rect = this.canvas.getBoundingClientRect();
      const rectCenterX = centerX - rect.left;
      const rectCenterY = centerY - rect.top;

      this.offsetX = rectCenterX - (rectCenterX - this.offsetX) * scaleDelta;
      this.offsetY = rectCenterY - (rectCenterY - this.offsetY) * scaleDelta;

      this.lastTouchDistance = currentDistance;
      this.render();
    }
  }

  handleTouchEnd(e) {
    this.clearLongPressTimer();

    if (this.isLongPress) {
      this.isLongPress = false;
      return;
    }

    if (e.touches.length === 0) {
      if (this.isPanning) {
        this.isPanning = false;
      }

      if (this.draggedNode && !this.isPanning) {
        const node = this.getNodeAt(
          (this.touchStartX || 0),
          (this.touchStartY || 0)
        );
        if (node && this.touchStartNode === node) {
          this.selectNode(node);
        }
        this.draggedNode = null;
      }

      this.isDragging = false;
    }
  }

  handleMouseDown(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - this.offsetX) / this.scale;
    const y = (e.clientY - rect.top - this.offsetY) / this.scale;

    this.isDragging = true;
    this.lastTouchX = e.clientX;
    this.lastTouchY = e.clientY;

    const node = this.getNodeAt(x, y);
    if (node) {
      this.draggedNode = node;
      this.dragOffsetX = x - node.x;
      this.dragOffsetY = y - node.y;
      this.selectNode(node);
    } else {
      this.selectNode(null);
      this.isPanning = true;
    }
  }

  handleMouseMove(e) {
    if (!this.isDragging) return;

    const dx = e.clientX - this.lastTouchX;
    const dy = e.clientY - this.lastTouchY;

    if (this.draggedNode) {
      const rect = this.canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left - this.offsetX) / this.scale;
      const y = (e.clientY - rect.top - this.offsetY) / this.scale;

      this.draggedNode.x = x - this.dragOffsetX;
      this.draggedNode.y = y - this.dragOffsetY;
      this.render();
    } else if (this.isPanning) {
      this.offsetX += dx;
      this.offsetY += dy;
      this.render();
    }

    this.lastTouchX = e.clientX;
    this.lastTouchY = e.clientY;
  }

  handleMouseUp(e) {
    this.isDragging = false;
    this.isPanning = false;
    this.draggedNode = null;
  }

  handleWheel(e) {
    e.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.min(Math.max(0.3, this.scale * delta), 3);

    this.offsetX = mouseX - (mouseX - this.offsetX) * (newScale / this.scale);
    this.offsetY = mouseY - (mouseY - this.offsetY) * (newScale / this.scale);
    this.scale = newScale;

    this.render();
    updateZoomLevel();
  }

  handleKeyDown(e) {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (this.selectedNode && !this.isEditing()) {
        e.preventDefault();
        this.deleteNode(this.selectedNode);
      }
    }
    if (e.key === 'Escape') {
      this.selectNode(null);
      this.connectingNode = null;
      this.hideContextMenu();
      this.hideModal();
      this.hideChatPanel();
    }
  }

  clearLongPressTimer() {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  getNodeAt(x, y) {
    for (let i = this.nodes.length - 1; i >= 0; i--) {
      const node = this.nodes[i];
      if (x >= node.x - this.nodeWidth / 2 &&
          x <= node.x + this.nodeWidth / 2 &&
          y >= node.y - this.nodeHeight / 2 &&
          y <= node.y + this.nodeHeight / 2) {
        return node;
      }
    }
    return null;
  }

  selectNode(node) {
    if (this.selectedNode) {
      this.selectedNode.selected = false;
    }
    this.selectedNode = node;
    if (node) {
      node.selected = true;
    }
    this.render();
    updateNodeCount();
  }

  createNode(x, y, text = '新节点', isRoot = false) {
    const node = {
      id: Date.now(),
      x: x,
      y: y,
      text: text,
      isRoot: isRoot,
      parentId: null,
      selected: false,
      children: []
    };
    this.nodes.push(node);
    this.render();
    this.saveToStorage();
    updateNodeCount();
    return node;
  }

  addChildNode(parentNode, text = '子节点') {
    const level = this.getNodeLevel(parentNode);
    const baseY = parentNode.y + this.verticalSpacing;
    const existingChildren = parentNode.children || [];
    const childIndex = existingChildren.length;

    const childX = parentNode.x + (childIndex % 2 === 0 ? 1 : -1) * this.horizontalSpacing * (1 + Math.floor(childIndex / 2) * 0.5);

    const y = this.getLowestChildY(parentNode) + this.verticalSpacing;

    const node = this.createNode(childX, y, text, false);
    node.parentId = parentNode.id;
    parentNode.children = parentNode.children || [];
    parentNode.children.push(node);
    this.connections.push({
      from: parentNode,
      to: node,
      id: `${parentNode.id}-${node.id}`
    });
    this.render();
    this.saveToStorage();
    return node;
  }

  getNodeLevel(node) {
    let level = 0;
    let current = node;
    while (current.parentId) {
      level++;
      current = this.nodes.find(n => n.id === current.parentId);
      if (!current) break;
    }
    return level;
  }

  getLowestChildY(node) {
    if (!node.children || node.children.length === 0) {
      return node.y;
    }
    return Math.max(...node.children.map(child => this.getLowestChildY(child)));
  }

  updateNode(node, text) {
    node.text = text;
    this.render();
    this.saveToStorage();
  }

  deleteNode(node) {
    const nodesToDelete = this.collectDescendants(node);
    nodesToDelete.push(node);

    nodesToDelete.forEach(n => {
      this.connections = this.connections.filter(c => c.from.id !== n.id && c.to.id !== n.id);
    });

    this.nodes = this.nodes.filter(n => !nodesToDelete.includes(n));

    this.connections.forEach(c => {
      if (nodesToDelete.includes(c.from)) {
        c.to.parentId = null;
      }
    });

    if (this.selectedNode === node) {
      this.selectedNode = null;
    }

    this.render();
    this.saveToStorage();
    updateNodeCount();
  }

  collectDescendants(node) {
    let descendants = [];
    if (node.children) {
      node.children.forEach(child => {
        descendants.push(child);
        descendants = descendants.concat(this.collectDescendants(child));
      });
    }
    return descendants;
  }

  connectNodes(fromNode, toNode) {
    if (!fromNode || !toNode || fromNode.id === toNode.id) return false;

    const exists = this.connections.some(c => c.from.id === fromNode.id && c.to.id === toNode.id);
    if (exists) return false;

    if (toNode.parentId) {
      const oldParent = this.nodes.find(n => n.id === toNode.parentId);
      if (oldParent) {
        oldParent.children = oldParent.children.filter(c => c.id !== toNode.id);
      }
    }

    toNode.parentId = fromNode.id;
    fromNode.children = fromNode.children || [];
    if (!fromNode.children.some(c => c.id === toNode.id)) {
      fromNode.children.push(toNode);
    }

    this.connections.push({
      from: fromNode,
      to: toNode,
      id: `${fromNode.id}-${toNode.id}`
    });

    this.render();
    this.saveToStorage();
    return true;
  }

  render() {
    const container = this.canvas.parentElement;
    this.canvas.width = container.clientWidth;
    this.canvas.height = container.clientHeight;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.save();
    this.ctx.translate(this.offsetX, this.offsetY);
    this.ctx.scale(this.scale, this.scale);

    this.connections.forEach(conn => {
      this.drawConnection(conn);
    });

    this.nodes.forEach(node => {
      this.drawNode(node);
    });

    this.ctx.restore();
  }

  drawConnection(conn) {
    const from = conn.from;
    const to = conn.to;

    this.ctx.beginPath();
    this.ctx.moveTo(from.x, from.y);

    const midX = (from.x + to.x) / 2;
    const midY = (from.y + to.y) / 2;

    if (Math.abs(to.x - from.x) > 100) {
      this.ctx.bezierCurveTo(
        midX, from.y,
        midX, to.y,
        to.x, to.y
      );
    } else {
      this.ctx.lineTo(to.x, to.y);
    }

    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    this.ctx.lineWidth = 3;
    this.ctx.stroke();
  }

  drawNode(node) {
    const width = this.nodeWidth;
    const height = this.nodeHeight;
    const x = node.x - width / 2;
    const y = node.y - height / 2;

    if (node.isRoot) {
      const gradient = this.ctx.createLinearGradient(x, y, x + width, y);
      gradient.addColorStop(0, '#00d2ff');
      gradient.addColorStop(1, '#3a7bd5');

      this.ctx.beginPath();
      this.ctx.roundRect(x - 10, y - 8, width + 20, height + 16, 20);
      this.ctx.fillStyle = gradient;
      this.ctx.fill();

      this.ctx.shadowColor = 'rgba(0, 210, 255, 0.4)';
      this.ctx.shadowBlur = 15;
      this.ctx.shadowOffsetX = 0;
      this.ctx.shadowOffsetY = 5;
    } else {
      this.ctx.beginPath();
      this.ctx.roundRect(x, y, width, height, 16);
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      this.ctx.fill();
      this.ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
      this.ctx.shadowBlur = 15;
      this.ctx.shadowOffsetX = 0;
      this.ctx.shadowOffsetY = 5;
    }
    this.ctx.shadowColor = 'transparent';
    this.ctx.shadowBlur = 0;
    this.ctx.shadowOffsetX = 0;
    this.ctx.shadowOffsetY = 0;

    if (node.selected) {
      this.ctx.beginPath();
      this.ctx.roundRect(x - 6, y - 6, width + 12, height + 12, 22);
      this.ctx.strokeStyle = '#00d2ff';
      this.ctx.lineWidth = 4;
      this.ctx.stroke();
    }

    if (node === this.connectingNode) {
      this.ctx.beginPath();
      this.ctx.roundRect(x - 4, y - 4, width + 8, height + 8, 20);
      this.ctx.strokeStyle = '#ff6b6b';
      this.ctx.lineWidth = 4;
      this.ctx.stroke();
    }

    this.ctx.font = node.isRoot ? 'bold 17px -apple-system, BlinkMacSystemFont, sans-serif' : '15px -apple-system, BlinkMacSystemFont, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillStyle = node.isRoot ? '#ffffff' : '#1a1a2e';
    this.ctx.fillText(node.text, node.x, node.y);
  }

  showContextMenu(node, x, y) {
    const menu = document.getElementById('contextMenu');
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
    menu.classList.add('show');
    this.selectedNode = node;
    node.selected = true;
    this.render();
  }

  hideContextMenu() {
    const menu = document.getElementById('contextMenu');
    menu.classList.remove('show');
  }

  showModal(title, placeholder, onConfirm) {
    const modal = document.getElementById('inputModal');
    document.getElementById('modalTitle').textContent = title;
    const input = document.getElementById('nodeInput');
    input.placeholder = placeholder;
    input.value = '';
    modal.classList.add('show');
    input.focus();

    this.modalOnConfirm = onConfirm;
    this.isEditing = true;
  }

  hideModal() {
    const modal = document.getElementById('inputModal');
    modal.classList.remove('show');
    this.isEditing = false;
  }

  showChatPanel() {
    const panel = document.getElementById('aiChatPanel');
    panel.classList.add('show');
  }

  hideChatPanel() {
    const panel = document.getElementById('aiChatPanel');
    panel.classList.remove('show');
  }

  isEditing() {
    return this.isEditing;
  }

  zoomIn() {
    this.scale = Math.min(this.scale * 1.2, 3);
    this.render();
    updateZoomLevel();
  }

  zoomOut() {
    this.scale = Math.max(this.scale / 1.2, 0.3);
    this.render();
    updateZoomLevel();
  }

  resetView() {
    this.scale = 1;
    this.offsetX = this.canvas.width / 2;
    this.offsetY = this.canvas.height / 2;
    this.render();
    updateZoomLevel();
  }

  centerView() {
    if (this.nodes.length > 0) {
      const bounds = this.getBounds();
      const centerX = (bounds.minX + bounds.maxX) / 2;
      const centerY = (bounds.minY + bounds.maxY) / 2;

      this.offsetX = this.canvas.width / 2 - centerX * this.scale;
      this.offsetY = this.canvas.height / 2 - centerY * this.scale;
      this.render();
    }
  }

  getBounds() {
    if (this.nodes.length === 0) {
      return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
    }

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    this.nodes.forEach(node => {
      minX = Math.min(minX, node.x - this.nodeWidth / 2);
      maxX = Math.max(maxX, node.x + this.nodeWidth / 2);
      minY = Math.min(minY, node.y - this.nodeHeight / 2);
      maxY = Math.max(maxY, node.y + this.nodeHeight / 2);
    });

    return { minX, maxX, minY, maxY };
  }

  clear() {
    this.nodes = [];
    this.connections = [];
    this.selectedNode = null;
    this.render();
    this.saveToStorage();
    updateNodeCount();
  }

  exportData() {
    return {
      nodes: this.nodes.map(n => ({
        id: n.id,
        x: n.x,
        y: n.y,
        text: n.text,
        isRoot: n.isRoot,
        parentId: n.parentId
      })),
      connections: this.connections.map(c => ({
        fromId: c.from.id,
        toId: c.to.id
      }))
    };
  }

  importData(data) {
    if (!data || !data.nodes) return;

    const nodeMap = new Map();
    data.nodes.forEach(n => {
      nodeMap.set(n.id, { ...n, children: [], selected: false });
    });

    this.nodes = Array.from(nodeMap.values());

    this.connections = [];
    data.connections.forEach(c => {
      const from = nodeMap.get(c.fromId);
      const to = nodeMap.get(c.toId);
      if (from && to) {
        this.connections.push({ from, to, id: `${c.fromId}-${c.toId}` });
        from.children = from.children || [];
        if (!from.children.some(child => child.id === to.id)) {
          from.children.push(to);
        }
      }
    });

    this.render();
    this.saveToStorage();
    updateNodeCount();
  }

  saveToStorage() {
    try {
      localStorage.setItem('inspirationMindMap', JSON.stringify(this.exportData()));
    } catch (e) {
      console.error('Failed to save to storage:', e);
    }
  }

  loadFromStorage() {
    try {
      const data = localStorage.getItem('inspirationMindMap');
      if (data) {
        this.importData(JSON.parse(data));
      }
    } catch (e) {
      console.error('Failed to load from storage:', e);
    }
  }

  getAllNodes() {
    return this.nodes.map(n => ({
      id: n.id,
      text: n.text,
      x: Math.round(n.x),
      y: Math.round(n.y),
      isRoot: n.isRoot,
      parentId: n.parentId,
      childrenCount: n.children ? n.children.length : 0
    }));
  }
}

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

let mindMap;
let aiService;
let chatHistory = [];

function init() {
  mindMap = new MindMap('mindMapCanvas');
  aiService = new AIService();

  setupToolbar();
  setupModal();
  setupChatPanel();
  setupTouchControls();
  registerAIToolHandlers();

  mindMap.render();

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.context-menu') && !e.target.closest('.node')) {
      mindMap.hideContextMenu();
    }
  });

  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
  });
}

function setupToolbar() {
  document.querySelectorAll('.tool-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      handleToolbarAction(action);
    });
    btn.addEventListener('touchend', (e) => {
      e.preventDefault();
      const action = btn.dataset.action;
      handleToolbarAction(action);
    });
  });

  document.querySelectorAll('.action-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.id;
      if (id === 'aiChatBtn') {
        mindMap.showChatPanel();
      } else if (id === 'clearBtn') {
        if (confirm('确定要清空所有节点吗？')) {
          mindMap.clear();
        }
      } else if (id === 'exportBtn') {
        exportData();
      }
    });
    btn.addEventListener('touchend', (e) => {
      e.preventDefault();
      const id = btn.id;
      if (id === 'aiChatBtn') {
        mindMap.showChatPanel();
      } else if (id === 'clearBtn') {
        if (confirm('确定要清空所有节点吗？')) {
          mindMap.clear();
        }
      } else if (id === 'exportBtn') {
        exportData();
      }
    });
  });

  document.querySelectorAll('.context-item').forEach(item => {
    item.addEventListener('click', () => {
      const action = item.dataset.action;
      handleContextMenuAction(action);
      mindMap.hideContextMenu();
    });
  });
}

function handleToolbarAction(action) {
  if (!mindMap.selectedNode && action !== 'addRoot') {
    showHint('请先选择一个节点');
    return;
  }

  switch (action) {
    case 'addRoot':
      const centerX = mindMap.canvas.width / 2 - mindMap.offsetX;
      const centerY = mindMap.canvas.height / 2 - mindMap.offsetY;
      mindMap.showModal('创建根节点', '输入根节点内容...', (text) => {
        const node = mindMap.createNode(centerX, centerY, text, true);
        mindMap.hideModal();
        showHint('根节点已创建');
      });
      break;

    case 'addChild':
      mindMap.showModal('添加子节点', '输入子节点内容...', (text) => {
        mindMap.addChildNode(mindMap.selectedNode, text);
        mindMap.hideModal();
        showHint('子节点已添加');
      });
      break;

    case 'edit':
      mindMap.showModal('编辑节点', '修改节点内容...', (text) => {
        mindMap.updateNode(mindMap.selectedNode, text);
        mindMap.hideModal();
        showHint('节点已更新');
      });
      break;

    case 'delete':
      if (confirm('确定要删除该节点及其子节点吗？')) {
        mindMap.deleteNode(mindMap.selectedNode);
        showHint('节点已删除');
      }
      break;
  }
}

function handleContextMenuAction(action) {
  const node = mindMap.selectedNode;
  if (!node) return;

  switch (action) {
    case 'addChild':
      mindMap.showModal('添加子节点', '输入子节点内容...', (text) => {
        mindMap.addChildNode(node, text);
        mindMap.hideModal();
      });
      break;

    case 'edit':
      mindMap.showModal('编辑节点', '修改节点内容...', (text) => {
        mindMap.updateNode(node, text);
        mindMap.hideModal();
      });
      break;

    case 'connect':
      if (mindMap.connectingNode) {
        if (mindMap.connectingNode !== node) {
          mindMap.connectNodes(mindMap.connectingNode, node);
          showHint('节点已连接');
        }
        mindMap.connectingNode = null;
        node.connecting = false;
      } else {
        mindMap.connectingNode = node;
        node.connecting = true;
        showHint('选择要连接的目标节点');
      }
      mindMap.render();
      break;

    case 'delete':
      if (confirm('确定要删除该节点及其子节点吗？')) {
        mindMap.deleteNode(node);
      }
      break;
  }
}

function setupModal() {
  const modal = document.getElementById('inputModal');
  const input = document.getElementById('nodeInput');

  document.getElementById('modalClose').addEventListener('click', () => mindMap.hideModal());
  document.getElementById('modalCancel').addEventListener('click', () => mindMap.hideModal());
  document.getElementById('modalConfirm').addEventListener('click', () => {
    if (mindMap.modalOnConfirm) {
      mindMap.modalOnConfirm(input.value);
    }
  });
  document.getElementById('modalConfirm').addEventListener('touchend', (e) => {
    e.preventDefault();
    if (mindMap.modalOnConfirm) {
      mindMap.modalOnConfirm(input.value);
    }
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (mindMap.modalOnConfirm) {
        mindMap.modalOnConfirm(input.value);
      }
    }
    if (e.key === 'Escape') {
      mindMap.hideModal();
    }
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      mindMap.hideModal();
    }
  });
}

function setupChatPanel() {
  document.getElementById('chatClose').addEventListener('click', () => mindMap.hideChatPanel());
  document.getElementById('chatSend').addEventListener('click', sendChatMessage);
  document.getElementById('chatSend').addEventListener('touchend', (e) => {
    e.preventDefault();
    sendChatMessage();
  });

  const chatInput = document.getElementById('chatInput');
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  });
}

function setupTouchControls() {
  document.getElementById('zoomInBtn').addEventListener('click', () => mindMap.zoomIn());
  document.getElementById('zoomInBtn').addEventListener('touchend', (e) => {
    e.preventDefault();
    mindMap.zoomIn();
  });

  document.getElementById('zoomOutBtn').addEventListener('click', () => mindMap.zoomOut());
  document.getElementById('zoomOutBtn').addEventListener('touchend', (e) => {
    e.preventDefault();
    mindMap.zoomOut();
  });

  document.getElementById('resetViewBtn').addEventListener('click', () => mindMap.resetView());
  document.getElementById('resetViewBtn').addEventListener('touchend', (e) => {
    e.preventDefault();
    mindMap.resetView();
  });

  document.getElementById('centerBtn').addEventListener('click', () => mindMap.centerView());
  document.getElementById('centerBtn').addEventListener('touchend', (e) => {
    e.preventDefault();
    mindMap.centerView();
  });
}

function registerAIToolHandlers() {
  aiService.registerToolHandler('create_node', async (args) => {
    const { text, x, y, parent_id } = args;

    if (parent_id) {
      const parentNode = mindMap.nodes.find(n => n.id === parent_id);
      if (parentNode) {
        mindMap.addChildNode(parentNode, text);
        return { success: true, message: `在 "${parentNode.text}" 下创建了子节点 "${text}"` };
      } else {
        return { success: false, message: `未找到父节点 ${parent_id}` };
      }
    } else {
      const nodeX = x || mindMap.canvas.width / 2 - mindMap.offsetX;
      const nodeY = y || mindMap.canvas.height / 2 - mindMap.offsetY;
      mindMap.createNode(nodeX, nodeY, text);
      return { success: true, message: `创建了节点 "${text}"` };
    }
  });

  aiService.registerToolHandler('connect_nodes', async (args) => {
    const { from_id, to_id } = args;
    const fromNode = mindMap.nodes.find(n => n.id === from_id);
    const toNode = mindMap.nodes.find(n => n.id === to_id);

    if (fromNode && toNode) {
      const success = mindMap.connectNodes(fromNode, toNode);
      if (success) {
        return { success: true, message: `已连接 "${fromNode.text}" 到 "${toNode.text}"` };
      } else {
        return { success: false, message: '这两个节点已经连接' };
      }
    } else {
      return { success: false, message: '未找到指定的节点' };
    }
  });

  aiService.registerToolHandler('update_node', async (args) => {
    const { id, text } = args;
    const node = mindMap.nodes.find(n => n.id === id);

    if (node) {
      mindMap.updateNode(node, text);
      return { success: true, message: `已将 "${node.text}" 更新为 "${text}"` };
    } else {
      return { success: false, message: `未找到节点 ${id}` };
    }
  });

  aiService.registerToolHandler('delete_node', async (args) => {
    const { id } = args;
    const node = mindMap.nodes.find(n => n.id === id);

    if (node) {
      mindMap.deleteNode(node);
      return { success: true, message: `已删除节点 "${node.text}"` };
    } else {
      return { success: false, message: `未找到节点 ${id}` };
    }
  });

  aiService.registerToolHandler('get_nodes', async () => {
    const nodes = mindMap.getAllNodes();
    return {
      success: true,
      nodes: nodes,
      count: nodes.length,
      message: `当前思维导图包含 ${nodes.length} 个节点`
    };
  });
}

async function sendChatMessage() {
  const input = document.getElementById('chatInput');
  const message = input.value.trim();
  if (!message) return;

  addChatMessage(message, 'user');
  input.value = '';

  const typingMessage = addChatMessage('AI 正在思考...', 'ai', true);

  try {
    const result = await aiService.chatWithAI(message, mindMap.getAllNodes());

    typingMessage.remove();

    if (result.error) {
      addChatMessage(`错误: ${result.error}`, 'ai');
    } else if (result.message) {
      addChatMessage(result.message, 'ai');
    }

    mindMap.render();
  } catch (error) {
    typingMessage.remove();
    addChatMessage(`错误: ${error.message}`, 'ai');
  }
}

function addChatMessage(content, type, isTyping = false) {
  const container = document.getElementById('chatMessages');
  const message = document.createElement('div');
  message.className = `chat-message ${type}`;
  if (isTyping) {
    message.id = 'typingMessage';
  }
  message.textContent = content;
  container.appendChild(message);
  container.scrollTop = container.scrollHeight;
  return message;
}

function showHint(text) {
  let hint = document.querySelector('.hint');
  if (!hint) {
    hint = document.createElement('div');
    hint.className = 'hint';
    document.querySelector('.canvas-container').appendChild(hint);
  }
  hint.textContent = text;
  hint.classList.add('show');
  setTimeout(() => hint.classList.remove('show'), 2000);
}

function updateNodeCount() {
  document.getElementById('nodeCount').textContent = `节点: ${mindMap.nodes.length}`;
}

function updateZoomLevel() {
  document.getElementById('zoomLevel').textContent = `缩放: ${Math.round(mindMap.scale * 100)}%`;
}

function exportData() {
  const data = mindMap.exportData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `mindmap-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showHint('已导出思维导图');
}

document.addEventListener('DOMContentLoaded', init);
