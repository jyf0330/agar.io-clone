# Your Notes

这份文档留给我们做长期积累。

我会把目前的理解、疑问、后续验证方向都先放进来。你之后也可以继续把自己的观察补进来。

## 当前理解

### 1. 这是一个“服务端权威”的实时游戏

最关键的判断是：

- 客户端只负责输入与渲染
- 服务端负责真实世界状态

这让阅读路线很清晰：

- 想理解玩法，优先看服务端
- 想理解视觉表现，再看客户端

### 2. 这个分支已经不是经典纯净版 Agar.io

经典主干之外，这个项目叠加了几套扩展系统：

- `materialization`
- `connection`
- `relationship`
- `body`
- `player card`

这说明仓库正在从“克隆原版玩法”演化成“自己的游戏变体”。

### 3. 三条循环是项目的总抓手

只要记住这三条循环，很多代码就不容易迷路：

- `tickGame`
- `gameloop`
- `sendUpdates`

它们分别对应：

- 实时推进
- 世界维护
- 网络广播

## 已确认的事实

- 本地服务已经成功运行在 `http://127.0.0.1:3000`
- 构建成功
- 单元测试通过：`80 passing`
- 客户端入口是 `apps/client/src/app.js`
- 服务端入口是 `apps/server/src/server.js`
- 玩家核心模型在 `apps/server/src/map/player.js`

## 暂时的疑问

### 1. `getTopPlayers()` 原地排序是否会带来副作用

当前实现：

- 直接对 `PlayerManager.data` 排序

待验证：

- 是否有别的逻辑默认依赖这个数组的原始顺序

### 2. 客户端没有插值，视觉抖动会不会明显

当前实现更偏简单直接：

- 服务端推快照
- 客户端直接画

待验证：

- 在多人或较高延迟下，是否会感到不够丝滑

### 3. 心跳和渲染循环绑在一起是否足够稳

当前做法：

- `gameLoop()` 里持续 `emit('0', target)`

这很省事，但也意味着：

- 渲染频率与输入上报频率耦合

待验证：

- 页面掉帧时，输入同步会不会跟着受影响

### 4. `sqlite3` 失败对哪些能力有影响

当前现象：

- 服务能启动
- 但日志存储模块降级

待确认：

- 是否只影响聊天/登录日志
- 是否还有别的功能依赖数据库

### 5. `playerDied` 事件字段名看起来不统一

当前现象：

- 服务端广播使用 `{ name: ... }`
- 客户端显示逻辑读取 `playerEatenName`

待确认：

- 这是不是一个已知未修的小 bug
- 实际游戏内死亡提示是否因此丢失玩家名

### 6. `VirusManager.delete()` 与调用方参数形状不完全匹配

当前现象：

- 调用方传入的是病毒索引数组
- `delete()` 内部更像按单个索引删除

待确认：

- 单 tick 命中多个病毒时是否会出现异常
- 这里是否只是历史遗留写法

## 我建议下一步继续拆的主题

### 主题 A：从输入到移动

目标：

- 吃透鼠标/键盘输入如何变成服务端移动

建议看：

- `apps/client/src/canvas.js`
- `socket.on('0')` in `apps/server/src/server.js`
- `Player.move()`
- `Cell.move()`

状态：

- 已整理为 `docs/06-input-to-movement.md`

### 主题 B：吞噬判定

目标：

- 吃透谁能吃谁、什么时候算吞掉

建议看：

- `Cell.checkWhoAteWho()`
- `PlayerManager.handleCollisions()`
- `tickPlayer()`

状态：

- 已整理为 `docs/07-devour-and-collision.md`

### 主题 C：世界同步

目标：

- 吃透为什么客户端只看到“自己附近”的对象

建议看：

- `Map.enumerateWhatPlayersSee()`
- `isVisibleEntity()`
- `serverTellPlayerMove`

状态：

- 已整理为 `docs/08-world-entities-and-visibility.md`

### 主题 D：扩展玩法系统

目标：

- 区分哪些是经典 Agar.io 逻辑，哪些是这个分支新增逻辑

建议看：

- `materialization.js`
- `connection.js`
- `relationship.js`
- `body.js`

状态：

- 已整理为 `docs/10-custom-systems.md`

### 主题 E：socket 协议

目标：

- 把握手、同步、聊天、管理命令整理成一份事件表

建议看：

- `apps/server/src/server.js`
- `apps/client/src/app.js`
- `apps/client/src/canvas.js`
- `apps/client/src/chat-client.js`

状态：

- 已整理为 `docs/09-socket-and-sync-protocol.md`

### 主题 F：运行与排障

目标：

- 把“怎么稳定跑起来”和“出问题先看哪”沉淀成操作视角

建议看：

- `gulpfile.js`
- `dist/`
- `apps/server/src/sql.js`
- 启动日志

状态：

- 已整理为 `docs/11-runtime-and-debug-notes.md`

## 后续记录模板

你可以继续按这个格式追加：

```md
## 观察
- 

## 我确认的事实
- 

## 我不确定的点
- 

## 下一步验证
- 
```
