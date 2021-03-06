import {any, TypedSQL} from '../../src';
import {tables} from '../dbschema';
import {mockDb} from '../test-utils';

const typedDb = new TypedSQL(tables);

const userTable = typedDb.table('users');
// const commentsTable = typedDb.table('comment');
const docTable = typedDb.table('doc');

describe('delete unit', () => {
  it('should delete all entries', async () => {
    // TODO: should probably require "where: []" here to be even more explicit
    const deleteAll = userTable.delete({});
    await deleteAll(mockDb, {});
    expect(mockDb.q).toMatchInlineSnapshot(`"DELETE FROM users RETURNING *"`);
    expect(mockDb.args).toMatchInlineSnapshot(`Array []`);
  });

  it('should delete entries matching an ID', async () => {
    const deleteOne = userTable.deleteByPrimaryKey();
    await deleteOne(mockDb, {id: 'blah'});
    expect(mockDb.q).toMatchInlineSnapshot(
      `"DELETE FROM users WHERE id = $1 RETURNING *"`,
    );
    expect(mockDb.args).toMatchInlineSnapshot(`
      Array [
        "blah",
      ]
    `);
  });

  it('should delete entries matching a set of IDs', async () => {
    const deleteOne = userTable.delete({where: [any('id')]});
    await deleteOne(mockDb, {id: ['id1', 'id2']});
    expect(mockDb.q).toMatchInlineSnapshot(
      `"DELETE FROM users WHERE id = ANY($1) RETURNING *"`,
    );
    expect(mockDb.args).toMatchInlineSnapshot(`
      Array [
        Array [
          "id1",
          "id2",
        ],
      ]
    `);
  });

  it('should delete entries with null values', async () => {
    const deleteByTitle = docTable.delete({where: ['title']});
    await deleteByTitle(mockDb, {title: null});
    expect(mockDb.q).toMatchInlineSnapshot(
      `"DELETE FROM doc WHERE (title IS NULL OR title = $1) RETURNING *"`,
    );
    expect(mockDb.args).toMatchInlineSnapshot(`
      Array [
        null,
      ]
    `);

    await deleteByTitle(mockDb, {title: 'not-null'});
    expect(mockDb.q).toMatchInlineSnapshot(
      `"DELETE FROM doc WHERE title = $1 RETURNING *"`,
    );
    expect(mockDb.args).toMatchInlineSnapshot(`
      Array [
        "not-null",
      ]
    `);
  });
});
