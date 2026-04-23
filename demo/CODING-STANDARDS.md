> ## DEPRECATED · 本文件已被 [demo/CODING-STANDARDS-v3.md](CODING-STANDARDS-v3.md) 替代
>
> **2026-04-24 更新**：V2（7 天 / 玩法创意赛道）已整体归档，现行计划为
> [demo/PLAN-v3-track2.md](PLAN-v3-track2.md)（21 天 / 赛道 2 · 智能 NPC）。
>
> V3 的代码规范在 [demo/CODING-STANDARDS-v3.md](CODING-STANDARDS-v3.md)。
> 本文件只保留作"V2 规范档案"，供将来回看。
>
> **请不要按本文件开工。** 现在的红线、依赖白名单、socket 事件前缀、
> Python 依赖策略都已经在 V3 版里更新过。

---

# Demo V2 · 代码规范（7 天冲刺版 · 已归档）

> 配套文档：[demo/PLAN-v2.md](PLAN-v2.md) · 已归档
> `/Users/macminim4/Documents/New project/jyf0330-repos/agar.io-clone-master/demo/PLAN-v2.md`
>
> **这份规范只服务于 7 天冲刺，不是通用工程规范。**
> **一条规则如果"demo 前一周"内不会影响验收结果，就不写。**
>
> 主审规则（和 PLAN-v2 一致）：
> - 方向已锁，不讨论架构。
> - 所有"顺便加一个 / 改一下 / 这样更好吧"走 `icebox.md`，demo 后再说。
> - 每晚 19:00 面对面过当日 ✅；过不了不许连夜加班改第二天的事。

---

## 0. 一句话心法

> **让 Day 7 能顺利录出 3 份可播放 MP4** 是唯一目标。
> 任何写出来的代码，先问："这行代码和 3 份 MP4 有关系吗？"——没关系就删掉或进 icebox。

---

## 1. 分支 / 提交 / 每日 checkpoint

### 1.1 分支
- 只用 `fix/apr20-launcher`，不回 `master`，不新开 feature 分支。
- 如果必须做"可能失败的尝试"，用 `git stash` 或本地临时 commit，**不要**推到远端新分支——远端分支越多，demo 日越混乱。

### 1.2 提交信息
**格式**：`v2-day{N}: {做了什么}`

- 每个 commit 必须对应 PLAN-v2 里的一条"✅ 验收项"，不要做"重构式"commit。
- **反例**：`refactor: extract helper`、`wip`、`update`、`fix bug`。
- **正例**：`v2-day1: load skeleton PNG as canvas background`、`v2-day2: add --demo-bots=2 flag`。

### 1.3 每日 checkpoint（强制）
收工前 5 分钟，往 [progress.md](../progress.md)（`/Users/macminim4/Documents/New project/jyf0330-repos/agar.io-clone-master/progress.md`）末尾追加一行（格式见 PLAN-v2 第八节）。
不写 = 当天没完成，不管代码写了多少。

---

## 2. 目录布局约定

### 2.1 demo 相关新文件一律进 `demo/` 子目录
| 类型 | 路径 |
|---|---|
| 计划 / 规范 / 交付物说明 | [demo/](/Users/macminim4/Documents/New project/jyf0330-repos/agar.io-clone-master/demo/) |
| 骨架底图 PNG（MJ 跑完降采样后） | `demo/assets/skeletons/skel-{1..5}.png` |
| Bot 轨迹 JSON | [demo/bots/](/Users/macminim4/Documents/New project/jyf0330-repos/agar.io-clone-master/demo/bots/) |
| 点评池 JSON + 规则 | [demo/critiques/](/Users/macminim4/Documents/New project/jyf0330-repos/agar.io-clone-master/demo/critiques/) |
| 录像 MP4 | `demo/videos/`（Day 6 新建） |

### 2.2 游戏代码改动落点
| 改动 | 位置 |
|---|---|
| 骨架底图加载 / 合成 | [apps/client/src/](/Users/macminim4/Documents/New project/jyf0330-repos/agar.io-clone-master/apps/client/src/) 新文件 `skeletonBase.js` |
| 本地 P2 输入路由 | `apps/client/src/inputRouter.js` |
| Bot 回放（假玩家） | [apps/server/src/](/Users/macminim4/Documents/New project/jyf0330-repos/agar.io-clone-master/apps/server/src/) 新文件 `botPlayback.js` |
| 90 秒局时 / 慢动作收尾 | 改 [apps/server/src/server.js](/Users/macminim4/Documents/New project/jyf0330-repos/agar.io-clone-master/apps/server/src/server.js) + `apps/client/src/slowmo.js`（新） |
| 本地点评池查询 | `apps/server/src/critiquePool.js`（新） |
| 涂改机制（只叠不抢） | 改 [apps/server/src/map/player.js](/Users/macminim4/Documents/New project/jyf0330-repos/agar.io-clone-master/apps/server/src/map/player.js) 的死亡处理 + 客户端渲染层 |

### 2.3 红线目录
- **不改** `node_modules/`、`dist/`（gulp 每次都会重建）。
- **不改** `graphify-out/`（AST 生成物）。
- **不新建** `src/`、`lib/`、`utils/` 这类顶层泛用目录——所有新代码进 `apps/...` 或 `demo/...`。

---

## 3. JavaScript 规范

### 3.1 保持现有风格，不做大扫除
- 项目已有 [.eslintrc](/Users/macminim4/Documents/New project/jyf0330-repos/agar.io-clone-master/.eslintrc) 和 [.babelrc](/Users/macminim4/Documents/New project/jyf0330-repos/agar.io-clone-master/.babelrc)，沿用。
- **不要**顺手加 `prettier`、`typescript`、`eslint-plugin-xxx`、改 webpack config。Day 7 之前任何工具链变动都算 icebox。
- 提交前本地必须跑过：
  ```
  node ./node_modules/gulp/bin/gulp.js test
  node ./node_modules/gulp/bin/gulp.js build
  ```
  （不要用 `npm start` / `npm run build`——当前 [package.json:6-11](/Users/macminim4/Documents/New project/jyf0330-repos/agar.io-clone-master/package.json) 是 Windows 风格脚本，在 macOS/Linux 会失败。修它属于 icebox，demo 后再动。）

### 3.2 风格硬规矩（违反直接 revert）
1. **不加默认导出 / ESM 混 CJS**。服务端保持 `module.exports = ...`，客户端保持现有 webpack 入口风格。
2. **不引入新依赖**（除非 PLAN-v2 第六节已点名）。凡是要 `npm install xxx` 的想法先进 icebox。
3. **所有新文件顶部加一行中文说明**，写"这个文件在 V2 里负责什么"。一行就够，别写成 JSDoc。
4. **函数 ≤ 50 行**。超了拆——但也别拆成 10 个 3 行函数，找到一个"能在验收当晚讲清楚"的粒度。
5. **不抽象**。7 天里禁止写 `AbstractXxxFactory` / `BaseController` / `StrategyRegistry`。一个 `function` + 一个 `if/else` 能解决就是答案。
6. **客户端坐标 vs 世界坐标分开**：新代码里变量必须带后缀，`xWorld / yWorld` vs `xScreen / yScreen`，不许出现裸 `x / y`。避开 PLAN-v2 #9 的潜在 bug。

### 3.3 日志
- 用 `console.log('[V2] ...')` / `console.error('[V2] ...')` 前缀。demo 日要能 `grep V2` 快速筛本届改动引入的问题。
- **不要**自己造 logger 模块。

---

## 4. Socket 协议

### 4.1 现有数字事件（`'0'/'1'/'2'/'3'`）
**不重命名**。服务端在 [apps/server/src/server.js:185](/Users/macminim4/Documents/New project/jyf0330-repos/agar.io-clone-master/apps/server/src/server.js) 已经监听了，客户端每帧发 [apps/client/src/app.js:466](/Users/macminim4/Documents/New project/jyf0330-repos/agar.io-clone-master/apps/client/src/app.js:466)。改名 = 前后端不兼容 + demo 日风险。

### 4.2 新事件命名规则
V2 里新增的 socket 事件**必须用语义名 + 前缀**：

| 场景 | 事件名 |
|---|---|
| 服务端推送"90 秒结束，进入慢动作" | `v2:matchEnd` |
| 服务端推送"someone painted on you" toast | `v2:paintStroke` |
| 客户端请求"我用 P2 键位输入"（本地双人） | `v2:p2Input` |
| 服务端推送"本局点评" | `v2:critique` |

**规则**：`v2:` 前缀 + camelCase 动词短语；payload 用对象 `{ ... }` 不用数组。

### 4.3 节流最小版
- 新增 `v2:p2Input` 必须客户端侧 `≤ 60 Hz`（`setInterval(16ms)` 或 `requestAnimationFrame` 节流），**不要**每帧发。
- 服务端收到 `v2:paintStroke` 必须每连接 `≤ 10 Hz` 限流（简单 `Map<socketId, lastTs>` 即可）。

---

## 5. Python（只用在 `demo/scripts/`）

### 5.1 约束
- **Stdlib-only**，不要 `pip install numpy/pandas/opencv`。[demo/scripts/generate_bots.py](/Users/macminim4/Documents/New project/jyf0330-repos/agar.io-clone-master/demo/scripts/generate_bots.py) 已经这样写了，后续脚本沿用。
- 顶部加文件级中文注释（项目已有 python-chinese-comments 约定）。
- 函数上方单行中文注释，不写 docstring。
- 输入输出用 JSON 文件，不用 stdin/stdout 管道——demo 日要的是"双击就能重跑"。

### 5.2 生成物要可复现
- 脚本如果用了随机性（`random`），必须**支持 `--seed` 参数**且有默认值。没有 seed 的脚本不合格。
- 这对应 PLAN-v2 附加风险 #3（Bot 看起来像真人要能调参数再跑）。

---

## 6. 资产 / JSON 数据

### 6.1 骨架 PNG
- 放 `demo/assets/skeletons/skel-{1..5}.png`，严格 5 张、不能 4 张也不能 6 张。
- 规格按 [demo/prompts/skeleton-bases.md](/Users/macminim4/Documents/New project/jyf0330-repos/agar.io-clone-master/demo/prompts/skeleton-bases.md) 执行。
- 客户端加载按固定命名 `skel-${1..5}.png`，**不要**动态 `readdir`——多一张少一张都是 demo 日 bug。

### 6.2 Bot JSON
- Schema 锁定在 [demo/bots/README.md](/Users/macminim4/Documents/New project/jyf0330-repos/agar.io-clone-master/demo/bots/README.md)，不自行扩展字段。
- 服务端加载时**必须 validate**：帧数 = 450、每帧有 `{x, y, facing}`，否则启动 fail-fast，不要"容错读"。

### 6.3 点评池 JSON
- 在 [demo/critiques/pool.json](/Users/macminim4/Documents/New project/jyf0330-repos/agar.io-clone-master/demo/critiques/pool.json) 里增删，**不要**拆成多个文件。
- 每条必须跑 [demo/critiques/README.md](/Users/macminim4/Documents/New project/jyf0330-repos/agar.io-clone-master/demo/critiques/README.md) 的 lint（禁词、长度），Day 4 验收项之一。

---

## 7. 配置与密钥

### 7.1 禁止硬编码
- 当前 [configs/game/config.js:22](/Users/macminim4/Documents/New project/jyf0330-repos/agar.io-clone-master/configs/game/config.js) 已经踩过 `adminPass: "DEFAULT"` 的坑（见 [docs/12-priority-fix-list.md](/Users/macminim4/Documents/New project/jyf0330-repos/agar.io-clone-master/docs/12-priority-fix-list.md) P0-2）。
- **V2 新加配置一律读 `process.env.XXX`**，没有默认值或默认值等于"关闭功能"，不要给一个能用的默认值。
- 例：LLM key 只走 `process.env.LLM_API_KEY`，不存在就立刻走本地 fallback，不报错也不重试。

### 7.2 可调参数放到一个文件
所有 V2 新加的可调参数（局时 90、慢动作饱和度 +60%、透明度 30%、匹配阈值 6 / 5 ...）集中放 `apps/server/src/v2Config.js`（新文件），不散在代码里。

理由：Day 6 / Day 7 彩排大概率要现场调数，分散在 10 个文件里会死。

---

## 8. 错误处理 / fallback（demo 日的命根子）

### 8.1 "绝不崩"优先级（从高到低）
1. **点评池**：LLM 超时 / 报错 / 返回违禁词 → 立即走本地池，**不重试、不报 toast、不让玩家察觉**。
2. **Bot 回放**：JSON 解析失败 → 用"原地站桩"假玩家兜底，服务端日志 `[V2] bot fallback`，游戏继续。
3. **骨架底图**：PNG 加载失败 → 用纯白底 + 警告色 debug overlay（只在开发模式显示），demo 模式下静默使用白底。
4. **P2 输入**：输入路由异常 → 退回单人模式，不阻塞 P1。

### 8.2 规矩
- 凡是"demo 现场可能炸"的 I/O（网络、fs、JSON.parse），必须 try/catch + 本地 fallback。
- fallback 分支**必须有单独一行日志** `console.warn('[V2 fallback] <场景>')`，Day 7 彩排靠它快速判断哪条兜底被触发过。
- 不要在 fallback 里做复杂逻辑——fallback 的目标是"继续走完这局"，不是"恢复原状"。

---

## 9. 验收 & 收工动作（每天收工必须做）

### 9.1 本地冒烟（每个 commit）
```
node ./node_modules/gulp/bin/gulp.js test
node ./node_modules/gulp/bin/gulp.js build
# 然后浏览器开 http://localhost:3000，跑一局，看控制台
```
只要 test 红、build 红、或控制台报新 error，**当日验收直接挂**，不许"明天一起修"。

### 9.2 PLAN-v2 每日 ✅ 勾选
PLAN-v2 每一天都有明确 `[ ]` 勾选项，收工时逐条勾掉。**勾不完不要勾半个**，写明阻塞点到 progress.md。

### 9.3 Graphify 同步（AGENTS.md 强制）
按 [AGENTS.md](/Users/macminim4/Documents/New project/jyf0330-repos/agar.io-clone-master/AGENTS.md) 要求，当天改完代码后跑一次：
```
graphify update .
```
（AST-only，不花 API 钱。忘了就 push 前补跑。）

---

## 10. icebox 使用

项目根目录 [icebox.md](/Users/macminim4/Documents/New project/jyf0330-repos/agar.io-clone-master/icebox.md)（没有就 Day 1 新建），格式见 PLAN-v2 第七节。

**什么算 icebox**：
- "这个函数可以 refactor 一下"
- "要不要加个 TypeScript？"
- "能不能再加一种骨架/点评类型？"
- "要不要把 socket 事件名改一下？"
- "加一个 replay 功能吧"

**什么不算 icebox，该立刻修**：
- PLAN-v2 当日 ✅ 里的验收项
- 控制台红字 error / 构建挂 / 测试红
- demo 日会被评委直接看到的视觉 bug

**怎么判断**：看 PLAN-v2.md 的 Day N 验收列表，列表里有 → 修；列表里没有 → icebox。

---

## 11. 红线（出现了直接 revert）

| 红线 | 原因 |
|---|---|
| 引入新 npm / pip 依赖 | 7 天内装新依赖容易连锁崩 |
| 改 `gulpfile.js` / `webpack.config.js` / `package.json` scripts | 构建工具链一炸全组停工 |
| 改 socket 数字事件 `'0'/'1'/'2'/'3'` | 前后端协议断裂 |
| 把 demo 代码写进 `configs/` 或 `apps/` 顶层 | 目录布局乱，demo 后清理成本高 |
| 动 `node_modules/` 或 `dist/` | 构建产物，不是源 |
| 写默认密码 / 默认 API key | 见 [docs/12 · P0-2](/Users/macminim4/Documents/New project/jyf0330-repos/agar.io-clone-master/docs/12-priority-fix-list.md) |
| 为了"代码更好看"做 refactor，但没对应 ✅ 验收项 | 不服务于 3 份 MP4 |

---

## 12. 三条 demo 日"保命"约定

1. **demo 前 24 小时代码冻结**（Day 7 下午彩排之后只改文案、不改代码）。
2. **所有改动必须本地录屏过一遍**再 commit，commit message 贴录屏时间戳（简单 `date` 输出即可）。
3. **Day 7 晚打包 `demo/videos/` 到 U 盘**，U 盘里附一份 `PLAN-v2.md` 的 PDF 版本——笔记本万一启动不了还能放 U 盘接投影口播。

---

*本规范最后更新：Demo 前 Day 0 晚（与 PLAN-v2 同步锁定）*
*有疑问：先对照 PLAN-v2 和 [docs/12-priority-fix-list.md](/Users/macminim4/Documents/New project/jyf0330-repos/agar.io-clone-master/docs/12-priority-fix-list.md)，再来找我。不要自己做决定。*
