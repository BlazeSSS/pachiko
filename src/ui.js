/**
 * ui.js - UI 管理模块
 * 处理 DOM 操作：蓄力条、分数板、游戏结束弹窗等
 */

// UI 元素引用
const uiElements = {
    scoreValue: null,
    ballsValue: null,
    powerBarFill: null,
    gameOver: null,
    finalScore: null,
    restartBtn: null
};

/**
 * 初始化 UI 元素引用
 */
function initUI() {
    uiElements.scoreValue = document.getElementById('score-value');
    uiElements.ballsValue = document.getElementById('balls-value');
    uiElements.powerBarFill = document.getElementById('power-bar-fill');
    uiElements.gameOver = document.getElementById('game-over');
    uiElements.finalScore = document.getElementById('final-score');
    uiElements.restartBtn = document.getElementById('restart-btn');
    
    console.log('UI 初始化完成');
}

/**
 * 更新分数显示
 * @param {number} score - 当前分数
 */
function updateScore(score) {
    if (uiElements.scoreValue) {
        uiElements.scoreValue.textContent = score;
    }
}

/**
 * 更新剩余球数显示
 * @param {number} balls - 剩余球数
 */
function updateBalls(balls) {
    if (uiElements.ballsValue) {
        uiElements.ballsValue.textContent = balls;
    }
}

/**
 * 更新蓄力条
 * @param {number} powerPercent - 力度百分比 (0-100)
 */
function updatePowerBar(powerPercent) {
    if (uiElements.powerBarFill) {
        uiElements.powerBarFill.style.width = `${Math.min(100, Math.max(0, powerPercent))}%`;
    }
}

/**
 * 显示游戏结束界面
 * @param {number} finalScore - 最终得分
 */
function showGameOver(finalScore) {
    if (uiElements.gameOver) {
        uiElements.finalScore.textContent = finalScore;
        uiElements.gameOver.style.display = 'block';
    }
}

/**
 * 隐藏游戏结束界面
 */
function hideGameOver() {
    if (uiElements.gameOver) {
        uiElements.gameOver.style.display = 'none';
    }
}

/**
 * 设置重新开始按钮回调
 * @param {function} callback - 回调函数
 */
function setRestartCallback(callback) {
    if (uiElements.restartBtn) {
        uiElements.restartBtn.addEventListener('click', callback);
    }
}

/**
 * 重置 UI 到初始状态
 */
function resetUI() {
    updateScore(0);
    updateBalls(20);
    updatePowerBar(0);
    hideGameOver();
}

// 导出模块
window.UIModule = {
    initUI,
    updateScore,
    updateBalls,
    updatePowerBar,
    showGameOver,
    hideGameOver,
    setRestartCallback,
    resetUI,
    uiElements
};
