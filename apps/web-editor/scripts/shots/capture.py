#!/usr/bin/env python3
"""Photograph one application window, or list the windows to choose from.

    capture.py --owner Code --list
    capture.py --owner Obsidian --out frame.png

Asking the window server for the window rather than for a screen rectangle is
what keeps a neighbouring window out of the frame when focus wanders.
"""

import argparse
import subprocess
import sys
import time

import Quartz


def windows(owner: str):
    info = Quartz.CGWindowListCopyWindowInfo(
        Quartz.kCGWindowListOptionOnScreenOnly
        | Quartz.kCGWindowListExcludeDesktopElements,
        Quartz.kCGNullWindowID,
    )
    found = []
    for window in info:
        if window.get("kCGWindowOwnerName") != owner:
            continue
        if window.get("kCGWindowLayer") != 0:
            continue
        bounds = window["kCGWindowBounds"]
        found.append(
            {
                "id": window["kCGWindowNumber"],
                "name": window.get("kCGWindowName", ""),
                "w": int(bounds["Width"]),
                "h": int(bounds["Height"]),
                "x": int(bounds["X"]),
                "y": int(bounds["Y"]),
            }
        )
    found.sort(key=lambda w: w["w"] * w["h"], reverse=True)
    return found


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--owner", required=True, help="Code, Obsidian, WebStorm…")
    parser.add_argument("--app", help="name to activate, when it differs from --owner")
    parser.add_argument("--out")
    parser.add_argument("--list", action="store_true")
    parser.add_argument("--delay", type=float, default=1.0)
    parser.add_argument("--no-activate", action="store_true")
    args = parser.parse_args()

    if args.list:
        for window in windows(args.owner):
            print(
                f"{window['id']}\t{window['w']}x{window['h']}"
                f"\t+{window['x']}+{window['y']}\t{window['name']}"
            )
        return 0

    if not args.out:
        parser.error("--out is required unless --list")

    if not args.no_activate:
        subprocess.run(
            ["osascript", "-e", f'tell application "{args.app or args.owner}" to activate'],
            capture_output=True,
        )
        time.sleep(args.delay)

    found = windows(args.owner)
    if not found:
        print(f"no window for {args.owner}", file=sys.stderr)
        return 1

    window = found[0]
    subprocess.run(
        ["screencapture", "-x", "-o", "-l", str(window["id"]), args.out], check=True
    )
    print(f"{args.out} <- {window['w']}x{window['h']} {window['name']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
