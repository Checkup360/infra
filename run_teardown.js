const { test, request } = require('@playwright/test');
const teardown = require('./e2e/global-teardown.ts').default;
teardown({}).catch(console.error);
