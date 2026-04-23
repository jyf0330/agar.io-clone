# NPC Personality Cards

`demo/npcs/personality-cards/*.yaml` 是每只 NPC 的长期人设卡。当前默认 3 只：

- `mochi`: 安静诗意
- `doudou`: 调皮捣蛋
- `wugui`: 老成稳重

## YAML 主要字段

- `version`: 人设卡版本号。结构有兼容性变化时再升。
- `id`: 程序内唯一 ID，文件名通常与它一致。
- `name`: 展示名，可读性优先。
- `skeleton`: 对应骨架资源 ID，要和美术骨架命名一致。
- `color`: NPC 主色，建议固定，用于涂色和识别。
- `archetype`: 一句话概括该 NPC 的核心性格。

- `anchors.facts`: 10 条稳定事实，是人设钉子。
- `anchors.catchphrases`: 5 条高频口头表达，帮助模型维持说话味道。
- `anchors.taboos`: 3 条明确禁区，防止输出跑偏。

- `behavior.speech_style`: 说话节奏、长短、语气规则。
- `behavior.painting_preference`: 涂色偏好，决定它爱涂谁、爱什么颜色、何时出手。
- `behavior.movement`: 移动速度和路径倾向。

- `relationship_schema.init_value`: 初始关系值。
- `relationship_schema.max_value`: 关系值上限。
- `relationship_schema.scoring`: 事件到关系分数的映射，尽量写成可落地的游戏事件键。

## 改动规则

- 优先保持字段结构稳定，不要随手改 key 名。
- 新 NPC 请直接复制现有 YAML 风格，字段顺序尽量保持一致。
- `anchors` 是 system prompt 里原样注入的核心段落，措辞要短、稳、可长期复用。
- `anchors` 不能改太频繁否则人设会漂。
- 如果一定要改 `anchors.facts`，每次只改 1 到 2 条，并记录原因。
- `catchphrases` 可以小修，但不要一次全换，否则说话味道会断层。
- `taboos` 只增不乱删，避免安全边界回退。
- `behavior` 可以按玩法需要微调，但要服务于 archetype，而不是追求一时有趣。
- `relationship_schema` 要体现差异化，不同 NPC 不要只改数字。

## 维护建议

- 新增或修改人格卡时，先对照 `mochi.yaml` 看风格，再补其它卡。
- 写事实时尽量使用长期成立的句子，不要写会随剧情频繁失效的信息。
- 如果 batch prompt 里同时塞 3 只 NPC，差异要主要靠 `anchors` 和 `behavior` 拉开，不要依赖临时上下文硬演。
