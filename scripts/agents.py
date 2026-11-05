"""Print the Claude Code sessions (by id) that still have a background agent at work.

A finished agent's transcript ends with its SubagentHandback report; one still running ends on
anything else. An agent quiet for longer than STALE is taken as dropped, not running.

Workflow agents sit one level deeper, in subagents/workflows/<run>/, and write no handback. A run
is at work while its journal.jsonl has an agent `started` with no `result` yet, or was written in
the last GAP (the moment between one phase's results and the next phase's starts). A run with no
write for longer than WORKFLOW_STALE was stopped or dropped.
"""
import glob
import json
import os
import sys
import time

STALE = 2 * 60 * 60
WORKFLOW_STALE = 30 * 60
GAP = 60
TAIL = 64 * 1024


def is_finished(path):
    with open(path, 'rb') as f:
        f.seek(0, os.SEEK_END)
        f.seek(max(0, f.tell() - TAIL))
        lines = [l for l in f.read().decode('utf-8', 'replace').splitlines() if l.strip()]
    for line in reversed(lines[-4:]):
        if '"SubagentHandback"' in line:
            return True
    return False


def is_workflow_running(run, now):
    journal = os.path.join(run, 'journal.jsonl')
    written = max(os.path.getmtime(p) for p in glob.glob(os.path.join(run, '*.jsonl')))
    if now - written > WORKFLOW_STALE:
        return False
    if now - os.path.getmtime(journal) < GAP:
        return True
    open_keys = set()
    with open(journal, encoding='utf-8', errors='replace') as f:
        for line in f:
            try:
                entry = json.loads(line)
            except ValueError:
                continue
            if entry.get('type') == 'started':
                open_keys.add(entry.get('key'))
            elif entry.get('type') == 'result':
                open_keys.discard(entry.get('key'))
    return bool(open_keys)


def main(projects):
    now = time.time()
    busy = set()
    for path in glob.glob(os.path.join(projects, '*', '*', 'subagents', '*.jsonl')):
        try:
            if now - os.path.getmtime(path) > STALE or is_finished(path):
                continue
        except OSError:
            continue
        busy.add(path.split(os.sep)[-3])
    for journal in glob.glob(os.path.join(projects, '*', '*', 'subagents', 'workflows', '*', 'journal.jsonl')):
        run = os.path.dirname(journal)
        try:
            if not is_workflow_running(run, now):
                continue
        except OSError:
            continue
        busy.add(run.split(os.sep)[-4])
    print(json.dumps(sorted(busy)))


main(sys.argv[1])
