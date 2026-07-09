import { beforeAll, afterAll } from 'vitest';

// Per-file isolation convention:
// Each test file is responsible for creating and cleaning up ONLY its own data,
// scoped to the user/ids it creates (e.g. cart items deleted by the test's userId).
// This bootstrap intentionally performs NO global truncation so that test files
// can run without clobbering each other's rows.

beforeAll(async () => {
  // Intentionally empty: no global setup / no truncation.
});

afterAll(async () => {
  // Intentionally empty: no global teardown / no truncation.
});
