// Populates process.env with fixed test values before any test file
// imports config/env.ts, which validates process.env at import time.
process.env.NODE_ENV ??= "test";
process.env.MONGO_URI ??= "mongodb://localhost:27017/tulonglink-test";
process.env.JWT_ACCESS_SECRET ??= "test-access-secret-0123456789";
process.env.JWT_REFRESH_SECRET ??= "test-refresh-secret-0123456789";
