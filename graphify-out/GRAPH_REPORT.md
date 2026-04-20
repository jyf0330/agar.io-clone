# Graph Report - \\wsl.localhost\Ubuntu-Full\home\jyf\projects\agar.io-clone  (2026-04-20)

## Corpus Check
- 70 files · ~34,553 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 340 nodes · 536 edges · 57 communities detected
- Extraction: 78% EXTRACTED · 22% INFERRED · 0% AMBIGUOUS · INFERRED: 117 edges (avg confidence: 0.8)
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
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]

## God Nodes (most connected - your core abstractions)
1. `t()` - 18 edges
2. `ChatClient` - 15 edges
3. `Canvas` - 13 edges
4. `beginAvatarDraftFlow()` - 13 edges
5. `setupSocket()` - 11 edges
6. `addPlayer()` - 9 edges
7. `tickGame()` - 9 edges
8. `createBodyBonuses()` - 8 edges
9. `Cell` - 8 edges
10. `enterGame()` - 8 edges

## Surprising Connections (you probably didn't know these)
- `tickPlayer()` --calls--> `delete()`  [INFERRED]
  \\wsl.localhost\Ubuntu-Full\home\jyf\projects\agar.io-clone\apps\server\src\server.js → \\wsl.localhost\Ubuntu-Full\home\jyf\projects\agar.io-clone\apps\server\src\map\virus.js
- `completeAvatarDraft()` --calls--> `createHistoryEntry()`  [INFERRED]
  \\wsl.localhost\Ubuntu-Full\home\jyf\projects\agar.io-clone\apps\client\src\app.js → \\wsl.localhost\Ubuntu-Full\home\jyf\projects\agar.io-clone\apps\client\src\avatar-history-store.js
- `setConnectionPairState()` --calls--> `applyConnectionState()`  [INFERRED]
  \\wsl.localhost\Ubuntu-Full\home\jyf\projects\agar.io-clone\apps\server\src\server.js → \\wsl.localhost\Ubuntu-Full\home\jyf\projects\agar.io-clone\apps\server\src\connection.js
- `attemptConnection()` --calls--> `getConnectionRange()`  [INFERRED]
  \\wsl.localhost\Ubuntu-Full\home\jyf\projects\agar.io-clone\apps\server\src\server.js → \\wsl.localhost\Ubuntu-Full\home\jyf\projects\agar.io-clone\apps\server\src\body.js
- `attemptConnection()` --calls--> `findConnectionTarget()`  [INFERRED]
  \\wsl.localhost\Ubuntu-Full\home\jyf\projects\agar.io-clone\apps\server\src\server.js → \\wsl.localhost\Ubuntu-Full\home\jyf\projects\agar.io-clone\apps\server\src\connection.js

## Hyperedges (group relationships)
- **Gameplay Scene** — agar_io_clone_game_ui, grid_arena, food_pellets, virus_cells, leaderboard_panel [EXTRACTED 0.95]
- **Multiplayer Match** — player_huy, player_dragon, multiplayer_viewports, leaderboard_panel [INFERRED 0.84]
- **Mobile Input Layer** — mobile_controls, player_huy, player_dragon [INFERRED 0.76]

## Communities

### Community 0 - "Community 0"
Cohesion: 0.11
Nodes (34): animloop(), applyTranslations(), beginAvatarDraftFlow(), clearDraftTimer(), completeAvatarDraft(), deactivateDraftMode(), enterGame(), findConnectedTargetCardPreview() (+26 more)

### Community 1 - "Community 1"
Cohesion: 0.09
Nodes (27): adjustForBoundaries(), move(), remove(), Cell, changeCellMass(), checkForCollisions(), enumerateCollidingCells(), findIndexByID() (+19 more)

### Community 2 - "Community 2"
Cohesion: 0.08
Nodes (22): getPosition(), validNick(), isVisibleEntity(), addNew(), Food, removeExcess(), balanceMass(), enumerateWhatPlayersSee() (+14 more)

### Community 3 - "Community 3"
Cohesion: 0.15
Nodes (18): applyConnectionState(), clearConnectionState(), createConnectionState(), distance(), findConnectionTarget(), isEligibleConnectionTarget(), resolveConnectionOutcome(), applyMaterializationState() (+10 more)

### Community 4 - "Community 4"
Cohesion: 0.22
Nodes (19): applyBodyState(), countBodyParts(), createBodyBonuses(), createBodyPart(), createBodyState(), createDefaultBodyParts(), getBreakSpikeBonus(), getConnectionRange() (+11 more)

### Community 5 - "Community 5"
Cohesion: 0.17
Nodes (13): buildDraftSession(), buildCandidateFromTemplate(), buildDraftCandidates(), clone(), randomPick(), removeMissingPart(), getDefaultTemplateById(), getDefaultTemplates() (+5 more)

### Community 6 - "Community 6"
Cohesion: 0.19
Nodes (17): gameLoop(), getAvatarInnerRadius(), shouldUseAvatarRuntimeRender(), cellTouchingBorders(), circlePoint(), drawAvatarCell(), drawBorder(), drawCells() (+9 more)

### Community 7 - "Community 7"
Cohesion: 0.28
Nodes (1): ChatClient

### Community 8 - "Community 8"
Cohesion: 0.24
Nodes (1): Canvas

### Community 9 - "Community 9"
Cohesion: 0.2
Nodes (4): buildClientJS(), getWebpackConfig(), mocha(), run()

### Community 10 - "Community 10"
Cohesion: 0.39
Nodes (9): Agar.IO Clone game UI, Colored food pellets, Grid-based arena, Leaderboard panel, Mobile joystick and targeting controls, Two simultaneous game viewports, Player cell dragon, Player cell huy (+1 more)

### Community 11 - "Community 11"
Cohesion: 0.32
Nodes (4): createPlayerCardEditor(), createHistoryState(), redo(), undo()

### Community 12 - "Community 12"
Cohesion: 0.47
Nodes (4): getStorage(), interpolate(), loadLocale(), setLocale()

### Community 13 - "Community 13"
Cohesion: 0.6
Nodes (5): createDraftPreviewDataUrl(), drawCircle(), drawLine(), drawRect(), drawShape()

### Community 14 - "Community 14"
Cohesion: 0.5
Nodes (2): clampScale(), getNextScale()

### Community 15 - "Community 15"
Cohesion: 0.5
Nodes (0): 

### Community 16 - "Community 16"
Cohesion: 0.83
Nodes (4): split icon, horizontal separation, left-right arrows, split

### Community 17 - "Community 17"
Cohesion: 0.5
Nodes (4): feed mass, feed icon, crosshair/target reticle, feed control

### Community 18 - "Community 18"
Cohesion: 0.67
Nodes (4): horizontal separation, player input control, split, split control icon

### Community 19 - "Community 19"
Cohesion: 0.67
Nodes (4): Targeting Reticle, Feed Action, Feed Control Icon, Player Control Input

### Community 20 - "Community 20"
Cohesion: 0.67
Nodes (0): 

### Community 21 - "Community 21"
Cohesion: 1.0
Nodes (0): 

### Community 22 - "Community 22"
Cohesion: 1.0
Nodes (0): 

### Community 23 - "Community 23"
Cohesion: 1.0
Nodes (0): 

### Community 24 - "Community 24"
Cohesion: 1.0
Nodes (0): 

### Community 25 - "Community 25"
Cohesion: 1.0
Nodes (0): 

### Community 26 - "Community 26"
Cohesion: 1.0
Nodes (0): 

### Community 27 - "Community 27"
Cohesion: 1.0
Nodes (0): 

### Community 28 - "Community 28"
Cohesion: 1.0
Nodes (0): 

### Community 29 - "Community 29"
Cohesion: 1.0
Nodes (0): 

### Community 30 - "Community 30"
Cohesion: 1.0
Nodes (0): 

### Community 31 - "Community 31"
Cohesion: 1.0
Nodes (0): 

### Community 32 - "Community 32"
Cohesion: 1.0
Nodes (0): 

### Community 33 - "Community 33"
Cohesion: 1.0
Nodes (0): 

### Community 34 - "Community 34"
Cohesion: 1.0
Nodes (0): 

### Community 35 - "Community 35"
Cohesion: 1.0
Nodes (0): 

### Community 36 - "Community 36"
Cohesion: 1.0
Nodes (0): 

### Community 37 - "Community 37"
Cohesion: 1.0
Nodes (0): 

### Community 38 - "Community 38"
Cohesion: 1.0
Nodes (0): 

### Community 39 - "Community 39"
Cohesion: 1.0
Nodes (0): 

### Community 40 - "Community 40"
Cohesion: 1.0
Nodes (0): 

### Community 41 - "Community 41"
Cohesion: 1.0
Nodes (0): 

### Community 42 - "Community 42"
Cohesion: 1.0
Nodes (0): 

### Community 43 - "Community 43"
Cohesion: 1.0
Nodes (0): 

### Community 44 - "Community 44"
Cohesion: 1.0
Nodes (0): 

### Community 45 - "Community 45"
Cohesion: 1.0
Nodes (0): 

### Community 46 - "Community 46"
Cohesion: 1.0
Nodes (0): 

### Community 47 - "Community 47"
Cohesion: 1.0
Nodes (0): 

### Community 48 - "Community 48"
Cohesion: 1.0
Nodes (0): 

### Community 49 - "Community 49"
Cohesion: 1.0
Nodes (0): 

### Community 50 - "Community 50"
Cohesion: 1.0
Nodes (0): 

### Community 51 - "Community 51"
Cohesion: 1.0
Nodes (0): 

### Community 52 - "Community 52"
Cohesion: 1.0
Nodes (0): 

### Community 53 - "Community 53"
Cohesion: 1.0
Nodes (0): 

### Community 54 - "Community 54"
Cohesion: 1.0
Nodes (0): 

### Community 55 - "Community 55"
Cohesion: 1.0
Nodes (0): 

### Community 56 - "Community 56"
Cohesion: 1.0
Nodes (0): 

## Knowledge Gaps
- **4 isolated node(s):** `Grid-based arena`, `crosshair/target reticle`, `feed control`, `horizontal separation`
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 22`** (2 nodes): `getRules()`, `webpack.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 23`** (2 nodes): `Point()`, `util.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 24`** (2 nodes): `createMemoryStorage()`, `avatar-history-store.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 25`** (2 nodes): `createMemoryStorage()`, `i18n.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 26`** (2 nodes): `createMemoryStorage()`, `player-card-storage.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 27`** (2 nodes): `Convert-ToWslLocation()`, `run-server.ps1`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 28`** (2 nodes): `logChatMessage()`, `chat-repository.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 29`** (2 nodes): `logFailedLoginAttempt()`, `logging-repository.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 30`** (1 nodes): `config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 31`** (1 nodes): `server.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 32`** (1 nodes): `materialization-status.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 33`** (1 nodes): `connection.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 34`** (1 nodes): `avatar-runtime-render.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 35`** (1 nodes): `player-card-sync.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 36`** (1 nodes): `player-card-scale.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 37`** (1 nodes): `avatar-draft-candidates.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 38`** (1 nodes): `materialization.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 39`** (1 nodes): `relationship.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 40`** (1 nodes): `connection-status.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 41`** (1 nodes): `player-card-preview.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 42`** (1 nodes): `body.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 43`** (1 nodes): `avatar-draft-preview.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 44`** (1 nodes): `player-card-canvas-transform.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 45`** (1 nodes): `relationship-status.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 46`** (1 nodes): `body-status.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 47`** (1 nodes): `player-card-history.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 48`** (1 nodes): `install-desktop-shortcut.ps1`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 49`** (1 nodes): `config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 50`** (1 nodes): `connection.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 51`** (1 nodes): `materialization.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 52`** (1 nodes): `relationship.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 53`** (1 nodes): `body.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 54`** (1 nodes): `util.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 55`** (1 nodes): `global.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 56`** (1 nodes): `avatar-draft-config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `addPlayer()` connect `Community 2` to `Community 1`, `Community 3`?**
  _High betweenness centrality (0.169) - this node is a cross-community bridge._
- **Why does `validNick()` connect `Community 2` to `Community 0`?**
  _High betweenness centrality (0.154) - this node is a cross-community bridge._
- **Why does `init()` connect `Community 3` to `Community 1`, `Community 2`, `Community 4`?**
  _High betweenness centrality (0.097) - this node is a cross-community bridge._
- **Are the 16 inferred relationships involving `t()` (e.g. with `formatMaterializationStatus()` and `formatConnectionStatus()`) actually correct?**
  _`t()` has 16 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `beginAvatarDraftFlow()` (e.g. with `t()` and `close()`) actually correct?**
  _`beginAvatarDraftFlow()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 5 inferred relationships involving `setupSocket()` (e.g. with `.addSystemLine()` and `t()`) actually correct?**
  _`setupSocket()` has 5 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Grid-based arena`, `crosshair/target reticle`, `feed control` to the rest of the system?**
  _4 weakly-connected nodes found - possible documentation gaps or missing edges._