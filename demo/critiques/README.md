# demo/critiques/ · 本地点评池 · V3 离线 fallback

> **2026-04-24 更新**：项目切到 V3 赛道 2 方案。本目录**不再是主路径**，
> 角色降级为 **"LLM 失败时的离线兜底"**。V3 主路径是 LLM 实时驱动 NPC 点评，详见
> [demo/PLAN-v3-track2.md](../PLAN-v3-track2.md) 第 3.6 节。
>
> V2 时代的描述（"LLM 做 async bonus，失败就用这里"）仍然有效，但语境变了：
> - V2：本地池 = 默认。LLM = 可选增强。
> - V3：**LLM = 默认**。本地池 = 拔网兜底 · forbiddenWords 校验失败兜底 · token 超预算兜底。
>
> 所有匹配算法、forbidden words、审稿守则、lint 脚本**保持不变**。
> V3 额外新增 2 个 fallback 池（不在本文件）：
> - `demo/critiques/greetings.json` · NPC 打招呼（Week 1 Day 4 新增）
> - `demo/critiques/expectations.json` · 局末期望（Week 2 Day 13 新增）
>
> **本文件下面的内容**是 V2 时代写的，V3 继续沿用，只把 "主路径" 的字眼换成 "fallback"。

---

# demo/critiques/ · 本地点评池（原 V2 文档）

对应 V3 的"LLM 失败时的点评 fallback"。**当 LLM 正常时走 LLM，超时/拒绝/拔网时走这里** —— 无感降级，这是方案不哑炮的关键。

---

## 文件清单

- `pool.json` · 50 个 slot，我已经起了 c01–c30 共 30 条（已按 V2 硬规则过稿），
  c31–c50 是留给你 / 策划的 20 条占位。每条有 `_todo` 字段告诉你想什么方向。
- `README.md`（本文）· 匹配算法 + LLM prompt 约束 + 审稿守则。

---

## 一、匹配算法（程序员按这个写，15 行搞定）

### 输入（局末每人算一组特征）

```ts
type PlayerFeatures = {
  originalPartsLeft: number;   // 原创部位数：未被涂过的原稿层数
  paintedOnMe: number;         // 被他人涂笔次数
  strokesOnOthers: number;     // 主动在他人身上涂笔次数
  dominantColor:
    | "red" | "orange" | "yellow" | "green"
    | "blue" | "purple" | "pink" | "mixed";
};
```

### 算法

```
function pickCritique(pool, f) {
  // 1) 筛出所有满足 prerequisites 的 entry（且 text 非空）
  const candidates = pool.entries.filter(e =>
    e.text && e.text.length > 0 && passesAllPrereqs(e.prerequisites, f)
  );

  // 2) 特异性优先：prerequisites 里限定的 key 数量越多越靠前
  candidates.sort((a, b) =>
    countKeys(b.prerequisites) - countKeys(a.prerequisites)
  );

  // 3) 最高特异性这一层做稳定随机：同分之间用 hash(playerId+roundSeed) 选
  const topSpecificity = countKeys(candidates[0]?.prerequisites ?? {});
  const topTier = candidates.filter(
    e => countKeys(e.prerequisites) === topSpecificity
  );
  return topTier[stableHash(playerId, roundSeed) % topTier.length];
}

function passesAllPrereqs(p, f) {
  if (p.originalPartsMin   != null && f.originalPartsLeft  < p.originalPartsMin) return false;
  if (p.originalPartsMax   != null && f.originalPartsLeft  > p.originalPartsMax) return false;
  if (p.paintedOnMin       != null && f.paintedOnMe        < p.paintedOnMin)     return false;
  if (p.paintedOnMax       != null && f.paintedOnMe        > p.paintedOnMax)     return false;
  if (p.strokesOnOthersMin != null && f.strokesOnOthers    < p.strokesOnOthersMin) return false;
  if (p.strokesOnOthersMax != null && f.strokesOnOthers    > p.strokesOnOthersMax) return false;
  if (p.dominantColor      != null && f.dominantColor      !== p.dominantColor)  return false;
  return true;
}
```

### 兜底

如果 `candidates.length === 0`（一般不会发生，但万一 4 个玩家都"mixed 色 + 中庸分"
且紫色/橙色 slot 还空着），**必须**走 c49/c50（策划写的通用兜底条）。
绝对不能显示空字符串。

---

## 二、主色计算（dominantColor）

玩家整局画下的所有笔触做加权（笔粗 × 不透明度 × 长度），转到 HSL，
按 `pool.json::meta.dominantColorBuckets` 的 `hueRangeDeg + minSaturation` 归桶。

- 若最大桶占比 < 40%（也就是四散），返回 `"mixed"`。
- 灰度笔触（saturation < 最低阈值）不计入任何彩色桶，但计入 mixed 判定的分母。

参考实现：`chroma-js` / `color` 包都有 `.hsl()` 直接出。

---

## 三、LLM async bonus 的 prompt 约束（Day 5 用）

**这是 demo 不翻车的第二道防线**。服务端在局开始时异步调 LLM，30s 超时；
成功就盖掉本地条目，失败就用本地。下面这段 prompt 是和 V2 方案锁死的硬规则：

```text
你是一个给游戏玩家画作写一句点评的助手。

硬规则（违反即 reject 并用本地池替换）：
  1. 只写一句中文，不超过 40 字。
  2. 语气荒诞但温柔。
  3. 只描绘图像意象（颜色、形状、质感、物件比喻）。
  4. 严禁出现或暗示以下主题：遗弃/抛弃/死亡/母亲/父亲/孤儿/没人要/失败/丑/难看/悲惨/可怜。
  5. 不得点评玩家人品、智力、价值。
  6. 不得使用网络梗、emoji、"尊嘟""家人们"等烂俗词。

输入（这一局该玩家的特征）：
  - 原创部位数：{originalPartsLeft}（0–10）
  - 被他人涂笔次数：{paintedOnMe}
  - 主动在他人身上涂笔次数：{strokesOnOthers}
  - 主色：{dominantColor}

参考风格（这些是本地池里过稿的，模仿这个调性）：
  - "像一盏从里面亮起来的灯笼，走哪儿都带着自己的夜晚。"
  - "身上带着一点点灼热，像刚刚拆开的辣椒酱包。"
  - "表面上写满了别人的名字，像一本借来借去的笔记本。"

请输出一句。不要加引号。不要解释。
```

### 服务端校验（必做）

LLM 返回后在服务端过一遍：

```js
function acceptLLM(text) {
  if (!text || text.length > 80 || text.length < 6) return false;
  for (const bad of pool.meta.forbiddenWords) {
    if (text.includes(bad)) return false;
  }
  return true;
}
```

拒绝就回落本地条目。不要重试 LLM（30 秒 demo 没时间耗）。

---

## 四、策划审稿守则（写 c31–c50 这 20 条时照着来）

1. **每条都问自己三遍**：
   - 这句话里有没有暗示"被别人抛下 / 没人要 / 很可怜"？
   - 把这句话投屏到大屏给陌生评委看，自己会不会脸红？
   - 如果点评的玩家是你自己，你想不想删朋友圈？
   有一个"不完全 OK"就重写。

2. **只写图像意象**。名词比形容词重要，具体比抽象重要。
   - ✅ "像一颗被阳光晒熟的小西红柿"
   - ❌ "像一个很温暖的人"（太抽象）
   - ❌ "你今天表现得很不错"（评价人）

3. **不要煽情**。demo 的节奏是 3 秒扫过去，评委没时间感动。
   惊喜 > 感动。

4. **每条字数 18–36 之间**。太短轻飘飘，太长屏幕装不下。

5. **占位里的 `_todo` 字段** 删掉或改成空字符串即可，程序员不会 load 它。
   填完记得：`text` 非空、`category` 从 `poetic/absurd/dangerous_warm/cool_blue/
   gentle_green/warm_yellow/warm_pink/surreal/triumph/minimalist` 中选一个。

6. **完成后跑一次本地 lint**（5 行脚本，下面给）：

```bash
python3 - <<'PY'
import json
pool = json.load(open("demo/critiques/pool.json", encoding="utf-8"))
bad = pool["meta"]["forbiddenWords"]
missing = [e["id"] for e in pool["entries"] if not e["text"].strip()]
violations = [(e["id"], w) for e in pool["entries"] for w in bad if w in e["text"]]
too_long = [e["id"] for e in pool["entries"] if len(e["text"]) > 40]
print("missing:", missing)
print("violations:", violations)
print("too_long:", too_long)
PY
```

三个 list 都空 = 审稿过关。

---

## 五、验收（V2 Day 4 晚上对这份做）

- [ ] c01–c30 每条我起的都读过，没有一条让你皱眉
- [ ] c31–c50 由你 / 策划 2 小时内写完（见守则 1-5）
- [ ] 上面那段 lint 脚本跑完，三个 list 都空
- [ ] 每个主色桶（red/orange/yellow/green/blue/purple/pink + mixed）都至少有 3 条命中
- [ ] 兜底 c49/c50 写了，prerequisites 空，text 和其它条目明显不同语气

做完这 5 条，Day 4 的 ✅"断网也能跑"就稳了。
