# AI / 自动化测试清单

这份给 AI、脚本或测试工程使用。重点是机械覆盖、回归稳定性、状态断言、日志和异常路径。

每项记录：命令、脚本名、截图/录屏、控制台错误、服务端日志、是否通过。

## 1. P0 冒烟

- [ ] `AI优先` `A01-01` 执行 `npm test`，记录通过数量、pending 数量、失败堆栈。
- [ ] `AI优先` `A01-02` 执行 `npm run build`，确认无报错，`dist/client/js/app.js` 更新。
- [ ] `AI优先` `A01-03` 执行 `npm start`，访问本地首页，HTTP 200，标题为“开放吞噬”。
- [ ] `AI优先` `A01-04` 浏览器控制台无首屏错误，Network 无关键 JS/CSS/图片 404。
- [ ] `AI优先` `A01-05` 线上地址可打开时，确认页面来自 3000 端口，能加载 JS/CSS。
- [ ] `AI优先` `A01-06` 执行 `npm run audit:prod`，记录生产依赖漏洞，作为上线风险输入。

## 2. 开始菜单与本地状态

- [ ] `AI优先` `A02-01` 输入合法昵称 `tester_01`，点击开始，能进入下一步或进游戏。
- [ ] `AI优先` `A02-02` 输入非法昵称：中文、空格、符号、HTML 标签，确认显示错误或被拒绝。
- [ ] `AI优先` `A02-03` 昵称超过 25 字符时被截断或限制，服务端不报错。
- [ ] `AI优先` `A02-04` 切换中英文后，首屏、设置、签名、HUD 关键文案存在。
- [ ] `AI优先` `A02-05` 勾选设置项后进游戏，相关全局状态变化符合预期。
- [ ] `AI优先` `A02-06` 刷新页面后语言、名片、签名、草稿等 localStorage 持久项符合预期。

## 3. 身体签名 V5 状态

- [ ] `AI优先` `A03-01` 新玩家第一次开始游戏时 `#bodySignaturePanel` 打开。
- [ ] `AI优先` `A03-02` 空画布提交不会进入游戏，显示空画布提示。
- [ ] `AI优先` `A03-03` 模拟画线后提交，localStorage 写入 bodySignature。
- [ ] `AI优先` `A03-04` bodySignature payload 包含 missingPart、selectedReferenceId、tier、bonus、similarity、coverage、imageDataUrl。
- [ ] `AI优先` `A03-05` 点击跳过，payload 标记 skipped，imageDataUrl 为 null。
- [ ] `AI优先` `A03-06` 已有签名时再次开始不重复强制弹签名。
- [ ] `AI优先` `A03-07` 握手 payload 附带 bodySignature，服务端同步后玩家 HUD 有身体信息。

## 4. 名片、草稿与图层状态

- [ ] `AI优先` `A04-01` 打开名片画板时 Fabric 脚本加载成功或给出失败提示。
- [ ] `AI优先` `A04-02` 保存名片后 localStorage 有 playerCard，包含 previewDataUrl、layers、activeLayerId。
- [ ] `AI优先` `A04-03` 导出 PNG 触发下载，导出 JSON 触发下载且 JSON 包含 layers。
- [ ] `AI优先` `A04-04` 保存到草稿后 draft 列表增加，刷新后仍存在。
- [ ] `AI优先` `A04-05` 新建图片时，有内容会先保存草稿，再清空画布。
- [ ] `AI优先` `A04-06` 图层显示/隐藏/锁定按钮会改变 layer payload。
- [ ] `AI优先` `A04-07` 两个客户端不同名片靠近后，同步包包含 playerCardPreviewDataUrl。

## 5. Socket 与游戏基础状态

- [ ] `AI优先` `A05-01` 玩家入场完成 socket 流程：connect -> respawn -> welcome -> gotit -> serverTellPlayerMove。
- [ ] `AI优先` `A05-02` 每帧或定时发送 `'0'` 移动心跳，服务端 lastHeartbeat 更新。
- [ ] `AI优先` `A05-03` 窗口 resize 后发送 `windowResized`，服务端 screenWidth/screenHeight 更新。
- [ ] `AI优先` `A05-04` 观战模式进入后收到全图玩家、食物、质量块、病毒、部位、ghost 数据。
- [ ] `AI优先` `A05-05` 两个玩家同时进入，双方同步包含对方玩家。
- [ ] `AI优先` `A05-06` 玩家断开后，服务端清理玩家并广播 playerDisconnect。

## 6. 经典玩法断言

- [ ] `AI优先` `A06-01` 玩家吃 food 后 mass 增加，food 数量补充。
- [ ] `AI优先` `A06-02` 触发 `'1'` 喷射质量，玩家质量下降，massFood 增加。
- [ ] `AI优先` `A06-03` 自己刚喷出的同 cell 质量块不会立刻被吃回。
- [ ] `AI优先` `A06-04` 触发 `'2'` 分裂，cell 数增加且不超过 limitSplit。
- [ ] `AI优先` `A06-05` 吃病毒触发 virusSplit。
- [ ] `AI优先` `A06-06` 大玩家吞噬小玩家后，吞噬者质量增加，被吞者收到 settlement + RIP。
- [ ] `AI优先` `A06-07` 多 cell 到合并时机后可重新合并。

## 7. 多人、排行榜、聊天、管理员

- [ ] `AI优先` `A07-01` 排行榜按质量排序，leaderboard 事件包含玩家数。
- [ ] `AI优先` `A07-02` 新玩家加入广播 playerJoin。
- [ ] `AI优先` `A07-03` 普通聊天通过 `player:chat` 或 `playerChat` 广播，HTML 标签被清理，长度限制生效。
- [ ] `AI优先` `A07-04` `-help` 显示命令列表，`-ping` 返回 pongcheck 延迟。
- [ ] `AI优先` `A07-05` `-dark`、`-border`、`-mass`、`-continuity`、`-roundfood` 改变对应状态。
- [ ] `AI优先` `A07-06` 未登录管理员执行 kick，返回无权限。
- [ ] `AI优先` `A07-07` 错误密码登录返回失败并记录日志。
- [ ] `AI优先` `A07-08` 测试服默认配置 `-login DEFAULT` 后可 kick 非管理员玩家。
- [ ] `AI优先` `A07-09` 踢不存在玩家或管理员玩家时返回找不到或不可踢。

## 8. 连接、关系、实体化、身体部位

- [ ] `AI优先` `A08-01` 靠近玩家触发 `'3'`，连接状态进入 CHANNELING。
- [ ] `AI优先` `A08-02` 距离满足时进入 RESONATING，intimacy 增加。
- [ ] `AI优先` `A08-03` 距离不满足时进入 BREAK，spike / pollution 增加。
- [ ] `AI优先` `A08-04` 额外 HAND 提高连接距离，额外 HEART/SPIKE 影响结算数值。
- [ ] `AI优先` `A08-05` HUD 同步 materialization 与 materializationStage。
- [ ] `AI优先` `A08-06` 拾取地图部位后，bodyPartCount 和 bodyPartCounts 更新。
- [ ] `AI优先` `A08-07` FOOT、HEAD、MOUTH 的移动、视野、吞噬收益加成可用脚本对比。
- [ ] `AI优先` `A08-08` 吞噬玩家后触发 body.stealRandomCorePart，结算记录部位来源。
- [ ] `AI优先` `A08-09` 达到 OVERREAL / body_complete 条件时，本局 settlement 显示 winner。

## 9. 部位掉落与拾取

- [ ] `AI优先` `A09-01` 地图 partLoot 数量不超过配置 maxWorldParts。
- [ ] `AI优先` `A09-02` 玩家靠近部位后 collectForPlayer 生效，同类旧部位被替换时产生 droppedPart。
- [ ] `AI优先` `A09-03` NPC 任务奖励生成部位，sourceType 为 npc_reward。
- [ ] `AI优先` `A09-04` 历史回响生成部位，sourceType 为 ghost_echo。
- [ ] `AI优先` `A09-05` 拾取、装备、替换、掉落事件写入 memoryStore / ghostRecorder。

## 10. NPC、跟宠、记忆

- [ ] `AI优先` `A10-01` 默认启动时 NPC roster 有 Mochi、Doudou、Wugui。
- [ ] `AI优先` `A10-02` 玩家入场后 activePet 同步到玩家 payload。
- [ ] `AI优先` `A10-03` 输入 `pet mochi` / `pet doudou` / `pet wugui`，activePet 切换并记录 pet_switched。
- [ ] `AI优先` `A10-04` 输入快捷问题，NPC 有 `npc:speak` 或 fallback，不崩。
- [ ] `AI优先` `A10-05` 输入“任务”，靠近 NPC 时生成奖励；离太远时返回提示。
- [ ] `AI优先` `A10-06` 最近聊天只保留 10 条服务端上下文，客户端 Recent 只保留 5 条。
- [ ] `AI优先` `A10-07` 回合结束后 summarizeSession / updatePersonaImpressions 被调用或降级失败不影响主流程。
- [ ] `AI优先` `A10-08` `V5_NPC_ENABLED=0 npm start` 时游戏主流程仍可玩，NPC UI 不破坏页面。

## 11. 历史回响、录制与结算

- [ ] `AI优先` `A11-01` 勾选录制同意时，移动/聊天/拾取/战斗写入 ghost trace/chat/item/part 事件。
- [ ] `AI优先` `A11-02` 取消录制同意时，settlement 中 recordingConsent 为 false，historyWritten 为 false。
- [ ] `AI优先` `A11-03` demo mode 下达到时间窗口和半径，map.ghosts 出现 active ghost。
- [ ] `AI优先` `A11-04` GHOST_DEBUG 开启时 HUD 显示 active、anchors、window、radius、ready。
- [ ] `AI优先` `A11-05` 回合时间到期自动 settlement + RIP，endedReason 为 round_end。
- [ ] `AI优先` `A11-06` 输入快速结算命令触发 settlement + RIP，endedReason 为 demo_quick_end。
- [ ] `AI优先` `A11-07` 玩家被吞噬时 settlement endedReason 为 swallowed，winnerName 为吞噬者。

## 12. 稳定性与异常路径

- [ ] `AI优先` `A12-01` 连续刷新 20 次，无服务端内存明显增长、无僵尸玩家残留。
- [ ] `AI优先` `A12-02` 同时启动 5-10 个客户端，移动 60 秒，服务端无崩溃。
- [ ] `AI优先` `A12-03` 断网/关闭 tab 后，5 秒心跳超时逻辑能清理玩家。
- [ ] `AI优先` `A12-04` 发送异常 socket payload：空 target、非数字 target、空聊天、超长聊天，服务端不崩。
- [ ] `AI优先` `A12-05` LLM/Ollama/OpenAI 不可用时，NPC fallback 生效，主游戏不受影响。
- [ ] `AI优先` `A12-06` SQLite/数据库不可用时，日志/记忆降级，不阻塞基础游戏。
- [ ] `AI优先` `A12-07` 长昵称、空排行榜、无名玩家、无名片玩家时无控制台错误。

## 13. 线上部署验收

仅当本次改动要同步云服务器时执行。

- [ ] `AI优先` `A13-01` 同步前本地 `npm test` 与 `npm run build` 通过。
- [ ] `AI优先` `A13-02` rsync 排除 `.git/`、`node_modules/`、`data/`、`.env*`、`graphify-out/`、机器本地状态。
- [ ] `AI优先` `A13-03` 服务器执行 `npm install --no-audit --no-fund && npm run build && pm2 restart agar-io-clone --update-env` 成功。
- [ ] `AI优先` `A13-04` 服务器本机 `curl http://127.0.0.1:3000/` 返回 HTML，包含“开放吞噬”。
- [ ] `AI优先` `A13-05` 公网 `http://124.222.83.113:3000/` 可完成自动化冒烟：开始、移动、吃食物、聊天、结算或死亡。

