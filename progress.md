Original prompt: 直接断开连接了，做完新建一个测试线程确保能正常玩；npx/Playwright弄；弄好啊，还有bug呢

- 2026-04-23: Installed working user-scoped npm/npx wrappers in /Users/macmin4/.local/bin and installed playwright + @playwright/cli globally under /Users/macmin4/.local.
- 2026-04-23: Verified playwright-cli can open the local game page; current landing-page console noise is only favicon.ico 404.
- 2026-04-23: Current goal is reproducing the remaining gameplay bug through a real browser flow, not just socket smoke tests.
- Note: develop-web-game helper script currently does not run out of the box here because its ESM import cannot resolve the globally installed playwright package, and this repo does not expose render_game_to_text / advanceTime hooks yet.
