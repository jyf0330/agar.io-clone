# Demo V3 · 代码规范（赛道 2 · 21 天版）

> 配套文档：[demo/PLAN-v3-track2.md](PLAN-v3-track2.md)
> `/Users/macminim4/Documents/New project/jyf0330-repos/agar.io-clone-master/demo/PLAN-v3-track2.md`
>
> V2 规范已归档：[demo/CODING-STANDARDS.md](CODING-STANDARDS.md)（顶部已挂 deprecated banner）
>
> **这份规范只服务于 V3 赛道 2 的 21 天冲刺。**
> **一条规则如果"Demo 日"当天不会影响评委看到的东西或 5 道必问题的演示，就不写。**
>
> 主审规则（和 PLAN-v3 一致）：
> - 方向已锁，不讨论赛道 / 架构。
> - 所有"顺便加一个 / 改一下 / 这样更好吧"走 `icebox.md`，参赛后再说。
> - 每晚 19:00 面对面过当日 ✅。
> - 每周日 15:00 里程碑过不了 → **砍功能保 demo，不延期，不加班**。

---

## 0. 一句话心法

> **让 3 份 demo 视频 + 白皮书 + 3 次彩排全过** 是唯一目标。
> 写每一行代码前先问："这行和评委 5 道必问题中哪一题有关？"（见 PLAN-v3 第五节 Q1–Q5）。
> 答不出来就进 icebox，不写。

---

## 1. 分支 / 提交 / 每日 checkpoint

### 1.1 分支
- 只用 `fix/apr20-launcher`，不回 `master`，不新开 feature 分支。
- 可能失败的尝试用 `git stash` 或本地临时 commit，不推远端。
- 里程碑节点（Day 7 / 14 / 20）推一次 tag：`v3-w1-milestone`、`v3-w2-milestone`、`v3-w3-milestone`。

### 1.2 提交信息
**格式**：`v3-day{N}: {做了什么}`
每个 commit 必须能映射到 PLAN-v3 某日验收项 `[ ]` 的其中一条。

- **反例**：`wip`、`refactor llm`、`update`。
- **正例**：`v3-day2: llm wrapper retry + sqlite cache`、`v3-day11: truncate old L2 when prompt > 1500 tokens`。

### 1.3 每日 checkpoint（强制）
收工前 5 分钟往 [progress.md](../progress.md)
（`/Users/macminim4/Documents/New project/jyf0330-repos/agar.io-clone-master/progress.md`）
末尾追加一行，格式见 PLAN-v3。不写 = 当天没完成。

### 1.4 里程碑视角
每周日 15:00 的 review 是硬门。过不了就按 PLAN-v3 第四节砍功能顺序砍，**立刻砍，当天砍完**，不拖到下周。

---

## 2. 目录布局约定

### 2.1 V3 新目录
| 类型 | 路径 |
|---|---|
| LLM 封装 | `apps/server/src/llm/`（新） |
| 记忆层 | `apps/server/src/memory/`（新） |
| NPC 编排 | `apps/server/src/npc/`（新） |
| 人设卡（YAML） | `demo/npcs/personality-cards/{mochi,doudou,wugui}.yaml` |
| 一致性测试 | `demo/consistency/` |
| 审计日志 | `data/audit/YYYY-MM-DD.jsonl` · **gitignore** |
| SQLite 数据库 | `data/memory.db` · **gitignore** |
| Demo 视频 | `demo/videos/week{1,2,3}/` |
| 白皮书 | `demo/submission/track2-whitepaper.md` |

### 2.2 V2 遗留目录（状态已变）
| 路径 | 状态 | 怎么处理 |
|---|---|---|
| [demo/bots/](/Users/macminim4/Documents/New project/jyf0330-repos/agar.io-clone-master/demo/bots/) | **废弃** | 不删，在 README 顶部加 `> Deprecated · V2 legacy`；代码里禁止再 `import` |
| [demo/scripts/generate_bots.py](/Users/macminim4/Documents/New project/jyf0330-repos/agar.io-clone-master/demo/scripts/generate_bots.py) | **废弃** | 同上，标 legacy |
| [demo/critiques/pool.json](/Users/macminim4/Documents/New project/jyf0330-repos/agar.io-clone-master/demo/critiques/pool.json) | **降级** | 从"主点评源"变成"LLM 失败时的 fallback 之一" |
| [demo/critiques/README.md](/Users/macminim4/Documents/New project/jyf0330-repos/agar.io-clone-master/demo/critiques/README.md) | **改版** | 按 V3 重写成"离线 fallback 使用指南" |
| [demo/handoff/day1-2.md](/Users/macminim4/Documents/New project/jyf0330-repos/agar.io-clone-master/demo/handoff/day1-2.md) | **归档** | 按 V3 重写成 `demo/handoff/week1.md`，旧文件标 deprecated |

### 2.3 红线目录
- **不改** `node_modules/`、`dist/`、`graphify-out/`。
- **不新建** 顶层 `src/`、`lib/`、`utils/`——新代码进 `apps/server/src/{llm,memory,npc}/` 或 `apps/client/src/`。
- **不往 git 提交** `data/memory.db`、`data/audit/*.jsonl`、`data/consistency/*.json`、`.env.local`。

---

## 3. JavaScript 规范

### 3.1 保持现有风格
- 继续用 [.eslintrc](/Users/macminim4/Documents/New project/jyf0330-repos/agar.io-clone-master/.eslintrc) 和 [.babelrc](/Users/macminim4/Documents/New project/jyf0330-repos/agar.io-clone-master/.babelrc)。
- 不引 Prettier / TypeScript / 新 eslint plugin。所有工具链改造进 icebox。
- 提交前本地必须跑过：
  ```
  node ./node_modules/gulp/bin/gulp.js test
  node ./node_modules/gulp/bin/gulp.js build
  ```
  （**不要**用 `npm start` / `npm run build`——[package.json:6-11](/Users/macminim4/Documents/New project/jyf0330-repos/agar.io-clone-master/package.json) 是 Windows 风格脚本，在 macOS/Linux 会失败。修它属于 icebox。）

### 3.2 风格硬规矩
1. 服务端保持 `module.exports`，客户端保持 webpack 入口风格，不混 ESM。
2. **新文件顶部一行中文说明**，写"在 V3 里负责什么"。
3. 函数 ≤ 50 行，超了拆，但不强拆成 3 行函数族。
4. 禁止抽象工厂 / `AbstractXxx` / `StrategyRegistry` / 各种 "灵活的"设计模式——21 天里都是反面教材。
5. **坐标命名必须带后缀**：`xWorld / yWorld` vs `xScreen / yScreen`，禁止裸 `x / y`（防 PLAN 附加风险点坐标混淆）。
6. **错误不吞**：`catch` 必须至少 `console.warn('[V3 fallback]...')`，然后走 fallback；不要 `catch {}`。

### 3.3 日志
- **业务日志**：`console.log('[V3] ...')` / `console.warn('[V3 fallback] ...')` / `console.error('[V3] ...')`。
  demo 日 `grep V3` 就是事故追查主武器。
- **LLM 审计日志**：走 `apps/server/src/llm/audit.js`（新），写入 `data/audit/YYYY-MM-DD.jsonl`。
  不要直接 `console.log` prompt 内容——既污染终端也没法复现。

---

## 4. Socket 协议

### 4.1 旧数字事件保留
现有 `'0'/'1'/'2'/'3'` **不重命名**。理由见 V2 规范，demo 日风险不吃。

### 4.2 V3 新事件命名
**必须** `v3:` 前缀 + camelCase 动词短语；payload 用对象 `{ ... }` 不用数组。

| 场景 | 事件名 |
|---|---|
| 服务端推送"NPC 发言" | `v3:npcUtter` |
| 服务端推送"NPC 涂你一笔" | `v3:npcPaint` |
| 服务端推送"局末摘要已生成" | `v3:sessionSummary` |
| 服务端推送"3 只 NPC 的打招呼" | `v3:npcGreet` |
| 客户端玩家发聊天给 NPC | `v3:playerChat` |
| 服务端通知"慢动作收尾" | `v3:matchEnd` |

### 4.3 废弃事件
- `v2:p2Input`（本地 P2 输入路由）**禁止出现在 V3 代码里**——V3 砍掉了双人同屏。

### 4.4 节流
- `v3:playerChat` 客户端侧最小 500ms 间隔。
- `v3:npcUtter` / `v3:npcPaint` 服务端推送无需节流（由 NPC Orchestrator 的 token 预算兜底，见 §5.3）。

---

## 5. LLM 调用纪律（V3 新增 · 最重要一章）

### 5.1 唯一入口
**所有 LLM 调用必须走** `apps/server/src/llm/wrapper.js`。
**红线**：任何业务代码（NPC、记忆、点评）直接 `require('openai')` 或 `fetch(...)` 去打 LLM 都是**违规**，当场 revert。

原因：
- 统一重试 / 超时 / 缓存 / token 预算 / 审计日志 / fallback。
- 漂移 / 预算爆了 / 断网场景要能一个地方改代码。

### 5.2 接口约定
以 [demo/handoff/week1.md](handoff/week1.md) Day 1 里的 wrapper 合同为准（该 handoff 是 Week 1 Day 1 开工蓝本）：

```js
const { ask } = require('./wrapper');

const result = await ask(promptId, params, {
  timeoutMs: 5000,   // 单次硬切
  useCache: true,    // 默认 true
});

if (!result.ok || result.source === 'fallback') {
  console.warn('[V3 fallback] llm', promptId, 'source=', result.source);
}
// 成功、走 cache、走 fallback 都会返回可用 text，业务代码直接用 result.text。
```

返回值字段（**所有 promptId 统一**）：

| 字段 | 类型 | 说明 |
|---|---|---|
| `ok` | `boolean` | 业务层拿得到可用文本。`true` = 走 LLM / cache / fallback 至少一个命中 |
| `text` | `string` | 可直接渲染；fallback 情况下也必须非空 |
| `source` | `'llm' \| 'cache' \| 'fallback'` | 审计 + Q2 演示要用 |
| `elapsedMs` | `number` | 审计 + 监控预算 |
| `tokenIn` | `number` | **必须真实填**（走 cache 时填 cache 命中时的值，走 fallback 填 0）；Q2 记忆膨胀演示的唯一依据 |
| `tokenOut` | `number` | 同上 |
| `promptId` | `string` | 回声，方便审计管道 |

`tokenIn` / `tokenOut` 在 handoff Day 1 草稿里没写，但 Q2（记忆膨胀）演示的时候要在审计日志里画长度曲线，所以 Wrapper 实作时**必须**把这两个字段加上，不要只返回 handoff 里的 4 个字段。

### 5.3 Prompt & Token 预算（硬上限）
- **单次预算**：输入 < 2000 token，输出 < 200 token。
- **全局预算**：每秒 ≤ 5 次调用（3 只 NPC × 1s 轮 + 偶发触发）。超了 wrapper 直接返回 `{ ok: false, reason: 'rate-limit' }`，业务走 fallback。
- 注入 prompt 前先走 `apps/server/src/llm/tokenizer.js` 估算长度，超了截断最旧 L2 摘要（保人设锚点 + L3 + 最新 1 条 L2 起步）。
- **所有 prompt 必须有 id**（字符串常量，枚举在 `apps/server/src/llm/prompts.js`）。不写"prompt = `你是一只猫...`"散在业务代码里。

当前规划的 prompt id（PLAN-v3 里提到的）：
- `npc_intent`（每秒 1 次 × 3 只）
- `npc_utter`（NPC 说话）
- `npc_reply_to_player`（玩家聊天回复）
- `summarize_session`（局末 L1 → L2）
- `update_persona_impression`（5 局 L2 → L3）
- `critique`（局末点评，V2 遗产改名）

**新增 prompt id 必须**：
1. 在 `prompts.js` 注册。
2. 配一条 fallback（可以是 `critiques/*.json` 里查表，也可以是硬编码常量）。
3. 在 `demo/docs/llm-wrapper.md` 里加一行说明。

### 5.4 Prompt 硬规则（禁词 / 安全）
所有输出都必须过**同一组校验**（写在 wrapper 层）：
- 长度 6–200 字。
- 不含禁词（见下"禁词表单一数据源"）。
- 不含玩家名的负面搭配（例如"阿柠很蠢"）。

校验不过 → **直接走 fallback**（返回值 `source: 'fallback'`），**不重试**。
业务代码**禁止**自己做这层校验——唯一入口原则。

#### 禁词表单一数据源（SSOT）
**禁词列表只存在一处**：
[demo/critiques/pool.json](/Users/macminim4/Documents/New project/jyf0330-repos/agar.io-clone-master/demo/critiques/pool.json) 的 `meta.forbiddenWords`。

**规矩**：
- Wrapper 启动时 `require('demo/critiques/pool.json').meta.forbiddenWords`，不许在 JS 代码里硬编码一份。
- handoff week1.md Day 2 示例里那段 `const bad = ['遗弃', ...]` 是草稿说明，**实际代码不能那么写**，必须读 JSON。
- 要新加禁词只改 `pool.json`，审稿 / 策划在一个文件里管住所有。
- Python 一致性脚本也一样，`json.load(open('demo/critiques/pool.json'))['meta']['forbiddenWords']`。

### 5.5 人设锚点（anchors）强制注入
- 每个 NPC 的 `demo/npcs/personality-cards/{id}.yaml` 里 `anchors` 段是**全字符串一字不改**塞进 `system` prompt。
- 注入模板写死在 `apps/server/src/npc/promptBuilder.js`，禁止绕过。
- 审计日志里必须能 `grep` 到 anchors 原文（PLAN-v3 Q3 的演示要当场给评委看）。
- 改 anchors 等于改人设，必须走 PR review（即使是 21 天内）；不允许悄悄 "调一下口吻"。

### 5.6 Cache 规则
- key = `hash(promptId + normalizedParams + personalityCardVersion + l3Version)`。
- L3 人物画像变了 → cache 自动失效（因为 key 里带版本）。
- 一致性测试的 15 个问题**必须** `cache: false`——要的就是漂移检测本尊。
- NPC intent 的 cache TTL ≤ 60 秒（否则所有 NPC 每秒同一 intent，demo 现场会被评委一眼看穿）。

### 5.7 API Key 管理
- 只从 `process.env.LLM_API_KEY`（或 provider 特定名）读，**不要**写进任何 `config/`、`*.json`、`*.yaml`。
- [.env.local](/Users/macminim4/Documents/New project/jyf0330-repos/agar.io-clone-master/.env.local) 放真 key，**必须在 .gitignore**。
- `.env.local.example` 入 git，只放占位 `LLM_API_KEY=<your-key-here>`。
- 没有 `.env.local` 时 wrapper 必须**仍然能启动**（fallback-only 模式），不能 `process.exit(1)`。

（延续 [docs/12 · P0-2](/Users/macminim4/Documents/New project/jyf0330-repos/agar.io-clone-master/docs/12-priority-fix-list.md) 的教训：**任何默认 API key / 密码进代码 = 红线**。）

---

## 6. 记忆层纪律（SQLite 三级）

### 6.1 唯一入口
所有对 `data/memory.db` 的读写必须走 `apps/server/src/memory/store.js`。
禁止散在业务代码里写 `db.prepare('...').run(...)`，一律通过 `store.insertEvent(...)` / `store.getLatestL2(npcId, playerId, n)` 之类语义接口。

### 6.2 三级职责边界（按 PLAN-v3 §3.4）
| 层 | 写入触发 | **是否进 prompt** | 保留策略 |
|---|---|---|---|
| L1 `events` | 玩家/NPC 每次动作 | **永远不进 prompt** | 只做审计，可按日期归档 |
| L2 `session_summaries` | 每局结束 | 最新 3 条进 prompt | 保留全部 |
| L3 `persona_impressions` | 每 5 局触发 | 整条进 prompt | 只保最新 1 条 / (npc × player) |

**硬规矩**：
- 代码里 `recallForPrompt(npcId, playerId)` 只允许返回 `{ l2Latest3, l3Current }`，根本没有"拿 L1 事件进 prompt"这条路径。
- 写 L1 事件必须用 `kind` 枚举（见 PLAN-v3 §3.4 示例），不接受自由字符串，防止一致性测试时字段名漂移。

### 6.3 Schema 迁移
- 所有 schema 变更写 `apps/server/src/memory/migrations/NNN-*.sql`，启动时自动跑。
- **不允许**线上热改 schema（21 天里也一样）——demo 前丢数据 = 丢记忆演示。
- SQLite 文件**不进 git**（见 §2.3）。

### 6.4 数据清理
- 任何 "drop all"、"truncate"、"delete from" 的调用**必须**包在 `store.resetForDev()` 之类的函数里，且在顶部 `if (process.env.NODE_ENV !== 'development') throw`。
- demo 环境（彩排、Demo 日）用单独存档目录，`data/demo-rehearsal/memory.db` 之类，不碰开发数据库。

---

## 7. 审计日志纪律

### 7.1 格式
每次 LLM 调用追加一行 JSON 到 `data/audit/YYYY-MM-DD.jsonl`：

```json
{"ts":1714000000,"promptId":"npc_intent","npcId":"mochi","playerId":"aning","tokenIn":842,"tokenOut":18,"cached":false,"ok":true,"promptHash":"sha1:...","outputPreview":"走向蓝色笔触"}
```

### 7.2 三条硬规矩
1. **不写完整 prompt**（体积会爆）。只写 hash + promptId + 关键 param。完整 prompt 要看的话走 dev-mode 开关 `process.env.V3_FULL_AUDIT=1`。
2. **不写 API key / 玩家隐私**（万一玩家在聊天里发了东西）。`outputPreview` 截断到 40 字。
3. **异步写**，不要阻塞 LLM 调用返回。写失败只 `console.warn`，不崩。

### 7.3 用途
- Q2（记忆膨胀）演示：`jq '.tokenIn' data/audit/*.jsonl | awk '...'` 画长度曲线。
- 事后复盘：Q3 的漂移调查。

---

## 8. Python 规范

### 8.1 依赖策略
V3 **对 Python 依赖有条件放宽**，只限以下白名单，其它仍然 stdlib-only：

| 依赖 | 用途 | 在哪 |
|---|---|---|
| `tiktoken` | Token 估算（consistency + 预算核对） | `demo/consistency/`、`demo/scripts/` |
| `openai` 或 `anthropic`（看 provider） | 一致性跑题直接打 LLM | `demo/consistency/run_consistency.py` |
| `sentence-transformers` | embedding 相似度打分 | `demo/consistency/score_drift.py` |
| `pyyaml` | 读人设卡 | 一致性脚本读 yaml |

**白名单之外**：禁止 `pip install`，想装新包先问 / 进 icebox。

装完后必须产出一份 `demo/consistency/requirements.txt`（固定版本），CI 或新人拉下来 `pip install -r` 就能跑。

### 8.2 风格
- 文件顶部一行中文说明（项目已有 python-chinese-comments 约定）。
- 函数上方单行中文注释，不写 docstring。
- 所有有随机性的脚本必须支持 `--seed`（继承 V2 规矩，对应 PLAN-v3 Q3 的可复现需求）。
- JSON 文件输入输出，不用管道。

### 8.3 一致性脚本特殊要求
- `run_consistency.py` 必须**走 LLM wrapper 的 HTTP 接口**（或者直接用 provider SDK 但 `cache=false`、`temperature` 固定），结果不能被 cache 污染。
- `score_drift.py` 输出必须包含：
  - 单题得分（0–100）
  - 每个 NPC 的汇总分
  - 全局平均分
  - 和上一次跑的对比（回归 / 改善）
- 分数 < 80% 触发 "需要重调 anchors 或降 temperature"——写进 `progress.md`，不是默默通过。

---

## 9. 资产 / JSON / YAML 数据

### 9.1 骨架 PNG
- 放 `demo/assets/skeletons/skel-{1..6}.png`，严格 6 张（V2 的 5 张 + 小乌龟 F）。
- 客户端按命名固定加载，不 `readdir`。

### 9.2 人设卡 YAML
- 路径固定：`demo/npcs/personality-cards/{mochi,doudou,wugui}.yaml`。
- **Schema 在 `demo/npcs/README.md` 写死**（`id / name / skeleton / color / archetype / anchors / behavior / relationship_schema`，见 PLAN-v3 §3.3）。
- 启动时加载必须**严格校验**——缺字段 fail-fast，不要 "容错读"。
- 改一张卡等于改一个 NPC 的核心人格，必须：
  1. 记录在 `progress.md`。
  2. 下次一致性测试必须跑。
  3. 改前把旧版 archive 到 `demo/npcs/personality-cards/archive/{id}-v{n}.yaml`。

### 9.3 Fallback JSON
- `demo/critiques/pool.json`（V2 遗产，改为点评 fallback）
- `demo/critiques/greetings.json`（新，NPC 打招呼 fallback）
- `demo/critiques/expectations.json`（新，局末期望 fallback）
- 3 个文件统一 schema（由 `demo/critiques/README.md` 定义 V3 版），禁止按文件结构各玩各的。
- 每个条目必须带 `tags`（情境匹配用）和过 lint（长度 / 禁词）。

### 9.4 一致性问题库
- `demo/consistency/questions.json`：3 只 NPC × 5 题 = 15 条。
- 改题 = 一致性历史数据作废，**禁止**在准备期（Day 12 之后）随便改题。
- 如果确实要改：必须同步重跑 baseline，且在 `progress.md` 留痕。

---

## 10. 配置与密钥

### 10.1 配置集中
所有 V3 可调参数进 `apps/server/src/v3Config.js`（新文件），按 section 分：

```js
module.exports = {
  llm: { timeoutMs: 5000, retry: 3, maxInTokens: 2000, maxOutTokens: 200, perSecondCap: 5 },
  memory: { l2KeepLatest: 3, l3TriggerEverySessions: 5 },
  game: { sessionSeconds: 90, gardenSize: 2000 },
  consistency: { passThreshold: 0.80 },
  ...
};
```

理由：Day 15 之后彩排会反复调数字，分散在 10 个文件里会死。

### 10.2 禁止硬编码密码 / Key（延续 V2 红线）
- [configs/game/config.js:22](/Users/macminim4/Documents/New project/jyf0330-repos/agar.io-clone-master/configs/game/config.js) 的 `adminPass: "DEFAULT"` **不要**作为样板——V3 新加的 admin / API key / provider secret 一律 `process.env.*`，没有就走 fallback 或关闭功能。

---

## 11. 错误处理 / Fallback（Demo 日的命根子）

### 11.1 Fallback 优先级（从高到低）
每个路径都**必须**走到底，不能"算了今天不演这段"。

| # | 场景 | 失败表现 | Fallback |
|---|---|---|---|
| 1 | LLM 调用（任何 promptId） | timeout / 429 / 被安全策略改写 / 返回违禁词 | wrapper 层直接走 fallback pool，**不重试**，业务无感 |
| 2 | SQLite 不可用 | 启动失败 / 写失败 | 启动失败 = fail-fast + 终端大红字；运行中写失败 = 降级成内存 map + `console.warn` |
| 3 | 人设卡 YAML 解析失败 | parse 报错 | fail-fast，**不允许** NPC 没有 anchors 还继续工作 |
| 4 | 骨架 PNG 加载失败 | 图片 404 | 用纯白底 + debug overlay（仅开发模式） |
| 5 | 玩家聊天 NPC 回复 LLM 挂 | 走 `critiques/greetings.json` 兜底，带当前人设 tag 匹配 |
| 6 | 断网 / 所有 LLM 调用挂 | NPC 仍能动（随机漫步 fallback）、能说话（硬编码的人设口头禅 + 少量 fallback 短语） |

### 11.2 规矩
- 每条 fallback 触发时**必须**一行 `console.warn('[V3 fallback] <场景> <原因>')`。
- Fallback 分支禁止复杂逻辑——目标是"继续这局"，不是"假装 LLM 没挂"。
- Demo 日预案（PLAN-v3 Q4）：准备一个"拔网彩排"——代码里要能承受每秒 5 次 LLM 调用全 timeout 的冲击。

---

## 12. 验收 & 收工动作

### 12.1 本地冒烟（每个 commit）
```
node ./node_modules/gulp/bin/gulp.js test
node ./node_modules/gulp/bin/gulp.js build
# 有网环境：http://localhost:3000 跑一局 90 秒，看控制台
# 无网环境（Day 2 之后每日做一次）：关 WiFi，再跑一局，确认 fallback 触发但游戏不崩
```

### 12.2 Token 预算抽样（Day 11 之后每日）
跑 10 局，抓审计日志：
```
tail -n 1000 data/audit/$(date +%Y-%m-%d).jsonl | jq '.tokenIn' | sort -n | tail
```
任何一次 `tokenIn > 2000` 都算当日不过，必须排查。

### 12.3 一致性定期跑（Day 12 之后）
每周日里程碑前：
```
python3 demo/consistency/run_consistency.py
python3 demo/consistency/score_drift.py
```
结果 < 80% = 里程碑过不了，按砍功能顺序处理。

### 12.4 Graphify 同步
按 [AGENTS.md](/Users/macminim4/Documents/New project/jyf0330-repos/agar.io-clone-master/AGENTS.md) 要求，改完代码后跑 `graphify update .`。

---

## 13. 里程碑与砍功能顺序（和 PLAN-v3 对齐）

Day 7 / 14 / 20 周日 15:00 任何一个里程碑过不了：**当场砍**，优先级从高到低：

1. **聊天框**（玩家→NPC 文字输入）— 砍了还剩"观察 + 自主对话"。
2. **涌现桥段 B**（调皮型追你）— 只留桥段 A（诗意型躲你）。
3. **3 只 NPC → 2 只**（砍掉 wugui 或 doudou，看哪只 prompt 调得稳）。
4. **技术视频**（展示 prompt 面板）— 只留主视频。

**不能砍的**（赛道 2 立身之本）：
- 长期记忆（L2 + L3 任何一个都不能没）
- 一致性测试（必须跑通且 ≥ 80%）
- 拔网 fallback

砍功能时**必须**同一天：
- 在 PLAN-v3 对应章节加 `~~删除线~~`。
- 在 `progress.md` 记"Day X 里程碑砍功能：XXX，原因：XXX"。
- 把相关代码用 `if (false)` 或删文件**彻底隔离**，不留"半活"状态。

---

## 14. icebox 使用（和 V2 一致）

项目根 [icebox.md](/Users/macminim4/Documents/New project/jyf0330-repos/agar.io-clone-master/icebox.md)（没有 Day 1 建），格式见 PLAN-v3。

**算 icebox**：
- "换个更大模型试试"
- "加第 4 只 NPC"
- "记忆加 embedding 检索"（V3 已经用了，但"加向量库"这种是 icebox）
- "给 NPC 加语音"
- "把 anchors 做成可视化编辑器"
- "加个 TypeScript / 改 webpack / ..."（还是老红线）

**不算 icebox，立刻修**：
- PLAN-v3 当日 `[ ]` 验收项。
- 控制台红字 error / 构建挂 / 测试红。
- 一致性分数 < 80%。
- 审计日志 `tokenIn > 2000`。
- Demo 日会被评委直接看到的视觉 / 文案 bug。

---

## 15. 红线（出现直接 revert）

| 红线 | 原因 |
|---|---|
| 业务代码绕过 `llm/wrapper.js` 直调 LLM | 破坏预算 / fallback / 审计 |
| 修改 `personality-cards/*.yaml` 的 `anchors` 段却没走 PR + 记录 | 人设漂移无法追溯 |
| 把 L1 `events` 塞进 prompt | 直接炸 token 预算 |
| 写默认 API key / 密码（含 `"DEFAULT"` / `"changeme"` / 空字符串视为"允许"） | 安全红线，延续 docs/12 P0-2 |
| 引入白名单外的 npm / pip 依赖 | 21 天内装新依赖等于打开一个未知战线 |
| 改 `gulpfile.js` / `webpack.config.js` / `package.json` scripts | 工具链一炸全组停工 |
| 改或重命名 socket 数字事件 `'0'/'1'/'2'/'3'` | 前后端断裂 |
| 提交 `data/memory.db` / `data/audit/*.jsonl` / `.env.local` | 泄密 + 仓库爆炸 |
| 动 `node_modules/` / `dist/` / `graphify-out/` | 构建产物，不是源 |
| 为了"代码更好看"做 refactor，但没对应 ✅ 验收项 | 不服务于 Q1–Q5 和 3 份 MP4 |

---

## 16. Demo 日"保命"约定

1. **Day 21 上午之后代码冻结**（下午只改白皮书文案 / 视频字幕 / PPT）。
2. 所有改动必须本地**录屏一次**再 commit，commit message 贴时间戳。
3. **提前玩 20 局存档**（Q5 需要）：从 Day 15 开始每天睡前玩 2 局真人，到 Day 20 正好 20 局 × 3 NPC 的 L3 演化可秀。
   - 存档目录 `data/demo-longhaul/`，**单独备份一份到 U 盘**。
4. U 盘里必须有：
   - 主视频 MP4
   - 技术视频 MP4
   - 一致性视频 MP4
   - 白皮书 PDF
   - PLAN-v3 PDF
   - 长线存档 `data/demo-longhaul/` 一份副本

---

*本规范最后更新：V2 → V3 转型日（2026-04-24），和 PLAN-v3-track2 同步锁定*
*有疑问：先对照 PLAN-v3 第五节 Q1–Q5，再找我。不要自己做决定。*
