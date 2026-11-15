#!/bin/sh
# delete_sip_users.sh — Delete SIP subscribers in batches
# Usage: delete_sip_users.sh <start> <end> [batch_size] [pause_secs]
#
# Runs mgr -nodico -X in batches to avoid MAO/TEL overload on OXE.
# Deploy to OXE and run from the mtcl shell.

if [ $# -lt 2 ]; then
    echo "Usage: $0 <start> <end> [batch_size] [pause_secs]"
    exit 1
fi

START=$1
END=$2
BATCH=${3:-100}
PAUSE=${4:-5}

if [ "$START" -gt "$END" ]; then
    echo "ERROR: start ($START) > end ($END)"
    exit 1
fi

TOTAL=$((END - START + 1))
NUM_BATCHES=$(( (TOTAL + BATCH - 1) / BATCH ))
CUR=$START
BNUM=0

echo ""
echo "Deleting $TOTAL SIP users ($START - $END) in batches of $BATCH"
echo "Pause between batches: ${PAUSE}s"
echo ""

while [ "$CUR" -le "$END" ]; do
    BNUM=$((BNUM + 1))
    BEND=$((CUR + BATCH - 1))
    [ "$BEND" -gt "$END" ] && BEND=$END

    LOGFILE="/tmpd/sipp_delete_batch.log"
    rm -f "$LOGFILE"

    i=$CUR
    while [ "$i" -le "$BEND" ]; do
        echo "DELETE Subscriber \"1\": \"$i\"" >> "$LOGFILE"
        i=$((i + 1))
    done

    CNT=$((BEND - CUR + 1))
    echo "Batch $BNUM/$NUM_BATCHES: deleting $CUR - $BEND ($CNT users)..."
    mgr -nodico -X "$LOGFILE" 2>&1
    echo "  Done."
    rm -f "$LOGFILE"

    CUR=$((BEND + 1))
    if [ "$CUR" -le "$END" ]; then
        echo "  Pausing ${PAUSE}s..."
        sleep $PAUSE
    fi
done

echo ""
echo "Finished deleting $TOTAL users ($START - $END)."
