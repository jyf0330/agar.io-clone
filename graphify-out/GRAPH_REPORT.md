# Graph Report - agar.io-clone-master  (2026-04-30)

## Corpus Check
- 198 files · ~504,995 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1064 nodes · 1780 edges · 41 communities detected
- Extraction: 84% EXTRACTED · 16% INFERRED · 0% AMBIGUOUS · INFERRED: 276 edges (avg confidence: 0.8)
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
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 45|Community 45]]

## God Nodes (most connected - your core abstractions)
1. `Orchestrator` - 37 edges
2. `executeSql()` - 31 edges
3. `GhostManager` - 25 edges
4. `createDebugPanel()` - 21 edges
5. `ask()` - 19 edges
6. `GhostRecorder` - 18 edges
7. `createElement()` - 17 edges
8. `ChatClient` - 16 edges
9. `runScenario()` - 15 edges
10. `addPlayer()` - 15 edges

## Surprising Connections (you probably didn't know these)
- `mocha()` --calls--> `run()`  [INFERRED]
  gulpfile.js → apps/server/src/sql.js
- `normalize()` --calls--> `constructor()`  [INFERRED]
  demo/consistency/score_drift.py → apps/server/src/map/massFood.js
- `normalize()` --calls--> `pushAwayCollidingCells()`  [INFERRED]
  demo/consistency/score_drift.py → apps/server/src/map/player.js
- `runScenario()` --calls--> `close()`  [INFERRED]
  demo/scripts/week1-playthrough-online.js → apps/server/src/sql.js
- `createPlayer()` --calls--> `init()`  [INFERRED]
  tests/unit/connection-service.js → apps/server/src/map/player.js

## Hyperedges (group relationships)
- **Gameplay Scene** — agar_io_clone_game_ui, grid_arena, food_pellets, virus_cells, leaderboard_panel [EXTRACTED 0.95]
- **Multiplayer Match** — player_huy, player_dragon, multiplayer_viewports, leaderboard_panel [INFERRED 0.84]
- **Mobile Input Layer** — mobile_controls, player_huy, player_dragon [INFERRED 0.76]

## Communities

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (31): clamp(), randomWalkIntent(), buildContextualFallbackUtterance(), pickGreetingFallback(), stableIndex(), buildPetContext(), buildPetQuestionFallbackReply(), estimatePromptTokens() (+23 more)

### Community 1 - "Community 1"
Cohesion: 0.04
Nodes (45): getActiveNpc(), getActivePetId(), getPosition(), validNick(), addNew(), Food, removeExcess(), createId() (+37 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (56): append(), getAuditFilePath(), resolveAuditDir(), toDateStamp(), createCacheKey(), ensureDatabase(), get(), loadDatabaseLibrary() (+48 more)

### Community 3 - "Community 3"
Cohesion: 0.07
Nodes (55): appendPartHistory(), applyBodyState(), applyOwnedPartDefaults(), applySignatureToParts(), cloneBodyPart(), cloneHistoryChain(), cloneShallowObject(), countBodyParts() (+47 more)

### Community 4 - "Community 4"
Cohesion: 0.07
Nodes (45): exportSession(), loadSeed(), main(), printUsage(), writeJson(), seedSummaries(), addSessionSummary(), buildWhere() (+37 more)

### Community 5 - "Community 5"
Cohesion: 0.06
Nodes (34): createDraftPreviewDataUrl(), drawCircle(), drawLine(), drawRect(), drawShape(), createBodyInventoryPanel(), createElement(), createFallbackElement() (+26 more)

### Community 6 - "Community 6"
Cohesion: 0.07
Nodes (15): animloop(), enterGame(), resize(), startGame(), createBodySignatureController(), clearBodySignature(), getStorage(), loadBodySignature() (+7 more)

### Community 7 - "Community 7"
Cohesion: 0.12
Nodes (41): createDebugPanel(), createDebugState(), error(), escapeHtml(), formatAge(), formatDebugPanel(), formatDebugPanelCopyText(), formatLatestGap() (+33 more)

### Community 8 - "Community 8"
Cohesion: 0.07
Nodes (2): GhostManager, PartLootManager

### Community 9 - "Community 9"
Cohesion: 0.08
Nodes (25): createLoopHarness(), createPlayer(), createGameLoopService(), Cell, changeCellMass(), checkForCollisions(), clientProvidedData(), constructor() (+17 more)

### Community 10 - "Community 10"
Cohesion: 0.09
Nodes (26): askOpenAI(), normalizeContent(), buildFallbackSummary(), buildTomorrowExpectation(), collectReferencedL1EventIds(), estimateRelationshipDelta(), getEventText(), getNpcName() (+18 more)

### Community 11 - "Community 11"
Cohesion: 0.15
Nodes (8): GhostRecorder, sanitizeReplayChat(), rememberRecentChat(), createNpcTaskRewardPart(), getNpcPosition(), grantNpcTaskReward(), isPlayerNearNpc(), recordReward()

### Community 12 - "Community 12"
Cohesion: 0.14
Nodes (23): createDraftId(), getStorage(), loadDrafts(), normalizeDraftPayload(), saveDraft(), createPlayerCardEditor(), createHistoryState(), redo() (+15 more)

### Community 13 - "Community 13"
Cohesion: 0.1
Nodes (18): applyTranslations(), renderPlayerCardPreviews(), renderStatusPanel(), formatBodyStatus(), formatConnectionStatus(), formatGhostDebugStatus(), getStorage(), interpolate() (+10 more)

### Community 14 - "Community 14"
Cohesion: 0.14
Nodes (23): buildScenarioOptions(), createDriver(), ensureDir(), finalizeVideo(), httpGet(), main(), observeNpcActivity(), observeOnline() (+15 more)

### Community 15 - "Community 15"
Cohesion: 0.13
Nodes (20): gameLoop(), getAvatarInnerRadius(), shouldUseAvatarRuntimeRender(), cellTouchingBorders(), circlePoint(), drawAvatarCell(), drawBodyAssemblyCell(), drawBorder() (+12 more)

### Community 16 - "Community 16"
Cohesion: 0.19
Nodes (12): projectActivePetForSync(), projectActivePetMovementForSync(), projectBodyPartForSync(), projectEquipmentSlotsForSync(), projectPartLootForSync(), projectPlayerForSync(), projectPlayerMetaForSync(), projectPlayerMovementForSync() (+4 more)

### Community 17 - "Community 17"
Cohesion: 0.12
Nodes (6): createBodyAssemblyPage(), createCharacterPreview(), createConfirmBodyButton(), createMissingPartPanel(), createPartOptionList(), createStatsPanel()

### Community 18 - "Community 18"
Cohesion: 0.27
Nodes (11): addSortIndicators(), enableUI(), getNthColumn(), getTable(), getTableBody(), getTableHeader(), loadColumns(), loadData() (+3 more)

### Community 19 - "Community 19"
Cohesion: 0.21
Nodes (8): goToNext(), goToPrevious(), makeCurrent(), toggleClass(), adjustForBoundaries(), constructor(), move(), remove()

### Community 20 - "Community 20"
Cohesion: 0.27
Nodes (7): buildCandidateFromTemplate(), buildDraftCandidates(), clone(), randomPick(), removeMissingPart(), getDefaultTemplateById(), getDefaultTemplates()

### Community 21 - "Community 21"
Cohesion: 0.33
Nodes (7): buildPetClosingLine(), buildSettlementSummary(), findHistoryEvent(), formatStats(), getAcquiredLabel(), summarizeKeyEvents(), summarizePart()

### Community 22 - "Community 22"
Cohesion: 0.38
Nodes (9): applyConnectionState(), clearConnectionState(), createConnectionState(), createStatePatch(), distance(), isEligibleConnectionTarget(), planAttempt(), resolveOutcome() (+1 more)

### Community 23 - "Community 23"
Cohesion: 0.44
Nodes (9): analyzeCanvas(), canvasToGrid(), clamp(), compareGrids(), createEmptyGrid(), createReferenceGrid(), getTier(), gridCoverage() (+1 more)

### Community 24 - "Community 24"
Cohesion: 0.25
Nodes (3): buildClientJS(), getWebpackConfig(), mocha()

### Community 25 - "Community 25"
Cohesion: 0.39
Nodes (9): Agar.IO Clone game UI, Colored food pellets, Grid-based arena, Leaderboard panel, Mobile joystick and targeting controls, Two simultaneous game viewports, Player cell dragon, Player cell huy (+1 more)

### Community 26 - "Community 26"
Cohesion: 0.32
Nodes (5): createController(), createFakeSocket(), createController(), createFakeSocket(), createSocketController()

### Community 27 - "Community 27"
Cohesion: 0.38
Nodes (4): getRandomSkeleton(), getSkeletonByKey(), preloadSkeletons(), waitForImage()

### Community 28 - "Community 28"
Cohesion: 0.53
Nodes (5): clearModule(), executeSql(), loadRepository(), readRows(), runPythonSqlite()

### Community 30 - "Community 30"
Cohesion: 0.6
Nodes (4): addHistoryEntry(), getStorage(), loadHistory(), saveHistory()

### Community 31 - "Community 31"
Cohesion: 0.6
Nodes (3): createPaintedAvatarDataUrl(), createPaintedAvatarSvg(), escapeAttribute()

### Community 32 - "Community 32"
Cohesion: 0.5
Nodes (2): clampScale(), getNextScale()

### Community 33 - "Community 33"
Cohesion: 0.83
Nodes (3): buildRsyncCommand(), printPlan(), shellQuote()

### Community 34 - "Community 34"
Cohesion: 0.67
Nodes (2): clearModule(), loadWrapperFixture()

### Community 36 - "Community 36"
Cohesion: 0.67
Nodes (2): clonePart(), createBodyAssemblyConfig()

### Community 37 - "Community 37"
Cohesion: 0.83
Nodes (4): split icon, horizontal separation, left-right arrows, split

### Community 38 - "Community 38"
Cohesion: 0.5
Nodes (4): feed mass, feed icon, crosshair/target reticle, feed control

### Community 39 - "Community 39"
Cohesion: 0.67
Nodes (4): horizontal separation, player input control, split, split control icon

### Community 40 - "Community 40"
Cohesion: 0.67
Nodes (4): Targeting Reticle, Feed Action, Feed Control Icon, Player Control Input

### Community 43 - "Community 43"
Cohesion: 1.0
Nodes (2): createElement(), loadChatClientWithDom()

### Community 45 - "Community 45"
Cohesion: 1.0
Nodes (2): loadConfigWithDemoFlag(), loadConfigWithEnv()

## Knowledge Gaps
- **6 isolated node(s):** `在地图内随机挑一个目标点，留一点边距避免贴墙。`, `朝目标移动最多 max_step，达到/超过则贴上。`, `Grid-based arena`, `crosshair/target reticle`, `feed control` (+1 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 8`** (41 nodes): `manager.js`, `partLoot.js`, `distance()`, `eventMatchesMap()`, `GhostManager`, `.activateTrace()`, `.canActivateTrace()`, `.constructor()`, `.getActiveGhostCount()`, `.getDebugState()`, `.getEventKey()`, `.getEvents()`, `.getPartEventPosition()`, `.isAnchorCoolingDown()`, `.isInTimeWindow()`, `.isNearAnyPlayer()`, `.loadChatRecords()`, `.loadEvents()`, `.loadPartPickupEvents()`, `.loadTracePoints()`, `.markAnchorTriggered()`, `.pruneGhosts()`, `.spawnGhostPartPickup()`, `.spawnHistoricalItem()`, `.tick()`, `.touchGhostsWithNearbyPlayers()`, `.updateGhostChats()`, `.updateGhostPartPickups()`, `.updateGhostPositions()`, `interpolateTrace()`, `normalizeAnchor()`, `normalizeEvent()`, `canCollectLoot()`, `distance()`, `PartLootManager`, `.addPart()`, `.balanceWorldParts()`, `.collectForPlayer()`, `.constructor()`, `.getSourceType()`, `.normalizePart()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 32`** (5 nodes): `player-card-scale.js`, `canScaleIn()`, `canScaleOut()`, `clampScale()`, `getNextScale()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 34`** (4 nodes): `clearModule()`, `createOpenAiMockServer()`, `loadWrapperFixture()`, `llm-wrapper.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 36`** (4 nodes): `body-assembly-parts.js`, `clonePart()`, `createBodyAssemblyConfig()`, `describePart()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 43`** (3 nodes): `createElement()`, `loadChatClientWithDom()`, `chat-client-behavior.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 45`** (3 nodes): `loadConfigWithDemoFlag()`, `loadConfigWithEnv()`, `demo-config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `addPlayer()` connect `Community 1` to `Community 11`, `Community 9`, `Community 3`, `Community 6`?**
  _High betweenness centrality (0.154) - this node is a cross-community bridge._
- **Why does `speakPreviousExpectations()` connect `Community 1` to `Community 11`, `Community 4`, `Community 6`?**
  _High betweenness centrality (0.124) - this node is a cross-community bridge._
- **Why does `listSessionSummaries()` connect `Community 4` to `Community 0`, `Community 1`, `Community 10`?**
  _High betweenness centrality (0.108) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `createDebugPanel()` (e.g. with `createElement()` and `createElement()`) actually correct?**
  _`createDebugPanel()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Are the 10 inferred relationships involving `ask()` (e.g. with `createCacheKey()` and `get()`) actually correct?**
  _`ask()` has 10 INFERRED edges - model-reasoned connections that need verification._
- **What connects `在地图内随机挑一个目标点，留一点边距避免贴墙。`, `朝目标移动最多 max_step，达到/超过则贴上。`, `Grid-based arena` to the rest of the system?**
  _6 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._