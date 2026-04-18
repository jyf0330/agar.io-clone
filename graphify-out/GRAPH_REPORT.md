# Graph Report - \\wsl.localhost\Ubuntu-Full\home\jyf\projects\agar.io-clone  (2026-04-18)

## Corpus Check
- Corpus is ~29,178 words - fits in a single context window. You may not need a graph.

## Summary
- 355 nodes · 711 edges · 30 communities detected
- Extraction: 88% EXTRACTED · 12% INFERRED · 0% AMBIGUOUS · INFERRED: 82 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_f()  p  .open()|f() / p / .open()]]
- [[_COMMUNITY_h  a()  c|h / a() / c]]
- [[_COMMUNITY_player.js  Cell  tickGame()|player.js / Cell / tickGame()]]
- [[_COMMUNITY_app.js  registerFunctions()  addSystemLine()|app.js / registerFunctions() / addSystemLine()]]
- [[_COMMUNITY_ChatClient  .registerFunctions()  .addSystemLine()|ChatClient / .registerFunctions() / .addSystemLine()]]
- [[_COMMUNITY_.emit()  addPlayer()  server.js|.emit() / addPlayer() / server.js]]
- [[_COMMUNITY_u  .flush()  .onHandshake()|u / .flush() / .onHandshake()]]
- [[_COMMUNITY_render.js  _()  gameLoop()|render.js / _() / gameLoop()]]
- [[_COMMUNITY_Canvas  .directionUp()  .directional()|Canvas / .directionUp() / .directional()]]
- [[_COMMUNITY_move()  massFood.js  adjustForBoundaries()|move() / massFood.js / adjustForBoundaries()]]
- [[_COMMUNITY_Player cell dragon  Player cell huy  Agar.IO Clone game UI|Player cell dragon / Player cell huy / Agar.IO Clone game UI]]
- [[_COMMUNITY_gulpfile.js  buildClientJS()  getWebpackConfig()|gulpfile.js / buildClientJS() / getWebpackConfig()]]
- [[_COMMUNITY_food.js  addNew()  Food|food.js / addNew() / Food]]
- [[_COMMUNITY_isVisibleEntity()  entityUtils.js  getPosition()|isVisibleEntity() / entityUtils.js / getPosition()]]
- [[_COMMUNITY_split icon  split  horizontal separation|split icon / split / horizontal separation]]
- [[_COMMUNITY_feed mass  feed icon  crosshairtarget reticle|feed mass / feed icon / crosshair/target reticle]]
- [[_COMMUNITY_split control icon  player input control  split|split control icon / player input control / split]]
- [[_COMMUNITY_Targeting Reticle  Feed Action  Feed Control Icon|Targeting Reticle / Feed Action / Feed Control Icon]]
- [[_COMMUNITY_logChatMessage()  chat-repository.js|logChatMessage() / chat-repository.js]]
- [[_COMMUNITY_logFailedLoginAttempt()  logging-repository.js|logFailedLoginAttempt() / logging-repository.js]]
- [[_COMMUNITY_AGENTS.md  README.md  TODO|AGENTS.md / README.md / TODO.md]]
- [[_COMMUNITY_getRules()  webpack.config.js|getRules() / webpack.config.js]]
- [[_COMMUNITY_util.js  Point()|util.js / Point()]]
- [[_COMMUNITY_config.js|config.js]]
- [[_COMMUNITY_sql.js|sql.js]]
- [[_COMMUNITY_util.js|util.js]]
- [[_COMMUNITY_sql.js|sql.js]]
- [[_COMMUNITY_util.js|util.js]]
- [[_COMMUNITY_global.js|global.js]]
- [[_COMMUNITY_server.js|server.js]]

## God Nodes (most connected - your core abstractions)
1. `h` - 55 edges
2. `f()` - 25 edges
3. `p` - 24 edges
4. `u` - 20 edges
5. `a()` - 15 edges
6. `ChatClient` - 15 edges
7. `m` - 13 edges
8. `Canvas` - 13 edges
9. `addPlayer()` - 12 edges
10. `registerFunctions()` - 11 edges

## Surprising Connections (you probably didn't know these)
- `addPlayer()` --calls--> `validNick()`  [INFERRED]
  src\server\server.js → src\client\js\app.js
- `generateSpawnpoint()` --calls--> `getPosition()`  [INFERRED]
  src\server\server.js → src\client\js\app.js
- `addPlayer()` --calls--> `init()`  [INFERRED]
  src\server\server.js → src\server\map\player.js
- `addPlayer()` --calls--> `findIndexByID()`  [INFERRED]
  src\server\server.js → src\server\map\player.js
- `addPlayer()` --calls--> `clientProvidedData()`  [INFERRED]
  src\server\server.js → src\server\map\player.js

## Hyperedges (group relationships)
- **Gameplay Scene** — agar_io_clone_game_ui, grid_arena, food_pellets, virus_cells, leaderboard_panel [EXTRACTED 0.95]
- **Multiplayer Match** — player_huy, player_dragon, multiplayer_viewports, leaderboard_panel [INFERRED 0.84]
- **Mobile Input Layer** — mobile_controls, player_huy, player_dragon [INFERRED 0.76]

## Communities

### Community 0 - "f() / p / .open()"
Cohesion: 0.06
Nodes (5): E(), f(), m, p, y

### Community 1 - "h / a() / c"
Cohesion: 0.07
Nodes (5): a(), c, d(), h, r()

### Community 2 - "player.js / Cell / tickGame()"
Cohesion: 0.14
Nodes (27): Cell, changeCellMass(), checkForCollisions(), clientProvidedData(), constructor(), enumerateCollidingCells(), findIndexByID(), getCell() (+19 more)

### Community 3 - "app.js / registerFunctions() / addSystemLine()"
Cohesion: 0.12
Nodes (28): addChatLine(), addSystemLine(), appendMessage(), checkLatency(), constructor(), directional(), directionDown(), directionUp() (+20 more)

### Community 4 - "ChatClient / .registerFunctions() / .addSystemLine()"
Cohesion: 0.13
Nodes (9): getPosition(), handleDisconnect(), resize(), setupSocket(), startGame(), v(), validNick(), ChatClient (+1 more)

### Community 5 - ".emit() / addPlayer() / server.js"
Cohesion: 0.16
Nodes (17): balanceMass(), constructor(), enumerateWhatPlayersSee(), addPlayer(), addSpectator(), calculateLeaderboard(), gameloop(), generateSpawnpoint() (+9 more)

### Community 6 - "u / .flush() / .onHandshake()"
Cohesion: 0.19
Nodes (2): s(), u

### Community 7 - "render.js / _() / gameLoop()"
Cohesion: 0.23
Nodes (15): _(), animloop(), gameLoop(), cellTouchingBorders(), circlePoint(), drawBorder(), drawCells(), drawCellWithLines() (+7 more)

### Community 8 - "Canvas / .directionUp() / .directional()"
Cohesion: 0.24
Nodes (1): Canvas

### Community 9 - "move() / massFood.js / adjustForBoundaries()"
Cohesion: 0.31
Nodes (5): adjustForBoundaries(), addNew(), constructor(), move(), remove()

### Community 10 - "Player cell dragon / Player cell huy / Agar.IO Clone game UI"
Cohesion: 0.39
Nodes (9): Agar.IO Clone game UI, Colored food pellets, Grid-based arena, Leaderboard panel, Mobile joystick and targeting controls, Two simultaneous game viewports, Player cell dragon, Player cell huy (+1 more)

### Community 11 - "gulpfile.js / buildClientJS() / getWebpackConfig()"
Cohesion: 0.29
Nodes (2): buildClientJS(), getWebpackConfig()

### Community 12 - "food.js / addNew() / Food"
Cohesion: 0.39
Nodes (5): addNew(), constructor(), delete(), Food, removeExcess()

### Community 13 - "isVisibleEntity() / entityUtils.js / getPosition()"
Cohesion: 0.67
Nodes (2): getPosition(), isVisibleEntity()

### Community 14 - "split icon / split / horizontal separation"
Cohesion: 0.83
Nodes (4): split icon, horizontal separation, left-right arrows, split

### Community 15 - "feed mass / feed icon / crosshair/target reticle"
Cohesion: 0.5
Nodes (4): feed mass, feed icon, crosshair/target reticle, feed control

### Community 16 - "split control icon / player input control / split"
Cohesion: 0.67
Nodes (4): horizontal separation, player input control, split, split control icon

### Community 17 - "Targeting Reticle / Feed Action / Feed Control Icon"
Cohesion: 0.67
Nodes (4): Targeting Reticle, Feed Action, Feed Control Icon, Player Control Input

### Community 18 - "logChatMessage() / chat-repository.js"
Cohesion: 0.67
Nodes (1): logChatMessage()

### Community 19 - "logFailedLoginAttempt() / logging-repository.js"
Cohesion: 0.67
Nodes (1): logFailedLoginAttempt()

### Community 20 - "AGENTS.md / README.md / TODO.md"
Cohesion: 1.0
Nodes (0): 

### Community 21 - "getRules() / webpack.config.js"
Cohesion: 1.0
Nodes (0): 

### Community 22 - "util.js / Point()"
Cohesion: 1.0
Nodes (0): 

### Community 23 - "config.js"
Cohesion: 1.0
Nodes (0): 

### Community 24 - "sql.js"
Cohesion: 1.0
Nodes (0): 

### Community 25 - "util.js"
Cohesion: 1.0
Nodes (0): 

### Community 26 - "sql.js"
Cohesion: 1.0
Nodes (0): 

### Community 27 - "util.js"
Cohesion: 1.0
Nodes (0): 

### Community 28 - "global.js"
Cohesion: 1.0
Nodes (0): 

### Community 29 - "server.js"
Cohesion: 1.0
Nodes (0): 

## Knowledge Gaps
- **4 isolated node(s):** `Grid-based arena`, `crosshair/target reticle`, `feed control`, `horizontal separation`
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `getRules() / webpack.config.js`** (2 nodes): `getRules()`, `webpack.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `util.js / Point()`** (2 nodes): `util.js`, `Point()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `config.js`** (1 nodes): `config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `sql.js`** (1 nodes): `sql.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `util.js`** (1 nodes): `util.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `sql.js`** (1 nodes): `sql.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `util.js`** (1 nodes): `util.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `global.js`** (1 nodes): `global.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `server.js`** (1 nodes): `server.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `h` connect `h / a() / c` to `f() / p / .open()`, `app.js / registerFunctions() / addSystemLine()`, `ChatClient / .registerFunctions() / .addSystemLine()`, `.emit() / addPlayer() / server.js`, `render.js / _() / gameLoop()`?**
  _High betweenness centrality (0.203) - this node is a cross-community bridge._
- **Why does `tickPlayer()` connect `.emit() / addPlayer() / server.js` to `move() / massFood.js / adjustForBoundaries()`, `player.js / Cell / tickGame()`?**
  _High betweenness centrality (0.075) - this node is a cross-community bridge._
- **Why does `addPlayer()` connect `.emit() / addPlayer() / server.js` to `player.js / Cell / tickGame()`, `ChatClient / .registerFunctions() / .addSystemLine()`?**
  _High betweenness centrality (0.073) - this node is a cross-community bridge._
- **What connects `Grid-based arena`, `crosshair/target reticle`, `feed control` to the rest of the system?**
  _4 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `f() / p / .open()` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._
- **Should `h / a() / c` be split into smaller, more focused modules?**
  _Cohesion score 0.07 - nodes in this community are weakly interconnected._
- **Should `player.js / Cell / tickGame()` be split into smaller, more focused modules?**
  _Cohesion score 0.14 - nodes in this community are weakly interconnected._