/**
 * physics.js - 物理世界管理
 * 使用 Rapier3D 物理引擎处理钢珠、钉子、奖池的物理交互
 */

// 全局物理变量
let physicsWorld = null;
let rigidBodySet = null;
let colliderSet = null;
let impulseJointSet = null;
let integrationParameters = null;

// 物理对象存储
const physicsObjects = {
    balls: [],      // 钢珠 { mesh, bodyHandle }
    pins: [],       // 钉子 { mesh, bodyHandle }
    slots: []       // 奖池触发器 { sensorHandle, score, index }
};

// 物理参数配置 (可调参)
const PHYSICS_CONFIG = {
    gravity: { x: 0, y: -9.8, z: 0 },     // 重力加速度
    dt: 1 / 60,                            // 时间步长
    substeps: 4,                           // 子步数，防止高速穿透
    ballRadius: 0.15,                      // 钢珠半径
    ballMass: 1.0,                         // 钢珠质量
    ballRestitution: 0.6,                  // 钢珠弹性
    ballFriction: 0.2,                     // 钢珠摩擦
    pinRadius: 0.08,                       // 钉子半径
    pinHeight: 0.3,                        // 钉子高度
    pinRestitution: 0.5,                   // 钉子弹性
    pinFriction: 0.3,                      // 钉子摩擦
    launchForceMin: 5,                     // 最小发射力度
    launchForceMax: 15,                    // 最大发射力度
    launchPosition: { x: 0, y: 8, z: 0 },  // 发射位置
    launchRandomX: 0.1                     // 发射随机偏移
};

/**
 * 初始化物理世界
 */
async function initPhysics() {
    // 等待 Rapier 引擎加载
    await RAPIER.init();
    
    // 创建物理世界
    const gravity = new RAPIER.Vector3(
        PHYSICS_CONFIG.gravity.x,
        PHYSICS_CONFIG.gravity.y,
        PHYSICS_CONFIG.gravity.z
    );
    physicsWorld = new RAPIER.World(gravity);
    
    rigidBodySet = physicsWorld.rigidBodySet;
    colliderSet = physicsWorld.colliderSet;
    impulseJointSet = physicsWorld.impulseJointSet;
    integrationParameters = physicsWorld.integrationParameters;
    
    // 设置子步数，提高碰撞检测精度
    integrationParameters.maxNumberOfSubsteps = PHYSICS_CONFIG.substeps;
    
    console.log('物理世界初始化完成');
    return physicsWorld;
}

/**
 * 创建钢珠刚体
 * @param {number} x - X 坐标
 * @param {number} y - Y 坐标
 * @param {number} z - Z 坐标
 * @returns {object} { bodyHandle, colliderHandle }
 */
function createBall(x, y, z) {
    // 创建动态刚体
    const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(x, y, z)
        .setLinearDamping(0.1)
        .setAngularDamping(0.1);
    
    const bodyHandle = rigidBodySet.create(bodyDesc);
    
    // 创建球形碰撞器
    const colliderDesc = RAPIER.ColliderDesc.ball(PHYSICS_CONFIG.ballRadius)
        .setDensity(PHYSICS_CONFIG.ballMass)
        .setRestitution(PHYSICS_CONFIG.ballRestitution)
        .setFriction(PHYSICS_CONFIG.ballFriction);
    
    const colliderHandle = colliderSet.createWithParent(colliderDesc, bodyHandle);
    
    return { bodyHandle, colliderHandle };
}

/**
 * 创建钉子 (静态圆柱体)
 * @param {number} x - X 坐标
 * @param {number} y - Y 坐标
 * @param {number} z - Z 坐标
 * @returns {object} { bodyHandle, colliderHandle }
 */
function createPin(x, y, z) {
    // 创建静态刚体
    const bodyDesc = RAPIER.RigidBodyDesc.fixed()
        .setTranslation(x, y, z);
    
    const bodyHandle = rigidBodySet.create(bodyDesc);
    
    // 创建圆柱形碰撞器
    const colliderDesc = RAPIER.ColliderDesc.cylinder(
        PHYSICS_CONFIG.pinHeight / 2,
        PHYSICS_CONFIG.pinRadius
    )
        .setRestitution(PHYSICS_CONFIG.pinRestitution)
        .setFriction(PHYSICS_CONFIG.pinFriction);
    
    const colliderHandle = colliderSet.createWithParent(colliderDesc, bodyHandle);
    
    return { bodyHandle, colliderHandle };
}

/**
 * 创建奖池槽位触发器
 * @param {number} index - 槽位索引 (0-4)
 * @param {number} x - X 坐标
 * @param {number} y - Y 坐标
 * @param {number} score - 分值
 * @returns {object} { sensorHandle, score, index }
 */
function createSlotSensor(index, x, y, score) {
    // 创建传感器 (无物理响应，只检测接触)
    const bodyDesc = RAPIER.RigidBodyDesc.fixed()
        .setTranslation(x, y, 0);
    
    const bodyHandle = rigidBodySet.create(bodyDesc);
    
    // 创建盒形传感器
    const width = 0.6;
    const height = 0.5;
    const depth = 0.3;
    
    const colliderDesc = RAPIER.ColliderDesc.cuboid(width / 2, height / 2, depth)
        .setSensor(true);  // 设置为传感器
    
    const sensorHandle = colliderSet.createWithParent(colliderDesc, bodyHandle);
    
    return { sensorHandle, score, index, bodyHandle };
}

/**
 * 创建机台边界墙
 */
function createWalls() {
    const wallThickness = 0.2;
    const machineWidth = 5;
    const machineHeight = 10;
    const machineDepth = 1;
    
    // 左墙
    createWall(-machineWidth / 2 - wallThickness / 2, machineHeight / 2, 0, 
               wallThickness, machineHeight, machineDepth);
    
    // 右墙
    createWall(machineWidth / 2 + wallThickness / 2, machineHeight / 2, 0,
               wallThickness, machineHeight, machineDepth);
    
    // 后墙
    createWall(0, machineHeight / 2, -machineDepth / 2,
               machineWidth, machineHeight, wallThickness);
    
    // 顶部发射区挡板
    createWall(0, machineHeight - 0.5, -0.3,
               machineWidth - 1, 0.3, 0.5);
    
    // 底部斜板 (引导球进入槽位)
    createSlopedBottom();
}

/**
 * 创建墙壁
 */
function createWall(x, y, z, width, height, depth) {
    const bodyDesc = RAPIER.RigidBodyDesc.fixed()
        .setTranslation(x, y, z);
    
    const bodyHandle = rigidBodySet.create(bodyDesc);
    
    const colliderDesc = RAPIER.ColliderDesc.cuboid(
        width / 2, height / 2, depth / 2
    )
        .setRestitution(0.3)
        .setFriction(0.5);
    
    colliderSet.createWithParent(colliderDesc, bodyHandle);
}

/**
 * 创建底部斜板
 */
function createSlopedBottom() {
    // 简化：在底部创建多个小斜面引导球
    const slopes = [
        { x: -1.5, y: 0.3, angle: 0.3 },
        { x: -0.75, y: 0.2, angle: 0.2 },
        { x: 0, y: 0.1, angle: 0 },
        { x: 0.75, y: 0.2, angle: -0.2 },
        { x: 1.5, y: 0.3, angle: -0.3 }
    ];
    
    slopes.forEach(slope => {
        const bodyDesc = RAPIER.RigidBodyDesc.fixed()
            .setTranslation(slope.x, slope.y, 0)
            .setRotation(RAPIER.Quaternion.fromEulerAngles(slope.angle, 0, 0));
        
        const bodyHandle = rigidBodySet.create(bodyDesc);
        
        const colliderDesc = RAPIER.ColliderDesc.cuboid(0.5, 0.05, 0.5)
            .setRestitution(0.2)
            .setFriction(0.6);
        
        colliderSet.createWithParent(colliderDesc, bodyHandle);
    });
}

/**
 * 生成钉阵
 * 交错排列：奇偶行偏移形成梅花桩效果
 */
function createPinGrid() {
    const rows = 10;           // 行数
    const cols = 6;            // 列数
    const rowSpacing = 0.8;    // 行间距
    const colSpacing = 0.7;    // 列间距
    const rowOffset = 0.35;    // 奇偶行偏移量
    const startY = 6;          // 起始高度
    const startX = -1.5;       // 起始 X 位置
    
    for (let row = 0; row < rows; row++) {
        const y = startY - row * rowSpacing;
        const offset = (row % 2) * rowOffset;
        
        for (let col = 0; col < cols; col++) {
            const x = startX + col * colSpacing + offset;
            const z = 0;
            
            const pin = createPin(x, y, z);
            physicsObjects.pins.push(pin);
        }
    }
    
    console.log(`创建了 ${physicsObjects.pins.length} 个钉子`);
}

/**
 * 创建奖池槽位
 * 5 个槽位，中间分值最高，向两侧递减
 */
function createSlots() {
    const slotScores = [50, 100, 200, 100, 50];  // 分值配置
    const slotY = 0.5;
    const slotSpacing = 0.8;
    const startX = -1.6;
    
    for (let i = 0; i < 5; i++) {
        const x = startX + i * slotSpacing;
        const slot = createSlotSensor(i, x, slotY, slotScores[i]);
        physicsObjects.slots.push(slot);
    }
    
    console.log(`创建了 ${physicsObjects.slots.length} 个奖池槽位`);
}

/**
 * 对钢珠施加发射冲量
 * @param {number} bodyHandle - 钢珠刚体句柄
 * @param {number} powerPercent - 力度百分比 (0-100)
 */
function launchBall(bodyHandle, powerPercent) {
    // 力度映射：0-100% -> min-max 冲量
    const force = PHYSICS_CONFIG.launchForceMin + 
                  (PHYSICS_CONFIG.launchForceMax - PHYSICS_CONFIG.launchForceMin) * 
                  (powerPercent / 100);
    
    // 随机 X 方向偏移
    const randomX = (Math.random() - 0.5) * 2 * PHYSICS_CONFIG.launchRandomX;
    
    // 施加冲量 (向下为主，带少量水平偏移)
    const impulse = new RAPIER.Vector3(randomX * force, -force * 0.5, 0);
    
    rigidBodySet.applyImpulse(bodyHandle, impulse, true);
    
    console.log(`发射钢珠！力度：${powerPercent.toFixed(1)}%, 冲量：${force.toFixed(2)}`);
}

/**
 * 获取钢珠位置
 * @param {number} bodyHandle - 刚体句柄
 * @returns {object} { x, y, z }
 */
function getBallPosition(bodyHandle) {
    const translation = rigidBodySet.translation(bodyHandle);
    return { x: translation.x, y: translation.y, z: translation.z };
}

/**
 * 移除钢珠
 * @param {number} bodyHandle - 刚体句柄
 */
function removeBall(bodyHandle) {
    rigidBodySet.remove(bodyHandle, true);
}

/**
 * 更新物理世界
 * @param {number} deltaTime - 时间增量
 */
function updatePhysics(deltaTime) {
    physicsWorld.step();
}

/**
 * 检查球与奖池的碰撞
 * @param {function} onBallScored - 回调函数 (slotIndex, score)
 */
function checkSlotCollisions(onBallScored) {
    // 遍历所有奖池传感器
    physicsObjects.slots.forEach(slot => {
        // 检查是否有物体接触传感器
        const contacts = physicsWorld.contactsWith(slot.sensorHandle);
        
        contacts.forEach(contact => {
            // 获取接触的另一个碰撞器
            const otherCollider = contact.collider1 === slot.sensorHandle ? 
                                  contact.collider2 : contact.collider1;
            
            // 检查是否是钢珠
            const parentHandle = rigidBodySet.get(otherCollider.parent());
            if (parentHandle) {
                // 找到对应的钢珠并触发得分
                const ballIndex = physicsObjects.balls.findIndex(
                    b => b.bodyHandle === otherCollider.parent()
                );
                
                if (ballIndex !== -1) {
                    onBallScored(slot.index, slot.score, ballIndex);
                }
            }
        });
    });
}

// 导出模块
window.PhysicsModule = {
    initPhysics,
    createBall,
    createPin,
    createSlotSensor,
    createWalls,
    createPinGrid,
    createSlots,
    launchBall,
    getBallPosition,
    removeBall,
    updatePhysics,
    checkSlotCollisions,
    PHYSICS_CONFIG,
    physicsObjects
};
