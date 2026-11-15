#!/usr/bin/env python3
"""oxe_remote.py — OXE remote automation (SSH/telnet) using pexpect.

Actions:
  deploy  — Transfer create+delete scripts to OXE (su to root for chmod)
  run     — Deploy one script then run it, all in one session

Environment variables:
  SIPP_OXE           OXE IP address
  SIPP_ACCESS        ssh or telnet
  SIPP_USER          Login username (typically mtcl)
  SIPP_PASS          Login password
  SIPP_ROOT_PASS     Root password (for su during deploy/run)
  SIPP_SCRIPT_PATH   Remote script directory (e.g. /tmpd/sipp_tools)
  SIPP_CREATE        Local path to create_sip_users.sh  (deploy only)
  SIPP_DELETE        Local path to delete_sip_users.sh  (deploy only)
  SIPP_LOCAL_SCRIPT  Local path to script to transfer   (run only)
  SIPP_CMD_ARGS      Arguments for the script            (run only)
"""

import sys
import os
import base64
import pexpect

PROMPT = r'[#>$]\s?'


def env(name):
    return os.environ.get(name, '')


def connect(host, access, user, password, timeout=30):
    """Open SSH or telnet, authenticate, consume login banner silently."""
    if access == 'telnet':
        child = pexpect.spawn('telnet %s' % host,
                              encoding='utf-8', timeout=timeout)
        child.expect('[Ll]ogin:')
        child.sendline(user)
        child.expect('[Pp]assword:')
        child.sendline(password)
    else:
        child = pexpect.spawn(
            'ssh -o StrictHostKeyChecking=no %s@%s' % (user, host),
            encoding='utf-8', timeout=timeout)
        i = child.expect(['yes/no', '[Pp]assword:'])
        if i == 0:
            child.sendline('yes')
            child.expect('[Pp]assword:')
        child.sendline(password)

    # Consume login banner silently (motd, system info, etc.)
    child.expect(PROMPT)
    return child


def deploy(host, access):
    """Deploy create/delete scripts to OXE as mtcl (no su needed)."""
    user = env('SIPP_USER') or 'mtcl'
    password = env('SIPP_PASS')
    script_path = env('SIPP_SCRIPT_PATH')
    create_file = env('SIPP_CREATE')
    delete_file = env('SIPP_DELETE')

    with open(create_file, 'rb') as f:
        cb64 = base64.b64encode(f.read().replace(b'\r\n', b'\n')).decode()
    with open(delete_file, 'rb') as f:
        db64 = base64.b64encode(f.read().replace(b'\r\n', b'\n')).decode()

    child = connect(host, access, user, password, timeout=60)

    print('  Creating %s/' % script_path)
    child.sendline('mkdir -p %s' % script_path)
    child.expect(PROMPT)

    print('  Transferring create_sip_users.sh...')
    child.sendline("echo '%s' | base64 -d > %s/create_sip_users.sh" % (cb64, script_path))
    child.expect(PROMPT)

    print('  Transferring delete_sip_users.sh...')
    child.sendline("echo '%s' | base64 -d > %s/delete_sip_users.sh" % (db64, script_path))
    child.expect(PROMPT)

    child.logfile_read = sys.stdout
    child.sendline('ls -la %s/' % script_path)
    child.expect(PROMPT)
    child.logfile_read = None

    child.sendline('exit')
    child.expect(pexpect.EOF)
    child.close()
    print('  Transfer complete.')


def run_cmd(host, access):
    """Deploy a script to OXE then run it — all in one session."""
    user = env('SIPP_USER') or 'mtcl'
    password = env('SIPP_PASS')
    script_path = env('SIPP_SCRIPT_PATH')
    local_script = env('SIPP_LOCAL_SCRIPT')
    cmd_args = env('SIPP_CMD_ARGS')

    with open(local_script, 'rb') as f:
        content = f.read().replace(b'\r\n', b'\n')
        sb64 = base64.b64encode(content).decode()
    script_name = os.path.basename(local_script)
    remote_script = '%s/%s' % (script_path, script_name)

    child = connect(host, access, user, password, timeout=900)

    # Deploy script as mtcl (no su needed — mtcl can write /tmpd/)
    print('  Deploying %s to OXE...' % script_name)
    child.sendline('mkdir -p %s' % script_path)
    child.expect(PROMPT)
    child.sendline("echo '%s' | base64 -d > %s" % (sb64, remote_script))
    child.expect(PROMPT)
    print('  Script deployed.')

    # Run the script with sh (no chmod +x needed)
    print('  Running: %s %s' % (script_name, cmd_args))
    print('')
    child.maxread = 100000
    child.sendline('sh %s %s; echo __SIPP_DONE__' % (remote_script, cmd_args))
    # First match is the echoed command line — skip it silently
    child.expect('__SIPP_DONE__', timeout=30)
    # Now log the actual script output
    child.logfile_read = sys.stdout
    child.expect('__SIPP_DONE__', timeout=900)
    child.expect(PROMPT)
    child.logfile_read = None

    child.sendline('exit')
    child.expect(pexpect.EOF)
    child.close()
    return 0


def main():
    try:
        action = sys.argv[1] if len(sys.argv) > 1 else ''
        host = env('SIPP_OXE')
        access = env('SIPP_ACCESS') or 'ssh'

        if not host:
            print('ERROR: SIPP_OXE not set.')
            sys.exit(1)

        if action == 'deploy':
            deploy(host, access)
        elif action == 'run':
            rc = run_cmd(host, access)
            sys.exit(rc)
        else:
            print('Usage: %s <deploy|run>' % sys.argv[0])
            sys.exit(1)

    except pexpect.TIMEOUT:
        print('\nERROR: Connection timed out.')
        sys.exit(1)
    except pexpect.EOF:
        print('\nERROR: Connection closed unexpectedly.')
        sys.exit(1)
    except Exception as e:
        print('\nERROR: %s' % e)
        sys.exit(1)


if __name__ == '__main__':
    main()
