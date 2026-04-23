> ## DEPRECATED · 本文件已归档
>
> **2026-04-24 更新**：项目切到 V3 赛道 2 方案。本文件的 Day 1-2 内容（骨架模板 + 双人同屏 + 预录 bot）**不再适用**。
>
> V3 的 Week 1 handoff 在 [demo/handoff/week1.md](week1.md)。主计划在 [demo/PLAN-v3-track2.md](../PLAN-v3-track2.md)。
>
> 本文件保留做历史记录。

---

# Day 1–2 TODO · 给程序员的执行单（V2 · 已归档）

**发件人**：{{你的名字}}
**收件人**：{{程序员名字}}
**主送**：{{策划 / 设计 抄送}}
**主题**：Demo V2 · Day 1–2 任务锁定（方向已冻，请按单走）

---

## 零、两句话开头

我已经和外部顾问锁死 V2 方案。接下来 7 天只按这个走。
**任何"顺便加个 … "的想法，先写进 `icebox.md`，demo 之后再说，不加进代码。**
**每晚 19:00 我在你电脑前验收当天的 ✅，过了才进下一天。**

---

## 一、背景（1 分钟读完）

Master 分支有个"空白画板画不出来"的 bug，我们不修它。**绕过**。
绕的方式是：玩家不再从零画 avatar，而是从 **5 张预生成的骨架 PNG** 里随机选一张，
20 秒内**在骨架上面加 10 笔**（只叠加笔触，不改底图，不改 JSON）。

我已经交付了 3 份东西你可以直接用（**不要自己重做**）：

| 你需要的 | 路径 | 状态 |
|---|---|---|
| 5 张骨架 PNG 的 Midjourney prompt | `demo/prompts/skeleton-bases.md` | ✅ 今晚 {{你的名字}} 跑 MJ 产出 PNG，Day 1 早上 9 点前交给你 |
| 2 条 Bot 轨迹 JSON（Day 2 要用） | `demo/bots/bot1.json`、`demo/bots/bot2.json`（+ `README.md`） | ✅ 已生成，fps=5，90s，450 帧 |
| 点评池 + 匹配规则（Day 4 要用，你先 Day 1–2 别管） | `demo/critiques/pool.json`、`demo/critiques/README.md` | ✅ 已写好 30 条，20 条占位策划在补 |

---

## 二、Day 1 任务：骨架模板化画板（6 小时）

### 2.1 范围（只做这些，其它都别碰）

1. 新增 `apps/client/src/avatar-skeleton-loader.js`：
   - 启动时预加载 `demo/assets/skeleton-bases/skeleton-{a..e}-*.png` 这 5 张
   - 导出 `getRandomSkeleton()` / `getSkeletonByKey(key)`

2. 改 `apps/client/src/player-card-editor.js`（320×320 的那个画板）：
   - 初始化时调 `getRandomSkeleton()` 选一张，作为**最底层**绘制到 canvas（不是最后一层，是最底层）
   - 玩家的笔触画在骨架**之上**，各自独立成一层（沿用现有 layers 机制）
   - 保存时 export 一张合成 PNG，不要导出骨架的 key 或 JSON 层级（简单粗暴：`canvas.toDataURL()`）

3. 不要改：
   - `avatar-draft-controller.js` 的状态机结构
   - `player-card-layers.js` 的层模型字段名
   - 任何 server 端代码

### 2.2 文件放置约定（严格遵守）

```
apps/client/src/avatar-skeleton-loader.js      ← 新增，你 Day 1 写
demo/assets/skeleton-bases/skeleton-a-doll.png  ← {{你的名字}} 今晚放
demo/assets/skeleton-bases/skeleton-b-blob.png
demo/assets/skeleton-bases/skeleton-c-ghost.png
demo/assets/skeleton-bases/skeleton-d-robot.png
demo/assets/skeleton-bases/skeleton-e-bean.png
```

打包/路径怎么让 webpack 看到这些 PNG，按你熟悉的方式处理（`require('...')` 或
`import.meta.url`，能跑就行，**不要花 2 小时选"最干净"方案**）。

### 2.3 Day 1 验收（19:00 我在你电脑前做这 5 步）

- [ ] 打开 `http://localhost:{port}`，进到 avatar 编辑页面
- [ ] 页面上**看到一张骨架底图**（不是空白 canvas）
- [ ] 连续刷新 10 次，**5 种骨架都至少出现过一次**（随机分布）
- [ ] 画 10 笔（任意颜色），**底图不被覆盖**（骨架线还能看到）
- [ ] 点保存 → 进游戏 → 看到自己那个 avatar 是"骨架 + 10 笔"的合成图
- [ ] 控制台 **0 报错**（warning 允许，error 不允许）

5 个全过 = Day 1 ✅。过一条或四条都不算过，我会让你回来继续。

### 2.4 不在 Day 1 做的事（写进 `icebox.md` 就行，别开工）

- ~~修"空白画板画不出来"的根因 bug~~
- ~~给骨架加动画/过渡效果~~
- ~~允许玩家二次挑骨架~~
- ~~骨架预览的小缩略图 UI~~
- ~~"骨架风格切换"菜单~~
- ~~支持上传自定义 PNG~~

这些 demo 后再说。

---

## 三、Day 2 任务：本地双人同屏 + Bot 回放（8 小时）

### 3.1 范围

1. **本地双人同屏**：一台电脑，Player1 用 WASD，Player2 用方向键
   - 客户端加"debug 二号玩家"开关（URL `?p2=1` 或 F2 键都行）
   - 两个玩家**走同一个 socket**（不是开两个 tab），只是本地 input router 分两路
   - 不需要 split-screen 摄像机，共用一个视野就行（demo 时两人都看大屏）

2. **Bot 回放**：服务端加启动参数 `--demo-bots=2`
   - 启动时读 `demo/bots/bot1.json` 和 `demo/bots/bot2.json`
   - 按 `meta.fps`（5 FPS）把每帧 `{x, y, facing}` 塞进 `players[botId]` 的 position
   - bot 有正常的 avatar 显示（用 `meta.skeleton` 对应那张骨架 + 一些预设笔触 = 我给你一个固定 asset）
   - 格式细节、消费建议都在 `demo/bots/README.md`，**一定先看那个文件再动手**

3. **不要做**：
   - 真联机（socket.io 跨机器）—— demo 不用
   - Bot AI（追人、躲人）—— 预录就够了
   - "第 5 个真人" 接口 —— 4 人封顶

### 3.2 Bot 生命周期细节（避免 Day 2 晚上才发现坑）

- Bot 是**假玩家**，但走完整 player 生命周期：有 hp、有 avatar、能被撞、会死。
- Bot 不会主动撞别人（它只按录像动）。**这是 feature，不是 bug**。
- 真人撞 bot 时，**照常触发 Day 3 的"涂一笔"逻辑**（Day 3 的事你 Day 2 别写，但
  要保证 bot 的 avatar 数据结构和真人完全一致，Day 3 拿来就能用）。
- 回放 450 帧走完后，bot **停在最后一帧**（不消失、不重新开始），
  配合 Day 4 的 90 秒局结束慢动作。

### 3.3 Day 2 验收（19:00）

- [ ] `npm run dev` 起服务，带 `--demo-bots=2` 参数
- [ ] 本地打开一个 tab，按 F2（或 `?p2=1`）进入双人模式
- [ ] 开局后，**屏幕上有 4 个角色**（P1, P2, Bot1 = Mochi 粉, Bot2 = Tofu 蓝）
- [ ] P1 用 WASD 能动、P2 用方向键能动、两只 bot 自动在走
- [ ] Bot1 起点约 (1800, 2600)，Bot2 起点约 (3200, 2400)—— 不重叠
- [ ] 连续看 90 秒，bot **不卡住**、**不穿墙**、**不闪回**
- [ ] 控制台 0 error

6 个全过 = Day 2 ✅。

### 3.4 不在 Day 2 做的事

- ~~涂一笔的视觉效果（Day 3）~~
- ~~局末慢动作 + 点评（Day 4）~~
- ~~LLM 接入（Day 5）~~
- ~~美化 / BGM / 滤镜（Day 6）~~
- ~~bot 的"个性化" AI~~

---

## 四、通用规则（两天都适用）

1. **19:00 验收前不要改 master 分支**，都在 `fix/apr20-launcher` 上继续。
   每天收工前 commit 一次，message 用 `[v2-day1] ...` / `[v2-day2] ...`。

2. **遇到任何"是不是应该顺便…"的念头**：
   - 打开 `icebox.md`（项目根目录没有就新建）
   - 写一行日期 + 想法
   - 关掉文件，继续当前 todo

3. **遇到技术不确定**（"这个 api 该不该用"之类），**立刻在群里 @ 我**，不要
   自己研究 45 分钟。我的回答可能是"你决定"，但我至少知道进度卡在哪。

4. **遇到阻塞**（画板 bug 冒出来、webpack 莫名报错、macOS 权限弹窗 …）：
   - 尝试 30 分钟
   - 还没解决就**立刻找我**，不要撑到 22:00 才说
   - 我们一起决定是绕过还是硬啃

5. **每天收工前 5 分钟，在 `progress.md` 末尾加一行**：
   ```
   - YYYY-MM-DD: v2-day{N} 完成 / 未完成，阻塞点：…
   ```

---

## 五、我明天早上 9:00 会给你的

- `demo/assets/skeleton-bases/skeleton-{a..e}-*.png` 这 5 张 PNG（今晚我跑 MJ）
- Bot 的"预设笔触合成 avatar 头像" 2 张 PNG（今晚顺手跑）
- 有任何问题今晚 23:00 前发我，明早 9:00 我到位

---

## 六、紧急联系

- 我：{{手机号}} / 微信 {{ID}}
- 策划：{{联系方式}}
- 场地彩排时间定 Day 7 下午 14:00，地点 {{待定}}

---

## 七、你回我一句就行

> "收到，Day 1 开干，按这个走。"

别的都不用回。

