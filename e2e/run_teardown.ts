import teardown from './global-teardown';
teardown({}).then(() => console.log('Done')).catch(console.error);
