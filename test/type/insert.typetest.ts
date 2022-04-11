import {TypedSQL} from '../../src';
import {tables} from '../dbschema';
import {mockDb} from '../test-utils';

const typedDb = new TypedSQL(tables);

const userTable = typedDb.table('users');
// const commentsTable = typedDb.table('comment');
// const docTable = typedDb.table('doc');

describe('types for insert queries', () => {
  it('should generate an insert function', async () => {
    const insertUser = userTable.insert();
    //    ^? const insertUser: (db: Queryable, row: UsersInput) => Promise<Users>
    const user = await insertUser(mockDb, {
      name: 'John Doe',
      pronoun: 'he/him',
    });
    user;
    // ^? const user: Users
  });

  it('should generate an insert without a disallowed column', async () => {
    const insertNoId = userTable.insert({disallowColumns: ['id']});
    //    ^? const insertNoId: (db: Queryable, row: Omit<UsersInput, "id">) => Promise<Users>
    const user = await insertNoId(mockDb, {
      name: 'John Doe',
      pronoun: 'he/him',
    });
    user;
    // ^? const user: Users

    // @ts-expect-error id is not allowed
    insertNoId(mockDb, {name: 'blah', id: 'not allowed!'});

    // TODO: this should be an error; use optional never to make it happen.
    const indirectUser = {name: 'blah', id: 'not allowed'};
    insertNoId(mockDb, indirectUser);
  });
});

describe('insert multiple', () => {
  it('should generate a multi-insert function', async () => {
    const insertUsers = userTable.insertMultiple();
    //    ^? const insertUsers: (db: Queryable, rows: readonly UsersInput[]) => Promise<Users[]>
    const users = await insertUsers(mockDb, [
      {name: 'John Doe', pronoun: 'he/him/his'},
      {name: 'Jane Doe', pronoun: 'she/her/hers'},
    ]);
    users;
    // ^? const users: Users[]
  });

  it('should generate a multi-insert without a disallowed column', async () => {
    const insertNoId = userTable.insertMultiple({disallowColumns: ['id']});
    //    ^? const insertNoId: (db: Queryable, rows: readonly Omit<UsersInput, "id">[]) => Promise<Users[]>
    const users = await insertNoId(mockDb, [
      {name: 'John Doe', pronoun: 'he/him/his'},
      {name: 'Jane Doe', pronoun: 'she/her/hers'},
    ]);
    users;
    // ^? const users: Users[]

    // @ts-expect-error id is not allowed
    insertNoId(mockDb, [{name: 'blah', id: 'not allowed!'}]);

    // @ts-expect-error id is not allowed in any of the inputs
    insertNoId(mockDb, [{name: 'blah'}, {name: 'blah', id: 'not allowed!'}]);
  });
});
