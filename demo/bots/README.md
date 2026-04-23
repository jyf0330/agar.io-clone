> ## DEPRECATED · V3 不再使用预录 bot
>
> **2026-04-24 更新**：项目切到 V3 赛道 2 方案。V3 的 NPC 由 LLM 实时驱动，
> **不再使用**本目录的预录 JSON 轨迹。详见 [demo/PLAN-v3-track2.md](../PLAN-v3-track2.md)。
>
> 本目录保留作为 **Day 1 早期 debug 兜底**（如果 LLM Wrapper 没搭好、想先测地图渲染），
> 也保留作为 V2 时代的设计档案。
>
> **不要**再在 V3 里走本目录的代码路径。

---

# demo/bots/ · 预录 Bot 回放文件（V2 · 已归档）

V2 方案 Day 2 的本地同屏实现依赖这些文件。服务端启动时加 `--demo-bots=2`，
按顺序读取 `bot1.json`、`bot2.json` 并按 fps 把每一帧当作该玩家的最新位置
喂进 game loop（绕过真实 socket，不走网络）。

## 文件格式合同（服务端严格按这个读）

```jsonc
{
  "version": 1,                     // 改格式时递增，server 遇到未知版本应拒绝启动并报错
  "meta": {
    "name": "Mochi",                // HUD 上显示的名字
    "color": "#FF6B9D",             // 死亡涂笔时的颜色；也用于 HUD 小圆点
    "skeleton": "skeleton-b-blob",  // 关联 demo/assets/skeleton-bases/ 的一张
    "durationSec": 90,              // 与 V2 局时一致
    "fps": 5,                       // 帧率：每秒喂 5 帧
    "mapWidth": 5000,               // 必须匹配 configs/game/config.js::gameWidth
    "mapHeight": 5000,              // 同上
    "seed": 42,                     // 调试用，能复现
    "maxSpeedPerSec": 280.0         // 记录用，服务端可忽略
  },
  "frames": [
    { "t": 0.0,  "x": 1829.29, "y": 2552.27, "facing": -1.0647 },
    { "t": 0.2,  "x": 1858.58, "y": 2504.54, "facing": -0.9826 },
    /* …共 durationSec * fps 条（90 × 5 = 450 条）… */
    { "t": 89.8, "x": 2996.13, "y": 2250.17, "facing": -0.5938 }
  ]
}
```

## 服务端消费建议（Day 2 程序员实现时参考）

1. **启动时一次性加载**：`JSON.parse(fs.readFileSync(...))`，每个 bot 存成
   `{ currentFrameIdx: 0, meta, frames }`。
2. **每一帧游戏 tick 判断**：`botElapsed = (now - roundStartAt) / 1000`，
   然后 `frameIdx = Math.min(frames.length - 1, Math.floor(botElapsed * meta.fps))`，
   读出 `{x, y, facing}`，塞进 `players[botId]` 的 position。
3. **死亡碰撞沿用真实逻辑**：bot 的 avatar 被真人撞到，走正常的"涂一笔"流程；
   bot 不会主动撞人（它只按录像动）。这是 demo 的特性不是 bug。
4. **回放结束**：`frameIdx >= frames.length - 1` 时 bot 停在最后一帧（不消失），
   正好配合 V2 的"90 秒到点慢动作亮相"收尾。

## 重新生成

```bash
# 默认两个示例
python3 demo/scripts/generate_bots.py

# 自定义一条，比如节奏快一点的 red bot：
python3 demo/scripts/generate_bots.py \
    --name Chili --color "#E03E3E" --skeleton skeleton-d-robot \
    --seed 7 --max-speed 360 --out demo/bots/bot3.json
```

`--seed` 固定后轨迹 100% 可复现。demo 彩排时可以针对录到的问题调 seed 重跑。

## 小提醒

- 不要 commit 无意义的大 diff：脚本每行写一帧（见 `generate_bots.py::write_bot`），
  所以 seed 一致就 diff 一致。别手改 JSON。
- 两个默认 bot 的 spawn 故意左右分开（1800, 2600 vs 3200, 2400），避免开局堆在一起。
- fake-chase 节奏每 10 秒一次，每次 2 秒冲向地图中心——观众会觉得"bot 在追人"，
  但它其实只是认路。不要告诉评委。
