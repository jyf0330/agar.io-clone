# Runtime And Debug Notes

这份文档记录“实际把仓库跑起来时”观察到的运行特征和调试抓手。

它不是纯源码结构，而是偏实战视角。

## 一句话概括

这个仓库源码主干是健康的，但运行上有几个很现实的注意点：

- `dist/` 不一定永远和源码同步
- 构建脚本更偏 Windows
- `sqlite3` 在某些本机环境里会降级失效
- 真正排查问题时，优先看服务端循环和 socket 事件

## 1. 这次实际怎么跑通的

本次本地验证用的是：

```bash
node ./node_modules/gulp/bin/gulp.js build
node dist/server/server.js
```

然后访问：

```bash
http://127.0.0.1:3000
```

## 2. 为什么没有直接用 `npm start`

`package.json` 里的脚本是：

- `pushd "%INIT_CWD%" && node .\\node_modules\\gulp\\bin\\gulp.js run && popd`

这套写法明显更偏 Windows shell。

在 macOS / Linux 上，真正可靠的部分其实是：

- `gulp` 任务本身

所以跨平台调试时，优先直接跑：

- `node ./node_modules/gulp/bin/gulp.js build`
- `node ./node_modules/gulp/bin/gulp.js test`
- `node dist/server/server.js`

## 3. 为什么一定要先重新 build

这个仓库的运行入口默认指向：

- `dist/server/server.js`

所以如果源码更新了，但 `dist/` 没更新，就可能出现：

- 运行的是旧构建产物
- 行为和源码对不上

本次实际就遇到了这种情况：

- `dist/server/map/player.js` 缺少新模块引用
- 直接跑会报 `Cannot find module '../connection'`

重新构建后就恢复正常。

所以一个非常重要的经验是：

- 读源码前可以先看 `apps/`
- 运行前一定先刷新 `dist/`

## 4. 构建链路里包含测试

`gulp build` 不只是打包，还会做：

- lint
- mocha 单测

这意味着：

- build 通过，通常也代表主干基础行为没明显炸掉

这次实际结果是：

- `80 passing`
- `1 pending`

这对“学习一个项目”很有帮助，因为它给了我们一个可信基线。

## 5. `sqlite3` 降级现象

本次服务启动时有警告：

- `sqlite3 unavailable, database logging is disabled`

原因是在这台机器上，`sqlite3` 的本地二进制模块没有成功加载。

但这套降级处理是温和的：

- `sql.js` 会导出一个空操作对象
- `run()` 和 `close()` 仍然存在
- 聊天/登录日志不会写数据库
- 游戏主流程仍可正常运行

所以当前结论是：

- 数据库问题不阻塞玩游戏
- 主要影响日志持久化

## 6. 最值得下断点/打日志的地方

如果后面你要自己调试，我建议优先盯这些位置。

### 启动与握手

- `apps/server/src/server.js` 的 `io.on('connection', ...)`
- `socket.on('respawn', ...)`
- `socket.on('gotit', ...)`
- `apps/client/src/app.js` 的 `socket.on('welcome', ...)`

### 移动

- `socket.on('0', ...)`
- `Player.move()`
- `Cell.move()`

### 吞噬

- `tickPlayer()`
- `PlayerManager.handleCollisions()`
- `Cell.checkWhoAteWho()`

### 同步

- `Map.enumerateWhatPlayersSee()`
- `sendUpdates()`
- `socket.on('serverTellPlayerMove', ...)`

### 扩展系统

- `attemptConnection(currentPlayer)`
- `relationship.applyConnectionOutcome(...)`
- `body.stealRandomCorePart(...)`

## 7. 看日志时的顺序建议

如果游戏出了问题，不要一上来全局搜。

建议按这个顺序排：

1. 是否已经成功 `welcome/gotit`
2. 是否有持续 `'0'` 心跳
3. `tickGame()` 是否还在跑
4. `sendUpdates()` 是否还在发状态
5. 客户端 `serverTellPlayerMove` 是否收到数据
6. 如果状态有了但画面不对，再看 `gameLoop()` / `render.js`

这个顺序最容易把问题切开。

## 8. 当前我记录下来的可疑点

### 1. `playerDied` 事件字段名不一致

服务端发：

- `{ name: ... }`

客户端读：

- `data.playerEatenName`

这会影响死亡提示。

### 2. `VirusManager.delete()` 可能更适合单索引

而调用方传的是索引数组。

如果以后要排查病毒吞噬异常，这里是第一批要看的点。

### 3. `PlayerManager.getTopPlayers()` 会原地排序

这可能让排行榜逻辑和玩家数组顺序耦合在一起。

目前未必出错，但值得记着。

## 9. 本地学习时最实用的命令

```bash
node ./node_modules/gulp/bin/gulp.js build
node ./node_modules/gulp/bin/gulp.js test
node dist/server/server.js
```

以及另开一个终端观察：

```bash
curl -I http://127.0.0.1:3000
```

## 10. 推荐把这份文档当什么用

这份文档最适合在两种时候打开：

- 你隔几天回来继续看这个仓库时
- 你明明改了代码，但实际运行行为跟预期不一样时

它的作用不是替代源码，而是：

- 帮你快速回到“真实运行视角”
