# Update LLM Prompt

Use this when changing prompts, LLM fallbacks, cache/audit behavior, or prompt
contract expectations.

Checklist:
- Read `apps/server/src/llm/wrapper.js` and the prompt owner before editing.
- Do not call provider SDKs or raw endpoints from business modules.
- Keep offline or deterministic fallbacks usable for tests and demos.
- Ensure prompt changes do not let model text directly mutate durable state.
- Add or update tests around parsing, fallback behavior, or state clamps when
  practical.
- Keep credentials and provider-specific secrets out of code, docs, logs, and
  memory files.
