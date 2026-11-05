"""Active Claude Code time per day, read from the transcripts under ~/.claude/projects.

Time is kept in 5-minute slots, in local time, that hold any transcript entry from any
session; sessions running side by side count once. A slot counts until the next busy slot
when that comes within 15 minutes (reading a reply, trying something out), else 5 minutes.
Files are read from where the last run stopped. Every slot ever seen is kept in the cache's
history, so days stay counted after Claude Code deletes old transcripts.

Usage: python3 -I usage.py <cache file>
Prints {"today", "average" (over the last 15 days with any use), "days" averaged,
"daily": {day: minutes} for every day on record, "hours": today's minutes in each hour,
"usualByNow": minutes a usual recent day had by this time of day, "usualHours": a usual day's minutes per hour}.
"""

import json
import os
import re
import sys
from datetime import datetime, timedelta

SLOT = 300
# A pause up to this long between busy slots still counts as working.
IDLE_GAP = 15 * 60
AVERAGE_DAYS = 15
STAMP = re.compile(rb'"timestamp":"(\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d)')


def slot_of(raw):
    utc = datetime.strptime(raw.decode(), "%Y-%m-%dT%H:%M:%S")
    epoch = (utc - datetime(1970, 1, 1)).total_seconds()
    return int(epoch // SLOT)


def day_of(slot):
    return datetime.fromtimestamp(slot * SLOT).strftime("%Y-%m-%d")


def credits(slots):
    """Each busy slot with the minutes it counts for under the pause rule."""
    ordered = sorted(slots)
    out = []
    for here, after in zip(ordered, ordered[1:] + [None]):
        gap = (after - here) * SLOT if after is not None else SLOT
        out.append((here, (gap if gap <= IDLE_GAP else SLOT) / 60))
    return out


def main():
    cache_path = sys.argv[1]
    root = os.path.expanduser("~/.claude/projects")
    try:
        with open(cache_path) as f:
            cache = json.load(f)
    except (OSError, ValueError):
        cache = {}
    # Older caches kept slots per file; start over in the new shape.
    offsets = cache.get("offsets", {}) if "history" in cache else {}
    history = {day: set(slots) for day, slots in cache.get("history", {}).items()}
    seen = set()

    for folder, _, names in os.walk(root):
        for name in names:
            if not name.endswith(".jsonl"):
                continue
            path = os.path.join(folder, name)
            try:
                size = os.stat(path).st_size
            except OSError:
                continue
            seen.add(path)
            offset = offsets.get(path, 0)
            if size < offset:
                offset = 0
            if size > offset:
                with open(path, "rb") as f:
                    f.seek(offset)
                    chunk = f.read()
                # Leave a half-written last line for the next run.
                end = chunk.rfind(b"\n") + 1
                for m in STAMP.finditer(chunk[:end]):
                    slot = slot_of(m.group(1))
                    history.setdefault(day_of(slot), set()).add(slot)
                offset += end
            offsets[path] = offset

    offsets = {p: o for p, o in offsets.items() if p in seen}
    os.makedirs(os.path.dirname(cache_path), exist_ok=True)
    tmp = cache_path + ".tmp"
    with open(tmp, "w") as f:
        json.dump({"offsets": offsets, "history": {d: sorted(s) for d, s in history.items()}}, f)
    os.replace(tmp, cache_path)

    now = datetime.now()
    today = now.strftime("%Y-%m-%d")
    daily = {day: round(sum(m for _, m in credits(slots))) for day, slots in sorted(history.items())}
    recent = [
        daily.get((now - timedelta(days=back)).strftime("%Y-%m-%d"), 0)
        for back in range(1, AVERAGE_DAYS + 1)
    ]
    past = [m for m in recent if m > 0]
    hours = [0.0] * 24
    for slot, m in credits(history.get(today, ())):
        hours[datetime.fromtimestamp(slot * SLOT).hour] += m
    hours = [round(m) for m in hours]

    # What a usual day looks like, from the same recent active days the average uses: minutes per
    # hour, and how much of the day was done by this time of day.
    active_days = [
        (now - timedelta(days=back)).strftime("%Y-%m-%d")
        for back in range(1, AVERAGE_DAYS + 1)
        if daily.get((now - timedelta(days=back)).strftime("%Y-%m-%d"), 0) > 0
    ]
    clock = now.hour * 3600 + now.minute * 60 + now.second
    usual_hours = [0.0] * 24
    by_now = 0
    for day in active_days:
        for slot, m in credits(history.get(day, ())):
            t = datetime.fromtimestamp(slot * SLOT)
            usual_hours[t.hour] += m
            if t.hour * 3600 + t.minute * 60 + t.second < clock:
                by_now += m
    n = len(active_days) or 1

    print(json.dumps({
        "today": daily.get(today, 0),
        "average": round(sum(past) / len(past)) if past else 0,
        "days": len(past),
        "daily": daily,
        "hours": hours,
        "usualByNow": round(by_now / n),
        "usualHours": [round(m / n, 1) for m in usual_hours],
    }))


main()
