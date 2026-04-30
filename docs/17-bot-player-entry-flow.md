# Bot Player Entry Flow

This note separates player-like actors before bot players move onto the normal
socket entry path.

## Actor Kinds

- `human`: a browser client controlled by a person.
- `bot`: a headless socket client controlled by code. It should enter through
  the same player payload and socket events as a human.
- `npc`: a narrative actor managed by the NPC orchestrator. It can reuse the
  `Player` body model, but it is not a competitive player.
- `ghost`: a replay projection from historical memory. It is rendered in the
  world but does not own a live player body.

## Rule

Competitive multiplayer rules should prefer `playerKind` over ad-hoc `isNpc`
checks. Bots are competitive players; NPC actors are not. This lets future bot
clients pick body parts, connect over Socket.IO, and send the same input events
as human clients without being treated as server-internal pets.
