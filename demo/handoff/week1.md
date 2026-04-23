# V3 · Week 1 TODO · 给程序员的执行单

**发件人**：{{你的名字}}
**收件人**：{{程序员名字}}
**主送**：{{策划 / 设计 抄送}}
**主题**：Demo V3 · Week 1 任务锁定（赛道 2 · 21 天计划 · 第 1 周）

---

## 零、两句话开头

项目换了目标赛道：**投赛道 2 · 智能 NPC · 情感纽带**（原本我们投 "玩法创意" 的 7 天计划废了）。
新计划 21 天，分 3 个里程碑。主文档：**[demo/PLAN-v3-track2.md](../PLAN-v3-track2.md)**。**开工前必读**。

**每晚 19:00 我验收当天的 ✅，过了才进下一天。**
**每周日 15:00 里程碑 review，过不了就砍功能保 demo，不延期不加班。**

---

## 一、必读顺序（30 分钟内读完）

1. [demo/PLAN-v3-track2.md](../PLAN-v3-track2.md) · **全文**。重点看：
   - 第二节"核心叙事转变"（我们不做 4 人战场了，改成 1 人 + 3 只 AI 宠物的花园）
   - 第三节"技术架构"（LLM wrapper、人设卡、3 级记忆）
   - 第四节 Week 1 Day 1-7 的每日验收
   - 第五节"评委必问 5 题"——你要把它记在心里，每个功能都想"它怎么回答 Q1-Q5"
2. [demo/critiques/README.md](../critiques/README.md) · 只看 LLM wrapper + forbiddenWords 校验那节（V3 继续沿用）
3. [demo/prompts/skeleton-bases.md](../prompts/skeleton-bases.md) · 骨架系统规格（继续用，另加 1 张小乌龟）

**不要读** `demo/PLAN-v2.md`、`demo/handoff/day1-2.md`——都已归档。

---

## 二、Week 1 的 7 天任务（按日出）

### Day 1 · 骨架系统 + LLM Wrapper 脚手架（6 小时）

**新增文件**：
- `apps/client/src/avatar-skeleton-loader.js`（同 V2 Day 1 设计，已规划好）
- `apps/server/src/llm/wrapper.js`（**新**，本周核心基础设施）
- `apps/server/src/llm/wrapper.test.js`（单测）

**Wrapper 接口合同**（你必须先实现这个，其它所有人都调它）：

```js
// apps/server/src/llm/wrapper.js
// 签名：
//   ask(promptId, params, opts) -> Promise<{ ok, text, source, elapsedMs }>
//     promptId: 't_intent' | 'npc_utter' | 'summarize_session' | ...
//     params: { npc, player, ctx, history, ... }  // 参数化 key
//     opts:   { timeoutMs=5000, useCache=true }
//   source: 'llm' | 'cache' | 'fallback'
//
// 硬要求：
//   - 任何失败都不抛异常，返回 { ok: false, text: <fallbackOrEmpty>, source: 'fallback' }
//   - 超时用 AbortController，5 秒硬 cut
//   - 重试 3 次，指数退避（200ms, 500ms, 1200ms）
//   - 缓存 key = sha256(promptId + JSON.stringify(params))
//   - 缓存用 better-sqlite3，单表 llm_cache(key TEXT PRIMARY KEY, text TEXT, ts INTEGER)
//   - Token 预算：输入 < 2000，输出 < 200（truncate 或 reject）
//   - 日志：每次调用写一行到 data/audit/YYYY-MM-DD.jsonl（含 prompt、response、耗时、source）
```

**今天先实现 mock 模式**：provider = 'mock' 时返回固定字符串，让后端其它人能调。真实 provider 明天（Day 2）接。

**Day 1 ✅（19:00）**
- [ ] 6 张骨架 PNG 在 `demo/assets/skeleton-bases/skeleton-{a..f}-*.png`（f 是小乌龟，{{你的名字}}今晚跑 MJ）
- [ ] 进游戏看到骨架 + 加笔的合成图（同 V2 Day 1 验收）
- [ ] `node -e "const w = require('./apps/server/src/llm/wrapper'); w.ask('hello', {}).then(console.log)"` 返回 `{ ok: true, text: '...mock...', source: 'llm', elapsedMs: < 10 }`
- [ ] Wrapper 单测通过（至少 3 个 case：成功、超时、缓存命中）
- [ ] 控制台 0 error

---

### Day 2 · LLM Wrapper 真实接入（6 小时）

**任务**：
- Provider = 'openai' 或 'anthropic'（你选一个，在 `.env.local` 配 API key）
- 参考 `demo/PLAN-v3-track2.md` §3.2
- 写架构文档：`demo/docs/llm-wrapper.md`（评委要看，你写 1 页就行，有架构图更好）

**关键校验**（wrapper 内部做）：
```js
function acceptResponse(text) {
  if (!text || text.length > 200) return false;
  const bad = ['遗弃','抛弃','死亡','死去','母亲','妈妈','父亲','爸爸',
               '孤儿','没人要','丑','失败','难看','悲惨','可怜'];
  return !bad.some(w => text.includes(w));
}
```
**过不了就走 fallback，不重试 LLM**。

**Day 2 ✅（19:00）**
- [ ] 真调通（curl 等价测试）一次，返回真实 LLM 文本
- [ ] 同 prompt 第二次 < 50ms（走 cache）
- [ ] 拔网 → 5 秒后返回 `{ ok: false, source: 'fallback' }` → 游戏**不崩**
- [ ] 5 个单测全过：成功 / 超时 / 失败 / cache 命中 / forbiddenWord rejection
- [ ] `demo/docs/llm-wrapper.md` 写好，程序员自己通读一遍没疑问
- [ ] 审计日志 `data/audit/2026-MM-DD.jsonl` 有今天的调用记录

---

### Day 3 · 1 只 NPC MVP（单人同屏 + Mochi 上线，8 小时）

**重大删除**：**不做 V2 那个"本地双人同屏"**。我们只保留 1 个真人。评委要看"你 vs AI"，不是"你 vs 你朋友"。

**新增文件**：
- `apps/server/src/npc/orchestrator.js` · NPC 编排器
- `apps/server/src/npc/mochi.js` · 单只 NPC 的 state machine
- `demo/npcs/personality-cards/mochi.yaml` · **今天只写 Mochi 一只**（doudou、wugui 在 Day 5）

**Orchestrator 接口合同**：
```js
// 每 1 秒调一次：
//   orchestrator.tick(gameState) -> void
// 内部：
//   对每只 NPC：
//     buildContext(npc, gameState) -> params
//     wrapper.ask('npc_intent', params, { timeoutMs: 4000 })
//       .then(res => parseIntent(res.text))  // 'move_to(x,y)' | 'paint' | 'speak' | 'idle'
//       .catch/fallback: 延用上一帧 intent
//   更新 gameState.npcs[npc.id]
//
// 硬预算：每秒总 LLM 调用 <= 5（3 NPC × 1 + 2 缓冲）。超了跳过这轮 tick。
```

**NPC intent prompt（`npc_intent`）模板**（你先写，策划 Day 4 修）：
```
你是游戏里的 NPC，人设如下（必须严格遵循）：
{anchors 整段，原样粘贴}

当前场景：
  - 时间：{time_of_day}
  - 你的位置：({npc.x}, {npc.y})
  - 玩家位置：({player.x}, {player.y})
  - 玩家刚才做的事：{last_player_action}
  - 其他 NPC 在做什么：{other_npcs_briefly}

请输出一个 intent（JSON 格式，不要加其它文字）：
{
  "intent": "move_to" | "speak" | "paint" | "idle",
  "params": { ... },    // move_to: {x, y}; speak: {text}; paint: {target, color}
  "reason": "一句话，不超过 15 字"
}
```

**Day 3 ✅（19:00）**
- [ ] Mochi 在花园里自主移动（不是录像）
- [ ] 移动不机械：连续看 90 秒，不会一直朝一个方向冲
- [ ] 拔网后 Mochi **继续动**（用 fallback 的"慢速随机漫步"，见 orchestrator fallback）
- [ ] 一局 90 秒跑完 0 error
- [ ] 每秒审计日志有 1 条 `t_intent` 调用记录
- [ ] Token 计数：每次调用输入 < 2000（日志里验证）

---

### Day 4 · NPC 说话 + 涂你（6 小时）

**新增 intent 类型**：`speak`、`paint`。
**新 prompt**：`npc_utter`（NPC 说一句话的内容）。

**新 UI**：
- NPC 头顶 speech bubble（3 秒淡出）
- 玩家头顶被涂时 toast："Mochi 在你身上画了一笔"

**策划交付**（Day 3 晚上 21:00 前给你）：
- `demo/critiques/greetings.json` · NPC 打招呼的本地 fallback（通用 10 条 + Mochi 专属 5 条）
- Mochi 的 5 个 catchphrases（已在 yaml 里）

**Day 4 ✅（19:00）**
- [ ] 一局里 Mochi 至少说 2 句话，内容和当前情境相关
- [ ] Mochi 至少涂你 1 次，看得见斜线，颜色是 Mochi 的 `#FF6B9D`
- [ ] 说话内容 100% 过 forbiddenWords 校验（audit 日志里全是 ok）
- [ ] 拔网后 Mochi 还能说话（从 greetings.json 读）

---

### Day 5 · 3 只 NPC 齐活 + 性格差异（8 小时）

**新增 yaml**：`demo/npcs/personality-cards/doudou.yaml`、`wugui.yaml`（模板见 [PLAN-v3-track2.md §3.3](../PLAN-v3-track2.md)）

**3 只性格卡概要**（策划 Day 4 晚上 21:00 前定稿）：
- **mochi** · 安静诗意 · 骨架 B 汤圆 · 粉 · 慢 / 少话 / 只涂冷色
- **doudou** · 调皮捣蛋 · 骨架 E 豆子兔 · 蓝 · 快 / 话多 / 见缝插针涂你
- **wugui** · 老成稳重 · 骨架 F 小乌龟 · 绿 · 中速 / 话不多但有分量 / 只在最后 30 秒涂你

**Orchestrator 改造**：
- 同时 tick 3 只
- Token 预算：每秒总调用 ≤ 5。3 只都要 intent 的时候只 batch 1 个大 prompt（把 3 只塞一起问），不是 3 个单独请求
- 实测：改 batch 后每秒 LLM 调用 ≈ 1-2 次，token 用量降到 1/3

**Day 5 ✅（19:00）**
- [ ] 3 只同屏 90 秒，0 error
- [ ] **盲测**：拉一个不知情的人看 30 秒，问他"你觉得这 3 只是同一种吗"，回答**"不是"**
- [ ] 说话频率：doudou > wugui > mochi（肉眼可见）
- [ ] 每秒 LLM 调用 ≤ 5（从审计日志 count）

---

### Day 6 · 聊天框（玩家 → NPC）+ 指令跟随（6 小时）

**新增**：
- 客户端：底部输入框，按 Enter 发送
- 服务端：玩家消息进入下一次 NPC intent prompt 的 `{last_player_action}` 字段
- NPC 回复通过 `npc_utter` prompt（带 "玩家刚对你说了什么" context）

**Day 6 ✅（19:00）**
- [ ] 你说"你喜欢什么颜色"，3 只各自回答，答案和人设一致（mochi 冷色、doudou 乱答、wugui 稳重答）
- [ ] 你说"你能走过来吗"，**至少 1 只真的走过来**（这就是 §5 Q4 的演示！）
- [ ] 所有回复过 forbiddenWords 校验
- [ ] 聊天 log 存进 `data/audit/chats/`

---

### Day 7 · **Week 1 里程碑验收**（周日 15:00，3 小时）

**必须跑 3 次完整流程，都录屏**（存 `demo/videos/week1/`）：

1. **有网、观察模式**（不操作）：一局 90 秒，3 只 NPC 自主表现
2. **有网、主动聊**：你和 3 只 NPC 分别对话 2 轮
3. **拔网线**：整局降级，NPC 还在动、还在说（话糙但不崩）

**过关条件**（缺一不可）：
- [ ] 3 次跑完 0 崩溃
- [ ] NPC 说话内容 100% 过 forbiddenWords
- [ ] 拔网时游戏**不黑屏、不报 error**，NPC **继续动**
- [ ] 3 段视频能直接拿给评委看 30 秒不尴尬

**没过关怎么办**（不要加班到凌晨修）：
- 列出没过的具体哪一条
- 砍 Week 2 / Week 3 的某个功能补时间
- 不延期 demo 日（或不延期参赛提交）

---

## 三、不在 Week 1 做的事（进 `icebox.md`）

- ~~SQLite 持久化记忆~~（Week 2）
- ~~跨会话 "它记得我"~~（Week 2）
- ~~一致性测试套件~~（Week 2）
- ~~关系值 + 明天期望机制~~（Week 2）
- ~~涌现行为桥段~~（Week 3）
- ~~美化 / BGM / 滤镜~~（Week 3）
- ~~录最终 demo 视频~~（Week 3）
- ~~赛道 2 白皮书~~（Week 3）

**任何**"Week 1 顺便把 XX 做了吧"的冲动 → 写进 `icebox.md` → 继续 Week 1。

---

## 四、沟通规则（和 V2 的一样，没变）

1. 遇到技术不确定 → 立刻在群里 @ 我，别自己研究 45 分钟
2. 遇到阻塞 → 尝试 30 分钟 → 还没解决立刻找我
3. 每天收工前在 `progress.md` 末尾加一行：
   ```
   - 2026-MM-DD: v3-w1-day{N} 完成 / 未完成
     - 今日完成：...
     - 阻塞点：...
     - 明日首件：...
   ```
4. 我每晚 19:00 看 progress.md，不看别的

---

## 五、我（{{你的名字}}）这周也要交的东西

- **今晚**：跑 6 张 MJ 骨架（5 张旧的 + 1 张新的小乌龟），放 `demo/assets/skeleton-bases/`
- **Day 3 前**：Mochi 的 `anchors.facts` 10 条 + `catchphrases` 5 条定稿（我和策划过一遍）
- **Day 4 前**：Mochi 的 `greetings.json` 里 5 条专属打招呼定稿
- **Day 5 前**：doudou + wugui 两张完整 yaml 定稿
- **每天 19:00**：我在你电脑前做验收

---

## 六、你回我一句就行

> "收到，V3 Week 1 开干。周日 15:00 见。"

别的都不用回。有阻塞随时说。

---

*本文件替代原 demo/handoff/day1-2.md（已归档）。*
