const themes = {
    simple: {
        name: '简约主题',
        primaryColor: '#007aff',
        primaryHover: '#0056b3',
        bgColor: '#f5f5f5',
        textColor: '#333'
    },
    elegant: {
        name: '优雅主题',
        primaryColor: '#8e44ad',
        primaryHover: '#732d91',
        bgColor: '#fafafa',
        textColor: '#2c3e50'
    },
    modern: {
        name: '现代主题',
        primaryColor: '#10b981',
        primaryHover: '#059669',
        bgColor: '#0f172a',
        textColor: '#e2e8f0'
    },
    dark: {
        name: '暗色主题',
        primaryColor: '#6366f1',
        primaryHover: '#4f46e5',
        bgColor: '#18181b',
        textColor: '#e4e4e7'
    },
    minimal: {
        name: '极简主题',
        primaryColor: '#000',
        primaryHover: '#333',
        bgColor: '#fff',
        textColor: '#000'
    }
};

let currentTheme = 'simple';

export function getThemes() {
    return themes;
}

export function getCurrentTheme() {
    return currentTheme;
}

export function setTheme(themeName) {
    if (!themes[themeName]) {
        console.warn(`Theme "${themeName}" not found, using default theme.`);
        themeName = 'simple';
    }
    
    currentTheme = themeName;
    document.body.className = `theme-${themeName}`;
    
    localStorage.setItem('theme', themeName);
    
    updateThemeButtons();
    
    return themeName;
}

export function updateThemeButtons() {
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.theme === currentTheme) {
            btn.classList.add('active');
        }
    });
}

export function loadSavedTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme && themes[savedTheme]) {
        setTheme(savedTheme);
    } else {
        setTheme('simple');
    }
}

export function resetTheme() {
    setTheme('simple');
}

export function exportThemeConfig() {
    const theme = themes[currentTheme];
    return JSON.stringify(theme, null, 2);
}

export function importThemeConfig(config) {
    try {
        const themeConfig = JSON.parse(config);
        if (themeConfig.name && themeConfig.primaryColor) {
            themes[currentTheme] = { ...themes[currentTheme], ...themeConfig };
            setTheme(currentTheme);
            return true;
        }
        return false;
    } catch (error) {
        console.error('Failed to import theme config:', error);
        return false;
    }
}
