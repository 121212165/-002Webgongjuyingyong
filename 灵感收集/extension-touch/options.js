class SettingsManager {
  constructor() {
    this.config = {
      apiKey: '',
      apiEndpoint: '',
      model: 'glm-4.7',
      longPressMenu: true,
      pinchZoom: true,
      hapticFeedback: false
    };
    this.loadSettings();
    this.initElements();
    this.bindEvents();
  }

  loadSettings() {
    try {
      const stored = localStorage.getItem('aiConfig');
      if (stored) {
        const config = JSON.parse(stored);
        this.config = { ...this.config, ...config };
      }

      const touchSettings = localStorage.getItem('touchSettings');
      if (touchSettings) {
        const settings = JSON.parse(touchSettings);
        this.config = { ...this.config, ...settings };
      }
    } catch (e) {
      console.error('Failed to load settings:', e);
    }
  }

  saveSettings() {
    try {
      localStorage.setItem('aiConfig', JSON.stringify({
        apiKey: this.config.apiKey,
        apiEndpoint: this.config.apiEndpoint,
        model: this.config.model
      }));

      localStorage.setItem('touchSettings', JSON.stringify({
        longPressMenu: this.config.longPressMenu,
        pinchZoom: this.config.pinchZoom,
        hapticFeedback: this.config.hapticFeedback
      }));
    } catch (e) {
      console.error('Failed to save settings:', e);
    }
  }

  initElements() {
    document.getElementById('apiKey').value = this.config.apiKey;
    document.getElementById('apiEndpoint').value = this.config.apiEndpoint;
    document.getElementById('model').value = this.config.model;
    document.getElementById('longPressMenu').checked = this.config.longPressMenu;
    document.getElementById('pinchZoom').checked = this.config.pinchZoom;
    document.getElementById('hapticFeedback').checked = this.config.hapticFeedback;
  }

  bindEvents() {
    document.getElementById('saveConfig').addEventListener('click', () => this.saveConfig());
    document.getElementById('testConnection').addEventListener('click', () => this.testConnection());

    document.getElementById('apiKey').addEventListener('input', (e) => {
      this.config.apiKey = e.target.value;
    });

    document.getElementById('apiEndpoint').addEventListener('input', (e) => {
      this.config.apiEndpoint = e.target.value;
    });

    document.getElementById('model').addEventListener('input', (e) => {
      this.config.model = e.target.value;
    });

    document.getElementById('longPressMenu').addEventListener('change', (e) => {
      this.config.longPressMenu = e.target.checked;
      this.saveSettings();
    });

    document.getElementById('pinchZoom').addEventListener('change', (e) => {
      this.config.pinchZoom = e.target.checked;
      this.saveSettings();
    });

    document.getElementById('hapticFeedback').addEventListener('change', (e) => {
      this.config.hapticFeedback = e.target.checked;
      this.saveSettings();
    });

    document.getElementById('exportData').addEventListener('click', () => this.exportData());
    document.getElementById('importData').addEventListener('click', () => {
      document.getElementById('importFile').click();
    });
    document.getElementById('importFile').addEventListener('change', (e) => this.importData(e));
    document.getElementById('clearData').addEventListener('click', () => this.clearData());
  }

  saveConfig() {
    this.config.apiKey = document.getElementById('apiKey').value;
    this.config.apiEndpoint = document.getElementById('apiEndpoint').value;
    this.config.model = document.getElementById('model').value;
    this.saveSettings();
    this.showToast('配置已保存');
  }

  async testConnection() {
    const apiKey = document.getElementById('apiKey').value;
    const apiEndpoint = document.getElementById('apiEndpoint').value;
    const model = document.getElementById('model').value;

    if (!apiKey || !apiEndpoint || !model) {
      this.showToast('请填写完整的 API 配置', 'error');
      return;
    }

    const testBtn = document.getElementById('testConnection');
    testBtn.textContent = '测试中...';
    testBtn.disabled = true;

    try {
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: 'user', content: 'Hello' }],
          max_tokens: 5
        })
      });

      if (response.ok) {
        this.showToast('连接成功 ✓');
      } else {
        const errorText = await response.text();
        this.showToast(`连接失败: ${response.status}`, 'error');
      }
    } catch (error) {
      this.showToast(`连接失败: ${error.message}`, 'error');
    } finally {
      testBtn.textContent = '测试连接';
      testBtn.disabled = false;
    }
  }

  exportData() {
    const mindMapData = localStorage.getItem('inspirationMindMap');
    const aiConfig = localStorage.getItem('aiConfig');
    const touchSettings = localStorage.getItem('touchSettings');

    const exportData = {
      version: '1.0.0',
      exportDate: new Date().toISOString(),
      data: {
        mindMap: mindMapData ? JSON.parse(mindMapData) : null,
        aiConfig: aiConfig ? JSON.parse(aiConfig) : null,
        touchSettings: touchSettings ? JSON.parse(touchSettings) : null
      }
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inspiration-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    this.showToast('数据已导出');
  }

  importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importData = JSON.parse(e.target.result);

        if (importData.data.mindMap) {
          localStorage.setItem('inspirationMindMap', JSON.stringify(importData.data.mindMap));
        }
        if (importData.data.aiConfig) {
          localStorage.setItem('aiConfig', JSON.stringify(importData.data.aiConfig));
        }
        if (importData.data.touchSettings) {
          localStorage.setItem('touchSettings', JSON.stringify(importData.data.touchSettings));
        }

        this.showToast('数据已导入');
        this.loadSettings();
        this.initElements();
      } catch (error) {
        this.showToast('导入失败: 无效的文件格式', 'error');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  }

  clearData() {
    if (confirm('确定要清空所有数据吗？此操作不可恢复。')) {
      localStorage.removeItem('inspirationMindMap');
      localStorage.removeItem('aiConfig');
      localStorage.removeItem('touchSettings');
      this.config = {
        apiKey: '',
        apiEndpoint: '',
        model: 'glm-4.7',
        longPressMenu: true,
        pinchZoom: true,
        hapticFeedback: false
      };
      this.initElements();
      this.showToast('数据已清空');
    }
  }

  showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new SettingsManager();
});
