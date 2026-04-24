#!/usr/bin/env python3
"""Simulate Week 2 memory sessions through the Node memory pipeline."""

import argparse
import json
import os
import subprocess
from pathlib import Path


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--n", type=int, default=10, help="number of sessions to simulate")
    parser.add_argument("--db", default="data/memory.db", help="SQLite memory DB path")
    parser.add_argument("--player-id", default="sim-player", help="simulated player id")
    args = parser.parse_args()

    repo_root = Path(__file__).resolve().parents[2]
    db_path = (repo_root / args.db).resolve()
    db_path.parent.mkdir(parents=True, exist_ok=True)

    runner = r"""
const store = require('./apps/server/src/memory/store');
const updater = require('./apps/server/src/memory/persona-updater');

const sessions = Number(process.env.SIM_SESSION_COUNT || '10');
const playerId = process.env.SIM_PLAYER_ID || 'sim-player';
const npcs = [
  {id: 'mochi', player: {name: '麻薯'}, personality: {anchorsText: 'anchors:\n  facts:\n    - "我喜欢安静的颜色"'}},
  {id: 'doudou', player: {name: '豆豆'}, personality: {anchorsText: 'anchors:\n  facts:\n    - "我喜欢亮色和惊喜"'}},
  {id: 'wugui', player: {name: '乌龟'}, personality: {anchorsText: 'anchors:\n  facts:\n    - "我说话稳重"'}}
];

function fakeAsk(_promptId, params) {
  return Promise.resolve({
    ok: true,
    text: JSON.stringify({
      impression: params.npcId + '记得玩家连续回来，偏好柔和颜色，互动稳定。',
      relationshipValue: Math.min(100, params.summaryCount + 3)
    }),
    source: 'llm'
  });
}

(async () => {
  let personaUpdates = 0;
  for (let session = 1; session <= sessions; session += 1) {
    npcs.forEach((npc) => {
      store.addSessionSummary({
        playerId,
        npcId: npc.id,
        sessionId: 'sim-session-' + session,
        summary: '第' + session + '局，玩家和' + npc.player.name + '互动，留下偏亮颜色。',
        relationshipDelta: 1,
        ts: session
      });
    });

    const results = await updater.updatePersonaImpressions({
      npcs,
      playerId,
      store,
      ask: fakeAsk,
      ts: session
    });
    personaUpdates += results.filter((entry) => !entry.skipped).length;
  }

  const impressions = npcs.map((npc) => store.getPersonaImpression(playerId, npc.id)).filter(Boolean);
  console.log(JSON.stringify({
    sessions,
    npcCount: npcs.length,
    personaUpdateRounds: Math.floor(sessions / 5),
    personaUpdates,
    personaRows: impressions.length,
    dbPath: process.env.MEMORY_DB_PATH
  }, null, 2));
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
"""

    env = os.environ.copy()
    env["MEMORY_DB_PATH"] = str(db_path)
    env["SIM_SESSION_COUNT"] = str(args.n)
    env["SIM_PLAYER_ID"] = args.player_id
    result = subprocess.run(
        ["node", "-e", runner],
        cwd=str(repo_root),
        env=env,
        text=True,
        capture_output=True,
        check=False,
    )

    if result.stdout:
        print(result.stdout.strip())
    if result.stderr:
        print(result.stderr.strip())
    raise SystemExit(result.returncode)


if __name__ == "__main__":
    main()
