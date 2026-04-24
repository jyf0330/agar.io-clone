# Graph Report - agar.io-clone-master  (2026-04-25)

## Corpus Check
- 152 files · ~261,079 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 828 nodes · 1368 edges · 32 communities detected
- Extraction: 84% EXTRACTED · 16% INFERRED · 0% AMBIGUOUS · INFERRED: 214 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]

## God Nodes (most connected - your core abstractions)
1. `Orchestrator` - 33 edges
2. `executeSql()` - 28 edges
3. `GhostManager` - 24 edges
4. `ask()` - 19 edges
5. `GhostRecorder` - 17 edges
6. `ChatClient` - 16 edges
7. `runScenario()` - 15 edges
8. `addPlayer()` - 15 edges
9. `get()` - 13 edges
10. `Canvas` - 13 edges

## Surprising Connections (you probably didn't know these)
- `normalize()` --calls--> `constructor()`  [INFERRED]
  demo/consistency/score_drift.py → apps/server/src/map/massFood.js
- `createElement()` --calls--> `loadFabric()`  [INFERRED]
  tests/unit/chat-input.js → apps/client/src/player-card-editor.js
- `mocha()` --calls--> `run()`  [INFERRED]
  gulpfile.js → apps/server/src/sql.js
- `normalize()` --calls--> `pushAwayCollidingCells()`  [INFERRED]
  demo/consistency/score_drift.py → apps/server/src/map/player.js
- `main()` --calls--> `get()`  [INFERRED]
  demo/consistency/run_consistency.py → apps/server/src/llm/cache.js

## Hyperedges (group relationships)
- **Gameplay Scene** — agar_io_clone_game_ui, grid_arena, food_pellets, virus_cells, leaderboard_panel [EXTRACTED 0.95]
- **Multiplayer Match** — player_huy, player_dragon, multiplayer_viewports, leaderboard_panel [INFERRED 0.84]
- **Mobile Input Layer** — mobile_controls, player_huy, player_dragon [INFERRED 0.76]

## Communities

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (43): getPosition(), addNew(), Food, removeExcess(), balanceMass(), enumerateVisibleWorld(), getVisibleWorldForPlayer(), Cell (+35 more)

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (44): exportSession(), loadSeed(), main(), printUsage(), writeJson(), seedSummaries(), buildFallbackImpression(), clampRelationshipValue() (+36 more)

### Community 2 - "Community 2"
Cohesion: 0.08
Nodes (50): appendPartHistory(), applyBodyState(), applySignatureToParts(), cloneBodyPart(), cloneHistoryChain(), cloneShallowObject(), countBodyParts(), createBodyBonuses() (+42 more)

### Community 3 - "Community 3"
Cohesion: 0.08
Nodes (46): append(), getAuditFilePath(), resolveAuditDir(), toDateStamp(), createCacheKey(), ensureDatabase(), get(), loadDatabaseLibrary() (+38 more)

### Community 4 - "Community 4"
Cohesion: 0.09
Nodes (17): clamp(), randomWalkIntent(), buildContextualFallbackUtterance(), pickGreetingFallback(), stableIndex(), buildPetContext(), buildPetQuestionFallbackReply(), estimatePromptTokens() (+9 more)

### Community 5 - "Community 5"
Cohesion: 0.08
Nodes (11): createDraftPreviewDataUrl(), drawCircle(), drawLine(), drawRect(), drawShape(), Canvas, ChatClient, createElement() (+3 more)

### Community 6 - "Community 6"
Cohesion: 0.07
Nodes (5): GhostManager, PartLootManager, createNpcTaskRewardPart(), grantNpcTaskReward(), recordReward()

### Community 7 - "Community 7"
Cohesion: 0.08
Nodes (25): animloop(), applyTranslations(), enterGame(), renderPlayerCardPreviews(), renderStatusPanel(), resize(), startGame(), validNick() (+17 more)

### Community 8 - "Community 8"
Cohesion: 0.1
Nodes (28): buildChatMessages(), executeChatScenario(), main(), executeOfflineScenario(), main(), buildScenarioOptions(), createDriver(), ensureDir() (+20 more)

### Community 9 - "Community 9"
Cohesion: 0.12
Nodes (26): reset(), createDraftId(), getStorage(), loadDrafts(), normalizeDraftPayload(), saveDraft(), createPlayerCardEditor(), loadFabric() (+18 more)

### Community 10 - "Community 10"
Cohesion: 0.09
Nodes (21): build_bot_json(), clamp(), generate_frames(), main(), parse_args(), pick_random_target(), 在地图内随机挑一个目标点，留一点边距避免贴墙。, 朝目标移动最多 max_step，达到/超过则贴上。 (+13 more)

### Community 11 - "Community 11"
Cohesion: 0.13
Nodes (21): buildNpcIntentPrompt(), buildNpcReplyPrompt(), buildNpcUtterPrompt(), buildPetQuestionPrompt(), buildSummarizeSessionPrompt(), buildUpdatePersonaImpressionPrompt(), formatMemoryBlock(), formatPetContextBlock() (+13 more)

### Community 12 - "Community 12"
Cohesion: 0.15
Nodes (18): gameLoop(), getAvatarInnerRadius(), shouldUseAvatarRuntimeRender(), cellTouchingBorders(), circlePoint(), drawAvatarCell(), drawBorder(), drawCells() (+10 more)

### Community 13 - "Community 13"
Cohesion: 0.15
Nodes (14): clamp(), createBehaviorProfile(), hexToHue(), normalizeIntent(), normalizeNpcKey(), NpcState, assertCardShape(), extractAnchorsText() (+6 more)

### Community 14 - "Community 14"
Cohesion: 0.24
Nodes (2): GhostRecorder, sanitizeReplayChat()

### Community 15 - "Community 15"
Cohesion: 0.27
Nodes (7): buildCandidateFromTemplate(), buildDraftCandidates(), clone(), randomPick(), removeMissingPart(), getDefaultTemplateById(), getDefaultTemplates()

### Community 16 - "Community 16"
Cohesion: 0.27
Nodes (7): projectActivePetForSync(), projectBodyPartForSync(), projectEquipmentSlotsForSync(), projectPartLootForSync(), projectPlayerForSync(), projectPlayersForSync(), projectVisibleWorldForSync()

### Community 17 - "Community 17"
Cohesion: 0.38
Nodes (9): applyConnectionState(), clearConnectionState(), createConnectionState(), createStatePatch(), distance(), isEligibleConnectionTarget(), planAttempt(), resolveOutcome() (+1 more)

### Community 18 - "Community 18"
Cohesion: 0.44
Nodes (9): analyzeCanvas(), canvasToGrid(), clamp(), compareGrids(), createEmptyGrid(), createReferenceGrid(), getTier(), gridCoverage() (+1 more)

### Community 19 - "Community 19"
Cohesion: 0.39
Nodes (9): Agar.IO Clone game UI, Colored food pellets, Grid-based arena, Leaderboard panel, Mobile joystick and targeting controls, Two simultaneous game viewports, Player cell dragon, Player cell huy (+1 more)

### Community 20 - "Community 20"
Cohesion: 0.29
Nodes (3): adjustForBoundaries(), constructor(), move()

### Community 21 - "Community 21"
Cohesion: 0.38
Nodes (4): getRandomSkeleton(), getSkeletonByKey(), preloadSkeletons(), waitForImage()

### Community 22 - "Community 22"
Cohesion: 0.6
Nodes (4): findHistoryEvent(), formatStats(), getAcquiredLabel(), summarizePart()

### Community 23 - "Community 23"
Cohesion: 0.6
Nodes (4): addHistoryEntry(), getStorage(), loadHistory(), saveHistory()

### Community 24 - "Community 24"
Cohesion: 0.5
Nodes (3): createController(), createFakeSocket(), createSocketController()

### Community 25 - "Community 25"
Cohesion: 0.6
Nodes (3): createPaintedAvatarDataUrl(), createPaintedAvatarSvg(), escapeAttribute()

### Community 26 - "Community 26"
Cohesion: 0.5
Nodes (2): clampScale(), getNextScale()

### Community 27 - "Community 27"
Cohesion: 0.67
Nodes (2): clearModule(), loadWrapperFixture()

### Community 29 - "Community 29"
Cohesion: 0.83
Nodes (4): split icon, horizontal separation, left-right arrows, split

### Community 30 - "Community 30"
Cohesion: 0.5
Nodes (4): feed mass, feed icon, crosshair/target reticle, feed control

### Community 31 - "Community 31"
Cohesion: 0.67
Nodes (4): horizontal separation, player input control, split, split control icon

### Community 32 - "Community 32"
Cohesion: 0.67
Nodes (4): Targeting Reticle, Feed Action, Feed Control Icon, Player Control Input

## Knowledge Gaps
- **6 isolated node(s):** `在地图内随机挑一个目标点，留一点边距避免贴墙。`, `朝目标移动最多 max_step，达到/超过则贴上。`, `Grid-based arena`, `crosshair/target reticle`, `feed control` (+1 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 14`** (20 nodes): `recorder.js`, `escapeRegExp()`, `GhostRecorder`, `.canRecordPlayer()`, `.constructor()`, `.getElapsed()`, `.recordChat()`, `.recordChatRecord()`, `.recordCombatEvent()`, `.recordEvent()`, `.recordGhostAnchor()`, `.recordItem()`, `.recordItemEvent()`, `.recordPartEvent()`, `.recordPartLifecycleEvent()`, `.recordPlayers()`, `.recordPlayerTrace()`, `.recordTypedCombatEvent()`, `loadForbiddenWords()`, `sanitizeReplayChat()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 26`** (5 nodes): `player-card-scale.js`, `canScaleIn()`, `canScaleOut()`, `clampScale()`, `getNextScale()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 27`** (4 nodes): `clearModule()`, `createOpenAiMockServer()`, `loadWrapperFixture()`, `llm-wrapper.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `addPlayer()` connect `Community 0` to `Community 2`, `Community 13`, `Community 7`?**
  _High betweenness centrality (0.165) - this node is a cross-community bridge._
- **Why does `ask()` connect `Community 3` to `Community 1`, `Community 11`, `Community 4`?**
  _High betweenness centrality (0.135) - this node is a cross-community bridge._
- **Why does `emit()` connect `Community 0` to `Community 5`, `Community 7`?**
  _High betweenness centrality (0.092) - this node is a cross-community bridge._
- **Are the 10 inferred relationships involving `ask()` (e.g. with `createCacheKey()` and `get()`) actually correct?**
  _`ask()` has 10 INFERRED edges - model-reasoned connections that need verification._
- **What connects `在地图内随机挑一个目标点，留一点边距避免贴墙。`, `朝目标移动最多 max_step，达到/超过则贴上。`, `Grid-based arena` to the rest of the system?**
  _6 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.07 - nodes in this community are weakly interconnected._