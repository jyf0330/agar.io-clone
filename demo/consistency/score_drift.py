#!/usr/bin/env python3
"""Score drift between the latest two Week 2 consistency runs."""

import argparse
import json
import re
from pathlib import Path


def normalize(text):
    return re.sub(r"\s+", "", str(text or "").lower())


def char_bigrams(text):
    value = normalize(text)
    if len(value) < 2:
        return {value} if value else set()
    return {value[index:index + 2] for index in range(len(value) - 1)}


def similarity(left, right):
    left_set = char_bigrams(left)
    right_set = char_bigrams(right)
    if not left_set and not right_set:
        return 1.0
    if not left_set or not right_set:
        return 0.0
    return len(left_set & right_set) / len(left_set | right_set)


def keyword_score(answer, keywords):
    if not keywords:
        return 1.0
    value = normalize(answer)
    hits = sum(1 for keyword in keywords if normalize(keyword) in value)
    return hits / len(keywords)


def load_runs(data_dir):
    files = sorted(Path(data_dir).glob("*.json"))
    if not files:
        raise SystemExit(f"no consistency runs found in {data_dir}")
    if len(files) == 1:
        return files[-1], files[-1]
    return files[-2], files[-1]


def answer_key(answer):
    return f"{answer.get('npcId')}::{answer.get('questionId')}"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data-dir", default="data/consistency")
    args = parser.parse_args()

    previous_path, latest_path = load_runs(args.data_dir)
    previous = json.loads(previous_path.read_text(encoding="utf8"))
    latest = json.loads(latest_path.read_text(encoding="utf8"))
    previous_by_key = {answer_key(answer): answer for answer in previous.get("answers", [])}
    scores = []

    for answer in latest.get("answers", []):
        key = answer_key(answer)
        old_answer = previous_by_key.get(key, answer)
        stable = similarity(old_answer.get("answer", ""), answer.get("answer", ""))
        anchored = keyword_score(answer.get("answer", ""), answer.get("expectedKeywords", []))
        score = round(((stable * 0.7) + (anchored * 0.3)) * 100, 1)
        scores.append(score)
        print(f"{key}: {score:5.1f}% | {answer.get('answer')}")

    overall = round(sum(scores) / len(scores), 1) if scores else 0
    print(f"整体一致性 {overall}%")
    if overall < 80:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
