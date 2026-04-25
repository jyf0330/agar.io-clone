# Graph Report - agar.io-clone-master  (2026-04-25)

## Corpus Check
- 168 files · ~284,993 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 933 nodes · 1575 edges · 34 communities detected
- Extraction: 85% EXTRACTED · 15% INFERRED · 0% AMBIGUOUS · INFERRED: 241 edges (avg confidence: 0.8)
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
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 35|Community 35]]

## God Nodes (most connected - your core abstractions)
1. `Orchestrator` - 37 edges
2. `executeSql()` - 28 edges
3. `GhostManager` - 25 edges
4. `ask()` - 19 edges
5. `GhostRecorder` - 17 edges
6. `ChatClient` - 16 edges
7. `createDebugPanel()` - 16 edges
8. `runScenario()` - 15 edges
9. `addPlayer()` - 15 edges
10. `applyBodyState()` - 13 edges

## Surprising Connections (you probably didn't know these)
- `normalize()` --calls--> `constructor()`  [INFERRED]
  demo/consistency/score_drift.py → apps/server/src/map/massFood.js
- `mocha()` --calls--> `run()`  [INFERRED]
  gulpfile.js → apps/server/src/sql.js
- `normalize()` --calls--> `pushAwayCollidingCells()`  [INFERRED]
  demo/consistency/score_drift.py → apps/server/src/map/player.js
- `main()` --calls--> `get()`  [INFERRED]
  demo/consistency/run_consistency.py → apps/server/src/llm/cache.js
- `generate_frames()` --calls--> `append()`  [INFERRED]
  demo/scripts/generate_bots.py → apps/server/src/llm/audit.js

## Hyperedges (group relationships)
- **Gameplay Scene** — agar_io_clone_game_ui, grid_arena, food_pellets, virus_cells, leaderboard_panel [EXTRACTED 0.95]
- **Multiplayer Match** — player_huy, player_dragon, multiplayer_viewports, leaderboard_panel [INFERRED 0.84]
- **Mobile Input Layer** — mobile_controls, player_huy, player_dragon [INFERRED 0.76]

## Communities

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (21): createDraftPreviewDataUrl(), drawCircle(), drawLine(), drawRect(), drawShape(), createBodyInventoryPanel(), createElement(), createFallbackElement() (+13 more)

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (55): appendPartHistory(), applyBodyState(), applyOwnedPartDefaults(), applySignatureToParts(), cloneBodyPart(), cloneHistoryChain(), cloneShallowObject(), countBodyParts() (+47 more)

### Community 2 - "Community 2"
Cohesion: 0.07
Nodes (44): exportSession(), loadSeed(), main(), printUsage(), writeJson(), seedSummaries(), buildFallbackImpression(), clampRelationshipValue() (+36 more)

### Community 3 - "Community 3"
Cohesion: 0.08
Nodes (20): clamp(), randomWalkIntent(), buildContextualFallbackUtterance(), pickGreetingFallback(), stableIndex(), buildPetContext(), buildPetQuestionFallbackReply(), estimatePromptTokens() (+12 more)

### Community 4 - "Community 4"
Cohesion: 0.08
Nodes (46): append(), getAuditFilePath(), resolveAuditDir(), toDateStamp(), createCacheKey(), ensureDatabase(), get(), loadDatabaseLibrary() (+38 more)

### Community 5 - "Community 5"
Cohesion: 0.06
Nodes (7): GhostManager, PartLootManager, createNpcTaskRewardPart(), getNpcPosition(), grantNpcTaskReward(), isPlayerNearNpc(), recordReward()

### Community 6 - "Community 6"
Cohesion: 0.06
Nodes (25): getActiveNpc(), getActivePetId(), getPosition(), addNew(), Food, removeExcess(), createId(), balanceMass() (+17 more)

### Community 7 - "Community 7"
Cohesion: 0.08
Nodes (26): adjustForBoundaries(), constructor(), move(), Cell, changeCellMass(), checkForCollisions(), clientProvidedData(), constructor() (+18 more)

### Community 8 - "Community 8"
Cohesion: 0.07
Nodes (27): applyTranslations(), enterGame(), renderPlayerCardPreviews(), renderStatusPanel(), resize(), startGame(), validNick(), createBodySignatureController() (+19 more)

### Community 9 - "Community 9"
Cohesion: 0.1
Nodes (28): buildChatMessages(), executeChatScenario(), main(), executeOfflineScenario(), main(), buildScenarioOptions(), createDriver(), ensureDir() (+20 more)

### Community 10 - "Community 10"
Cohesion: 0.09
Nodes (23): reset(), build_bot_json(), clamp(), generate_frames(), main(), parse_args(), pick_random_target(), 在地图内随机挑一个目标点，留一点边距避免贴墙。 (+15 more)

### Community 11 - "Community 11"
Cohesion: 0.15
Nodes (32): createDebugPanel(), createDebugState(), escapeHtml(), formatAge(), formatDebugPanel(), formatDebugPanelCopyText(), formatLatestGap(), formatLatestLongTask() (+24 more)

### Community 12 - "Community 12"
Cohesion: 0.14
Nodes (23): createDraftId(), getStorage(), loadDrafts(), normalizeDraftPayload(), saveDraft(), createPlayerCardEditor(), createHistoryState(), redo() (+15 more)

### Community 13 - "Community 13"
Cohesion: 0.13
Nodes (21): buildNpcIntentPrompt(), buildNpcReplyPrompt(), buildNpcUtterPrompt(), buildPetQuestionPrompt(), buildSummarizeSessionPrompt(), buildUpdatePersonaImpressionPrompt(), formatMemoryBlock(), formatPetContextBlock() (+13 more)

### Community 14 - "Community 14"
Cohesion: 0.14
Nodes (19): animloop(), gameLoop(), getAvatarInnerRadius(), shouldUseAvatarRuntimeRender(), cellTouchingBorders(), circlePoint(), drawAvatarCell(), drawBorder() (+11 more)

### Community 15 - "Community 15"
Cohesion: 0.15
Nodes (14): clamp(), createBehaviorProfile(), hexToHue(), normalizeIntent(), normalizeNpcKey(), NpcState, assertCardShape(), extractAnchorsText() (+6 more)

### Community 16 - "Community 16"
Cohesion: 0.24
Nodes (2): GhostRecorder, sanitizeReplayChat()

### Community 17 - "Community 17"
Cohesion: 0.19
Nodes (12): projectActivePetForSync(), projectActivePetMovementForSync(), projectBodyPartForSync(), projectEquipmentSlotsForSync(), projectPartLootForSync(), projectPlayerForSync(), projectPlayerMetaForSync(), projectPlayerMovementForSync() (+4 more)

### Community 18 - "Community 18"
Cohesion: 0.27
Nodes (7): buildCandidateFromTemplate(), buildDraftCandidates(), clone(), randomPick(), removeMissingPart(), getDefaultTemplateById(), getDefaultTemplates()

### Community 19 - "Community 19"
Cohesion: 0.33
Nodes (7): buildPetClosingLine(), buildSettlementSummary(), findHistoryEvent(), formatStats(), getAcquiredLabel(), summarizeKeyEvents(), summarizePart()

### Community 20 - "Community 20"
Cohesion: 0.38
Nodes (9): applyConnectionState(), clearConnectionState(), createConnectionState(), createStatePatch(), distance(), isEligibleConnectionTarget(), planAttempt(), resolveOutcome() (+1 more)

### Community 21 - "Community 21"
Cohesion: 0.44
Nodes (9): analyzeCanvas(), canvasToGrid(), clamp(), compareGrids(), createEmptyGrid(), createReferenceGrid(), getTier(), gridCoverage() (+1 more)

### Community 22 - "Community 22"
Cohesion: 0.39
Nodes (9): Agar.IO Clone game UI, Colored food pellets, Grid-based arena, Leaderboard panel, Mobile joystick and targeting controls, Two simultaneous game viewports, Player cell dragon, Player cell huy (+1 more)

### Community 23 - "Community 23"
Cohesion: 0.32
Nodes (5): createController(), createFakeSocket(), createController(), createFakeSocket(), createSocketController()

### Community 24 - "Community 24"
Cohesion: 0.38
Nodes (4): getRandomSkeleton(), getSkeletonByKey(), preloadSkeletons(), waitForImage()

### Community 25 - "Community 25"
Cohesion: 0.6
Nodes (4): addHistoryEntry(), getStorage(), loadHistory(), saveHistory()

### Community 26 - "Community 26"
Cohesion: 0.6
Nodes (3): createPaintedAvatarDataUrl(), createPaintedAvatarSvg(), escapeAttribute()

### Community 27 - "Community 27"
Cohesion: 0.5
Nodes (2): clampScale(), getNextScale()

### Community 28 - "Community 28"
Cohesion: 0.67
Nodes (2): clearModule(), loadWrapperFixture()

### Community 30 - "Community 30"
Cohesion: 0.83
Nodes (4): split icon, horizontal separation, left-right arrows, split

### Community 31 - "Community 31"
Cohesion: 0.5
Nodes (4): feed mass, feed icon, crosshair/target reticle, feed control

### Community 32 - "Community 32"
Cohesion: 0.67
Nodes (4): horizontal separation, player input control, split, split control icon

### Community 33 - "Community 33"
Cohesion: 0.67
Nodes (4): Targeting Reticle, Feed Action, Feed Control Icon, Player Control Input

### Community 35 - "Community 35"
Cohesion: 1.0
Nodes (2): loadConfigWithDemoFlag(), loadConfigWithEnv()

## Knowledge Gaps
- **6 isolated node(s):** `在地图内随机挑一个目标点，留一点边距避免贴墙。`, `朝目标移动最多 max_step，达到/超过则贴上。`, `Grid-based arena`, `crosshair/target reticle`, `feed control` (+1 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 16`** (20 nodes): `recorder.js`, `escapeRegExp()`, `GhostRecorder`, `.canRecordPlayer()`, `.constructor()`, `.getElapsed()`, `.recordChat()`, `.recordChatRecord()`, `.recordCombatEvent()`, `.recordEvent()`, `.recordGhostAnchor()`, `.recordItem()`, `.recordItemEvent()`, `.recordPartEvent()`, `.recordPartLifecycleEvent()`, `.recordPlayers()`, `.recordPlayerTrace()`, `.recordTypedCombatEvent()`, `loadForbiddenWords()`, `sanitizeReplayChat()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 27`** (5 nodes): `player-card-scale.js`, `canScaleIn()`, `canScaleOut()`, `clampScale()`, `getNextScale()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 28`** (4 nodes): `clearModule()`, `createOpenAiMockServer()`, `loadWrapperFixture()`, `llm-wrapper.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 35`** (3 nodes): `loadConfigWithDemoFlag()`, `loadConfigWithEnv()`, `demo-config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `emit()` connect `Community 6` to `Community 0`, `Community 8`?**
  _High betweenness centrality (0.149) - this node is a cross-community bridge._
- **Why does `speakPreviousExpectations()` connect `Community 6` to `Community 16`, `Community 2`?**
  _High betweenness centrality (0.145) - this node is a cross-community bridge._
- **Why does `addPlayer()` connect `Community 6` to `Community 8`, `Community 1`, `Community 15`, `Community 7`?**
  _High betweenness centrality (0.131) - this node is a cross-community bridge._
- **Are the 10 inferred relationships involving `ask()` (e.g. with `createCacheKey()` and `get()`) actually correct?**
  _`ask()` has 10 INFERRED edges - model-reasoned connections that need verification._
- **What connects `在地图内随机挑一个目标点，留一点边距避免贴墙。`, `朝目标移动最多 max_step，达到/超过则贴上。`, `Grid-based arena` to the rest of the system?**
  _6 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.07 - nodes in this community are weakly interconnected._