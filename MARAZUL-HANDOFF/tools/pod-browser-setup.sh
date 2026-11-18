#!/bin/bash
# One-time setup of Node 22 and Playwright's Chromium on the GPU pod (idempotent).
set -e
if [ ! -x /opt/node/bin/node ]; then
  cd /tmp && curl -fsSL https://nodejs.org/dist/v22.11.0/node-v22.11.0-linux-x64.tar.xz -o node.tar.xz
  mkdir -p /opt/node && tar -xJf node.tar.xz -C /opt/node --strip-components=1
fi
export PATH=/opt/node/bin:$PATH
if [ ! -d /opt/node/lib/node_modules/playwright ]; then
  npm install -g playwright@1.63.0 >/dev/null 2>&1
fi
export PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers
if [ ! -d /opt/pw-browsers ] || [ -z "$(ls /opt/pw-browsers 2>/dev/null | grep chromium)" ]; then
  npx -y playwright@1.63.0 install --with-deps chromium >/tmp/pw-install.log 2>&1 || (tail -20 /tmp/pw-install.log; exit 1)
fi
node -v
ls /opt/pw-browsers
