import {Pool} from 'pg';

import {Queryable} from '../db-utils';

export function getDbForTests() {
  if (!process.env.POSTGRES_URL) {
    throw new Error('Must set POSTGRES_URL to run unit tests');
  }
  const pool = new Pool({
    connectionString: process.env.POSTGRES_URL,
  });

  const db: Queryable & {q: string; args: string[]} = {
    q: '',
    args: [],
    query(q, args) {
      this.q = q;
      this.args = args;
      return pool.query(q, args);
    },
  };

  afterAll(async () => {
    await pool.end();
  });

  // Run all tests in a transaction and roll it back to avoid mutating the DB.
  // This will avoid mutations even if the test fails.
  beforeEach(async () => db.query('BEGIN'));
  afterEach(async () => db.query('ROLLBACK'));

  return db;
}

export const mockDb: Queryable & {q: string; args: string[]} = {
  q: '',
  args: [],
  async query(q, args) {
    this.q = q;
    this.args = args;
    return {rowCount: 1, rows: [{}]};
  },
};
