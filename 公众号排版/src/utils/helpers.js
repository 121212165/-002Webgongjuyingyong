export function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash.toString();
}

export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

export function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

export function formatDate(date) {
    return new Date(date).toLocaleString('zh-CN');
}

export function copyToClipboard(text) {
    return navigator.clipboard.writeText(text).then(() => true).catch(() => {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        const result = document.execCommand('copy');
        document.body.removeChild(textarea);
        return result;
    });
}

export function downloadFile(content, filename, type = 'text/plain') {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

export function getSelectionText() {
    const selection = window.getSelection();
    return selection ? selection.toString() : '';
}

export function insertTextAtCursor(textarea, text) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = textarea.value.substring(0, start);
    const after = textarea.value.substring(end);
    textarea.value = before + text + after;
    textarea.selectionStart = textarea.selectionEnd = start + text.length;
    textarea.focus();
}

export function wrapText(textarea, prefix, suffix = '') {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    const newText = prefix + selectedText + suffix;
    textarea.value = textarea.value.substring(0, start) + newText + textarea.value.substring(end);
    const newCursorPos = start + prefix.length;
    textarea.selectionStart = textarea.selectionEnd = newCursorPos + (end - start);
    textarea.focus();
}

export function countWords(text) {
    return text.replace(/\s/g, '').length;
}

export function countParagraphs(text) {
    return text.split('\n').filter(line => line.trim().length > 0).length;
}

export function countHeadings(text) {
    return (text.match(/^#{1,6}\s+/gm) || []).length;
}

export function countImages(text) {
    return (text.match(/!\[.*?\]\(.*?\)/g) || []).length;
}

export function estimateReadTime(text, wordsPerMinute = 500) {
    const wordCount = countWords(text);
    return Math.ceil(wordCount / wordsPerMinute);
}

export function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}
