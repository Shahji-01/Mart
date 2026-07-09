import { describe, it, expect } from 'vitest';
// Importing the database package must NOT throw at collection time even when
// DATABASE_URL is unset (R14: lazy pool / import-safe module). We import the
// `db` and `pool` proxies but intentionally never access a property on them,
// so no Pool is constructed and no connection is opened.
import { db, pool } from '@workspace/database';

describe('test harness collection smoke', () => {
  it('runs a trivially-true assertion (proves the runner executes tests)', () => {
    expect(1 + 1).toBe(2);
  });

  it('imports @workspace/database without throwing when DATABASE_URL is unset', () => {
    // Referencing the imported bindings proves the module loaded successfully.
    // We do NOT read any property off the proxies, so lazy initialization
    // (and the DATABASE_URL requirement) is never triggered.
    expect(typeof db).toBe('object');
    expect(typeof pool).toBe('object');
  });
});
