# Update Test Case Index

Use this whenever a task touches tests or discusses test coverage in this
repository.

This is the single source of truth for maintaining the Chinese game-flow test
coverage index. Keep AGENTS.md as the trigger point; keep the actual checklist
here.

Checklist:
- Confirm `tests/TEST_CASES.md` exists. If it is missing, create it before
  changing or reporting on test cases.
- Confirm `AGENTS.md` points test-related tasks to this skill and says this
  skill centralizes `tests/TEST_CASES.md` maintenance.
- Keep `tests/TEST_CASES.md` focused on game-flow coverage only: entry,
  handshake, movement, food, body parts, devour, bots, reconnect, settlement,
  bot-test full match, historical echo, and NPC/pet side flows.
- Do not list every Mocha `it()` case. Leave implementation details, utility
  cases, DTO fields, style checks, and formatting assertions inside test files.
- When tests add, delete, or materially change a full-flow coverage area, update
  the matching flow entry in `tests/TEST_CASES.md` in the same change.
- In `tests/TEST_CASES.md`, keep descriptions in Chinese and cite only the main
  test files that prove the flow.
