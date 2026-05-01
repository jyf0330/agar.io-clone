# Balance Phase Two Rhythm

Phase two turns the phase-one telemetry into a repeatable single-round rhythm
check. The intent is to tune the existing V5 loop:

food growth -> part pickup -> Ghost contact -> NPC/Ghost/player pressure ->
devour or body completion -> settlement.

No new gameplay system is required for this phase. A tuning change is ready only
when the rhythm report says why it helped.

## Running A Rhythm Check

Start a playtest server with telemetry:

```bash
V5_BALANCE_PRESET=demo V5_BALANCE_TELEMETRY=1 npm start
```

After one or more bot or human runs:

```bash
npm run balance:report
```

To read another directory or a single JSONL file:

```bash
npm run balance:report -- data/balance/2026-05-02.jsonl
```

## Report Signals

The report groups events by preset and prints:

- `firstPart`: the first observed part pickup timing.
- `firstGhost`: the first world snapshot with active Ghosts.
- `bodyCompletion`: completed-body settlements divided by all settlements.
- `devours`: player-vs-player part theft pressure.
- `partsBySource`: whether parts come from map pickups, Ghost echoes, NPC
  rewards, or kill loot.
- `settlementsByReason`: whether rounds end by timer or body completion.

Each timing or completion line is marked:

- `PASS`: inside the current target band.
- `CHECK`: outside the target band or missing enough data.

## Current Target Bands

| Preset | First Part | First Ghost | Body Completion |
| --- | --- | --- | --- |
| `demo` | 30-60s | 60-120s | 20-40% |
| `standard` | 60-120s | 120-240s | 10-25% |
| `long` | 120-300s | 180-420s | 5-20% |

These are not final balance values. They are guardrails for the next 20-50
recorded runs.

## Tuning Rules

When `firstPart` is too late:

- Raise `partLoot.maxWorldParts` or `partLoot.spawnBatch` for that preset.
- Prefer map pickup density before adding NPC reward shortcuts.

When `firstPart` is too early:

- Lower `spawnBatch` first.
- Keep `maxWorldParts` high enough that the map still feels authored.

When `firstGhost` is too late:

- Raise `ghostEcho.triggerRadius`.
- Lower `ghostEcho.anchorCooldownMs`.
- Seed more replayable anchors in quiet map regions.

When `firstGhost` is too early or too noisy:

- Lower `maxActiveGhosts`.
- Raise `anchorCooldownMs`.
- Keep Ghosts meaningful instead of constant background noise.

When `bodyCompletion` is too high:

- Reduce external part sources before weakening player abilities.
- Check whether NPC rewards or Ghost echo items are overfeeding completion.

When `bodyCompletion` is too low:

- Raise early part availability.
- Improve pet/Ghost guidance before adding raw rewards.

When `devours` are missing in PvP runs:

- Check player encounter density and map size before changing steal rules.
- Use bot/human pathing evidence to decide whether players are simply not
  meeting.

## Next Step

Run paired telemetry passes:

```bash
V5_BALANCE_PRESET=demo V5_BALANCE_TELEMETRY=1 npm start
npm run balance:report

V5_BALANCE_PRESET=standard V5_BALANCE_TELEMETRY=1 npm start
npm run balance:report
```

Record each report in `logs/dev_log.md` with the preset, run count, and any
parameter change made afterward.
