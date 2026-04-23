# Demo V3 · 赛道 2「智能 NPC · 情感纽带与 AI 队友」版

> **状态**：V2 已被 V3 替代。V2 所有文档保留但标注为 Deprecated。
> **目标赛道**：赛道 2（AI NPC 长期记忆 + 情感连接 + 人设一致性）
> **周期**：21 天（V2 的 7 天 + 新增 2 周）
> **分支**：继续 `fix/apr20-launcher`
> **主审**：每晚 19:00 面对面验收 ✅；每周日下午 15:00 里程碑 review

---

## 零、和 V2 的关系（一页说清楚）

| 维度 | V2（旧） | V3（本文件） |
|---|---|---|
| 目标 | 投"玩法创意/Indie"类赛道 | 投赛道 2 · 智能 NPC · 情感纽带 |
| 叙事 | 4 人战场 · 互涂 avatar | 单人家园 · 你 + 3 只 AI 宠物 · 互涂 avatar |
| 核心 AI | 无（LLM 只是点评 bonus） | LLM 是 NPC 的驱动核心，**去掉 LLM 游戏无法成立** |
| Bot | 450 帧预录 JSON | 废弃。改为 LLM 实时驱动的 NPC |
| 记忆 | 无 | **长期记忆 + 摘要层级 + 跨会话** |
| 一致性 | 无 | **标准题库 + 漂移检测** |
| 离线兜底 | 完整游戏不依赖网 | 游戏能跑但 AI 质量降级（cached response） |
| 周期 | 7 天 | 21 天（3 周 3 里程碑） |

**V2 交付物的去向**：
- [demo/prompts/skeleton-bases.md](prompts/skeleton-bases.md) · 骨架 PNG prompt · ✅ **保留**（NPC 和玩家都用骨架）
- [demo/scripts/generate_bots.py](scripts/generate_bots.py) + `demo/bots/*.json` · ❌ **废弃**（真 NPC 不用录像）。文件不删，标为 "legacy，Day 1 debug 兜底用"。
- [demo/critiques/pool.json](critiques/pool.json) · ⚠️ **降级**为 V3 的离线 fallback（LLM 挂了时用）
- [demo/critiques/README.md](critiques/README.md) · ⚠️ **改版**：明确这是 fallback，不再是主路径
- [demo/handoff/day1-2.md](handoff/day1-2.md) · ❌ **归档**，按 V3 重写 Day 1-2 handoff
- [demo/PLAN-v2.md](PLAN-v2.md) · ⚠️ **加顶部 banner** 指向本文件

---

## 一、为什么 V3 能满足赛道 2：逐条对照

赛道 2 截图里的硬要求：

### 核心要求

> **通过 AI 技术实现 NPC 的长期记忆、性格定制及深度互动**

- V3 的 3 只 NPC 每只都有 YAML 人设卡（性格 / 说话方式 / 画画偏好）
- 每局结束 LLM 调 1 次生成"本局摘要"，存 SQLite
- 多局摘要再由 LLM 二次压缩成"长期人物画像"（你是谁、你爱什么颜色、你和我关系值）
- 玩家每次重开游戏，NPC 第一句话基于"上次和你发生了什么" → **观感就是它记得你**

> **基于 AI 技术建立玩家对 AI NPC 的长期追求，以提升玩家情感连接与游戏生命周期，而非仅关注即时拟人化效果**

- 游戏不是 90 秒单局，而是 "回合制家园"。单局 90 秒（保留 V2 的节奏），但**游戏生命周期定义在 "多局跨会话" 的尺度上**
- 每局结束 NPC 给你一句"期望"（例：今天你画了很多黄色，我明天想看你画一朵花）→ 下一局兑现/不兑现会影响 NPC 态度
- 评委演示：关掉游戏 → 5 分钟后重开 → NPC 说 "你回来了，我以为你今天不想来" · 一击命中"情感连接"

### 评审关注

> **如何在长线交互中保持人设的一致 (Consistency)**

- 每只 NPC 有"人设锚点"（10 个固定事实 + 5 个口头禅 + 3 个禁忌话题）
- 每次 prompt 都强制注入人设锚点（见 §3.3）
- 漂移检测器：周末跑一次，用 5 个标准问题问每只 NPC，对比上周答案，漂移 >20% 触发人设 prompt 重调
- 评委演示：打开漂移报告给他看，分数一目了然

> **如何解决"记忆膨胀"带来的幻觉问题**

- 三级记忆结构（§3.4）：原始事件 → 局末摘要 → 多局人物画像
- prompt 注入时**只用最新 3 局摘要 + 画像**，原始事件不进 prompt（只做审计日志）
- Token 预算 < 2000 / 请求，强制截断
- 召回用 embedding 相似度，不是全量拼接
- 评委演示：展示"摘要链条可视化"——原始 200 条事件如何被压成 3 句人物画像

### 参考案例：体现 AI 的指令跟随与行为涌现能力

- 玩家在聊天框里说 "你能朝蓝色笔触那边走一下吗"——NPC 真的走过去（指令跟随）
- 涌现来自人设 × 情境：**诗意型 NPC** 在下雨天 bg 出现时会主动说"今天画点冷色吧"，而**调皮型** 在同一情境下会主动涂你一笔

### 场景选择：**小型家园 + 拟人宠物**（而不是 V2 的 4 人对战）

- 赛道参考案例明说"可聚焦于特定场景（如小型家园）或非人类形态（如宠物）"——我们两个都占
- 游戏场景：**一个圆形的 "画板花园"**，玩家和 3 只宠物在里面
- 宠物是非人类形态（骨架 B 汤圆、骨架 E 豆子兔、+ 一只新的骨架 F 小乌龟）
- 避开"AI 一定要像人"的陷阱——可爱的拟人宠物对评委更温柔

---

## 二、核心叙事转变（一句话：**从"战场"到"家"**）

### 玩家视角

1. 第一次打开：命名自己（例：阿柠），选骨架画 avatar（20 秒）
2. 进入花园：3 只宠物凑过来，各自性格不同，其中一只对你特别好奇（随机选定）
3. 玩一局 90 秒：你和宠物在花园里走动 / 画对方 avatar（叠笔，不抢）
4. 局末：NPC 给你点评（LLM 生成，带着它对你的"印象")，每只 NPC 给你一个"明天的期望"
5. 关掉游戏 → 再次打开：花园还在，宠物记得你，说一句问候 → 新一局开始

### 关键情感钩子（评委看到会印象深刻的 3 个瞬间）

| 瞬间 | 产生条件 | 触达 |
|---|---|---|
| **"它记得我"** | 关了游戏 ≥ 5 分钟后重开 | 情感纽带（赛道 2 主打点） |
| **"它变了"** | 连续 3 局给诗意型 NPC 涂调皮的笔触 | 行为涌现 + 深度互动 |
| **"它没变"** | 20 局后问它同样的问题答案一致 | 一致性（评审关注点） |

---

## 三、技术架构

### 3.1 总览图

```
                        +-------------------+
                        |   Game Client     |
                        |  (browser, 320x   |
                        |   canvas + 花园)   |
                        +---------+---------+
                                  |
                                  | websocket
                                  v
                        +-------------------+
                        |   Game Server     |
                        |   (Node, 90s loop)|
                        +----+------+-------+
                             |      |
                             |      |  npc-intent(player-id, ctx)
                             v      v
        +---------------+   +----------------+     +-----------------+
        | Offline pool  |<--| NPC Orchestrator|-->|  LLM Wrapper    |
        | (pool.json)   |   |  (personality   |   |  (retry/timeout |
        | last-resort   |   |   cards + mem   |   |   cache/budget) |
        +---------------+   |   recall)       |   +--------+--------+
                            +--------+--------+            |
                                     |                     v
                                     v             +-------+-------+
                            +-----------------+    |  OpenAI/Claude |
                            |  Memory Store   |    |   / local      |
                            |  (SQLite)       |    +----------------+
                            |  - events       |
                            |  - session_sum  |
                            |  - persona_img  |
                            +-----------------+
```

### 3.2 LLM Wrapper（Day 1-2 就要搭好）

位置：`apps/server/src/llm/wrapper.js`（新建）

职责：
- 统一接口：`ask(promptId, params, { timeout, cache })` → Promise<string>
- 重试：指数退避，3 次，总上限 15 秒
- 超时：单次 5 秒硬 cut
- 缓存：按 `hash(promptId + params)` 存 SQLite，命中直接返回
- 预算：单次 < 2000 token（输入）+ < 200 token（输出）
- **核心原则**：**任何失败都不崩游戏**。失败时返回 `{ ok: false, fallback: <本地池查到的那条> }`

### 3.3 人设卡（Personality Card）YAML 模板

位置：`demo/npcs/personality-cards/{npc-id}.yaml`

```yaml
id: mochi
name: "麻薯"
skeleton: skeleton-b-blob
color: "#FF6B9D"
archetype: "安静诗意"

anchors:
  facts:
    - "我住在花园西边的苔藓石头下"
    - "我的梦想是收集所有颜色的落叶"
    - "我怕雷声，下雨天会躲起来"
    - "我最喜欢在午后晒太阳"
    - "我会记得每个来花园的人"
    - "我不吃糖"
    - "我有一个朋友叫豆豆（另一只 NPC）"
    - "我没有名字之前是一团粉色的雾"
    - "我从不主动打断别人"
    - "我觉得雨是天空在涂色"

  catchphrases:
    - "嗯……"
    - "这个颜色，像..."
    - "你今天不一样"

  taboos:
    - "不谈论死亡、抛弃、母亲、父亲、失败"
    - "不说网络流行词"
    - "不主动问个人隐私"

behavior:
  speech_style: "每句话 < 15 字。偶尔用省略号。不问反问句。"
  painting_preference: "喜欢冷色系，讨厌饱和度过高的红"
  movement: "缓慢，停顿多"

relationship_schema:
  init_value: 0
  max_value: 100
  scoring:
    player_paints_cool_color: +2
    player_paints_warm_on_me: -1
    player_ignores_me_whole_round: -5
    player_greets_on_return: +3
```

**硬规则**：每次调 LLM 时，`anchors` 整段一字不改原样塞进 system prompt。这是"人设不漂"的钉子。

V3 默认 3 只 NPC：`mochi`（安静诗意）、`doudou`（调皮捣蛋）、`wugui`（老成稳重）。每只一张 YAML。

### 3.4 三级记忆结构（解决"记忆膨胀"）

**L1 · 原始事件（events 表）**
- 每次玩家做一件事（涂笔 / 移动进 NPC 视野 / 说话 / 登陆 / 登出）写一行
- 只做审计，**从不进 prompt**
- 每局几十到几百行

```sql
CREATE TABLE events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id TEXT, npc_id TEXT, session_id TEXT,
  kind TEXT, -- 'paint_on_me', 'greet', 'logout', 'chat', 'idle'
  payload JSON,
  ts INTEGER
);
```

**L2 · 局末摘要（session_summaries 表）**
- 每局结束 LLM 调 1 次：输入这局所有 L1 事件（或前 50 条），输出 ≤ 80 字摘要
- prompt id: `summarize_session`
- 摘要格式固定：`{关系变化}, {玩家主色}, {3 条具体事件}, {一句感受}`

```sql
CREATE TABLE session_summaries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id TEXT, npc_id TEXT, session_id TEXT,
  summary TEXT,
  relationship_delta INTEGER,
  ts INTEGER
);
```

**L3 · 人物画像（persona_impressions 表）**
- 每 5 局触发一次：输入最近 5 条 L2 摘要 + 当前 L3，输出新 L3（压缩重写）
- ≤ 150 字
- prompt id: `update_persona_impression`
- **这是 prompt 注入时真正使用的长期记忆**

```sql
CREATE TABLE persona_impressions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id TEXT, npc_id TEXT,
  impression TEXT,
  relationship_value INTEGER,
  updated_ts INTEGER
);
```

**Prompt 注入时**：只取最新 3 条 L2 + 当前 L3 + 人设锚点 → 总 < 1500 token。
原始 L1 事件永远不直接进 LLM。

### 3.5 一致性测试（Consistency Harness）

位置：`demo/consistency/`

- `questions.json`: 5 个标准问题 / NPC，例：
  - "你住在哪里？"
  - "如果下雨你会做什么？"
  - "你最不喜欢什么颜色？"
  - "你的朋友是谁？"
  - "你会做什么来打发时间？"
- `run_consistency.py`: 跑一次 = 给 3 只 NPC × 5 题 = 15 个问答，记录
- `score_drift.py`: 对比最近 2 次的 15 组答案，用 embedding 相似度 + 关键词匹配打分
- 过线要求：**≥ 80% 相似度** = 人设没漂

评委演示：本地命令行 `python3 demo/consistency/run_consistency.py && python3 demo/consistency/score_drift.py` → 终端打出表格。

### 3.6 离线兜底（V2 的精神保留）

- **每一个 LLM 调用点**都配一条本地 fallback：
  - 点评：`demo/critiques/pool.json`（V2 已有 30 条 + 待补 20 条）
  - NPC 打招呼：新增 `demo/critiques/greetings.json`（10 条通用 + 每只 NPC 5 条专属）
  - NPC 局末期望：新增 `demo/critiques/expectations.json`（20 条按情境）
- **LLM Wrapper 内部**：失败 → 查 fallback → 如果 fallback 也查不到 → 用 "..."（省略号）而不是空字符串
- 演示：demo 时准备 **拔网彩排一次**，要求"宠物依然在动、能说话、答复模糊但人设未崩"

---

## 四、21 天计划（3 周 × 3 里程碑）

### 🎯 Week 1 · Milestone 1：NPC 会动 · 会说 · 能涂（Day 1–7）

**Week 1 目标验收（Day 7 周日 15:00）**：
一局 90 秒里，3 只 NPC 在花园里移动、互相打招呼、偶尔对你说一句话、涂你的 avatar。
全程 0 崩溃。断网时它们还能动（走 fallback）。

#### Day 1 · 骨架系统 + LLM Wrapper 脚手架

**范围**：
- 同 V2 Day 1 的骨架底图系统（[demo/prompts/skeleton-bases.md](prompts/skeleton-bases.md) 已备）
- **新增 1 张骨架 F**（小乌龟）专门留给 `wugui` NPC。今晚加到 MJ prompt 里
- 创建 `apps/server/src/llm/wrapper.js` 脚手架：定义接口 + 实现 mock 版（返回固定字符串）
- 配置：`.env.local.example` 加 `OPENAI_API_KEY`、`LLM_MODEL=gpt-4o-mini`、`LLM_TIMEOUT_MS=5000`

**Day 1 验收**：
- [ ] 6 张骨架 PNG 可用（5 + 新增乌龟）
- [ ] 玩家进游戏看到骨架 + 加笔的合成图
- [ ] 调 `llm.ask('hello', {})` 返回 mock 字符串，不崩
- [ ] 控制台 0 error

#### Day 2 · LLM Wrapper 真实接入 + Cache

**范围**：
- Wrapper 接 OpenAI / Claude / 本地（按你选的 provider）
- 实现 retry / timeout / cache（SQLite 存 cache）
- 写 5 个单元测试：超时、失败、成功、cache 命中、并发
- 写一份 `demo/docs/llm-wrapper.md` 给评委看（架构图 + 预算 + 失败处理流）

**Day 2 验收**：
- [ ] `llm.ask('hello', {})` 真调通，有响应
- [ ] 同 prompt 第二次调 < 50ms（走 cache）
- [ ] 拔网线 → 超时 5s → 返回 `{ ok: false, ... }` → 游戏不崩
- [ ] 5 个单测全过

#### Day 3 · 本地单人同屏（砍掉双人）+ 1 只 NPC MVP

**关键改动**：V2 是双人同屏，V3 **砍掉双人，只保留 1 个真人**。评委要看的是 "你 vs AI"，不是 "你 vs 你朋友"。

**范围**：
- 客户端：默认单人（没有 `?p2=1`）
- 服务端：启动时加载 1 只 NPC（`mochi`），用 LLM 驱动它的移动决策
  - 每 1 秒调 LLM 一次，输入周围环境（玩家位置、颜色、时间），输出 `{ intent: 'move_to' | 'idle' | 'paint' | 'speak', params: {...} }`
  - 超时/失败 → 上一帧 intent 继续
- NPC 的 avatar 用骨架 + 预涂笔触合成（Day 1 已备）

**Day 3 验收**：
- [ ] 单人开局，Mochi 在花园里自己走动（不是录像，真 LLM intent 驱动）
- [ ] Mochi 移动不机械（不会一直朝一个方向冲）
- [ ] 拔网后 Mochi 继续动（用 fallback 的"慢速随机漫步"）
- [ ] 一局 90 秒跑完 0 error

#### Day 4 · NPC 说话 + 涂你

**范围**：
- NPC intent 支持 `speak(text)` 和 `paint_on(target, color)`
- `speak` 时走 prompt `npc_utter`，带人设卡 + 当前情境
- `paint_on` 触发时走 V2 Day 3 的"涂一笔"逻辑（已规划好）
- 聊天气泡 UI（右上角出现 3 秒淡出）

**Day 4 验收**：
- [ ] 一局里 Mochi 至少说 2 句话，内容和花园情境相关
- [ ] Mochi 偶尔靠近你 avatar 涂一笔，看得见
- [ ] 说话内容过 forbiddenWords lint（复用 V2 的校验）

#### Day 5 · 3 只 NPC 齐活 + 人设卡系统

**范围**：
- 写 `demo/npcs/personality-cards/` 下 3 张 YAML：mochi / doudou / wugui
- NPC Orchestrator 同时驱动 3 只
- Token 预算：3 × 1s × 5s 窗口 = 15 次调用/窗口，超出就跳过（随机一只这轮用 fallback）
- 3 只 NPC 同屏，性格**肉眼可见差异**：
  - mochi：慢、少说话、只涂冷色
  - doudou：快、话多、见缝插针涂你
  - wugui：中速、说话老成、只在快结束时涂你

**Day 5 验收**：
- [ ] 3 只 NPC 同屏 90 秒，控制台 0 error
- [ ] **盲测**：叫一个不知情的人看 30 秒，问他"你觉得这 3 只是同一种吗"，回答"不是"
- [ ] 说话频率符合人设（doudou > wugui > mochi）

#### Day 6 · Toast + HUD + 聊天框（玩家对 NPC 发话）

**范围**：
- 玩家能在聊天框里打字 → 作为 context 进 NPC 的下一次 prompt
- NPC 回复走 `npc_reply_to_player` prompt（带人设 + 短记忆）
- Toast：NPC 涂你、NPC 说话、NPC 离开画面都有小 toast

**Day 6 验收**：
- [ ] 你说 "你喜欢什么颜色"，3 只 NPC 各自回答，答案和人设一致
- [ ] 你说 "你能走过来吗"，至少 1 只真的走过来（指令跟随）

#### Day 7 · **Week 1 里程碑验收**（周日 15:00）

**全套流程跑 3 次**：
1. **网通、不做操作**：一局 90 秒，3 只 NPC 自主表现
2. **网通、主动聊**：你和 NPC 对话 5 轮
3. **拔网线**：整局降级，但游戏不崩、NPC 还在动

每次录屏 2 分钟存进 `demo/videos/week1/`。

**过关标准**：3 次跑完都无崩溃，聊天合理，拔网线降级可感但不破。

---

### 🎯 Week 2 · Milestone 2：记得你 · 人设稳（Day 8–14）

**Week 2 目标验收（Day 14 周日 15:00）**：
评委命名后玩一局 → 关游戏 5 分钟 → 重开 → 至少 2 只 NPC 正确引用"上局发生的一件事"，
一致性测试 ≥ 80% 通过。

#### Day 8 · SQLite 层 + events 表 + session_summaries 表

**范围**：
- `apps/server/src/memory/store.js`：SQLite 封装（better-sqlite3）
- 定义 §3.4 的 3 张表，写 migration
- 游戏中所有 NPC 相关事件写 `events` 表

**Day 8 验收**：
- [ ] 玩一局后 `sqlite3 data/memory.db` 能看到几十上百行 events
- [ ] events 表字段 schema 正确，可查询

#### Day 9 · 局末摘要 pipeline（L1 → L2）

**范围**：
- 局末触发 `summarize_session` prompt：输入本局 events（压成文本），输出 ≤ 80 字摘要
- 存进 `session_summaries` 表
- 失败走 fallback：预置 10 条通用摘要模板按"关系变化 + 主色"查表

**Day 9 验收**：
- [ ] 跑完一局，sql 查 `SELECT * FROM session_summaries` 有 3 行（每只 NPC 一行）
- [ ] 3 个摘要内容不同（各自人设视角）
- [ ] 拔网后有 fallback 摘要，不是空

#### Day 10 · 人物画像 pipeline（L2 → L3）+ 5 局触发

**范围**：
- 每 5 局触发一次 `update_persona_impression`：输入最近 5 条 L2 + 当前 L3，输出新 L3
- 存 `persona_impressions` 表
- 单元测试：模拟 10 局 events → 应该有 2 次 L3 更新

**Day 10 验收**：
- [ ] 脚本 `demo/scripts/simulate_sessions.py --n 10` 跑完，L3 表有 2 条记录
- [ ] 肉眼看 L3 内容合理（"这玩家喜欢蓝色，对我态度中立"之类）

#### Day 11 · Prompt 注入机制 · 记忆膨胀真实防护

**范围**：
- 改造 NPC Orchestrator 的 prompt：每次都注入 **人设锚点 + 最新 3 条 L2 + 当前 L3**
- Token counter：注入前算长度，超预算强制截断老 L2
- 日志：每次 LLM 调用的完整 prompt 存审计文件 `data/audit/YYYY-MM-DD.jsonl`

**Day 11 验收**：
- [ ] 任意一次 LLM 调用的 prompt 长度 < 2000 token（用 tiktoken 或 token 估算）
- [ ] 跑 30 局不崩，prompt 长度没膨胀趋势（线性稳定）

#### Day 12 · 一致性测试套件

**范围**：
- 写 `demo/consistency/questions.json`：每只 NPC 5 题
- 写 `run_consistency.py`：调 LLM 15 次 → 记录答案到 `data/consistency/YYYY-MM-DD.json`
- 写 `score_drift.py`：对比最近两次的结果，打 0-100 相似度分

**Day 12 验收**：
- [ ] `python3 demo/consistency/run_consistency.py` 跑通，15 个回答
- [ ] `python3 demo/consistency/score_drift.py` 跑通，能打出"整体一致性 87%"这样的数字
- [ ] 数字 ≥ 80%

#### Day 13 · 关系值 + 明天期望

**范围**：
- 每局结束计算 `relationship_delta`（按人设卡 `relationship_schema` 的规则）
- NPC 给玩家一个 "明天期望"（存 L2 摘要旁）
- 下一局开始时，NPC 第一句话引用 "昨天的期望"

**Day 13 验收**：
- [ ] 连续玩 2 局：第二局开始 Mochi 说 "昨天你答应给我一朵花的"（或类似）
- [ ] 如果玩家这局没画花，Mochi 关系值降 2
- [ ] HUD 显示 3 只 NPC 的当前关系值（0-100）

#### Day 14 · **Week 2 里程碑验收**（周日 15:00）

**"阿柠实验"**：
1. 叫一个真人坐下，取名 "阿柠"（或他真名）
2. 玩 2 局
3. 关掉游戏，关电脑 5 分钟
4. 重开，打开游戏
5. 观察 3 只 NPC 第一句话

**过关标准**：
- 至少 2 只 NPC 的第一句话引用了上面 2 局里发生的具体事情（颜色、动作、互动）
- 一致性测试分数 ≥ 80%
- 人设卡 anchors 在 prompt 里原样出现（grep 一下审计日志）

---

### 🎯 Week 3 · Milestone 3：涌现 · 美化 · 交材料（Day 15–21）

**Week 3 目标验收（Day 20 周六 15:00）**：
3 份不同角度的 demo 视频 + 1 份赛道 2 技术白皮书 + 3 次彩排全过。

#### Day 15 · 涌现行为（intent → action）

**范围**：
- 强化 NPC 决策链：人设 + 记忆 + 当前情境 → LLM 出 "intent"（JSON）→ 解析成动作
- 情境特征加上：时间（午前/午后/夜）、天气（bg 随机）、其他 NPC 行为
- 做 2 个可展示的 emergent 桥段：
  - 桥段 A：连续 3 局给诗意型 NPC 涂红色 → 第 4 局 NPC 主动躲开你
  - 桥段 B：调皮型 NPC 在你离开后会追上来涂你的后背

**Day 15 验收**：
- [ ] 桥段 A 能 100% 复现（playthrough 录像证明）
- [ ] 桥段 B 能 80% 复现

#### Day 16 · 美化（同 V2 Day 6）

**范围**：
- 花园背景、BGM、字体、慢动作滤镜
- **不要**过度设计——Track 2 评委看的是"AI 有没有灵魂"，不是"UI 好不好看"

#### Day 17 · 录视频（3 种角度）

1. **主视频（90 秒一局 + 1 分钟记忆瞬间）**：
   - 90 秒：命名 + 玩 1 局（真人操作）
   - 切黑 2 秒 + 字幕"5 分钟后"
   - 1 分钟：重开 → NPC 第一句话（字幕高亮关键词）
2. **技术视频（3 分钟）**：
   - 屏幕左半玩游戏，右半开发者面板显示 prompt 内容、token 用量、L2 L3 更新
3. **一致性视频（2 分钟）**：
   - 跑一次一致性测试，终端输出打分
   - 打开 2 周前的结果对比

**Day 17 验收**：3 份视频都一镜到底、能正确展示各自卖点。

#### Day 18 · 赛道 2 技术白皮书（3 页 A4）

位置：`demo/submission/track2-whitepaper.md`

内容大纲：
1. 项目概述（一段话 + 主视频 link）
2. 赛道 2 硬要求 × 我们的回答（表格形式）
3. 架构图 + 3 级记忆结构图
4. 一致性保障机制 + 最近测试分数截图
5. 记忆膨胀解决方案（真实 prompt 长度数据图）
6. 离线兜底演示（拔网视频 link）
7. 局限 + 未来计划（诚实写）

**Day 18 验收**：程序员 + 策划各读一遍不产生疑问。

#### Day 19 · 参赛材料打包 + 现场彩排 1/3

- 按赛道官方要求打包：视频 + 文档 + 源码 link + 团队信息
- 第 1 次彩排：完整流程 + 有网

#### Day 20 · 彩排 2/3 + 彩排 3/3

- 第 2 次：**拔网线彩排**。降级路径 + 评委可能问的问题都演练
- 第 3 次：完整流程，**目标 demo 场地或等价网络环境**

**Day 20 验收**（周日 15:00）：
- [ ] 3 次彩排全过，无崩溃
- [ ] 3 份视频 + 白皮书 + 提交包全就位
- [ ] 评委必问 5 题（§五）各有 1 个完整答案 + 屏幕演示步骤

#### Day 21 · Buffer / Demo 日

- 上午：修彩排发现的任何小问题
- 下午：demo（或最后一次彩排）

---

## 五、评委必问 5 题 · 你必须 30 秒内答完 + 有屏幕证据

| 问题 | 答案要点 | 演示步骤 |
|---|---|---|
| Q1: 你的 AI 真的记得玩家吗？ | L1 事件 → L2 局末摘要 → L3 人物画像，3 级压缩。重开游戏 5 分钟后，NPC 第一句话引用上次的事 | 当场关游戏 30 秒再开，让 NPC 自己说 |
| Q2: 记忆膨胀怎么处理？ | Prompt 只注入最新 3 条 L2 + 当前 L3 + 人设锚点。总 < 1500 token。原始事件只做审计 | 打开审计日志 `data/audit/...jsonl`，展示第 1 局和第 30 局的 prompt 长度几乎一样 |
| Q3: 人设会漂吗？怎么证明？ | 每只 NPC 有 10 个 anchors 强制注入；周末跑一致性测试打分 | 现场跑 `python3 demo/consistency/run_consistency.py`，终端打出 87% 之类数字 |
| Q4: 断网了怎么办？ | 每个 LLM 调用点都有 fallback pool（继承自 V2）。拔网 NPC 仍能动、能说话（话糙但人设不崩） | 现场拔网，当着评委玩 30 秒 |
| Q5: 和 AI NPC 的"长线追求"体现在哪？ | 关系值 + 明天期望机制。单局节奏 90 秒保证评委看得进去，长线价值在跨会话累积 | 打开一个玩了 20 局的存档（你提前玩好），给评委看 L3 人物画像的演化 |

**这 5 题每题都要有"演示步骤"**——光嘴说不算数。

---

## 六、V2 → V3 详细对比

| 维度 | V2 | V3 |
|---|---|---|
| 赛道 | 游戏创意 / Indie | 赛道 2 · 智能 NPC |
| 时长 | 7 天 | 21 天（3 里程碑） |
| 真人玩家 | 2 人同屏 | **1 人**（评委要看 "你 vs AI"） |
| 非真人角色 | 2 条 450 帧预录 bot | **3 只** LLM 实时驱动 NPC |
| 地图尺寸 | 5000×5000（对战） | 缩小到 **2000×2000**（花园感） |
| 骨架 PNG | 5 张 | **6 张**（加小乌龟 F） |
| 局时 | 90 秒 | 90 秒（保留） |
| 主 AI 调用点 | 0（LLM 只是 bonus） | 每秒 3 次（3 只 NPC × 1 次 intent） |
| Token 预算 | 无 | < 2000 / 调用，< 200 / 秒总量 |
| 记忆 | 无 | 3 级 SQLite |
| 一致性 | 无 | 5 题 × 3 NPC 的漂移检测 |
| 离线兜底 | 完整游戏 | 降级但不崩（话糙） |
| 关键卖点 | 社交降压 + 可爱 | **它记得你 · 它没变 · 它懂你** |
| Demo 录法 | 90 秒一镜到底 | 90 秒一局 + 1 分钟 "5 分钟后回来" |

---

## 七、交付物清单（继承 / 废弃 / 新增）

### 继承（V2 已完成，V3 继续用）
- `demo/prompts/skeleton-bases.md` · 加 1 张小乌龟
- `demo/critiques/pool.json` · 作为离线 fallback

### 废弃（V3 不用，文件保留做 legacy）
- `demo/scripts/generate_bots.py`
- `demo/bots/bot1.json`、`bot2.json`
- 相关 README（加 "Deprecated" 头）

### 改版（V2 内容还在，但角色变了）
- `demo/critiques/README.md` · 改写为 "V3 离线 fallback 使用指南"
- `demo/handoff/day1-2.md` · 重写为 V3 Week 1 handoff
- `demo/PLAN-v2.md` · 顶部加 banner 指向本文件

### 新增（V3 要做的所有新文档）

| 文档 | 谁用 | Day |
|---|---|---|
| `demo/PLAN-v3-track2.md` · **本文件** | 所有人 | Day 0 |
| `demo/docs/llm-wrapper.md` · Wrapper 规范 | 程序员 + 评委 | Day 2 |
| `demo/npcs/personality-cards/{mochi,doudou,wugui}.yaml` | 程序员 + 策划 | Day 5 |
| `demo/npcs/README.md` · 人设卡字段说明 | 策划 | Day 5 |
| `demo/critiques/greetings.json` · NPC 打招呼 fallback | 策划 | Day 4 |
| `demo/critiques/expectations.json` · 期望 fallback | 策划 | Day 13 |
| `demo/consistency/questions.json` · 标准题库 | 策划 | Day 12 |
| `demo/consistency/run_consistency.py` + `score_drift.py` | 程序员 | Day 12 |
| `demo/scripts/simulate_sessions.py` · 模拟多局 | 程序员（测试用） | Day 10 |
| `demo/submission/track2-whitepaper.md` · 参赛白皮书 | 你 | Day 18 |
| `demo/videos/week{1,2,3}/*.mp4` | 你（录） | 各 milestone |

---

## 八、新的风险清单（比 V2 多，正视它）

| # | 风险 | 概率 | 兜底 |
|---|---|---|---|
| R1 | LLM API 延迟 > 5 秒 | 中 | Wrapper timeout + cache + fallback |
| R2 | Token 预算爆了（prompt 超 2000） | 中 | 强制截断老 L2；单测每次 prompt 长度 |
| R3 | 人设漂移 | 中 | anchors 强制注入 + 周测漂移 |
| R4 | 3 只 NPC 同屏用光 API quota | 中 | 每秒总预算 5 次调用，超了跳过本轮 |
| R5 | Demo 场地网络差 | 高 | 主视频提前录好；拔网彩排 |
| R6 | 21 天做不完 | **高** | Day 7 / 14 / 20 里程碑强制砍功能，不砍日期 |
| R7 | 一致性测试分数永远上不了 80% | 中 | anchors 加倍 + prompt 重写 + 降模型温度 |
| R8 | 评委"看不到 AI 的价值" | 中 | Q1-Q5 五题演示步骤，每题都当场 demo |
| R9 | 记忆 bug 让 NPC 说错人名 | 低但致命 | embedding 召回 + 硬编码人名校验 |
| R10 | 2 周后你没信心了想回 V2 | **中** | Day 7 Week 1 验收过了就不回头 |

**R6 和 R10 是最可能杀死这个计划的**。里程碑制就是为了这两条设计的——每周日 15:00 过不了就砍功能保 demo，**不加班**，**不延期**。

---

## 九、决策锁定声明

> 我已经和外部顾问锁死 V3 方案，投**赛道 2 · 智能 NPC · 情感纽带**。
> 接下来 21 天只按这个走。
> 任何"顺便加个 … "的想法先写进 `icebox.md` 留到参赛之后，不加进代码。
> 每晚 19:00 我验收当天的 ✅。
> 每周日 15:00 走里程碑 review，过不了就**砍功能保 demo**，不延期。

---

## 十、立刻要做的 3 件事（你现在就能开干）

1. **今晚**：看完本文件 → 和程序员 / 策划各过一遍 → 任何疑问在明早 9:00 前发我
2. **今晚**：按 [demo/prompts/skeleton-bases.md](prompts/skeleton-bases.md) 跑 5 张 MJ；**另外再加 1 张小乌龟**（我等下补进 prompt 文件，或者你让我现在就写）
3. **明天 Day 1 早 9:00**：程序员按新 handoff 开工

---

*本文件生成于 V2 → V3 转型日（2026-04-24）。*
*后续所有修改以本文件为准，V2 相关文档均已打 "Deprecated" 或 "Role changed" 标。*
