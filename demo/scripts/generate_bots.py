#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
demo/scripts/generate_bots.py

Deliverable 3 · Bot 轨迹生成脚本
-------------------------------
为 V2 demo 方案生成"预录 Bot 回放"JSON。服务端启动时带 --demo-bots=2，
从 demo/bots/bot1.json, bot2.json 读取这些轨迹当作两个假玩家喂给游戏。

核心设计（防"动得太机械"）：
  1. 基础：分段随机漫游（每 N 秒重新挑一个目标点，smooth 加速到它）
  2. 点缀：每 10 秒有一小段"假装追人"——朝地图中心冲 2 秒，再回归漫游
  3. 噪声：每一帧再叠一点小 jitter，让 facing 不死板

输出格式（严格约定，服务端侧按这个读）：
  {
    "version": 1,
    "meta": {
      "name": "Mochi",
      "color": "#FF6B9D",
      "skeleton": "skeleton-b-blob",
      "durationSec": 90,
      "fps": 5,
      "mapWidth": 5000,
      "mapHeight": 5000
    },
    "frames": [
      {"t": 0.0, "x": 2500.0, "y": 2500.0, "facing": 0.0},
      ...
    ]
  }

用法（stdlib-only，不需要 pip install 任何东西）：

  # 生成默认两个示例（bot1.json + bot2.json），已在 V2 Day 2 验收前跑一次：
  python3 demo/scripts/generate_bots.py

  # 自定义：
  python3 demo/scripts/generate_bots.py \
      --name Mochi --color "#FF6B9D" --skeleton skeleton-b-blob \
      --seed 42 --out demo/bots/bot1.json

作者：外部顾问交付物 · 依 V2 七天计划
"""

import argparse
import json
import math
import os
import random
import sys
from typing import List, Tuple

# ----------------------------- 默认参数 -----------------------------

DEFAULT_MAP_W = 5000
DEFAULT_MAP_H = 5000
DEFAULT_FPS = 5
DEFAULT_DURATION_SEC = 90          # 与 V2 的 90 秒局长一致
DEFAULT_MAX_SPEED_PER_SEC = 280.0  # 像素/秒；5000 的地图里视觉上"像在跑"
DEFAULT_TARGET_SWAP_SEC = 4.0      # 每 4 秒重新挑一个漫游目标
DEFAULT_FAKE_CHASE_EVERY = 10.0    # 每 10 秒触发一次
DEFAULT_FAKE_CHASE_DUR = 2.0       # 每次假装追 2 秒
DEFAULT_JITTER = 0.08              # facing 抖动幅度（弧度）


# ----------------------------- 工具函数 -----------------------------

def clamp(v: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, v))


def pick_random_target(map_w: int, map_h: int, rng: random.Random,
                       margin: float = 400.0) -> Tuple[float, float]:
    """在地图内随机挑一个目标点，留一点边距避免贴墙。"""
    return (
        rng.uniform(margin, map_w - margin),
        rng.uniform(margin, map_h - margin),
    )


def smooth_step_toward(cur_x: float, cur_y: float,
                       tgt_x: float, tgt_y: float,
                       max_step: float) -> Tuple[float, float]:
    """朝目标移动最多 max_step，达到/超过则贴上。"""
    dx = tgt_x - cur_x
    dy = tgt_y - cur_y
    dist = math.hypot(dx, dy)
    if dist < 1e-6:
        return cur_x, cur_y
    if dist <= max_step:
        return tgt_x, tgt_y
    ratio = max_step / dist
    return cur_x + dx * ratio, cur_y + dy * ratio


# ----------------------------- 主生成逻辑 -----------------------------

def generate_frames(
    duration_sec: float,
    fps: int,
    map_w: int,
    map_h: int,
    max_speed_per_sec: float,
    target_swap_sec: float,
    fake_chase_every: float,
    fake_chase_dur: float,
    jitter: float,
    seed: int,
    spawn: Tuple[float, float] = None,
) -> List[dict]:
    rng = random.Random(seed)
    dt = 1.0 / fps
    max_step = max_speed_per_sec * dt

    # 起点：地图中央偏随机
    if spawn is None:
        cx, cy = map_w / 2.0, map_h / 2.0
        x = cx + rng.uniform(-600, 600)
        y = cy + rng.uniform(-600, 600)
    else:
        x, y = spawn
    x = clamp(x, 0, map_w)
    y = clamp(y, 0, map_h)

    target_x, target_y = pick_random_target(map_w, map_h, rng)
    last_swap = 0.0
    last_fake_chase = -fake_chase_every * rng.uniform(0.3, 0.7)  # 错开两只 bot 的节奏
    in_fake_chase = False
    fake_chase_end = 0.0

    frames: List[dict] = []
    facing = 0.0
    total_frames = int(round(duration_sec * fps))

    for i in range(total_frames):
        t = i * dt

        # === 决策：是否切换目标 / 是否进入 fake chase ===
        if in_fake_chase:
            if t >= fake_chase_end:
                in_fake_chase = False
                target_x, target_y = pick_random_target(map_w, map_h, rng)
                last_swap = t
        else:
            if t - last_fake_chase >= fake_chase_every:
                # 进入 fake chase：目标设为"地图中心附近"，造成"往人堆里冲"的错觉
                in_fake_chase = True
                fake_chase_end = t + fake_chase_dur
                last_fake_chase = t
                target_x = map_w / 2.0 + rng.uniform(-300, 300)
                target_y = map_h / 2.0 + rng.uniform(-300, 300)
            elif t - last_swap >= target_swap_sec:
                target_x, target_y = pick_random_target(map_w, map_h, rng)
                last_swap = t

        # === 移动 ===
        step = max_step * (1.35 if in_fake_chase else 1.0)
        new_x, new_y = smooth_step_toward(x, y, target_x, target_y, step)

        # facing = 当前速度方向 + 小 jitter
        dx = new_x - x
        dy = new_y - y
        if abs(dx) > 1e-4 or abs(dy) > 1e-4:
            facing = math.atan2(dy, dx)
        facing += rng.uniform(-jitter, jitter)
        # 规整到 [-pi, pi]
        if facing > math.pi:
            facing -= 2 * math.pi
        elif facing < -math.pi:
            facing += 2 * math.pi

        x, y = new_x, new_y

        frames.append({
            "t": round(t, 3),
            "x": round(x, 2),
            "y": round(y, 2),
            "facing": round(facing, 4),
        })

    return frames


def build_bot_json(
    name: str,
    color: str,
    skeleton: str,
    duration_sec: float,
    fps: int,
    map_w: int,
    map_h: int,
    seed: int,
    spawn: Tuple[float, float] = None,
    max_speed_per_sec: float = DEFAULT_MAX_SPEED_PER_SEC,
) -> dict:
    frames = generate_frames(
        duration_sec=duration_sec,
        fps=fps,
        map_w=map_w,
        map_h=map_h,
        max_speed_per_sec=max_speed_per_sec,
        target_swap_sec=DEFAULT_TARGET_SWAP_SEC,
        fake_chase_every=DEFAULT_FAKE_CHASE_EVERY,
        fake_chase_dur=DEFAULT_FAKE_CHASE_DUR,
        jitter=DEFAULT_JITTER,
        seed=seed,
        spawn=spawn,
    )
    return {
        "version": 1,
        "meta": {
            "name": name,
            "color": color,
            "skeleton": skeleton,
            "durationSec": duration_sec,
            "fps": fps,
            "mapWidth": map_w,
            "mapHeight": map_h,
            "seed": seed,
            "maxSpeedPerSec": max_speed_per_sec,
        },
        "frames": frames,
    }


def write_bot(path: str, payload: dict) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        # 紧凑 frames 每行一条；meta 正常缩进——diff 友好
        f.write("{\n")
        f.write('  "version": {},\n'.format(payload["version"]))
        f.write('  "meta": ')
        f.write(json.dumps(payload["meta"], ensure_ascii=False, indent=2).replace("\n", "\n  "))
        f.write(",\n")
        f.write('  "frames": [\n')
        for i, fr in enumerate(payload["frames"]):
            comma = "," if i < len(payload["frames"]) - 1 else ""
            f.write("    " + json.dumps(fr, ensure_ascii=False) + comma + "\n")
        f.write("  ]\n")
        f.write("}\n")


# ----------------------------- CLI -----------------------------

def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Generate pre-recorded bot trajectories for V2 demo.",
    )
    p.add_argument("--name", type=str, default=None,
                   help="Bot display name (default: auto per --preset)")
    p.add_argument("--color", type=str, default=None,
                   help="Primary color hex, e.g. #FF6B9D (default per preset)")
    p.add_argument("--skeleton", type=str, default=None,
                   help="Skeleton key, e.g. skeleton-b-blob (default per preset)")
    p.add_argument("--seed", type=int, default=None, help="RNG seed")
    p.add_argument("--duration", type=float, default=DEFAULT_DURATION_SEC)
    p.add_argument("--fps", type=int, default=DEFAULT_FPS)
    p.add_argument("--map-width", type=int, default=DEFAULT_MAP_W)
    p.add_argument("--map-height", type=int, default=DEFAULT_MAP_H)
    p.add_argument("--max-speed", type=float, default=DEFAULT_MAX_SPEED_PER_SEC)
    p.add_argument("--spawn-x", type=float, default=None)
    p.add_argument("--spawn-y", type=float, default=None)
    p.add_argument("--out", type=str, default=None,
                   help="Output JSON path (single bot mode). "
                        "If omitted, runs the default batch: bot1.json + bot2.json")
    return p.parse_args()


# 两个示例 bot 的默认人设——手调过，配色和 demo 整体友好
DEFAULT_PRESETS = [
    {
        "name": "Mochi",
        "color": "#FF6B9D",         # 粉
        "skeleton": "skeleton-b-blob",
        "seed": 42,
        "spawn": (1800.0, 2600.0),
        "out": "demo/bots/bot1.json",
    },
    {
        "name": "Tofu",
        "color": "#5AA8FF",         # 蓝
        "skeleton": "skeleton-e-bean",
        "seed": 137,
        "spawn": (3200.0, 2400.0),
        "out": "demo/bots/bot2.json",
    },
]


def main() -> int:
    args = parse_args()

    # 单 bot 模式
    if args.out is not None:
        name = args.name or "Bot"
        color = args.color or "#888888"
        skeleton = args.skeleton or "skeleton-a-doll"
        seed = args.seed if args.seed is not None else random.randrange(1, 10_000)
        spawn = None
        if args.spawn_x is not None and args.spawn_y is not None:
            spawn = (args.spawn_x, args.spawn_y)
        payload = build_bot_json(
            name=name, color=color, skeleton=skeleton,
            duration_sec=args.duration, fps=args.fps,
            map_w=args.map_width, map_h=args.map_height,
            seed=seed, spawn=spawn, max_speed_per_sec=args.max_speed,
        )
        write_bot(args.out, payload)
        print("[ok] wrote {} ({} frames)".format(args.out, len(payload["frames"])))
        return 0

    # 批量模式：出两个示例
    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    for preset in DEFAULT_PRESETS:
        out_path = os.path.join(repo_root, preset["out"])
        payload = build_bot_json(
            name=preset["name"],
            color=preset["color"],
            skeleton=preset["skeleton"],
            duration_sec=args.duration,
            fps=args.fps,
            map_w=args.map_width,
            map_h=args.map_height,
            seed=preset["seed"],
            spawn=preset["spawn"],
            max_speed_per_sec=args.max_speed,
        )
        write_bot(out_path, payload)
        print("[ok] wrote {} ({} frames, {}s @ {} fps)".format(
            out_path, len(payload["frames"]), args.duration, args.fps))
    return 0


if __name__ == "__main__":
    sys.exit(main())
