// 全局变量
let timerInterval = null;
let remainingTime = 0;
let totalTime = 0;
let isPaused = false;
let currentSession = 1;
let totalSessions = 4;
let isFocusing = false;

// DOM 元素
const focusSessionView = document.querySelector('.focus-session-view');
const focusingView = document.querySelector('.focusing-view');
const startFocusButton = document.getElementById('start-focus-button');
const pauseTimerButton = document.getElementById('pause-timer-button');
const focusDurationInput = document.getElementById('focus-duration');
const timerMinutesDisplay = document.getElementById('timer-minutes');
const timerFill = document.querySelector('.focusing-view .timer-fill');
const currentSessionDisplay = document.getElementById('current-session');
const totalSessionsDisplay = document.getElementById('total-sessions');

// 初始化函数
function init() {
    // 初始化计时器刻度
    initTimerMarkers();
    
    // 绑定事件监听
    bindEventListeners();
    
    // 设置默认进度环
    updateProgressRing();
}

// 初始化计时器刻度
function initTimerMarkers() {
    const markersContainer = document.querySelector('.timer-markers');
    const radius = 90;
    const centerX = 100;
    const centerY = 100;
    
    for (let i = 0; i < 12; i++) {
        const angle = (i * 30) * (Math.PI / 180); // 每30度一个刻度
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        
        const marker = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        marker.setAttribute('cx', x);
        marker.setAttribute('cy', y);
        marker.setAttribute('r', '2');
        marker.setAttribute('fill', '#ffffff');
        
        markersContainer.appendChild(marker);
    }
}

// 绑定事件监听器
function bindEventListeners() {
    // 导航项切换
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            // 移除所有活动状态
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            // 添加当前活动状态
            item.classList.add('active');
            
            // 这里可以添加不同视图的切换逻辑
        });
    });
    
    // 启动专注时段
    startFocusButton.addEventListener('click', startFocusSession);
    
    // 暂停/继续计时器
    pauseTimerButton.addEventListener('click', togglePauseTimer);
    
    // 专注时长变化时更新休息次数信息
    focusDurationInput.addEventListener('change', updateRestInfo);
    focusDurationInput.addEventListener('input', updateRestInfo);
}

// 更新休息次数信息
function updateRestInfo() {
    const duration = parseInt(focusDurationInput.value);
    let restCount = 0;
    
    // 根据时长计算休息次数
    if (duration >= 60 && duration < 90) {
        restCount = 1;
    } else if (duration >= 90 && duration < 150) {
        restCount = 2;
    } else if (duration >= 150) {
        restCount = 3;
    }
    
    document.querySelector('.rest-info').textContent = `你将有 ${restCount} 次休息时间。`;
}

// 启动专注会话
function startFocusSession() {
    // 获取设置的时长
    const duration = parseInt(focusDurationInput.value) * 60; // 转换为秒
    const skipRest = document.getElementById('skip-rest').checked;
    
    // 计算总会话数
    totalSessions = skipRest ? 1 : 4;
    currentSession = 1;
    
    // 更新视图
    focusSessionView.classList.add('hidden');
    focusingView.classList.remove('hidden');
    
    // 设置会话显示
    currentSessionDisplay.textContent = currentSession;
    totalSessionsDisplay.textContent = totalSessions;
    
    // 开始计时
    startTimer(duration);
}

// 开始计时器
function startTimer(duration) {
    isFocusing = true;
    remainingTime = duration;
    totalTime = duration;
    isPaused = false;
    
    // 更新显示
    updateTimerDisplay();
    updateTimerRing();
    
    // 清除可能存在的计时器
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    
    // 设置新的计时器
    timerInterval = setInterval(() => {
        if (!isPaused) {
            remainingTime--;
            
            if (remainingTime <= 0) {
                clearInterval(timerInterval);
                handleTimerComplete();
            } else {
                updateTimerDisplay();
                updateTimerRing();
            }
        }
    }, 1000);
}

// 暂停/继续计时器
function togglePauseTimer() {
    isPaused = !isPaused;
    
    // 更新按钮图标
    pauseTimerButton.textContent = isPaused ? '▶️' : '⏸️';
}

// 更新计时器显示
function updateTimerDisplay() {
    const minutes = Math.floor(remainingTime / 60);
    timerMinutesDisplay.textContent = minutes;
}

// 更新计时器环
function updateTimerRing() {
    const circumference = 2 * Math.PI * 90;
    const dashoffset = circumference * (1 - remainingTime / totalTime);
    
    timerFill.style.strokeDasharray = circumference;
    timerFill.style.strokeDashoffset = dashoffset;
}

// 更新进度环
function updateProgressRing() {
    const progressCircle = document.querySelector('.focus-session-view .progress-fill');
    const circumference = 2 * Math.PI * 50;
    const completedPercent = 0.5; // 模拟50%完成
    
    progressCircle.style.strokeDasharray = circumference;
    progressCircle.style.strokeDashoffset = circumference * (1 - completedPercent);
}

// 处理计时器完成
function handleTimerComplete() {
    if (currentSession < totalSessions) {
        // 如果不是最后一个会话，进入休息时间
        enterRestPeriod();
    } else {
        // 所有会话完成
        completeAllSessions();
    }
}

// 进入休息时间
function enterRestPeriod() {
    // 这里可以添加休息时间的逻辑
    // 简单示例：显示休息时间提示并自动进入下一个专注会话
    alert('休息时间！5分钟后自动开始下一个专注时段。');
    
    // 模拟5分钟休息后开始下一个会话
    setTimeout(() => {
        currentSession++;
        currentSessionDisplay.textContent = currentSession;
        startTimer(totalTime); // 使用相同的时长
    }, 5 * 60 * 1000);
}

// 完成所有会话
function completeAllSessions() {
    alert('恭喜！所有专注时段已完成。');
    
    // 重置并返回初始视图
    resetAndReturnToStart();
}

// 重置并返回初始视图
function resetAndReturnToStart() {
    clearInterval(timerInterval);
    isFocusing = false;
    
    // 切换回初始视图
    focusingView.classList.add('hidden');
    focusSessionView.classList.remove('hidden');
}

// 页面加载完成后初始化
window.addEventListener('DOMContentLoaded', init);