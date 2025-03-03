#!/usr/bin/env node

// eslint-disable-next-line unicorn/prefer-top-level-await
(async () => {
    const { startServer } = require('../dist/src/index');
    startServer();
})()
