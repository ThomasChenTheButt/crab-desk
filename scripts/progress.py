"""Print how far each working chat is through its task list, and a rough time left.

A chat's task list lives in its transcript as the update_plan calls of its current turn. Replaying
them gives steps done of total; the time the done steps took, spread over the steps left, gives
the estimate. A chat with no list this turn, or none finished yet, gets no estimate.
"""
import glob
import json
import os
import sys
import time
from datetime import datetime


def stamp(record):
    try:
        return datetime.fromisoformat(record['timestamp'].replace('Z', '+00:00')).timestamp()
    except (KeyError, ValueError, AttributeError):
        return None


def is_prompt(record):
    if record.get('type') != 'user' or record.get('isSidechain') or record.get('isMeta'):
        return False
    content = (record.get('message') or {}).get('content')
    if isinstance(content, str):
        return not content.startswith('<')
    return any(isinstance(c, dict) and c.get('type') == 'text' and not c.get('text', '').startswith('<')
               for c in content or [])


def plan_calls(record):
    for c in (record.get('message') or {}).get('content') or []:
        if isinstance(c, dict) and c.get('type') == 'tool_use' and c.get('name', '').endswith('update_plan'):
            yield c.get('input') or {}


def replay(path):
    steps, started, finished = [], None, []
    with open(path, errors='replace') as f:
        for line in f:
            if 'update_plan' not in line and '"user"' not in line:
                continue
            try:
                record = json.loads(line)
            except ValueError:
                continue
            at = stamp(record)
            if is_prompt(record):
                # A new message from you starts a new turn; the old list no longer applies.
                steps, started, finished = [], None, []
                continue
            for call in plan_calls(record):
                before = sum(s == 'completed' for s in steps)
                if 'items' in call:
                    steps = [i.get('status', 'pending') for i in call['items']]
                    names = [i.get('content', '') for i in call['items']]
                    started = started or at
                if call.get('advance'):
                    if 'in_progress' in steps:
                        steps[steps.index('in_progress')] = 'completed'
                    if 'pending' in steps:
                        steps[steps.index('pending')] = 'in_progress'
                for n in call.get('done') or []:
                    if 0 < n <= len(steps):
                        steps[n - 1] = 'completed'
                if call.get('start') and 0 < call['start'] <= len(steps):
                    steps[call['start'] - 1] = 'in_progress'
                finished += [at] * max(0, sum(s == 'completed' for s in steps) - before)
    if not steps or started is None:
        return None
    done = sum(s == 'completed' for s in steps)
    current = names[steps.index('in_progress')] if 'in_progress' in steps else ''
    left = None
    stamps = [t for t in finished if t]
    if 0 < done < len(steps) and stamps:
        per_step = (stamps[-1] - started) / done
        left = max(1, round((per_step * (len(steps) - done) - (time.time() - stamps[-1])) / 60))
    return {'done': done, 'total': len(steps), 'step': current, 'minutesLeft': left}


def main(projects, ids):
    out = {}
    for cli_id in ids:
        for path in glob.glob(os.path.join(projects, '*', cli_id + '.jsonl')):
            found = replay(path)
            if found:
                out[cli_id] = found
    print(json.dumps(out))


main(sys.argv[1], sys.argv[2:])
