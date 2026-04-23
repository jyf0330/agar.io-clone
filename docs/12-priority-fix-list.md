# 12 · 按优先级的修复清单

> 产出说明：本文只做"读 + 规划"，不动代码。目的是把当前仓库里已验证的坑按"值钱程度"排出来，方便下一步按序逐条修复。
>
> 验证环境：macOS（darwin 24.6），Node v24.14.0。
> 验证命令实际结果：
> - `npm run build` / `npm start` **失败**（Windows 风格脚本，见 P0-1）。
> - `node ./node_modules/gulp/bin/gulp.js build` **成功**，`dist/client/js/app.js` 约 127 KiB。
> - Mocha 测试：`92 passing`。
> - `npm audit`：`72 vulnerabilities（1 critical / 40 high / ...）`。
>
> 路径约定：每条问题都给可点击链接 + 纯绝对路径兜底。

---

## P0 · 现在就会咬人（构建/部署/安全基线）

### P0-1 · 跨平台脚本：`npm run build` / `npm start` 在 macOS/Linux 直接失败

**证据**

- [package.json:6-11](/Users/macminim4/Documents/New project/jyf0330-repos/agar.io-clone-master/package.json)
  `/Users/macminim4/Documents/New project/jyf0330-repos/agar.io-clone-master/package.json:6`
  脚本用 `pushd "%INIT_CWD%"` + `node .\\node_modules\\gulp\\bin\\gulp.js ...`，是 Windows cmd 语法 + 反斜杠路径，在 zsh/bash 下 `pushd` 不接受 `"%INIT_CWD%"`，且 `.\\node_modules\\...` 不是有效路径。
- [README.md:74-79](/Users/macminim4/Documents/New project/jyf0330-repos/agar.io-clone-master/README.md)
  `/Users/macminim4/Documents/New project/jyf0330-repos/agar.io-clone-master/README.md:74`
  README 仍然让用户 `npm start`，首次使用直接卡死。
- [Dockerfile:10](/Users/macminim4/Documents/New project/jyf0330-repos/agar.io-clone-master/Dockerfile)
  `/Users/macminim4/Documents/New project/jyf0330-repos/agar.io-clone-master/Dockerfile:10`
  `CMD [ "npm", "start" ]`：Linux 容器里也一样炸。

**影响**：新人/CI/容器开箱即坏；问题不在 gulp，而在 npm 脚本层。

**建议做法（不在本文执行，仅说明）**

- 把 4 条 script 改成跨平台：`"build": "gulp build"`、`"start": "gulp run"`（前提是让 `gulp` 走 `npx` 或 `node_modules/.bin`，直接写 `gulp` 靠 npm 自己加 PATH 即可）。
- 如果要保留 `pushd` 行为的意图（回到调用目录），可用 `cross-env` 或直接去掉，npm 本身就会在包目录执行。

---

### P0-2 · 默认管理员密码硬编码为 `"DEFAULT"`

**证据**

- [configs/game/config.js:22](/Users/macminim4/Documents/New project/jyf0330-repos/agar.io-clone-master/configs/game/config.js)
  `/Users/macminim4/Documents/New project/jyf0330-repos/agar.io-clone-master/configs/game/config.js:22`
  `adminPass: "DEFAULT"`，且文件被 git 跟踪，等于公开仓库里已经写死了默认密码。
- [apps/server/src/server.js:128-143](/Users/macminim4/Documents/New project/jyf0330-repos/agar.io-clone-master/apps/server/src/server.js)
  `/Users/macminim4/Documents/New project/jyf0330-repos/agar.io-clone-master/apps/server/src/server.js:128`
  服务端直接 `password === config.adminPass` 比对，失败才记日志，无速率限制。
- [apps/client/src/chat-client.js:57-59](/Users/macminim4/Documents/New project/jyf0330-repos/agar.io-clone-master/apps/client/src/chat-client.js)
  `/Users/macminim4/Documents/New project/jyf0330-repos/agar.io-clone-master/apps/client/src/chat-client.js:57`
  客户端 `/login <pwd>` 就能触发，即聊天框里一行命令就获得管理员能力（可 `kick` 等）。

**影响**：只要部署上线且没改 config，任何玩家都能 `/login DEFAULT` 升权。

**建议做法**

- 读 `process.env.ADMIN_PASS`，默认不存在就**禁用**管理员命令，而不是给一个已知值。
- 比对用 `crypto.timingSafeEqual`，避免时序侧信道（虽然对字符串密码影响小，但规范化做法）。
- `/login` 加最小节流（例如同 IP 5 次/分钟）。

---

### P0-3 · Node 版本没锁定，团队/CI 会漂

**证据**

- [package.json](/Users/macminim4/Documents/New project/jyf0330-repos/agar.io-clone-master/package.json)
  `/Users/macminim4/Documents/New project/jyf0330-repos/agar.io-clone-master/package.json`
  无 `engines` 字段。
- 仓库根也没有 `.nvmrc`。
- [Dockerfile:1](/Users/macminim4/Documents/New project/jyf0330-repos/agar.io-clone-master/Dockerfile)
  `/Users/macminim4/Documents/New project/jyf0330-repos/agar.io-clone-master/Dockerfile:1`
  固定 `node:14-alpine`——已经 EOL，且和我本地 Node 24 能跑的事实冲突，说明"容器版本"和"开发版本"实际已经脱钩。

**影响**：不是当前硬故障，但是潜在漂移源——CI 绿 / 本地炸，或反过来。

**建议做法**

- 根加 `.nvmrc`（选一个当前长期支持版，比如 `20` 或 `22`）。
- `package.json` 加 `"engines": { "node": ">=20" }`。
- `Dockerfile` 基础镜像同步升级（`node:20-alpine` 或 `node:22-alpine`）。

---

## P1 · 安全 / 依赖债，短期不爆但要管

### P1-1 · 依赖漏洞面较大，不能无脑 `audit fix --force`

**证据**

- `npm audit` 当前输出：`72 vulnerabilities（1 critical、40 high、...）`。
- 涉及主依赖（见 [package.json:41-70](/Users/macminim4/Documents/New project/jyf0330-repos/agar.io-clone-master/package.json)）：`express`、`socket.io`、`socket.io-client`、`sqlite3`、`webpack`、`gulp` 等。

**风险点**

- `--force` 会带破坏性升级（比如 webpack/gulp 大版本跳），现有 gulpfile、webpack config 可能直接崩。

**建议做法**

- 分批：先 `npm audit` 只看 `runtime` 依赖（`--omit=dev`），优先级高于 dev 工具链。
- 逐包升：`express`、`socket.io`、`socket.io-client`、`sqlite3` 先手动 bump 到安全 patch，每升一个跑一次 `node ./node_modules/gulp/bin/gulp.js test` + 启动冒烟。
- dev 工具链（`gulp`、`gulp-*`、`webpack-stream`）单独一个分支升，失败可回滚。
- 在修好 P0-1 之前不要期望 `npm test` 本身可用，仍需用 `node ./node_modules/gulp/bin/gulp.js test` 兜底。

---

### P1-2 · 管理员通道无速率/连接限制，多 Bot 场景易被滥用

**证据**

- [apps/server/src/server.js:185](/Users/macminim4/Documents/New project/jyf0330-repos/agar.io-clone-master/apps/server/src/server.js)
  `/Users/macminim4/Documents/New project/jyf0330-repos/agar.io-clone-master/apps/server/src/server.js:185`
  `'0'/'1'/'2'/'3'` 事件处理中没有基于连接的速率限制，也没有全局每秒消息上限。
- [apps/client/src/app.js:466](/Users/macminim4/Documents/New project/jyf0330-repos/agar.io-clone-master/apps/client/src/app.js)
  `/Users/macminim4/Documents/New project/jyf0330-repos/agar.io-clone-master/apps/client/src/app.js:466`
  客户端每帧发 `'0'` 心跳/目标。
- 无 Redis adapter、无集群、无连接数上限。

**影响**：不是当前 bug，但**扩展 AI/Bot 就是多连接高频写**，这条是必踩。

**建议做法**

- 每连接最小节流（如 `0` 事件 ≤ 60 Hz、`pass`/`kick` ≤ 5/min）。
- 全局连接数上限 + 每 IP 并发连接上限（可先做简单内存版）。
- 如果要横向扩，再引入 `@socket.io/redis-adapter`。

---

## P2 · AI/Bot 扩展之前要还的架构债

说明：这些**不是当前 bug**，但只要你开始写 Bot、LLM 决策、训练、回放，这几条就会立刻咬人。

### P2-1 · 网络协议用数字事件名，外部 Bot 无法靠"常识"接入

- [apps/server/src/server.js:185](/Users/macminim4/Documents/New project/jyf0330-repos/agar.io-clone-master/apps/server/src/server.js)
  `/Users/macminim4/Documents/New project/jyf0330-repos/agar.io-clone-master/apps/server/src/server.js:185`
  监听 `'0' / '1' / '2' / '3'`。
- 建议做法：要么加一层"语义别名"（`move` → `0`），要么先把协议写成 [docs/09-socket-and-sync-protocol.md](/Users/macminim4/Documents/New project/jyf0330-repos/agar.io-clone-master/docs/09-socket-and-sync-protocol.md) 的强约束版，写 Bot 时严格只看文档。

### P2-2 · 客户端只看到"视口内世界"，AI 观察是受限观测

- [apps/server/src/map/map.js:39](/Users/macminim4/Documents/New project/jyf0330-repos/agar.io-clone-master/apps/server/src/map/map.js)
  `/Users/macminim4/Documents/New project/jyf0330-repos/agar.io-clone-master/apps/server/src/map/map.js:39`
- [apps/server/src/lib/entityUtils.js:7](/Users/macminim4/Documents/New project/jyf0330-repos/agar.io-clone-master/apps/server/src/lib/entityUtils.js)
  `/Users/macminim4/Documents/New project/jyf0330-repos/agar.io-clone-master/apps/server/src/lib/entityUtils.js:7`
- 影响：客户端 AI 天然是 partial observation，做全局策略会偏。
- 建议做法：上 AI 时显式注明"输入是局部观测"，要全局视野就走服务端特权通道，不要偷偷加给所有客户端。

### P2-3 · 客户端坐标 vs 服务端坐标容易混淆

- [apps/client/src/app.js:387](/Users/macminim4/Documents/New project/jyf0330-repos/agar.io-clone-master/apps/client/src/app.js)
  `/Users/macminim4/Documents/New project/jyf0330-repos/agar.io-clone-master/apps/client/src/app.js:387`
  客户端做 world→screen 变换。
- 服务端有独立的质量/半径/移动计算（见 [apps/server/src/map/player.js](/Users/macminim4/Documents/New project/jyf0330-repos/agar.io-clone-master/apps/server/src/map/player.js)）。
- 建议做法：写 Bot 接入层时，明确 API 只返回 world 坐标，屏蔽 screen 变换；不要让 AI 决策吃到屏幕像素。

### P2-4 · `Math.random()` 泛滥，无 seed / 无回放

- 仓库内大量 `Math.random()`（食物/病毒/出生位置等）。
- 影响：做训练、回放、行为对比都不可复现。
- 建议做法：引入可注入 RNG（比如 seedrandom），服务端一个全局实例，关键路径（出生位置、食物分布、病毒刷新）全部走这个，留出 seed 配置。

---

## 你清单里目前"不成立 / 不适用"的项

- 原 `4`（Socket.IO 2.x 老旧）：**不成立**，[package.json:59-60](/Users/macminim4/Documents/New project/jyf0330-repos/agar.io-clone-master/package.json) 已经是 `^4.6.1`。
- 原 `10`（没有多 cell 支持）：**不成立**，[apps/server/src/map/player.js:108/188/208](/Users/macminim4/Documents/New project/jyf0330-repos/agar.io-clone-master/apps/server/src/map/player.js) 都是基于 `player.cells[]`。
- 原 `11–13 / 16–17`（LLM/推理服务/Key 管理）：**目前没代码**，不适用。
- 原 `14–15`（Mongo/AI 日志）：**不适用**，项目用 SQLite，见 [package.json:61](/Users/macminim4/Documents/New project/jyf0330-repos/agar.io-clone-master/package.json) 和 [apps/server/src/sql.js:35](/Users/macminim4/Documents/New project/jyf0330-repos/agar.io-clone-master/apps/server/src/sql.js)。
- 原 `20`（前端体积爆炸）：**暂不严重**，当前 `dist/client/js/app.js` 约 127 KiB。

---

## 建议的动手顺序

1. **P0-1 跨平台脚本**（改 `package.json`，验证 `npm run build` + `npm start` 在 macOS 通过）。
2. **P0-2 默认管理员密码**（env 化 + 默认关闭管理员命令）。
3. **P0-3 Node 版本锁定**（`.nvmrc` + `engines` + Dockerfile 基础镜像）。
4. P1-1 依赖分批升（先 runtime 再 dev 工具链）。
5. P1-2 事件节流 / 连接上限（为后面 Bot 做准备）。
6. P2-* 在真正要动 AI/Bot 之前再一起处理。

每一步**修完后**都应至少跑一遍：

```
node ./node_modules/gulp/bin/gulp.js test
node ./node_modules/gulp/bin/gulp.js build
```

以及浏览器打开 `http://localhost:3000` 冒烟一次，确认没有回归。
