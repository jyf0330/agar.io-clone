# icebox · Demo 之后再考虑

> 规则（见 [demo/PLAN-v3-track2.md](demo/PLAN-v3-track2.md) 第九节 + [demo/CODING-STANDARDS-v3.md](demo/CODING-STANDARDS-v3.md) §14）：
>
> - 任何"顺便加一个 / 改一下 / 这样更好吧"的想法，**先写这里，不要改代码**。
> - 每条一行，格式：`- YYYY-MM-DD: {提出人} {想法} —— {可选理由 / 关联}`
> - 参赛 / demo 结束之后，我们一起过这个文件，决定哪些进下一期。
>
> **什么不算 icebox（立刻修，不走这里）**：
> - PLAN-v3 当日 ✅ 验收项
> - 控制台红字 error / 构建挂 / 测试红
> - 一致性分数 < 80%（Week 2 之后）
> - 审计日志里 `tokenIn > 2000`
> - Demo 日会被评委直接看到的视觉或文案 bug

---

## V3 期间进池的想法

<!-- 每条一行。新条目放在上方，老条目往下沉。 -->

- YYYY-MM-DD: {示例} 想给 NPC 加语音合成 —— 语音对赛道 2 加分点不大，21 天内做不完

---

## 代码 / 基础设施类（长期想修但不在 21 天里）

- 2026-04-24: agent 跨平台脚本 `npm run build` / `npm start` 在 macOS/Linux 直接失败 —— 已有完整分析 [docs/12 · P0-1](docs/12-priority-fix-list.md)
- 2026-04-24: agent `configs/game/config.js` 里 `adminPass: "DEFAULT"` 硬编码 —— [docs/12 · P0-2](docs/12-priority-fix-list.md)；V3 已改用 `process.env.ADMIN_PASS`，但老 config 字段未清
- 2026-04-24: agent Node 版本没锁定 `.nvmrc` / `engines` 缺失 —— [docs/12 · P0-3](docs/12-priority-fix-list.md)
- 2026-04-24: agent `npm audit` 报 72 个漏洞（1 critical / 40 high） —— [docs/12 · P1-1](docs/12-priority-fix-list.md)，涉及 express / socket.io / webpack 等
- 2026-04-24: agent 前端体积 / socket 协议语义化 / Math.random 加 seed —— [docs/12 · P2-*](docs/12-priority-fix-list.md)

---

## 规范 / handoff 小矛盾（对齐时顺手处理）

- 2026-04-24: agent `demo/handoff/week1.md` Day 1 wrapper 接口注释里 `promptId: 't_intent'` 疑似 typo，Day 3 模板里是 `npc_intent` —— 对齐为 `npc_intent`
- 2026-04-24: agent `demo/handoff/week1.md` Day 6 ✅ 提到"这就是 §5 Q4 的演示"，但 Q4 是"断网怎么办"；指令跟随是 PLAN-v3 第一节"参考案例"段，不在 Q1–Q5 —— 修正文案
- 2026-04-24: agent `demo/handoff/week1.md` Day 2 硬编码了一份 forbiddenWords —— 改为读 `demo/critiques/pool.json::meta.forbiddenWords`（见 CODING-STANDARDS-v3 §5.4）

---

*本文件由计划锁定日（2026-04-24）创建。*
*任何时候想删掉这里的条目，必须先判断它是否已经在代码里落实；没落实就不能删。*
