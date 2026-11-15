#!/usr/bin/env python3
import pexpect, time, sys

OXE_IP = '172.19.5.80'
START = 47000
END = 48999
BATCH = 100
PAUSE = 5

print('Connecting to OXE %s via telnet...' % OXE_IP)
child = pexpect.spawn('telnet %s' % OXE_IP, timeout=30)
child.expect('login:')
child.sendline('mtcl')
child.expect('assword:')
child.sendline('mtcl')
child.expect([r'\)\w+>', r'\$', r'#'])
print('Logged in as mtcl.')

total = END - START + 1
done = 0
batch_num = 0
i = START

while i <= END:
    batch_end = min(i + BATCH - 1, END)
    batch_num += 1
    count = batch_end - i + 1
    print('\nBatch %d: deleting %d-%d (%d users)...' % (batch_num, i, batch_end, count))

    # Generate batch file with a single shell loop (fast)
    gen_cmd = 'rm -f /tmpd/del_batch.txt; j=%d; while [ $j -le %d ]; do echo "DELETE Subscriber \\"1\\": \\"$j\\"" >> /tmpd/del_batch.txt; j=$((j+1)); done; echo GENOK' % (i, batch_end)
    child.sendline(gen_cmd)
    child.expect('GENOK', timeout=30)
    child.expect([r'\)\w+>', r'\$', r'#'])

    # Run mgr
    print('  Running mgr...')
    child.sendline('/DHS3bin/oneshot/mtcl/mgr -nodico -X /tmpd/del_batch.txt; echo MGROK')
    child.expect('MGROK', timeout=120)
    child.expect([r'\)\w+>', r'\$', r'#'])
    done += count
    print('  Done. Progress: %d/%d' % (done, total))

    i = batch_end + 1
    if i <= END:
        print('  Pausing %ds...' % PAUSE)
        time.sleep(PAUSE)

print('\n=== COMPLETE: deleted %d users (%d-%d) ===' % (done, START, END))
child.sendline('exit')
child.close()
