#!/usr/bin/env python3
"""Rest the pointer somewhere, and optionally follow what is under it.

    pointer.py 598 464                    # hover, for a preview that opens on it
    pointer.py 653 509 --mods cmd --click # follow a link the way a reader would

AppleScript's `click at` needs assistive access that osascript is not granted
here; posting the event is. A hover that opens after a delay counts the pointer
standing still, so move once and wait — repeating the move restarts the count.
"""

import argparse
import time

import Quartz

MODIFIERS = {
    "cmd": Quartz.kCGEventFlagMaskCommand,
    "ctrl": Quartz.kCGEventFlagMaskControl,
    "alt": Quartz.kCGEventFlagMaskAlternate,
    "shift": Quartz.kCGEventFlagMaskShift,
}
COMMAND_KEY = 55


def mouse(kind, x, y, flags):
    event = Quartz.CGEventCreateMouseEvent(None, kind, (x, y), Quartz.kCGMouseButtonLeft)
    Quartz.CGEventSetFlags(event, flags)
    Quartz.CGEventPost(Quartz.kCGHIDEventTap, event)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("x", type=float)
    parser.add_argument("y", type=float)
    parser.add_argument("--from", dest="origin", nargs=2, type=float, metavar=("X", "Y"))
    parser.add_argument("--mods", default="", help="comma separated: cmd,ctrl,alt,shift")
    parser.add_argument("--click", action="store_true")
    parser.add_argument("--dwell", type=float, default=0.0)
    args = parser.parse_args()

    flags = 0
    for name in filter(None, args.mods.split(",")):
        flags |= MODIFIERS[name]

    held = flags & Quartz.kCGEventFlagMaskCommand
    if held:
        Quartz.CGEventPost(
            Quartz.kCGHIDEventTap, Quartz.CGEventCreateKeyboardEvent(None, COMMAND_KEY, True)
        )
        time.sleep(0.3)

    if args.origin:
        x0, y0 = args.origin
        for step in range(1, 15):
            mouse(
                Quartz.kCGEventMouseMoved,
                x0 + (args.x - x0) * step / 14,
                y0 + (args.y - y0) * step / 14,
                flags,
            )
            time.sleep(0.045)
    else:
        mouse(Quartz.kCGEventMouseMoved, args.x, args.y, flags)

    time.sleep(args.dwell)

    if args.click:
        mouse(Quartz.kCGEventLeftMouseDown, args.x, args.y, flags)
        time.sleep(0.06)
        mouse(Quartz.kCGEventLeftMouseUp, args.x, args.y, flags)

    if held:
        time.sleep(0.3)
        Quartz.CGEventPost(
            Quartz.kCGHIDEventTap,
            Quartz.CGEventCreateKeyboardEvent(None, COMMAND_KEY, False),
        )

    print(f"pointer {args.x},{args.y} mods={args.mods or 'none'} click={args.click}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
