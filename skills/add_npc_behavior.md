# Add NPC Behavior

Use this when adding or changing NPC behavior, prompts, memory usage, pet logic,
task rewards, or relationship-facing behavior.

Checklist:
- Read `memory/short_memory.md`, `AGENTS.md`, and relevant files under
  `apps/server/src/npc/`, `apps/server/src/memory/`, and `apps/server/src/llm/`.
- Keep all model calls behind `apps/server/src/llm/wrapper.js`.
- Treat model output as text or suggestions until deterministic server code
  validates and applies state changes.
- Add or update focused unit tests when behavior changes.
- Run the narrowest relevant test, then run broader checks if shared behavior was
  touched.
- Update `memory/decisions.md` or `memory/forbidden_changes.md` when the change
  creates a durable rule.
