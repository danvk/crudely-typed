import {any, TypedSQL} from '../../src';
import {tables} from '../dbschema';
import {mockDb} from '../test-utils';

const typedDb = new TypedSQL(tables);

const userTable = typedDb.table('users');

describe('types for delete queries', () => {
  it('should delete all entries', async () => {
    const deleteAll = userTable.delete({});
    deleteAll;
    // ^? const deleteAll: (db: Queryable, where: {}) => Promise<Users[]>
  });

  it('should delete entries matching an ID', async () => {
    const deleteOne = userTable.deleteByPrimaryKey();
    //    ^? const deleteOne: (db: Queryable, where: {
    //           id: string;
    //       }) => Promise<Users | null>
    const user = await deleteOne(mockDb, {id: 'blah'});
    user;
    // ^? const user: Users | null
  });

  it('should delete entries matching a set of IDs', async () => {
    const deleteMany = userTable.delete({where: [any('id')]});
    //    ^? const deleteMany: (db: Queryable, where: {
    //           id: Set<string> | readonly string[];
    //       }) => Promise<Users[]>
    const users = await deleteMany(mockDb, {id: ['id1', 'id2']});
    users;
    // ^?  const users: Users[]

    const users2 = await deleteMany(mockDb, {id: new Set(['id1', 'id2'])});
    users2;
    // ^? const users2: Users[]

    // @ts-expect-error strings are not allowed
    deleteMany(mockDb, {id: 'id'});
  });
});
