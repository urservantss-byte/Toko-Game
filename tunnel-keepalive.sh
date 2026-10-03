#!/bin/bash
# Keep-alive loop untuk SSH reverse tunnel toko-game via serveo.net
LOG=/home/hatch/workspace/toko-game/serveo.log
while true; do
  echo "--- $(date -u +%FT%TZ) starting ssh tunnel ---" >> "$LOG"
  ssh -o StrictHostKeyChecking=no \
      -o UserKnownHostsFile=/dev/null \
      -o ConnectTimeout=20 \
      -o ServerAliveInterval=15 \
      -o ServerAliveCountMax=3 \
      -o ExitOnForwardFailure=yes \
      -o ProxyCommand="/home/hatch/workspace/9router/proxy-ssh.sh %h %p" \
      -R 80:localhost:3000 serveo.net >> "$LOG" 2>&1
  echo "--- $(date -u +%FT%TZ) tunnel exited rc=$?, retry in 5s ---" >> "$LOG"
  sleep 5
done
