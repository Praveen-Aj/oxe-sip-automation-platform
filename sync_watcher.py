#!/usr/bin/env python3
"""sync_watcher.py — Auto-sync SIPp scripts to peer server on file change.

Polls the script directory for modifications and rsyncs changed files
to the peer server. Runs as a background daemon.

Usage: python3 sync_watcher.py <peer_ip> <local_dir> <remote_dir> [interval_secs]
"""

import os
import sys
import time
import subprocess
import signal

running = True


def signal_handler(sig, frame):
    global running
    running = False
    print('\n[sync_watcher] Stopping...')


def get_mtimes(directory, extensions=None):
    """Get modification times for all relevant files."""
    mtimes = {}
    if extensions is None:
        extensions = ('.sh', '.conf', '.py')
    for f in os.listdir(directory):
        if any(f.endswith(ext) for ext in extensions):
            path = os.path.join(directory, f)
            if os.path.isfile(path):
                mtimes[f] = os.path.getmtime(path)
    return mtimes


def rsync_file(filepath, peer_ip, remote_dir):
    """Rsync a single file to the peer."""
    cmd = [
        'rsync', '-az', '--timeout=10',
        '-e', 'ssh -o StrictHostKeyChecking=no -o BatchMode=yes',
        filepath,
        'root@%s:%s/' % (peer_ip, remote_dir)
    ]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        return result.returncode == 0
    except (subprocess.TimeoutExpired, Exception):
        return False


def main():
    if len(sys.argv) < 4:
        print('Usage: %s <peer_ip> <local_dir> <remote_dir> [interval]' % sys.argv[0])
        sys.exit(1)

    peer_ip = sys.argv[1]
    local_dir = sys.argv[2]
    remote_dir = sys.argv[3]
    interval = int(sys.argv[4]) if len(sys.argv) > 4 else 5

    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    print('[sync_watcher] Watching: %s' % local_dir)
    print('[sync_watcher] Peer:     root@%s:%s' % (peer_ip, remote_dir))
    print('[sync_watcher] Interval: %ds' % interval)
    print('[sync_watcher] PID:      %d' % os.getpid())
    print('')

    # Save PID file
    pidfile = os.path.join(local_dir, '.sync_watcher.pid')
    with open(pidfile, 'w') as f:
        f.write(str(os.getpid()))

    prev_mtimes = get_mtimes(local_dir)

    while running:
        time.sleep(interval)
        if not running:
            break

        curr_mtimes = get_mtimes(local_dir)
        changed = []

        for fname, mtime in curr_mtimes.items():
            if fname not in prev_mtimes or prev_mtimes[fname] < mtime:
                changed.append(fname)

        if changed:
            for fname in changed:
                filepath = os.path.join(local_dir, fname)
                ok = rsync_file(filepath, peer_ip, remote_dir)
                status = 'OK' if ok else 'FAIL'
                print('[sync_watcher] %s -> %s [%s]' % (fname, peer_ip, status))

        prev_mtimes = curr_mtimes

    # Cleanup PID file
    if os.path.exists(pidfile):
        os.remove(pidfile)
    print('[sync_watcher] Stopped.')


if __name__ == '__main__':
    main()
