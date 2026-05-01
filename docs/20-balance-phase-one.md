# Balance Phase One

This document records the first numeric-design foundation pass for the V5
historical echo game loop. The goal is not to add new gameplay. The goal is to
make the current systems measurable and selectable by playtest mode.

## Scope

Phase one covers:

- Balance presets for `demo`, `standard`, and `long` sessions.
- Optional JSONL balance telemetry for world snapshots, part pickups, and
  player devour events.
- A first metric vocabulary for the next bot and human playtest passes.

Phase one deliberately does not rebalance every body part, add new rewards, or
change the NPC/LLM authority boundary.

## Presets

Select a preset with `V5_BALANCE_PRESET`.

| Preset | Use | Round Length | Intent |
| --- | --- | --- | --- |
| `demo` | Short demonstrations | 8 minutes | High density, frequent Ghost/part contact |
| `standard` | Default local playtest | 12 minutes | Baseline tuning target |
| `long` | Historical echo stress tests | 45 minutes | Long-session memory and Ghost pacing |

`V5_DEMO_MODE=1` still maps to the `demo` preset for backward compatibility.
If both are present, `V5_BALANCE_PRESET` wins.

Preset source:

- [balance-presets.js](/Users/macminim4/Documents/New project/jyf0330-repos/agar.io-clone-master/configs/game/balance-presets.js)
- [config.js](/Users/macminim4/Documents/New project/jyf0330-repos/agar.io-clone-master/configs/game/config.js)

## Telemetry

Enable local balance telemetry with:

```bash
V5_BALANCE_TELEMETRY=1 npm start
```

By default, events are written as JSONL under `data/balance/YYYY-MM-DD.jsonl`.
Override the directory with `BALANCE_AUDIT_DIR`.

The first event types are:

- `balance_world_snapshot`: player count, world entity counts, mass-food total,
  Ghost count, and compact player mass/body state.
- `balance_part_pickup`: player, part type, part source, and body count after
  pickup.
- `balance_player_devour`: eater/victim ids, mass totals, and stolen part type.

Snapshot cadence defaults to once per second. Override it with
`V5_BALANCE_SNAPSHOT_INTERVAL_MS`.

## First Metrics

Use these metrics for the first month of playtests:

- Time to first part pickup.
- Time to first Ghost trigger.
- Parts acquired by source: map pickup, Ghost echo, NPC reward, kill loot.
- Player mass at 1, 3, 6, and 12 minutes.
- Devour count and stolen-part distribution.
- Body completion rate by preset.
- Settlement reason: round end vs body completion.

## First Pass Targets

Initial targets are intentionally broad. Tighten them after 20-50 recorded runs.

| Metric | Demo Target | Standard Target |
| --- | --- | --- |
| First meaningful part | 30-60s | 60-120s |
| Ghost contact | 1-2 min | 2-4 min |
| Body completion | 20-40% | 10-25% |
| Player devour | At least 1 in most PvP runs | Common but not mandatory |
| Empty-feeling start | Under 30s | Under 60s |

## Next Work

The next slice is the phase-two rhythm loop in
[21-balance-phase-two-rhythm.md](/Users/macminim4/Documents/New project/jyf0330-repos/agar.io-clone-master/docs/21-balance-phase-two-rhythm.md).
