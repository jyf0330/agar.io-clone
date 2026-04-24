# V5 实施任务清单 · 画板优先

> 依据仓库现状（[`apps/client/src/app.js`](../apps/client/src/app.js)、[`player-card-editor.js`](../apps/client/src/player-card-editor.js)、[`avatar-draft-controller.js`](../apps/client/src/avatar-draft-controller.js)、[`apps/client/index.html`](../apps/client/index.html)）与 [`PLAN-v5-historical-echo.md`](PLAN-v5-historical-echo.md) 整理。  
> **原则**：先做 **V5 签名部位画板**（独立轻量 UI + 哈希分档 + 本地状态），再串握手与服务端；**不**一上来改完整「名片」多层编辑器逻辑，避免与现 `avatarDraft` 流程缠死。

---

## 现有能力（复用边界）

| 模块 | 现状 | V5 画板关系 |
|------|------|-------------|
| `player-card-editor.js` | 多图层、多工具、圆形出版框 | **可抽**：画布导出 `toDataURL`、笔触逻辑；**不宜**：直接当 V5 唯一入口（过重） |
| `avatar-draft-controller.js` | 限时抽候选、与名片面板联动 | **并行**：V5 画板应在 `startGame` 链上 **早于或替代** `shouldStartDraft` 的入口，由配置开关控制 |
| `player-card-storage.js` | 持久化整卡 | V5 可新增 **`body-signature-storage.js`** 或在 storage 中加 `bodySignature` 字段 |
| 开局流程 `startGame` → `enterGame` | 名片可选 → 连接 | 插入 **`beginBodySignatureFlow`** |

---

## Phase A · 画板（P0，优先交付）

按顺序做；每一项可单独验收。

### A0 偏差处理（已执行）

- [x] **A0.1** 默认关闭 V3 NPC / 记忆 / 聊天 AI 侧边系统，保留 `V3_NPC_ENABLED=1` 回放旧 Week 1 demo；V5 开发不再被 NPC loop 抢走主流程。
- [x] **A0.2** 开局入口改回显式开始菜单，不再自动跳过开始流程，保证画板能成为进入对局前的第一步。
- [x] **A0.3** 鬼魂 / 宠物 / 录制功能先不阻塞 Phase A；签名画板本地闭环稳定后，已在 Phase C 接入鬼魂录制/回放与宠物任务奖励。

### A1 配置与资源

- [x] **A1.1** 新增 `configs/game/body-signature.js`（或 `demo/configs/`）：本期 **签名槽类型**（如 `HAND`）、**三张参考图** 路径、`templateId`、**基础加成表**、哈希阈值 `low: 0.1`、`high: 0.7`（相似度映射规则说明）。  
  当前实现：先落在 `apps/client/src/body-signature-config.js`，使用程序化参考轮廓，避免 Phase A 被资源管线卡住。
- [x] **A1.2** 资源目录：三张 ref PNG（透明底统一尺寸，如 128×128），放入 `demo/assets/body-signature-refs/` 或 `apps/client/img/body-signature/`（与 webpack 复制策略一致）。  
  当前实现：资源位于 `apps/client/assets/img/body-signature/refs/`，构建复制到 `dist/client/img/body-signature/refs/`。

### A2 UI 结构（HTML/CSS）

- [x] **A2.1** 在 [`apps/client/index.html`](../apps/client/index.html) 增加 **`#bodySignaturePanel`**（默认隐藏）：  
  - 左侧：**固定角色立绘**（SVG/PNG）+ **明显镂空/高亮「缺一格」**；下方或侧列 **三张参考缩略图**（可点选高亮当前匹配目标，或 V5 定案为「已选类型则三选一 ref」——与策划锁死一种交互）。  
  - 右侧：**签名小画布**（建议独立 `<canvas>`，尺寸固定如 256×256）。  
  - 按钮：**清除**、**撤销（可选 v2）**、**提交**、**跳过（用参考默认、无加成）**。
- [x] **A2.2** 样式：与 `startMenu` 同屏或全屏遮罩；移动端可后续适配，v1 可桌面优先。

### A3 客户端逻辑（新模块）

- [x] **A3.1** 新建 `apps/client/src/body-signature-controller.js`（或 `v5-body-signature-flow.js`）：负责打开/关闭面板、绑定画布指针事件、清屏、导出 `canvas.toDataURL('image/png')`。
- [x] **A3.2** **哈希分档**：引入 `browser-image-hash`（或等价）在 **客户端** 对「玩家图」与「三张 ref」分别算距离，映射到 **相似度 s ∈ [0,1]**（文档写明映射公式，如 `1 - hamming/max`）。输出：  
  - `s < 0.1` → `usePlayerStroke: false`，`bonusTier: none`  
  - `s >= 0.1` → `usePlayerStroke: true`，`bonusTier: base`  
  - `s >= 0.7` → `bonusTier: high`（基础加成 ×1.5）  
  选中 **最接近** 的那张 ref 的 `templateId`。  
  当前实现：用 16×16 alpha grid 与程序化 ref 轮廓比较；后续可替换为真实 perceptual hash 库，不影响 payload。
- [x] **A3.3** 提交结果写入 **`global.bodySignature`** 或 `localStorage`：`{ templateId, slotType, similarity, bonusTier, usePlayerStroke, strokeDataUrl }`，供下一步 socket 使用。
- [x] **A3.4** 接入 [`apps/client/src/app.js`](../apps/client/src/app.js)：`startGame(type)` 最前面判断 `config.v5BodySignatureEnabled`（或读 `global` / query），若开启则 **`bodySignatureController.open(type, onDone)`**，`onDone` 里再调用现有 `avatarDraftController.beginDraftFlow` 或 `enterGame`。

### A4 文案与本地化

- [x] **A4.1** [`apps/client/src/i18n.js`](../apps/client/src/i18n.js) 增加 `signature.*` 键（标题、说明、三档结果提示、跳过警告）。

### A5 构建与依赖

- [x] **A5.1** `npm install browser-image-hash`（或选定库），webpack 能打包。  
  当前实现：选定库为本地 `body-signature-analysis.js` 的 16×16 alpha-grid 感知近似，避免新增依赖；webpack 已能打包。
- [x] **A5.2** `npm run build` 通过；手动：开局 → 画板 → 提交 → 进入游戏（数据可先只打 `console.log`）。

**Phase A 完成标准**：不连服务端也能 **完整走通画板 → 本地持久化签名结果 → 进入现有对局**；控制台或 UI 临时显示「模板 / 档位」。

---

## Phase B · 与服务端握手（P1）

- [x] **B1** [`socket-controller.js`](../apps/client/src/socket-controller.js) / 握手 payload：附加 `bodySignature` 对象。
- [x] **B2** [`apps/server/src/server.js`](../apps/server/src/server.js)（或 `player.js`）：创建 `Player` 时读入并挂在 `player.bodySignature`；**暂不**改 `body.js` 数值，先日志校验。
- [x] **B3** 将 `bodySignature` 同步进 `enumerateVisibleWorld` 或仅自用 HUD（后续再接 `applyBodyState`）。  
  当前实现：`player-projection.js` 下发 `bodySignature`，客户端 `player-hydration.js` 同步；服务端同时把签名转成权威 `bodyParts`。

---

## Phase C · 玩法挂钩（P2，画板之后）

- [x] **C1** [`body.js`](../apps/server/src/body.js)：`createBodyPart` 支持 `templateId` / `signatureBonus`；开局默认 loadout + 签名槽覆盖。  
  当前实现：`bodySignature` 在 `Player.clientProvidedData` 后覆盖 HAND 槽；`faint/echo` 转成 `connectionRangeBonus`，并进入同步 payload。
- [x] **C2** 槽位换装 + `stealRandomCorePart` 完整对象（见 V5 §5）。  
  当前实现：`equipBodyPart` 会替换同类型槽并把旧件掉落；`stealRandomCorePart` 保留完整 part 对象；`PartLootManager` 负责世界掉落、拾取、同步与客户端绘制。
- [x] **C3** 鬼魂 / 录制 / 宠物：按 [`PLAN-v5-historical-echo.md`](PLAN-v5-historical-echo.md) §七排期。  
  当前实现：`ghost/recorder.js` 写入轨迹/聊天/物品 L1 事件；`ghost/manager.js` 按时间+地点触发历史回响与绝对坐标物品；客户端绘制 ghost；宠物任务请求通过 `npc/task-rewards.js` 生成完整部位奖励并记录事实。

---

## 风险与决策点（画板相关）

1. **交互二选一**：三张 ref 是 **固定展示三选一类型** 还是 **先选部位类型再画**——须在 A1 锁死，否则哈希比对对象不明。  
2. **立绘资源**：美术出「缺一格」母图 vs 程序用 mask；v1 可用 **单张 PNG + CSS clip** 或 **SVG path 镂空**。  
3. **与 `avatarDraft` 顺序**：建议 **签名画板 →（可选）名片 draft → 进局**；配置项关闭时保持旧行为。  
4. **哈希在客户端**：防作弊需服务端二次校验（Phase B+）；v1 可只客户端。

---

## 修订

- 2026-04-24：初版，**Phase A 画板优先**。
- 2026-04-25：完成 Phase B/C 剩余项：签名同步与服务端权威部位、世界部位掉落/拾取、历史回响录制/回放、宠物任务奖励链路。
