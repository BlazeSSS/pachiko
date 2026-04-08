/**
 * game.js - 游戏逻辑管理
 * 处理游戏状态：得分、球数、发射逻辑、游戏流程
 */

// 游戏状态
const gameState = {
    score: 0,              // 当前得分
    ballsRemaining: 20,    // 剩余球数
    ballsInPlay: 0,        // 场上球数
    isCharging: false,     // 是否正在蓄力
    currentPower: 0,       // 当前蓄力值 (0-100)
    powerDirection: 1,     // 蓄力方向 (1=增加，-1=减少)
    isGameOver: false,     // 游戏是否结束
    scoredBalls: []        // 已得分待复位的球索引
};

// 游戏配置
const GAME_CONFIG = {
    totalBalls: 20,        // 每局总球数
    maxBallsInPlay: 10,    // 场上最大球数
    powerChargeSpeed: 2,   // 蓄力速度 (%/帧)
    ballResetDelay: 1000   // 进球后重置延迟 (ms)
};

/**
 * 初始化游戏状态
 */
function initGame() {
    gameState.score = 0;
    gameState.ballsRemaining = GAME_CONFIG.totalBalls;
    gameState.ballsInPlay = 0;
    gameState.isCharging = false;
    gameState.currentPower = 0;
    gameState.powerDirection = 1;
    gameState.isGameOver = false;
    gameState.scoredBalls = [];
    
    console.log('游戏初始化完成');
}

/**
 * 开始蓄力
 */
function startCharging() {
    if (gameState.isGameOver) return;
    if (gameState.ballsRemaining <= 0) return;
    if (gameState.ballsInPlay >= GAME_CONFIG.maxBallsInPlay) return;
    
    gameState.isCharging = true;
    gameState.currentPower = 0;
    gameState.powerDirection = 1;
    
    console.log('开始蓄力');
}

/**
 * 停止蓄力并发射
 * @returns {number} 发射力度百分比
 */
function stopCharging() {
    if (!gameState.isCharging) return 0;
    
    gameState.isCharging = false;
    const power = gameState.currentPower;
    
    console.log(`蓄力完成：${power.toFixed(1)}%`);
    
    return power;
}

/**
 * 更新蓄力状态
 */
function updateCharging() {
    if (!gameState.isCharging) return;
    
    // 更新蓄力值 (来回摆动)
    gameState.currentPower += GAME_CONFIG.powerChargeSpeed * gameState.powerDirection;
    
    if (gameState.currentPower >= 100) {
        gameState.currentPower = 100;
        gameState.powerDirection = -1;
    } else if (gameState.currentPower <= 0) {
        gameState.currentPower = 0;
        gameState.powerDirection = 1;
    }
    
    // 更新 UI
    UIModule.updatePowerBar(gameState.currentPower);
}

/**
 * 发射钢珠
 * @param {number} power - 发射力度
 */
function launchBall(power) {
    if (gameState.ballsRemaining <= 0) return false;
    if (gameState.ballsInPlay >= GAME_CONFIG.maxBallsInPlay) return false;
    
    // 创建新球
    const ballData = PhysicsModule.createBall(
        PhysicsModule.PHYSICS_CONFIG.launchPosition.x,
        PhysicsModule.PHYSICS_CONFIG.launchPosition.y,
        PhysicsModule.PHYSICS_CONFIG.launchPosition.z
    );
    
    // 存储球信息
    const ballInfo = {
        bodyHandle: ballData.bodyHandle,
        colliderHandle: ballData.colliderHandle,
        hasScored: false,
        isWaitingReset: false
    };
    
    PhysicsModule.physicsObjects.balls.push(ballInfo);
    
    // 更新状态
    gameState.ballsRemaining--;
    gameState.ballsInPlay++;
    
    // 发射
    PhysicsModule.launchBall(ballData.bodyHandle, power);
    
    console.log(`发射第 ${GAME_CONFIG.totalBalls - gameState.ballsRemaining} 球，剩余：${gameState.ballsRemaining}`);
    
    return true;
}

/**
 * 处理进球得分
 * @param {number} slotIndex - 槽位索引
 * @param {number} score - 得分
 * @param {number} ballIndex - 球在数组中的索引
 */
function onBallScored(slotIndex, score, ballIndex) {
    const ball = PhysicsModule.physicsObjects.balls[ballIndex];
    if (!ball || ball.hasScored) return;
    
    // 标记已得分
    ball.hasScored = true;
    
    // 加分
    gameState.score += score;
    UIModule.updateScore(gameState.score);
    
    console.log(`进球！槽位 ${slotIndex}, 得分 +${score}, 总分 ${gameState.score}`);
    
    // 播放简化音效 (console.log 占位)
    playSoundEffect(score);
    
    // 标记待重置
    ball.isWaitingReset = true;
    gameState.scoredBalls.push(ballIndex);
    
    // 延迟后重置球
    setTimeout(() => {
        resetBall(ballIndex);
    }, GAME_CONFIG.ballResetDelay);
}

/**
 * 重置单个球
 * @param {number} ballIndex - 球索引
 */
function resetBall(ballIndex) {
    const ball = PhysicsModule.physicsObjects.balls[ballIndex];
    if (!ball) return;
    
    // 从物理世界移除
    PhysicsModule.removeBall(ball.bodyHandle);
    
    // 从数组移除
    PhysicsModule.physicsObjects.balls.splice(ballIndex, 1);
    
    // 更新状态
    gameState.ballsInPlay--;
    
    // 从待重置列表移除
    const scoredIndex = gameState.scoredBalls.indexOf(ballIndex);
    if (scoredIndex !== -1) {
        gameState.scoredBalls.splice(scoredIndex, 1);
    }
    
    console.log(`球已重置，场上剩余：${gameState.ballsInPlay}`);
    
    // 检查游戏结束
    checkGameOver();
}

/**
 * 检查游戏是否结束
 */
function checkGameOver() {
    if (gameState.isGameOver) return;
    
    // 所有球用完且场上无球
    if (gameState.ballsRemaining === 0 && gameState.ballsInPlay === 0) {
        endGame();
    }
}

/**
 * 结束游戏
 */
function endGame() {
    gameState.isGameOver = true;
    
    console.log(`游戏结束！最终得分：${gameState.score}`);
    
    // 显示结束界面
    UIModule.showGameOver(gameState.score);
}

/**
 * 播放音效 (简化版)
 * @param {number} score - 得分值
 */
function playSoundEffect(score) {
    // 简单蜂鸣占位 (实际可接入 Web Audio API)
    const pitch = 400 + (score / 200) * 400;  // 根据分数调整音调
    console.log(`[音效] 频率：${pitch.toFixed(0)}Hz`);
    
    // 可选：使用 Web Audio API 播放简单蜂鸣
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = pitch;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
    } catch (e) {
        // 忽略音频错误
    }
}

/**
 * 获取当前游戏状态
 */
function getGameState() {
    return { ...gameState };
}

/**
 * 重新开始游戏
 */
function restartGame() {
    // 清除所有场上的球
    PhysicsModule.physicsObjects.balls.forEach(ball => {
        PhysicsModule.removeBall(ball.bodyHandle);
    });
    PhysicsModule.physicsObjects.balls = [];
    
    // 重置游戏状态
    initGame();
    
    // 重置 UI
    UIModule.resetUI();
    
    console.log('游戏重新开始');
}

// 导出模块
window.GameModule = {
    initGame,
    startCharging,
    stopCharging,
    updateCharging,
    launchBall,
    onBallScored,
    resetBall,
    checkGameOver,
    endGame,
    getGameState,
    restartGame,
    gameState,
    GAME_CONFIG
};
