// 功能测试脚本
// 此脚本用于模拟用户操作，验证应用的核心功能

// 测试结果记录
const testResults = [];

// 测试状态
let isTestRunning = false;

// 测试用例执行函数
async function runTest(testCase) {
    console.log(`正在执行测试：${testCase.name}`);
    
    try {
        await testCase.execute();
        testResults.push({
            name: testCase.name,
            result: 'PASS',
            message: '测试通过'
        });
        console.log(`测试通过：${testCase.name}`);
    } catch (error) {
        testResults.push({
            name: testCase.name,
            result: 'FAIL',
            message: error.message
        });
        console.log(`测试失败：${testCase.name} - ${error.message}`);
    }
}

// 应用初始化测试
const appInitTest = {
    name: '应用初始化测试',
    execute: async function() {
        // 检查应用是否成功加载
        const importPage = document.getElementById('importPage');
        if (!importPage) {
            throw new Error('导入页面未找到');
        }
        
        if (importPage.style.display === 'none') {
            throw new Error('导入页面未显示');
        }
        
        // 检查导入选项是否存在
        const fileInput = document.getElementById('fileInput');
        const dragArea = document.getElementById('dragArea');
        
        if (!fileInput) {
            throw new Error('文件输入元素未找到');
        }
        
        if (!dragArea) {
            throw new Error('拖拽区域未找到');
        }
    }
};

// 阅读器对象测试
const readerObjectTest = {
    name: '阅读器对象测试',
    execute: async function() {
        // 检查阅读器对象是否存在
        if (typeof Reader === 'undefined') {
            throw new Error('Reader类未定义');
        }
        
        // 检查ReaderApp类是否存在
        if (typeof ReaderApp === 'undefined') {
            throw new Error('ReaderApp类未定义');
        }
    }
};

// 文件解析器测试
const fileParserTest = {
    name: '文件解析器测试',
    execute: async function() {
        // 检查文件解析器是否存在
        if (typeof FileParserFactory === 'undefined') {
            throw new Error('FileParserFactory类未定义');
        }
        
        if (typeof EpubParser === 'undefined') {
            throw new Error('EpubParser类未定义');
        }
        
        if (typeof TextParser === 'undefined') {
            throw new Error('TextParser类未定义');
        }
        
        if (typeof PDFParser === 'undefined') {
            throw new Error('PDFParser类未定义');
        }
    }
};

// DOM元素存在性测试
const domElementsTest = {
    name: 'DOM元素存在性测试',
    execute: async function() {
        const requiredElements = [
            'fileInput',
            'dragArea',
            'recentBooks',
            'bookList',
            'readerPage',
            'backBtn',
            'bookTitle',
            'menuBtn',
            'bookmarkBtn',
            'readerContent',
            'prevBtn',
            'nextBtn',
            'progressText',
            'settingsBtn',
            'sidebar',
            'settingsPanel',
            'overlay'
        ];
        
        for (const elementId of requiredElements) {
            const element = document.getElementById(elementId);
            if (!element) {
                throw new Error(`元素 ${elementId} 未找到`);
            }
        }
    }
};

// 样式存在性测试
const stylesTest = {
    name: '样式存在性测试',
    execute: async function() {
        // 检查是否存在CSS样式表
        const styleSheets = document.styleSheets;
        if (styleSheets.length === 0) {
            throw new Error('未找到CSS样式表');
        }
        
        // 检查关键样式是否存在
        const computedStyle = window.getComputedStyle(document.body);
        if (!computedStyle) {
            throw new Error('无法获取计算样式');
        }
    }
};

// 完整测试套件
const testSuite = [
    appInitTest,
    readerObjectTest,
    fileParserTest,
    domElementsTest,
    stylesTest
];

// 运行所有测试
async function runAllTests() {
    if (isTestRunning) {
        console.log('测试正在运行中...');
        return;
    }
    
    isTestRunning = true;
    console.log('开始执行功能测试...');
    
    // 重置测试结果
    testResults.length = 0;
    
    // 执行所有测试用例
    for (const testCase of testSuite) {
        await runTest(testCase);
    }
    
    // 输出测试结果
    console.log('\n=== 功能测试结果 ===');
    console.table(testResults);
    
    // 统计测试结果
    const passedTests = testResults.filter(result => result.result === 'PASS').length;
    const failedTests = testResults.filter(result => result.result === 'FAIL').length;
    
    console.log(`\n测试总数：${testResults.length}`);
    console.log(`通过测试：${passedTests}`);
    console.log(`失败测试：${failedTests}`);
    console.log(`测试通过率：${((passedTests / testResults.length) * 100).toFixed(2)}%`);
    
    isTestRunning = false;
    
    // 返回测试结果
    return testResults;
}

// 页面加载完成后执行测试
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('页面加载完成，准备执行功能测试...');
    });
} else {
    console.log('页面已加载，准备执行功能测试...');
}

// 导出测试函数
window.runAllTests = runAllTests;
window.testResults = testResults;
