import {any, TypedSQL} from '../../src';
import {tables} from '../dbschema';
import {getDbForTests} from '../test-utils';

const typedDb = new TypedSQL(tables);

// const userTable = typedDb.table('users');
const commentsTable = typedDb.table('comment');
// const docTable = typedDb.table('doc');

const COMMENT1_ID = '01234567-1f62-4f80-ad29-3ad48a03a36e';
const COMMENT2_ID = '12345678-1f62-4f80-ad29-3ad48a03a36e';

describe('delete e2e', () => {
  const db = getDbForTests();

  const getAllComments = commentsTable.select();

  it('should delete all entries', async () => {
    const deleteAll = commentsTable.delete({});

    expect(await getAllComments(db)).toHaveLength(2);
    expect(await deleteAll(db, {})).toHaveLength(2);
    expect(await getAllComments(db)).toHaveLength(0);
  });

  it('should delete entries matching an ID', async () => {
    expect(await getAllComments(db)).toHaveLength(2);
    const deleteOne = commentsTable.deleteByPrimaryKey();
    expect(await deleteOne(db, {id: COMMENT1_ID})).toMatchObject({
      id: COMMENT1_ID,
      metadata: {sentiment: 'snarky'},
      content_md: 'Why are we only writing this doc in March?',
    });
    const finalComments = await getAllComments(db);
    expect(finalComments).toHaveLength(1);
    expect(finalComments).toMatchObject([{id: COMMENT2_ID}]);
  });

  describe('delete multiple', () => {
    const deleteMultiple = commentsTable.delete({where: [any('id')]});

    it('should delete entries matching an array of IDs', async () => {
      expect(await getAllComments(db)).toHaveLength(2);
      expect(
        await deleteMultiple(db, {id: [COMMENT1_ID, COMMENT2_ID]}),
      ).toHaveLength(2);
      expect(await getAllComments(db)).toHaveLength(0);
    });

    it('should delete entries matching an array of IDs', async () => {
      expect(await getAllComments(db)).toHaveLength(2);
      await deleteMultiple(db, {id: new Set([COMMENT1_ID, COMMENT2_ID])});
      expect(await getAllComments(db)).toHaveLength(0);
    });
  });
});
