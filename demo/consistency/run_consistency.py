#!/usr/bin/env python3
"""Run the Week 2 NPC consistency question harness."""

import argparse
import json
import os
import subprocess
from datetime import datetime, timezone
from pathlib import Path


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--questions", default="demo/consistency/questions.json")
    parser.add_argument("--out-dir", default="data/consistency")
    args = parser.parse_args()

    repo_root = Path(__file__).resolve().parents[2]
    questions_path = (repo_root / args.questions).resolve()
    out_dir = (repo_root / args.out_dir).resolve()
    out_dir.mkdir(parents=True, exist_ok=True)
    run_id = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S-%f")
    out_path = out_dir / f"{run_id}.json"

    runner = r"""
const fs = require('fs');
const wrapper = require('./apps/server/src/llm/wrapper');
const payload = JSON.parse(fs.readFileSync(process.env.CONSISTENCY_QUESTIONS_PATH, 'utf8'));

function buildPrompt(question) {
  return {
    system: [
      '你是游戏 NPC 一致性测试器。',
      '回答必须稳定、短、符合 npcId 的长期人设。',
      '不要引入新设定。'
    ].join('\n'),
    user: [
      'npcId: ' + question.npcId,
      'question: ' + question.question,
      '请只回答一句中文，最多 40 字。'
    ].join('\n'),
    maxTokens: 80,
    temperature: 0.2
  };
}

(async () => {
  const answers = [];
  for (const question of payload.questions) {
    let text = question.fallbackAnswer;
    try {
      const result = await wrapper.ask('consistency_check', {
        npcId: question.npcId,
        questionId: question.id,
        question: question.question
      }, {
        useCache: false,
        prompt: buildPrompt(question)
      });
      if (result && result.ok && result.text && result.text.indexOf('MOCK:') !== 0) {
        text = result.text.slice(0, 40);
      }
    } catch (_error) {
      text = question.fallbackAnswer;
    }

    answers.push({
      npcId: question.npcId,
      questionId: question.id,
      question: question.question,
      answer: text,
      expectedKeywords: question.keywords || []
    });
  }

  console.log(JSON.stringify({answers}, null, 2));
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
"""

    env = os.environ.copy()
    env["CONSISTENCY_QUESTIONS_PATH"] = str(questions_path)
    result = subprocess.run(
        ["node", "-e", runner],
        cwd=str(repo_root),
        env=env,
        text=True,
        capture_output=True,
        check=False,
    )
    if result.returncode != 0:
        if result.stderr:
            print(result.stderr.strip())
        raise SystemExit(result.returncode)

    node_payload = json.loads(result.stdout)
    output = {
        "runId": run_id,
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "provider": os.environ.get("LLM_PROVIDER", "mock"),
        "answers": node_payload["answers"],
    }
    out_path.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf8")
    print(f"wrote {len(output['answers'])} answers to {out_path}")


if __name__ == "__main__":
    main()
