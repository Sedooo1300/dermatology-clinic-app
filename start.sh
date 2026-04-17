#!/bin/bash
cd /home/z/my-project

while true; do
  # Check if server is already running
  if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null | grep -q "200"; then
    sleep 10
    continue
  fi

  echo "[$(date)] Starting server..."
  bun .next/standalone/server.js > /tmp/server.log 2>&1 &
  SERVER_PID=$!
  echo "[$(date)] Started with PID $SERVER_PID"

  # Wait and check
  sleep 5
  if ! kill -0 $SERVER_PID 2>/dev/null; then
    echo "[$(date)] Server crashed immediately, waiting 5s before retry..."
    sleep 5
  fi

  sleep 10
done
