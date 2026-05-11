# 游戏全流程测试覆盖清单

本文件只记录“能证明游戏主流程被覆盖”的测试，不逐条列出所有单元测试细节。
细节型断言留在测试文件里维护；这里关注玩家和机器人从进入游戏到结算的关键路径。

维护原则：

- 只有新增、删除或实质改变“游戏全流程覆盖”时才更新本文件。
- 不记录工具函数、样式细节、单个字段投影、局部格式化等细节测试。
- 每条用中文描述覆盖的玩家流程，并列出主要测试文件作为证据入口。

## 流程覆盖

### 1. 打开游戏与前置入口

覆盖玩家能打开浏览器入口、服务端入口可发现、进入游戏前关键控件存在。

主要测试：

- `tests/smoke/static-entrypoints.js`
- `tests/unit/client-index.js`
- `tests/unit/recording-consent.js`

### 2. 玩家加入房间与基础同步

覆盖玩家完成 Socket.IO 握手、发送进入 payload、收到 welcome、开始接收移动同步。

主要测试：

- `tests/integration/socket-flow.js`
- `tests/unit/player-entry.js`
- `tests/unit/socket-controller.js`
- `tests/unit/player-hydration.js`

### 3. 竞技场移动与视野同步

覆盖玩家输入会转成移动目标，服务端按同步契约广播可见世界，客户端保留必要状态。

主要测试：

- `tests/unit/canvas-input.js`
- `tests/unit/socket-emit.js`
- `tests/unit/game-loop-service.js`
- `tests/unit/player-projection.js`
- `tests/unit/map-visibility.js`

### 4. 吃食物、质量变化与经典规则

覆盖玩家通过碰撞吃食物、质量转半径、发射质量块不会立刻吃回、吃病毒会分裂。

主要测试：

- `tests/integration/classic-gameplay.js`
- `tests/unit/body.js`
- `tests/unit/util.js`
- `tests/unit/virus.js`

### 5. 身体部位选择、掉落、拾取与显示

覆盖玩家从身体组装选择进入游戏，地图生成部位掉落，拾取后装备、库存、同步和画面显示更新。

主要测试：

- `tests/unit/body-assembly-page.js`
- `tests/unit/body-assembly-parts.js`
- `tests/unit/part-loot.js`
- `tests/unit/game-loop-service.js`
- `tests/unit/render-part-loot.js`
- `tests/unit/render-body-assembly.js`
- `tests/unit/body-inventory-panel.js`

### 6. 玩家吞噬、偷部位与保护

覆盖吞噬不直接删除玩家，而是偷取一个部位；被吞玩家在关键场景获得保护或无敌。

主要测试：

- `tests/integration/classic-gameplay.js`
- `tests/unit/game-loop-service.js`
- `tests/unit/body.js`

### 7. 机器人进入、行动与聊天边界

覆盖默认机器人启动、机器人按玩家协议进入、移动/追逐/拾取/技能行为可运行，且聊天只出现在需要的事件上。

主要测试：

- `tests/unit/default-bot-swarm.js`
- `tests/unit/bot-swarm.js`
- `tests/unit/bot-client.js`
- `tests/unit/bot-actions.js`
- `tests/unit/player-manager.js`
- `tests/unit/multiplayer-policy.js`

### 8. 断线重连与保留玩家

覆盖浏览器断线后可用同一 token 恢复玩家，心跳间隔不会直接踢出玩家，只有保留玩家时新人类仍能靠近活跃机器人出生。

主要测试：

- `tests/integration/socket-flow.js`
- `tests/unit/game-loop-service.js`
- `tests/unit/socket-controller.js`
- `tests/unit/player-entry.js`

### 9. 回合计时、身体完成与结算

覆盖回合计时同步、计时结束结算、身体完成触发结算、非竞争机器人不能错误结束回合、结算面板展示身体来源。

主要测试：

- `tests/unit/game-loop-service.js`
- `tests/unit/round-timer-status.js`
- `tests/unit/settlement.js`
- `tests/unit/settlement-panel.js`
- `tests/unit/bot-test-client.js`

### 10. 机器人全局比赛演练

覆盖多机器人模拟玩家从加入、战斗、行为采样、关键事件记录到自然结算和中文报告生成的完整演练。

主要测试：

- `tests/unit/bot-test-runner.js`
- `tests/unit/bot-test-client.js`
- `tests/unit/bot-test-report.js`
- `tests/unit/bot-test-state-machine.js`
- `tests/unit/bot-test-logger.js`

### 11. 历史回声与持久化回放

覆盖同意录制后的轨迹、聊天、物品和战斗事件持久化，并能从 SQLite 记录重放为历史回声和掉落物。

主要测试：

- `tests/integration/historical-echo-persistence.js`
- `tests/unit/ghost-recorder.js`
- `tests/unit/ghost-manager.js`
- `tests/unit/memory-store.js`
- `tests/unit/render-ghost.js`

### 12. NPC、宠物与记忆侧流程

覆盖 NPC/宠物在开启后可以移动、回应、推荐部位、记录建议和回归记忆，不直接绕过游戏规则改写 durable 状态。

主要测试：

- `tests/unit/npc-orchestrator.js`
- `tests/unit/npc-task-rewards.js`
- `tests/unit/active-pet.js`
- `tests/unit/pet-status.js`
- `tests/unit/memory-session-summarizer.js`
- `tests/unit/memory-persona-updater.js`

## 不在本文件展开的内容

以下内容仍由测试文件本身维护，但不再逐条写入本清单：

- 单个工具函数和格式化断言。
- 单个 DOM id、CSS 细节、按钮文案或局部样式。
- 单个 DTO 字段、缓存优化、错误日志格式。
- 报告生成中的细粒度裁剪规则。
- 只服务于实现细节的边界条件。
