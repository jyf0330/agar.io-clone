# Deliverable 1 · 6 张残缺骨架底图 Midjourney Prompts

> **2026-04-24 V3 更新**：项目切到赛道 2 方案，新增第 6 张 "小乌龟" 骨架（骨架 F）专门给 `wugui` NPC。
> 玩家继续只用前 5 张（A-E），骨架 F 只给 NPC 用。prompt 加在第 5.5 节。
>
> 其它内容（规格、降采样、验收）**完全不变**。

> 目标：为骨架模板化提供 5+1 张 PNG 底图，玩家 20 秒内在其上**涂色 + 加 10 笔**完成 avatar。
> 直接绕开 master 分支"空白画板画不出来"的 bug：画板只叠加新笔触到 PNG 上，不再承担"从零开始"的职责。

---

## 0. 必须遵守的技术约束（全部 5 张通用）

| 项 | 值 | 原因 |
|---|---|---|
| 目标最终尺寸 | **320×320 PNG** | 匹配 `apps/client/src/player-card-editor.js:11` 的 `CANVAS_SIZE = 320` |
| 生成尺寸 | **1024×1024**（MJ 原生）→ 后期用 `sips` / Photoshop 降采样 | 保留细节，降采样时更柔和 |
| 长宽比参数 | `--ar 1:1` | 圆形裁切（`CIRCLE_RADIUS = CANVAS_SIZE / 2`）强制正方 |
| 主体占画面 | 约 **70%**，居中 | 被圆形 mask 裁切后仍完整可见；留 15% 边距 |
| 背景 | **纯白 #FFFFFF 或极浅灰 #F5F5F5**，无阴影、无渐变 | 玩家后续用任意颜色涂色都能看清；后期可一键抠透明 |
| 线条颜色 | **单一深灰 #3A3A3A**（不要纯黑） | 和玩家画笔颜色区分开，玩家的笔触不会被"吞"进线稿 |
| 线条粗细 | **中等偏粗**（MJ 用 "thick outline" / "bold linework"） | 320×320 下仍清晰；太细降采样后会断 |
| 禁止出现 | 阴影、渐变、高光、贴图、纹理、文字、水印 | 会和玩家涂色打架 |
| 风格 | **flat line art, coloring book page, no fill** | 玩家负责填色 |
| MJ 参数 | `--v 6 --style raw --stylize 50 --ar 1:1 --no shadow, gradient, texture, text` | stylize 低，防 MJ 自作主张加装饰 |

> **缺失槽位规则**：每张骨架必须**缺失 2–3 个槽位**，从 `['hair','eye','arm','leg','accessory']` 里挑。其余槽位保留简单轮廓。这样玩家 10 笔能有明确目标。

---

## 1. 骨架 A · 「无脸人偶」Faceless Doll

**缺失槽位**：`eye`, `hair`, `accessory`（3 个）
**保留**：`arm`, `leg` 的简单轮廓
**画面直觉**：一个圆头小人，脸是空白的椭圆，只有身体 + 四肢轮廓。

```text
/imagine prompt: a minimalist cartoon doll character centered in frame, bold dark gray outline only, no fill colors, oval blank face with absolutely no features no eyes no mouth no nose, smooth bald round head, simple rounded torso, two straight arms hanging down, two short legs, flat coloring book style, children's activity page, thick even linework, pure white background, no shadow no gradient no texture no decoration, full body visible within center 70% of square canvas --ar 1:1 --v 6 --style raw --stylize 50 --no shadow, gradient, texture, hair, eyes, mouth, nose, text, watermark
```

**验收点**：打印出来像 2 元店的涂色本封面。脸是纯白椭圆。头顶是光的。身上没有任何口袋/按钮/领结。

---

## 2. 骨架 B · 「四脚兽宝宝」Blob Critter

**缺失槽位**：`arm`, `accessory`, `hair`（3 个）
**保留**：`eye`（两个大圆点）, `leg`（四条短腿，其实是 leg 槽位的变形）
**画面直觉**：一团圆滚滚的小兽，两只空洞大眼，四条小短腿，没手、没头发、没配饰。

```text
/imagine prompt: a cute round blob creature character centered in frame, bold dark gray outline only, pure line art no fill, chubby circular body shape like a dumpling, two large circular eyes as hollow circles no pupils no eyelids, four very short simple legs at the bottom, absolutely no arms no hands, smooth completely bald top, no tail no ears no horns no accessories, flat coloring book style, thick even linework, pure white background, no shadow no gradient no texture, subject occupies center 70% of square canvas --ar 1:1 --v 6 --style raw --stylize 50 --no arms, hands, hair, horns, ears, tail, accessories, shadow, gradient, texture, text
```

**验收点**：看起来像一个有脚的汤圆。眼睛是两个空心圆（玩家可以涂瞳孔）。四条小腿。没有任何突出物。

---

## 3. 骨架 C · 「长条幽灵」Tall Ghost

**缺失槽位**：`hair`, `arm`, `leg`（3 个）
**保留**：`eye`, `accessory`（底部可以有锯齿状下摆作为 accessory 引子）
**画面直觉**：拉长的幽灵轮廓，像被压扁的水滴，两只眼，没有四肢，底部波浪边。

```text
/imagine prompt: a vertical elongated ghost silhouette character centered in frame, bold dark gray outline only, pure line art no fill, tall tear-drop body shape with wavy scalloped bottom edge like classic cartoon ghost, two small oval eyes placed high on the body as hollow shapes no pupils, absolutely no arms no hands no legs no feet no hair no accessories on top, smooth rounded top, flat coloring book style, thick even linework, pure white background, no shadow no gradient no texture, subject occupies center 70% of square canvas --ar 1:1 --v 6 --style raw --stylize 50 --no arms, hands, legs, feet, hair, hat, accessories, shadow, gradient, texture, mouth, text
```

**验收点**：像吃豆人被拉高一倍。没有手没有脚。下摆像三个连着的小波浪。

---

## 4. 骨架 D · 「豆荚小机器人」Pod Robot

**缺失槽位**：`eye`, `hair`, `accessory`（3 个）
**保留**：`arm`（两根直杆）, `leg`（两根直杆）
**画面直觉**：一个胶囊形身体，四根火柴棍四肢，脸上一个空白矩形屏幕，没任何按钮/天线/耳朵。

```text
/imagine prompt: a simple geometric robot character centered in frame, bold dark gray outline only, pure line art no fill, vertical capsule shaped body, a large blank rectangular screen on the face with absolutely no content inside no eyes no mouth no pixels no text, two straight thin stick arms on the sides, two straight thin stick legs at the bottom, no antenna no ears no buttons no panels no knobs no screws no hair, flat coloring book style, thick even linework, pure white background, no shadow no gradient no texture, subject occupies center 70% of square canvas --ar 1:1 --v 6 --style raw --stylize 50 --no antenna, buttons, knobs, screws, panels, text, numbers, lights, shadow, gradient, texture
```

**验收点**：像宜家说明书里的小人。脸上一个纯白长方形。没有一颗螺丝。

---

## 5. 骨架 E · 「长耳豆子」Bean Bunny

**缺失槽位**：`eye`, `arm`, `accessory`（3 个）
**保留**：`hair`（两只长耳朵占 hair 槽）, `leg`（两条短腿）
**画面直觉**：一颗直立的豆子身体，顶上两只长耳朵，两条小短腿。没眼睛、没手、没配饰。

```text
/imagine prompt: a standing bean shaped character centered in frame, bold dark gray outline only, pure line art no fill, vertical oval bean body, two long upright rabbit ears on top as simple elongated ovals, absolutely no facial features no eyes no nose no mouth, no arms no hands, two very short simple legs at the bottom, no tail no accessories no clothing, flat coloring book style, thick even linework, pure white background, no shadow no gradient no texture, subject occupies center 70% of square canvas --ar 1:1 --v 6 --style raw --stylize 50 --no eyes, nose, mouth, arms, hands, tail, clothes, accessories, shadow, gradient, texture, whiskers, text
```

**验收点**：像一颗立着的花生米戴了两片兔耳朵。脸上一片空白。没有手。

---

## 5.5 骨架 F · 「小乌龟」Slow Turtle（V3 新增 · NPC 专用）

> V3 赛道 2 版本新增。给 `wugui` NPC（老成稳重人设）用。玩家的随机池**不包括**这张。

**缺失槽位**：`eye`, `hair`, `accessory`（3 个）
**保留**：`arm`（两只小短手）, `leg`（四条小矮腿）, **龟壳轮廓**（新元素，区分度来源）
**画面直觉**：侧面轮廓的小乌龟，椭圆龟壳占身体主体，脸是空白，没表情，四条小腿和两只小手。

```text
/imagine prompt: a cute minimalist small turtle character centered in frame side view, bold dark gray outline only, pure line art no fill, large oval shell shape as main body outline with simple smooth seam pattern not detailed, small rounded head sticking out on the left side with absolutely no facial features no eyes no mouth no nose, two very short front arms and two very short back legs, a tiny short tail, no hair no hat no accessories, no shell textures no scales no decorations, flat coloring book style, thick even linework, pure white background, no shadow no gradient no texture, subject occupies center 70% of square canvas --ar 1:1 --v 6 --style raw --stylize 50 --no eyes, mouth, nose, texture, scales, shell decoration, hat, accessories, shadow, gradient, text
```

**验收点**：像涂色书里最简化的那只乌龟。椭圆壳 + 空白头 + 4 腿 + 小尾巴。壳上没有任何图案（`wugui` 的稳重感从"朴素"出来）。

**命名**：`demo/assets/skeleton-bases/skeleton-f-turtle.png`

---

## 6. 生成完成后的 3 步处理（必做）

### 6.1 四选一 · 质检
每条 prompt 跑 `/imagine`（U1/U2/U3/U4 会出 4 张变体）。从 4 张里挑：
- 背景**完全纯白**（MJ 经常偷偷加浅灰阴影，有就淘汰）
- **缺失槽位真的缺失**（MJ 会手贱加眼睛，有就淘汰）
- 主体**在中心圆内**（裁切 Φ=320 圆后不切到肢体）

如 4 张都不合格，`/imagine` 重跑，不要勉强用。

### 6.2 降采样 + 抠白背景

macOS 命令行一次搞定（放 `demo/assets/skeleton-source/` 里原图，输出到 `demo/assets/skeleton-bases/`）：

```bash
# 1024 → 320 降采样
for f in demo/assets/skeleton-source/*.png; do
  name=$(basename "$f" .png)
  sips -z 320 320 "$f" --out "demo/assets/skeleton-bases/${name}.png"
done

# （可选）白背景转透明 —— 需要先装 ImageMagick：brew install imagemagick
for f in demo/assets/skeleton-bases/*.png; do
  magick "$f" -fuzz 5% -transparent white "${f%.png}-alpha.png"
done
```

### 6.3 命名规则

最终放进代码里的 6 张必须叫：

```
demo/assets/skeleton-bases/skeleton-a-doll.png    # 玩家池
demo/assets/skeleton-bases/skeleton-b-blob.png    # 玩家池 + mochi NPC
demo/assets/skeleton-bases/skeleton-c-ghost.png   # 玩家池
demo/assets/skeleton-bases/skeleton-d-robot.png   # 玩家池
demo/assets/skeleton-bases/skeleton-e-bean.png    # 玩家池 + doudou NPC
demo/assets/skeleton-bases/skeleton-f-turtle.png  # V3 新增 · wugui NPC 专用
```

程序员 Day 1 直接读这 6 个路径，不再改名。玩家随机池只含 a-e，骨架 f 只用于 `wugui` NPC。

---

## 7. 一次性验收（今晚跑完 MJ 后做）

- [ ] 6 张 PNG 都是 320×320
- [ ] 6 张背景都是纯白（或透明 alpha）
- [ ] 6 张都肉眼可辨缺失哪 2–3 个槽位
- [ ] 任意一张放在 macOS Preview 里套上圆形 mask（快捷键 `Shift+Cmd+4` 拖正方形截图后在 Preview 编辑工具里加 Ellipse mask），主体不被圆切到
- [ ] 6 张看起来"**像一家人**"——统一的线条粗细、统一的深灰色 `#3A3A3A`、统一的留白哲学

> 任何一条过不了，那张重跑。不要妥协。这是 Day 1 玩家看到的第一个画面。
