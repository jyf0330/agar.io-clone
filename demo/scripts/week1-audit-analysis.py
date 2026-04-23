#!/usr/bin/env python3
# 读取 data/audit/*.jsonl，汇总 Week 1 验收关心的调用、延迟、fallback、敏感词与每小时 token。

from __future__ import annotations

import argparse
import json
import math
import sys
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable


DEFAULT_GLOB = "data/audit/*.jsonl"
DEFAULT_SUMMARY_GLOB = "demo/videos/week1/*.mp4.json"
FORBIDDEN_WORDS_PATH = Path("demo/critiques/pool.json")


@dataclass
class ScenarioWindow:
    name: str
    path: Path
    started_ms: int
    finished_ms: int
    audit_inputs: list[str]


# 读取 forbiddenWords 配置；缺失时退回空列表，避免脚本自己崩。
def load_forbidden_words() -> list[str]:
    if not FORBIDDEN_WORDS_PATH.exists():
        return []
    try:
        payload = json.loads(FORBIDDEN_WORDS_PATH.read_text("utf-8"))
    except (json.JSONDecodeError, OSError):
        return []
    words = payload.get("meta", {}).get("forbiddenWords", [])
    return [word for word in words if isinstance(word, str) and word]


# 展开命令行传进来的文件、目录或 glob。
def resolve_input_files(raw_inputs: list[str]) -> list[Path]:
    candidates = raw_inputs or [DEFAULT_GLOB]
    resolved: list[Path] = []
    seen: set[Path] = set()

    for raw in candidates:
        path = Path(raw)
        matches: Iterable[Path]
        if any(ch in raw for ch in "*?[]"):
            matches = sorted(Path().glob(raw))
        elif path.is_dir():
            matches = sorted(path.glob("*.jsonl"))
        else:
            matches = [path]

        for match in matches:
            if match.is_file():
                absolute = match.resolve()
                if absolute not in seen:
                    seen.add(absolute)
                    resolved.append(match)

    return sorted(resolved)


def resolve_summary_files(raw_glob: str) -> list[Path]:
    if not raw_glob:
        return []
    return sorted(Path().glob(raw_glob))


def parse_iso_to_millis(raw_value: object) -> int | None:
    if not isinstance(raw_value, str) or not raw_value.strip():
        return None
    normalized = raw_value.replace("Z", "+00:00")
    try:
        dt = datetime.fromisoformat(normalized)
    except ValueError:
        return None
    return int(dt.timestamp() * 1000)


# 把 JS Date.now() 毫秒时间戳和秒级时间戳都兼容掉。
def normalize_timestamp_ms(raw_value: object) -> int | None:
    if not isinstance(raw_value, (int, float)):
        return None
    value = float(raw_value)
    if value > 1_000_000_000_000:
        millis = int(value)
    else:
        millis = int(value * 1000)
    return millis if millis >= 0 else None


# 兼容未来可能出现的命中数字段。
def extract_forbidden_hit_count(entry: dict, forbidden_words: list[str]) -> int:
    for key in (
        "forbiddenWordsHits",
        "forbiddenWordHits",
        "forbiddenWordsCount",
        "forbiddenWordCount",
    ):
        value = entry.get(key)
        if isinstance(value, bool):
            return int(value)
        if isinstance(value, (int, float)):
            return max(0, int(value))

    text = entry.get("text")
    if not isinstance(text, str) or not forbidden_words:
        return 0
    return sum(1 for word in forbidden_words if word in text)


# 计算 nearest-rank p95，样本少时也容易解释。
def percentile(values: list[float], ratio: float) -> float:
    if not values:
        return 0.0
    ordered = sorted(values)
    index = max(0, math.ceil(len(ordered) * ratio) - 1)
    return ordered[index]


# 把 token 归到小时桶里，便于 CLI 直接看。
def format_hour_bucket(timestamp_seconds: float, use_utc: bool) -> str:
    tzinfo = timezone.utc if use_utc else None
    dt = datetime.fromtimestamp(timestamp_seconds, tz=tzinfo)
    return dt.strftime("%Y-%m-%d %H:00")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Summarize audit JSONL files for Week 1 milestone checks."
    )
    parser.add_argument(
        "inputs",
        nargs="*",
        help="Audit files, directories, or glob patterns. Defaults to data/audit/*.jsonl",
    )
    parser.add_argument(
        "--summary-glob",
        default=DEFAULT_SUMMARY_GLOB,
        help="Glob for playthrough summary JSON files. Default: demo/videos/week1/*.mp4.json",
    )
    parser.add_argument(
        "--utc",
        action="store_true",
        help="Bucket hourly token usage in UTC instead of local time.",
    )
    return parser


def summarize_entries(
    entries: list[dict],
    forbidden_words: list[str],
    use_utc: bool,
) -> dict:
    total_calls = 0
    fallback_calls = 0
    forbidden_hits = 0
    latencies_ms: list[float] = []
    hourly_tokens: dict[str, int] = defaultdict(int)

    for entry in entries:
        total_calls += 1

        if entry.get("source") == "fallback":
            fallback_calls += 1

        elapsed = entry.get("elapsedMs")
        if isinstance(elapsed, (int, float)):
            latencies_ms.append(float(elapsed))

        forbidden_hits += extract_forbidden_hit_count(entry, forbidden_words)

        ts_ms = normalize_timestamp_ms(entry.get("ts"))
        if ts_ms is not None:
            bucket = format_hour_bucket(ts_ms / 1000.0, use_utc)
            token_in = entry.get("tokenIn", 0)
            token_out = entry.get("tokenOut", 0)
            token_total = 0
            if isinstance(token_in, (int, float)):
                token_total += int(token_in)
            if isinstance(token_out, (int, float)):
                token_total += int(token_out)
            hourly_tokens[bucket] += token_total

    avg_latency = sum(latencies_ms) / len(latencies_ms) if latencies_ms else 0.0
    p95_latency = percentile(latencies_ms, 0.95)
    fallback_rate = (fallback_calls / total_calls) * 100.0 if total_calls else 0.0

    return {
        "total_calls": total_calls,
        "fallback_calls": fallback_calls,
        "fallback_rate": fallback_rate,
        "avg_latency": avg_latency,
        "p95_latency": p95_latency,
        "forbidden_hits": forbidden_hits,
        "hourly_tokens": hourly_tokens,
    }


def load_entries(files: list[Path]) -> tuple[list[dict], int]:
    entries: list[dict] = []
    invalid_lines = 0

    for file_path in files:
        try:
            lines = file_path.read_text("utf-8").splitlines()
        except OSError as error:
            print(f"Failed to read {file_path}: {error}", file=sys.stderr)
            raise SystemExit(1)

        for line in lines:
            if not line.strip():
                continue
            try:
                entry = json.loads(line)
            except json.JSONDecodeError:
                invalid_lines += 1
                continue

            if not isinstance(entry, dict):
                invalid_lines += 1
                continue

            entries.append(entry)

    return entries, invalid_lines


def load_scenario_windows(summary_glob: str) -> list[ScenarioWindow]:
    latest_by_name: dict[str, ScenarioWindow] = {}

    for path in resolve_summary_files(summary_glob):
        try:
            payload = json.loads(path.read_text("utf-8"))
        except (OSError, json.JSONDecodeError):
            continue

        if not isinstance(payload, dict):
            continue

        audit_window = payload.get("auditWindow", {})
        started_ms = None
        finished_ms = None
        if isinstance(audit_window, dict):
            started_ms = normalize_timestamp_ms(audit_window.get("startedTsMs"))
            finished_ms = normalize_timestamp_ms(audit_window.get("finishedTsMs"))
        if started_ms is None:
            started_ms = parse_iso_to_millis(payload.get("startedAt"))
        if finished_ms is None:
            finished_ms = parse_iso_to_millis(payload.get("finishedAt"))

        scenario_name = payload.get("scenario")
        audit_inputs: list[str] = []
        audit_meta = payload.get("audit")
        if isinstance(audit_meta, dict):
            audit_dir = audit_meta.get("dir")
            if isinstance(audit_dir, str) and audit_dir.strip():
                audit_inputs.append(audit_dir)
            extra_inputs = audit_meta.get("inputs")
            if isinstance(extra_inputs, list):
                audit_inputs.extend(
                    item for item in extra_inputs if isinstance(item, str) and item.strip()
                )
        if (
            isinstance(scenario_name, str)
            and scenario_name
            and started_ms is not None
            and finished_ms is not None
            and finished_ms >= started_ms
        ):
            candidate = ScenarioWindow(
                name=scenario_name,
                path=path,
                started_ms=started_ms,
                finished_ms=finished_ms,
                audit_inputs=audit_inputs,
            )
            existing = latest_by_name.get(scenario_name)
            if existing is None or candidate.finished_ms >= existing.finished_ms:
                latest_by_name[scenario_name] = candidate

    return sorted(latest_by_name.values(), key=lambda item: item.started_ms)


def print_summary_block(title: str, metrics: dict) -> None:
    print(title)
    print(f"Total LLM calls          : {metrics['total_calls']}")
    print(f"Average latency          : {metrics['avg_latency']:.2f} ms")
    print(f"P95 latency              : {metrics['p95_latency']:.2f} ms")
    print(
        "Fallback hit rate        : "
        f"{metrics['fallback_calls']}/{metrics['total_calls']} ({metrics['fallback_rate']:.2f}%)"
    )
    print(f"forbiddenWords hits      : {metrics['forbidden_hits']}")


def main() -> int:
    args = build_parser().parse_args()
    forbidden_words = load_forbidden_words()
    scenario_windows = load_scenario_windows(args.summary_glob)

    if args.inputs:
        files = resolve_input_files(args.inputs)
    elif scenario_windows:
        scenario_input_globs: list[str] = []
        for window in scenario_windows:
            scenario_input_globs.extend(window.audit_inputs)
        files = resolve_input_files(scenario_input_globs) if scenario_input_globs else resolve_input_files([])
    else:
        files = resolve_input_files([])

    if not files:
        print("No audit files found.", file=sys.stderr)
        return 1

    entries, invalid_lines = load_entries(files)
    if not entries:
        print("No audit records found.")
        return 0

    overall = summarize_entries(entries, forbidden_words, args.utc)
    scenario_results: list[tuple[ScenarioWindow, dict]] = []
    threshold_failures: list[str] = []

    print("== Week 1 Audit Summary ==")
    print(f"Files scanned            : {len(files)}")
    print(f"Summary windows scanned  : {len(scenario_windows)}")
    print_summary_block("", overall)
    print(f"Invalid lines skipped    : {invalid_lines}")

    if scenario_windows:
        print("")
        print("== Scenario Windows ==")
        for window in scenario_windows:
            scenario_files = resolve_input_files(window.audit_inputs) if window.audit_inputs else files
            scenario_entries, _scenario_invalid = load_entries(scenario_files)
            scoped_entries = [
                entry
                for entry in scenario_entries
                if (
                    normalize_timestamp_ms(entry.get("ts")) is not None
                    and window.started_ms
                    <= normalize_timestamp_ms(entry.get("ts"))
                    <= window.finished_ms
                )
            ]
            metrics = summarize_entries(scoped_entries, forbidden_words, args.utc)
            scenario_results.append((window, metrics))

            started_at = datetime.fromtimestamp(window.started_ms / 1000.0).isoformat()
            finished_at = datetime.fromtimestamp(window.finished_ms / 1000.0).isoformat()
            print(f"[{window.name}] {started_at} -> {finished_at}")
            print_summary_block("", metrics)
            print("")

            if window.name == "online" and metrics["fallback_rate"] >= 10.0:
                threshold_failures.append(
                    f"online fallback rate {metrics['fallback_rate']:.2f}% was not below 10%"
                )
            if window.name == "offline" and metrics["fallback_rate"] <= 90.0:
                threshold_failures.append(
                    f"offline fallback rate {metrics['fallback_rate']:.2f}% was not above 90%"
                )

    print("== Hourly Token Usage ==")
    if overall["hourly_tokens"]:
        for bucket in sorted(overall["hourly_tokens"]):
            print(f"{bucket}  {overall['hourly_tokens'][bucket]}")
    else:
        print("(no timestamped token data)")

    if threshold_failures:
        print("")
        print("== Threshold Checks ==")
        for failure in threshold_failures:
            print(f"FAIL: {failure}")
    elif scenario_results:
        print("")
        print("== Threshold Checks ==")
        print("PASS: online fallback rate < 10% and offline fallback rate > 90%")

    if overall["forbidden_hits"] != 0:
        return 2
    if threshold_failures:
        return 3
    return 0


if __name__ == "__main__":
    sys.exit(main())
