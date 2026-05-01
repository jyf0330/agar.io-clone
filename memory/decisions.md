# Decisions

## 2026-05-02 - Add Project Memory And Workflow Records

Decision:
- Adopt a lightweight `memory/`, `logs/`, and `skills/` structure for agent
  handoffs and recurring project workflows.

Reason:
- The project has several long-lived subsystems, including multiplayer gameplay,
  NPC/LLM behavior, ghost replay, bot-player verification, and cloud deployment.
  A small shared memory surface reduces rediscovery and helps preserve boundaries
  across sessions.

Rejected:
- Copying AiTownHermesSim rules verbatim, because this project is a live browser
  multiplayer game rather than a headless C# relationship simulator.
