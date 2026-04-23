# Graph Report - agar.io-clone-master  (2026-04-24)

## Corpus Check
- 97 files · ~87,447 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 422 nodes · 597 edges · 25 communities detected
- Extraction: 83% EXTRACTED · 17% INFERRED · 0% AMBIGUOUS · INFERRED: 101 edges (avg confidence: 0.8)
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
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]

## God Nodes (most connected - your core abstractions)
1. `ChatClient` - 15 edges
2. `ask()` - 13 edges
3. `Canvas` - 13 edges
4. `addPlayer()` - 12 edges
5. `emitIfReady()` - 11 edges
6. `createLayerPayload()` - 10 edges
7. `t()` - 10 edges
8. `createBodyBonuses()` - 8 edges
9. `Cell` - 8 edges
10. `getPartCount()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `createPlayer()` --calls--> `init()`  [INFERRED]
  tests/unit/connection-service.js → apps/server/src/map/player.js
- `emit()` --calls--> `addSpectator()`  [INFERRED]
  tests/unit/socket-emit.js → apps/server/src/server.js
- `emit()` --calls--> `emitIfReady()`  [INFERRED]
  tests/unit/socket-emit.js → apps/client/src/socket-emit.js
- `emit()` --calls--> `enterGame()`  [INFERRED]
  tests/unit/socket-emit.js → apps/client/src/app.js
- `mocha()` --calls--> `run()`  [INFERRED]
  gulpfile.js → apps/server/src/sql.js

## Hyperedges (group relationships)
- **Gameplay Scene** — agar_io_clone_game_ui, grid_arena, food_pellets, virus_cells, leaderboard_panel [EXTRACTED 0.95]
- **Multiplayer Match** — player_huy, player_dragon, multiplayer_viewports, leaderboard_panel [INFERRED 0.84]
- **Mobile Input Layer** — mobile_controls, player_huy, player_dragon [INFERRED 0.76]

## Communities

### Community 0 - "Community 0"
Cohesion: 0.08
Nodes (26): createPlayer(), applyMaterializationState(), createMaterializationState(), resolveMaterializationStage(), Cell, changeCellMass(), checkForCollisions(), clientProvidedData() (+18 more)

### Community 1 - "Community 1"
Cohesion: 0.13
Nodes (23): createDraftId(), getStorage(), loadDrafts(), normalizeDraftPayload(), saveDraft(), createPlayerCardEditor(), createHistoryState(), redo() (+15 more)

### Community 2 - "Community 2"
Cohesion: 0.12
Nodes (24): createCacheKey(), ensureDatabase(), get(), loadDatabaseLibrary(), loadFileCache(), persistFileCacheEntry(), reset(), resolveCachePath() (+16 more)

### Community 3 - "Community 3"
Cohesion: 0.09
Nodes (17): getPosition(), validNick(), addNew(), Food, removeExcess(), balanceMass(), enumerateVisibleWorld(), getVisibleWorldForPlayer() (+9 more)

### Community 4 - "Community 4"
Cohesion: 0.17
Nodes (23): applyBodyState(), countBodyParts(), createBodyBonuses(), createBodyPart(), createBodyState(), createDefaultBodyParts(), getBreakSpikeBonus(), getConnectionRange() (+15 more)

### Community 5 - "Community 5"
Cohesion: 0.13
Nodes (16): animloop(), applyTranslations(), enterGame(), renderPlayerCardPreviews(), renderStatusPanel(), startGame(), formatBodyStatus(), formatConnectionStatus() (+8 more)

### Community 6 - "Community 6"
Cohesion: 0.17
Nodes (17): gameLoop(), getAvatarInnerRadius(), shouldUseAvatarRuntimeRender(), cellTouchingBorders(), circlePoint(), drawAvatarCell(), drawBorder(), drawCells() (+9 more)

### Community 7 - "Community 7"
Cohesion: 0.19
Nodes (4): resize(), Canvas, canEmit(), emitIfReady()

### Community 8 - "Community 8"
Cohesion: 0.22
Nodes (14): append(), getAuditFilePath(), resolveAuditDir(), toDateStamp(), build_bot_json(), clamp(), generate_frames(), main() (+6 more)

### Community 9 - "Community 9"
Cohesion: 0.28
Nodes (1): ChatClient

### Community 10 - "Community 10"
Cohesion: 0.27
Nodes (7): buildCandidateFromTemplate(), buildDraftCandidates(), clone(), randomPick(), removeMissingPart(), getDefaultTemplateById(), getDefaultTemplates()

### Community 11 - "Community 11"
Cohesion: 0.38
Nodes (9): applyConnectionState(), clearConnectionState(), createConnectionState(), createStatePatch(), distance(), isEligibleConnectionTarget(), planAttempt(), resolveOutcome() (+1 more)

### Community 12 - "Community 12"
Cohesion: 0.39
Nodes (9): Agar.IO Clone game UI, Colored food pellets, Grid-based arena, Leaderboard panel, Mobile joystick and targeting controls, Two simultaneous game viewports, Player cell dragon, Player cell huy (+1 more)

### Community 13 - "Community 13"
Cohesion: 0.29
Nodes (2): buildClientJS(), getWebpackConfig()

### Community 14 - "Community 14"
Cohesion: 0.38
Nodes (3): projectPlayerForSync(), projectPlayersForSync(), projectVisibleWorldForSync()

### Community 15 - "Community 15"
Cohesion: 0.29
Nodes (2): adjustForBoundaries(), move()

### Community 16 - "Community 16"
Cohesion: 0.38
Nodes (4): getRandomSkeleton(), getSkeletonByKey(), preloadSkeletons(), waitForImage()

### Community 17 - "Community 17"
Cohesion: 0.6
Nodes (5): createDraftPreviewDataUrl(), drawCircle(), drawLine(), drawRect(), drawShape()

### Community 18 - "Community 18"
Cohesion: 0.6
Nodes (4): addHistoryEntry(), getStorage(), loadHistory(), saveHistory()

### Community 19 - "Community 19"
Cohesion: 0.5
Nodes (2): clampScale(), getNextScale()

### Community 20 - "Community 20"
Cohesion: 0.67
Nodes (2): clearModule(), loadWrapperFixture()

### Community 22 - "Community 22"
Cohesion: 0.83
Nodes (4): split icon, horizontal separation, left-right arrows, split

### Community 23 - "Community 23"
Cohesion: 0.5
Nodes (4): feed mass, feed icon, crosshair/target reticle, feed control

### Community 24 - "Community 24"
Cohesion: 0.67
Nodes (4): horizontal separation, player input control, split, split control icon

### Community 25 - "Community 25"
Cohesion: 0.67
Nodes (4): Targeting Reticle, Feed Action, Feed Control Icon, Player Control Input

## Knowledge Gaps
- **6 isolated node(s):** `在地图内随机挑一个目标点，留一点边距避免贴墙。`, `朝目标移动最多 max_step，达到/超过则贴上。`, `Grid-based arena`, `crosshair/target reticle`, `feed control` (+1 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 9`** (16 nodes): `chat-client.js`, `ChatClient`, `.addChatLine()`, `.addSystemLine()`, `.appendMessage()`, `.checkLatency()`, `.constructor()`, `.printHelp()`, `.registerCommand()`, `.registerFunctions()`, `.sendChat()`, `.toggleBorder()`, `.toggleContinuity()`, `.toggleDarkMode()`, `.toggleMass()`, `.toggleRoundFood()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 13`** (8 nodes): `buildClientJS()`, `buildServer()`, `copyClientAssets()`, `copyClientHtml()`, `getWebpackConfig()`, `gulpfile.js`, `runServer()`, `setDev()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 15`** (7 nodes): `game-logic.js`, `massFood.js`, `adjustForBoundaries()`, `addNew()`, `constructor()`, `move()`, `remove()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 19`** (5 nodes): `player-card-scale.js`, `canScaleIn()`, `canScaleOut()`, `clampScale()`, `getNextScale()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 20`** (4 nodes): `clearModule()`, `createOpenAiMockServer()`, `loadWrapperFixture()`, `llm-wrapper.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `addPlayer()` connect `Community 3` to `Community 0`?**
  _High betweenness centrality (0.192) - this node is a cross-community bridge._
- **Why does `loadPlayerCard()` connect `Community 1` to `Community 5`?**
  _High betweenness centrality (0.180) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `ask()` (e.g. with `createCacheKey()` and `get()`) actually correct?**
  _`ask()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Are the 10 inferred relationships involving `addPlayer()` (e.g. with `init()` and `findIndexByID()`) actually correct?**
  _`addPlayer()` has 10 INFERRED edges - model-reasoned connections that need verification._
- **Are the 9 inferred relationships involving `emitIfReady()` (e.g. with `.registerFunctions()` and `.sendChat()`) actually correct?**
  _`emitIfReady()` has 9 INFERRED edges - model-reasoned connections that need verification._
- **What connects `在地图内随机挑一个目标点，留一点边距避免贴墙。`, `朝目标移动最多 max_step，达到/超过则贴上。`, `Grid-based arena` to the rest of the system?**
  _6 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._