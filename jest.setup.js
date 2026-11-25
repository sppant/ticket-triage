// Keep test output quiet; specs that assert on logs pass their own logger config.
process.env.LOG_LEVEL = process.env.LOG_LEVEL || 'silent';
