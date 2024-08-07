import {any, TypedSQL} from '../../src';
import {tables} from '../dbschema';
import {mockDb} from '../test-utils';

const typedDb = new TypedSQL(tables);

const userTable = typedDb.table('users');
// const commentsTable = typedDb.table('comment');
const docTable = typedDb.table('doc');

describe('update', () => {
  it('should generate update by primary key', async () => {
    const updateByKey = userTable.updateByPrimaryKey();
    await updateByKey(
      mockDb,
      {id: 'john'},
      {name: 'John Doe', pronoun: 'he/him'},
    );
    expect(mockDb.q).toMatchInlineSnapshot(
      `"UPDATE users SET name = $2, pronoun = $3 WHERE id = $1 RETURNING *"`,
    );
    expect(mockDb.args).toMatchInlineSnapshot(`
      Array [
        "john",
        "John Doe",
        "he/him",
      ]
    `);
  });

  it('should update with a where clause', async () => {
    const update = docTable.update({where: ['title']});
    await update(
      mockDb,
      {title: 'Great Expectations'},
      {created_by: 'Charles Dickens'},
    );

    expect(mockDb.q).toMatchInlineSnapshot(
      `"UPDATE doc SET created_by = $2 WHERE title = $1 RETURNING *"`,
    );
    expect(mockDb.args).toMatchInlineSnapshot(`
      Array [
        "Great Expectations",
        "Charles Dickens",
      ]
    `);
  });

  it('should update with a where any clause', async () => {
    const update = docTable.update({where: [any('title')]});
    await update(
      mockDb,
      {title: ['Great Expectations']},
      {created_by: 'Charles Dickens'},
    );

    expect(mockDb.q).toMatchInlineSnapshot(
      `"UPDATE doc SET created_by = $2 WHERE title = ANY($1) RETURNING *"`,
    );
    expect(mockDb.args).toMatchInlineSnapshot(`
      Array [
        Array [
          "Great Expectations",
        ],
        "Charles Dickens",
      ]
    `);
    const arrayQ = mockDb.q;
    const arrayArgs = mockDb.args;

    // Passing a Set should be the same as an Array.
    await update(
      mockDb,
      {title: new Set(['Great Expectations'])},
      {created_by: 'Charles Dickens'},
    );
    expect(mockDb.q).toEqual(arrayQ);
    expect(mockDb.args).toEqual(arrayArgs);
  });

  it('should update with a where null clause', async () => {
    const update = docTable.update({where: ['title']});
    await update(mockDb, {title: null}, {created_by: 'Unknown'});

    expect(mockDb.q).toMatchInlineSnapshot(
      `"UPDATE doc SET created_by = $2 WHERE (title IS NULL OR title = $1) RETURNING *"`,
    );
    expect(mockDb.args).toMatchInlineSnapshot(`
      Array [
        null,
        "Unknown",
      ]
    `);
  });

  it('should update a null column', async () => {
    const update = docTable.update({where: ['title']});
    await update(mockDb, {title: null}, {title: 'Unknown'});

    expect(mockDb.q).toMatchInlineSnapshot(
      `"UPDATE doc SET title = $2 WHERE (title IS NULL OR title = $1) RETURNING *"`,
    );
    expect(mockDb.args).toMatchInlineSnapshot(`
      Array [
        null,
        "Unknown",
      ]
    `);
  });

  it('should update two null columns', async () => {
    const update = docTable.update({where: ['title', 'contents']});
    await update(mockDb, {title: null, contents: null}, {title: 'Unknown'});

    expect(mockDb.q).toMatchInlineSnapshot(
      `"UPDATE doc SET title = $3 WHERE (title IS NULL OR title = $1) AND (contents IS NULL OR contents = $2) RETURNING *"`,
    );
    expect(mockDb.args).toMatchInlineSnapshot(`
      Array [
        null,
        null,
        "Unknown",
      ]
    `);
  });

  it('should update with fixed columns', async () => {
    const update = docTable.update({set: ['contents'], where: ['title']});
    await update(
      mockDb,
      {title: 'Great Expectations'},
      {contents: 'Twas the best of times, err, I mean…'},
    );

    expect(mockDb.q).toMatchInlineSnapshot(
      `"UPDATE doc SET contents = $1 WHERE title = $2 RETURNING *"`,
    );
    expect(mockDb.args).toMatchInlineSnapshot(`
      Array [
        "Twas the best of times, err, I mean…",
        "Great Expectations",
      ]
    `);
  });

  it('should update with fixed columns and a where null clause', async () => {
    const update = docTable.update({set: ['created_by'], where: ['title']});
    await update(mockDb, {title: null}, {created_by: 'Unknown'});

    expect(mockDb.q).toMatchInlineSnapshot(
      `"UPDATE doc SET created_by = $1 WHERE (title IS NULL OR title = $2) RETURNING *"`,
    );
    expect(mockDb.args).toMatchInlineSnapshot(`
      Array [
        "Unknown",
        null,
      ]
    `);
  });

  it('should update with fixed columns and limitOne', async () => {
    const update = docTable.update({
      set: ['contents'],
      where: ['title'],
      limitOne: true,
    });
    await update(
      mockDb,
      {title: 'Great Expectations'},
      {contents: 'Twas the best of times, err, I mean…'},
    );

    expect(mockDb.q).toMatchInlineSnapshot(
      `"UPDATE doc SET contents = $1 WHERE title = $2 RETURNING *"`,
    );
    expect(mockDb.args).toMatchInlineSnapshot(`
      Array [
        "Twas the best of times, err, I mean…",
        "Great Expectations",
      ]
    `);
  });

  it('should update without a where clause (update all)', async () => {
    const update = docTable.update({set: ['created_by']});
    await update(mockDb, {}, {created_by: 'A Person'});

    expect(mockDb.q).toMatchInlineSnapshot(
      `"UPDATE doc SET created_by = $1 RETURNING *"`,
    );
    expect(mockDb.args).toMatchInlineSnapshot(`
      Array [
        "A Person",
      ]
    `);
  });

  it('should update with an any clause', async () => {
    const update = docTable.update({
      set: ['created_by'],
      where: [any('title')],
    });
    await update(
      mockDb,
      {title: ['Great Expectations', 'Bleak House']},
      {created_by: 'Charles Dickens'},
    );

    expect(mockDb.q).toMatchInlineSnapshot(
      `"UPDATE doc SET created_by = $1 WHERE title = ANY($2) RETURNING *"`,
    );
    expect(mockDb.args).toMatchInlineSnapshot(`
      Array [
        "Charles Dickens",
        Array [
          "Great Expectations",
          "Bleak House",
        ],
      ]
    `);
  });

  it('should update with an any clause and a Set parameter', async () => {
    const update = docTable.update({
      set: ['created_by'],
      where: [any('title')],
    });
    await update(
      mockDb,
      {title: new Set(['Great Expectations', 'Bleak House'])},
      {created_by: 'Charles Dickens'},
    );

    expect(mockDb.q).toMatchInlineSnapshot(
      `"UPDATE doc SET created_by = $1 WHERE title = ANY($2) RETURNING *"`,
    );
    expect(mockDb.args).toMatchInlineSnapshot(`
      Array [
        "Charles Dickens",
        Array [
          "Great Expectations",
          "Bleak House",
        ],
      ]
    `);
  });

  it('should be idempotent with dynamic updates', async () => {
    const update = docTable.update({where: ['title']});
    await update(
      mockDb,
      {title: 'Great Expectations'},
      {created_by: 'Charles Dickens'},
    );
    const initQ = mockDb.q;
    const initArgs = mockDb.args;

    await update(
      mockDb,
      {title: 'Great Expectations'},
      {created_by: 'Charles Dickens'},
    );
    expect(mockDb.q).toEqual(initQ);
    expect(mockDb.args).toEqual(initArgs);
  });
});
