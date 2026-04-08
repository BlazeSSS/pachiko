# 3D 柏青哥网页游戏 MVP

## 项目说明
这是一个无需下载、浏览器即玩的 3D 柏青哥原型，验证核心玩法：发射钢珠 → 物理下落 → 碰撞钉阵 → 落入奖池得分。

## 技术栈
- **渲染**: Three.js (r128)
- **物理**: Rapier3D (@dimforge/rapier3d)
- **纯前端实现**, 无需后端

## 文件结构
```
src/
├── index.html       # 主页面 (含 UI 样式)
├── main.js          # 入口：初始化 Three.js + Rapier, 游戏主循环
├── physics.js       # 物理世界管理，球/钉/奖池创建
├── game.js          # 游戏状态：得分、球数、发射逻辑
└── ui.js            # DOM 操作：蓄力条、分数板、游戏结束弹窗
```

## 如何运行

### 方法 1: 使用 Python 内置服务器 (推荐)
```bash
cd /workspace/src
python3 -m http.server 8080
```
然后在浏览器访问：`http://localhost:8080/index.html`

### 方法 2: 使用 live-server (Node.js)
```bash
npm install -g live-server
cd /workspace/src
live-server --port=8080
```

### 方法 3: 使用 VS Code Live Server 插件
1. 安装 "Live Server" 扩展
2. 右键点击 `index.html`
3. 选择 "Open with Live Server"

## 游戏操作

| 操作 | 说明 |
|------|------|
| **按住空格键** | 开始蓄力 (力度条来回摆动) |
| **松开空格键** | 发射钢珠 |
| **鼠标点击** | 同样可以蓄力/发射 |
| **点击重新开始** | 游戏结束后重置 |

## 游戏规则

- **每局 20 球**, 用完后显示总分
- **场上最多同时存在 10 球**
- **奖池分值** (从左到右): 50 / 100 / 200 / 100 / 50
- 中间槽位分值最高，向两侧递减
- 进球后钢珠自动重置，可继续发射

## 可调参数

在 `physics.js` 的 `PHYSICS_CONFIG` 对象中可调整:

```javascript
const PHYSICS_CONFIG = {
    gravity: { x: 0, y: -9.8, z: 0 },     // 重力
    ballRadius: 0.15,                      // 钢珠半径
    ballMass: 1.0,                         // 钢珠质量
    ballRestitution: 0.6,                  // 钢珠弹性 (反弹系数)
    ballFriction: 0.2,                     // 钢珠摩擦
    pinRadius: 0.08,                       // 钉子半径
    launchForceMin: 5,                     // 最小发射力度
    launchForceMax: 15,                    // 最大发射力度
    // ... 更多参数见源码
};
```

在 `game.js` 的 `GAME_CONFIG` 对象中可调整:

```javascript
const GAME_CONFIG = {
    totalBalls: 20,           // 每局总球数
    maxBallsInPlay: 10,       // 场上最大球数
    powerChargeSpeed: 2,      // 蓄力速度
    ballResetDelay: 1000      // 进球后重置延迟 (ms)
};
```

## 验收标准检查清单

- [x] 打开 HTML 文件能看到 3D 机台和钉阵
- [x] 按住空格蓄力，松开发射钢珠
- [x] 钢珠物理下落，与钉子碰撞反弹
- [x] 落入不同槽位，分数正确增加
- [x] 20 球结束后显示总分，可刷新重玩

## 注意事项

1. **首次加载需要网络**: Three.js 和 Rapier3D 通过 CDN 引入
2. **建议使用 Chrome/Firefox**: 确保 WebGL 支持
3. **如果球穿透钉子**: 可增加 `substeps` 参数提高物理精度
4. **移动端未适配**: 本 MVP 仅支持桌面端键盘/鼠标操作

## 后续扩展建议

- 添加粒子特效 (进球时)
- 完善音效系统
- 移动端触摸控制
- 更多钉阵布局
- 特殊奖池/道具系统
- 存档/排行榜功能
