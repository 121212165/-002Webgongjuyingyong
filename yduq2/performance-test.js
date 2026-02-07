// 性能测试脚本
// 此脚本用于评估本地阅读应用的性能表现

// 性能测试结果记录
const performanceResults = [];

// 测试配置
const testConfig = {
    iterations: 5, // 每个测试用例执行的次数
    warmupIterations: 2 // 预热执行的次数
};

// 性能测试用例
const performanceTests = [
    {
        name: '页面加载速度测试',
        execute: async function() {
            // 测量页面加载时间
            const startTime = performance.now();
            
            // 强制刷新页面以测量加载时间
            window.location.reload(true);
            
            // 等待页面加载完成
            await new Promise((resolve) => {
                window.addEventListener('load', resolve);
            });
            
            const endTime = performance.now();
            const loadTime = endTime - startTime;
            
            return loadTime;
        }
    },
    {
        name: '文件解析速度测试',
        execute: async function() {
            // 创建一个测试文件
            const testContent = '# 测试书籍\n\n## 第一章 测试内容\n这是第一章的测试内容，用于验证本地阅读应用的功能。\n\n## 第二章 章节切换\n这是第二章的测试内容，用于验证章节切换功能。\n\n## 第三章 书签功能\n这是第三章的测试内容，用于验证书签功能。\n\n## 第四章 设置功能\n这是第四章的测试内容，用于验证设置功能。\n\n## 第五章 进度保存\n这是第五章的测试内容，用于验证进度保存功能。';
            
            const blob = new Blob([testContent], { type: 'text/plain' });
            const file = new File([blob], 'test-file.txt', { type: 'text/plain' });
            
            // 测量文件解析时间
            const startTime = performance.now();
            
            // 使用FileParserFactory解析文件
            const parser = FileParserFactory.getParser(file);
            await parser.parse(file);
            
            const endTime = performance.now();
            const parseTime = endTime - startTime;
            
            return parseTime;
        }
    },
    {
        name: '内存占用测试',
        execute: async function() {
            // 测量内存占用情况
            if (performance.memory) {
                const memoryUsage = performance.memory.usedJSHeapSize / 1024 / 1024; // 转换为MB
                return memoryUsage;
            } else {
                throw new Error('内存测量API不可用');
            }
        }
    },
    {
        name: 'DOM操作响应时间测试',
        execute: async function() {
            // 测量DOM操作的响应时间
            const startTime = performance.now();
            
            // 执行一系列DOM操作
            for (let i = 0; i < 100; i++) {
                const div = document.createElement('div');
                div.textContent = `测试元素 ${i}`;
                document.body.appendChild(div);
                document.body.removeChild(div);
            }
            
            const endTime = performance.now();
            const domTime = endTime - startTime;
            
            return domTime;
        }
    }
];

// 运行单个性能测试用例
async function runPerformanceTest(testCase) {
    console.log(`正在执行性能测试：${testCase.name}`);
    
    // 预热执行
    for (let i = 0; i < testConfig.warmupIterations; i++) {
        await testCase.execute();
    }
    
    // 记录执行时间
    const executionTimes = [];
    
    for (let i = 0; i < testConfig.iterations; i++) {
        const executionTime = await testCase.execute();
        executionTimes.push(executionTime);
    }
    
    // 计算统计数据
    const minTime = Math.min(...executionTimes);
    const maxTime = Math.max(...executionTimes);
    const avgTime = executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length;
    
    // 计算中位数
    const sortedTimes = executionTimes.sort((a, b) => a - b);
    const medianTime = sortedTimes[Math.floor(sortedTimes.length / 2)];
    
    // 记录测试结果
    performanceResults.push({
        name: testCase.name,
        iterations: testConfig.iterations,
        min: minTime,
        max: maxTime,
        avg: avgTime,
        median: medianTime,
        rawData: executionTimes
    });
    
    console.log(`测试完成：${testCase.name} - 平均时间：${avgTime.toFixed(2)}ms`);
}

// 运行所有性能测试
async function runAllPerformanceTests() {
    console.log('开始执行性能测试...');
    
    // 重置测试结果
    performanceResults.length = 0;
    
    // 执行所有性能测试用例
    for (const testCase of performanceTests) {
        await runPerformanceTest(testCase);
    }
    
    // 输出测试结果
    console.log('\n=== 性能测试结果 ===');
    performanceResults.forEach(result => {
        console.log(`${result.name}：`);
        console.log(`  迭代次数：${result.iterations}`);
        console.log(`  最小时间：${result.min.toFixed(2)}ms`);
        console.log(`  最大时间：${result.max.toFixed(2)}ms`);
        console.log(`  平均时间：${result.avg.toFixed(2)}ms`);
        console.log(`  中位数时间：${result.median.toFixed(2)}ms`);
    });
    
    return performanceResults;
}

// 导出性能测试函数
window.runAllPerformanceTests = runAllPerformanceTests;
window.performanceResults = performanceResults;
