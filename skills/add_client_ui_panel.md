# Add Client UI Panel

Use this when adding or changing browser panels, HUD/status surfaces, editor UI,
or canvas-adjacent controls.

Checklist:
- Read the nearby client modules and CSS before editing.
- Keep source changes under `apps/client/`; do not hand-edit `dist/` as source.
- Match existing DOM helper, rendering, storage, and i18n patterns.
- Verify with a focused unit test when logic is separable.
- For visible UI changes, run the app and inspect the page when practical.
- Run `npm run build` when source changes should regenerate `dist/`.
