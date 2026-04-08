/**
 * main.js - 游戏入口
 * 初始化 Three.js 渲染器 + Rapier 物理引擎
 * 管理游戏主循环
 */

// Three.js 变量
let scene = null;
let camera = null;
let renderer = null;
let clock = null;

// 视觉对象存储
const visualObjects = {
    ballMeshes: [],    // 钢珠网格
    pinMeshes: [],     // 钉子网格
    slotMeshes: []     // 奖池网格
};

// 材质配置
const materials = {
    ballMaterial: null,   // 钢珠材质 (红色金属)
    pinMaterial: null,    // 钉子材质 (银色金属)
    slotMaterials: []     // 奖池材质 (金/银/铜)
};

/**
 * 初始化 Three.js 场景
 */
function initThreeJS() {
    const container = document.getElementById('canvas-container');
    
    // 创建场景
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    scene.fog = new THREE.Fog(0x1a1a2e, 10, 30);
    
    // 创建相机 (固定透视视角)
    camera = new THREE.PerspectiveCamera(
        45,                                     // FOV
        window.innerWidth / window.innerHeight, // 宽高比
        0.1,                                    // 近裁剪面
        100                                     // 远裁剪面
    );
    camera.position.set(0, 5, 12);  // 相机位置：正前方稍高
    camera.lookAt(0, 3, 0);         // 看向机台中心
    
    // 创建渲染器
    renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        alpha: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    
    // 创建时钟
    clock = new THREE.Clock();
    
    // 设置光照
    setupLighting();
    
    // 创建材质
    setupMaterials();
    
    console.log('Three.js 初始化完成');
}

/**
 * 设置光照
 */
function setupLighting() {
    // 环境光 (基础照明)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);
    
    // 主定向光 (模拟顶灯)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -10;
    directionalLight.shadow.camera.right = 10;
    directionalLight.shadow.camera.top = 10;
    directionalLight.shadow.camera.bottom = -10;
    scene.add(directionalLight);
    
    // 补光 (减少阴影对比度)
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight.position.set(-5, 5, -5);
    scene.add(fillLight);
    
    console.log('光照设置完成');
}

/**
 * 设置材质
 */
function setupMaterials() {
    // 钢珠材质：红色金属
    materials.ballMaterial = new THREE.MeshStandardMaterial({
        color: 0xff3333,
        metalness: 0.9,
        roughness: 0.1,
        envMapIntensity: 1.0
    });
    
    // 钉子材质：银色金属
    materials.pinMaterial = new THREE.MeshStandardMaterial({
        color: 0xcccccc,
        metalness: 0.8,
        roughness: 0.2
    });
    
    // 奖池材质：不同颜色区分分值
    const slotColors = [
        0xcd7f32,  // 铜色 (两侧)
        0xc0c0c0,  // 银色
        0xffd700,  // 金色 (中间最高分)
        0xc0c0c0,  // 银色
        0xcd7f32   // 铜色 (两侧)
    ];
    
    slotColors.forEach(color => {
        materials.slotMaterials.push(new THREE.MeshStandardMaterial({
            color: color,
            metalness: 0.6,
            roughness: 0.3,
            transparent: true,
            opacity: 0.8
        }));
    });
    
    console.log('材质设置完成');
}

/**
 * 创建机台框架 (可视化)
 */
function createMachineFrame() {
    const frameMaterial = new THREE.MeshStandardMaterial({
        color: 0x2a2a4a,
        metalness: 0.5,
        roughness: 0.5
    });
    
    // 背板
    const backBoard = new THREE.Mesh(
        new THREE.BoxGeometry(6, 10, 0.2),
        frameMaterial
    );
    backBoard.position.set(0, 5, -0.5);
    backBoard.receiveShadow = true;
    scene.add(backBoard);
    
    // 侧边框
    const leftFrame = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 10, 1),
        frameMaterial
    );
    leftFrame.position.set(-3, 5, 0);
    scene.add(leftFrame);
    
    const rightFrame = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 10, 1),
        frameMaterial
    );
    rightFrame.position.set(3, 5, 0);
    scene.add(rightFrame);
    
    // 顶部发射区装饰
    const topPlate = new THREE.Mesh(
        new THREE.BoxGeometry(4, 0.5, 0.8),
        new THREE.MeshStandardMaterial({ color: 0x4a4a6a })
    );
    topPlate.position.set(0, 9.5, 0);
    scene.add(topPlate);
    
    console.log('机台框架创建完成');
}

/**
 * 同步物理球的视觉位置
 */
function syncBallVisuals() {
    // 清除旧网格
    visualObjects.ballMeshes.forEach(mesh => scene.remove(mesh));
    visualObjects.ballMeshes = [];
    
    // 为每个物理球创建/更新网格
    PhysicsModule.physicsObjects.balls.forEach(ballInfo => {
        const pos = PhysicsModule.getBallPosition(ballInfo.bodyHandle);
        
        const ballMesh = new THREE.Mesh(
            new THREE.SphereGeometry(PhysicsModule.PHYSICS_CONFIG.ballRadius, 16, 16),
            materials.ballMaterial
        );
        ballMesh.position.set(pos.x, pos.y, pos.z);
        ballMesh.castShadow = true;
        ballMesh.receiveShadow = true;
        
        scene.add(ballMesh);
        visualObjects.ballMeshes.push(ballMesh);
    });
}

/**
 * 创建钉阵可视化
 */
function createPinVisuals() {
    PhysicsModule.physicsObjects.pins.forEach(pinInfo => {
        const pinMesh = new THREE.Mesh(
            new THREE.CylinderGeometry(
                PhysicsModule.PHYSICS_CONFIG.pinRadius,
                PhysicsModule.PHYSICS_CONFIG.pinRadius,
                PhysicsModule.PHYSICS_CONFIG.pinHeight,
                8
            ),
            materials.pinMaterial
        );
        
        // 获取物理位置
        const body = PhysicsModule.rigidBodySet.get(pinInfo.bodyHandle);
        if (body) {
            const pos = PhysicsModule.getBallPosition(pinInfo.bodyHandle);
            pinMesh.position.set(pos.x, pos.y, pos.z);
        }
        
        pinMesh.castShadow = true;
        pinMesh.receiveShadow = true;
        scene.add(pinMesh);
        visualObjects.pinMeshes.push(pinMesh);
    });
    
    console.log(`创建了 ${visualObjects.pinMeshes.length} 个钉子可视化`);
}

/**
 * 创建奖池可视化
 */
function createSlotVisuals() {
    PhysicsModule.physicsObjects.slots.forEach((slotInfo, index) => {
        const slotMesh = new THREE.Mesh(
            new THREE.BoxGeometry(0.5, 0.4, 0.6),
            materials.slotMaterials[index % materials.slotMaterials.length]
        );
        
        const body = PhysicsModule.rigidBodySet.get(slotInfo.bodyHandle);
        if (body) {
            const pos = PhysicsModule.getBallPosition(slotInfo.bodyHandle);
            slotMesh.position.set(pos.x, pos.y - 0.2, pos.z + 0.3);
        }
        
        slotMesh.receiveShadow = true;
        scene.add(slotMesh);
        visualObjects.slotMeshes.push(slotMesh);
        
        // 添加分值标签 (简化：用颜色区分)
    });
    
    console.log(`创建了 ${visualObjects.slotMeshes.length} 个奖池可视化`);
}

/**
 * 游戏主循环
 */
function gameLoop() {
    requestAnimationFrame(gameLoop);
    
    const deltaTime = clock.getDelta();
    
    // 更新物理世界
    PhysicsModule.updatePhysics(deltaTime);
    
    // 检查奖池碰撞
    PhysicsModule.checkSlotCollisions(GameModule.onBallScored);
    
    // 更新蓄力状态
    GameModule.updateCharging();
    
    // 同步视觉
    syncBallVisuals();
    
    // 渲染场景
    renderer.render(scene, camera);
}

/**
 * 处理窗口大小变化
 */
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

/**
 * 设置输入事件监听
 */
function setupInputHandlers() {
    // 键盘事件
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space') {
            e.preventDefault();
            GameModule.startCharging();
        }
    });
    
    document.addEventListener('keyup', (e) => {
        if (e.code === 'Space') {
            e.preventDefault();
            const power = GameModule.stopCharging();
            if (power > 0) {
                GameModule.launchBall(power);
            }
        }
    });
    
    // 鼠标点击也可发射
    document.addEventListener('mousedown', (e) => {
        if (e.target.tagName !== 'BUTTON') {
            GameModule.startCharging();
        }
    });
    
    document.addEventListener('mouseup', () => {
        const power = GameModule.stopCharging();
        if (power > 0) {
            GameModule.launchBall(power);
        }
    });
    
    // 重新开始按钮
    UIModule.setRestartCallback(() => {
        GameModule.restartGame();
    });
    
    // 窗口大小变化
    window.addEventListener('resize', onWindowResize);
    
    console.log('输入处理器设置完成');
}

/**
 * 初始化游戏场景
 */
async function initGameScene() {
    // 初始化物理世界
    await PhysicsModule.initPhysics();
    
    // 创建物理对象
    PhysicsModule.createWalls();
    PhysicsModule.createPinGrid();
    PhysicsModule.createSlots();
    
    // 创建可视化对象
    createMachineFrame();
    createPinVisuals();
    createSlotVisuals();
    
    console.log('游戏场景初始化完成');
}

/**
 * 主入口函数
 */
async function main() {
    console.log('=== 3D 柏青哥 MVP 启动 ===');
    
    // 初始化 UI
    UIModule.initUI();
    
    // 初始化 Three.js
    initThreeJS();
    
    // 初始化游戏状态
    GameModule.initGame();
    
    // 初始化场景 (等待物理引擎)
    await initGameScene();
    
    // 设置输入处理
    setupInputHandlers();
    
    // 更新初始 UI
    UIModule.updateBalls(GameModule.gameState.ballsRemaining);
    
    console.log('=== 游戏就绪，按空格键发射钢珠! ===');
    
    // 启动游戏循环
    gameLoop();
}

// 页面加载完成后启动
window.addEventListener('load', main);
