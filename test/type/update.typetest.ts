import {any, TypedSQL} from '../../src';
import {tables} from '../dbschema';
import {mockDb} from '../test-utils';

const typedDb = new TypedSQL(tables);

const userTable = typedDb.table('users');
const docTable = typedDb.table('doc');

describe('update', () => {
  it('should generate update by primary key', async () => {
    const updateByKey = userTable.updateByPrimaryKey();
    //    ^? const updateByKey: (db: Queryable, where: {
    //           id: string;
    //       }, update: Partial<Users>) => Promise<Users | null>
    const updatedUser = await updateByKey(
      mockDb,
      {id: 'john'},
      {name: 'John Doe', pronoun: 'he/him'},
    );
    updatedUser;
    // ^? const updatedUser: Users | null
  });

  it('should update with a where clause', async () => {
    const update = docTable.update({where: ['title']});
    //    ^? const update: (db: Queryable, where: {
    //           title: string | null;
    //       }, update: Partial<Doc>) => Promise<Doc[]>
    const newDoc = await update(
      mockDb,
      {title: 'Great Expectations'},
      {created_by: 'Charles Dickens'},
    );
    newDoc;
    // ^? const newDoc: Doc[]
  });

  it('should update with a where any clause', async () => {
    const update = docTable.update({where: [any('title')]});
    //    ^? const update: (db: Queryable, where: {
    //           title: Set<string | null> | readonly (string | null)[];
    //       }, update: Partial<Doc>) => Promise<Doc[]>
    const newDocs = await update(
      mockDb,
      {title: ['Great Expectations']},
      {created_by: 'Charles Dickens'},
    );
    newDocs;
    // ^? const newDocs: Doc[]
  });

  it('should update with fixed columns', async () => {
    const update = docTable.update({set: ['contents'], where: ['title']});
    //    ^? const update: (db: Queryable, where: {
    //           title: string | null;
    //       }, update: {
    //           contents: string | null;
    //       }) => Promise<Doc[]>
    const newDocs = await update(
      mockDb,
      {title: 'Great Expectations'},
      {contents: 'Twas the best of times, err, I mean…'},
    );
    newDocs;
    // ^? const newDocs: Doc[]
  });

  it('should update with fixed columns and limitOne', async () => {
    const update = docTable.update({
      set: ['contents'],
      where: ['title'],
      limitOne: true,
    });
    update;
    // ^? const update: (db: Queryable, where: {
    //        title: string | null;
    //    }, update: {
    //        contents: string | null;
    //    }) => Promise<Doc | null>
  });

  it('should update without a where clause (update all)', async () => {
    const update = docTable.update({set: ['created_by']});
    update;
    // ^? const update: (db: Queryable, where: {}, update: {
    //        created_by: string;
    //    }) => Promise<Doc[]>
  });

  it('should update with an any clause', async () => {
    const update = docTable.update({
      set: ['created_by'],
      where: [any('title')],
    });
    update;
    // ^? const update: (db: Queryable, where: {
    //        title: Set<string | null> | readonly (string | null)[];
    //    }, update: {
    //        created_by: string;
    //    }) => Promise<Doc[]>
  });

  it('should update with a mix of any clauses and limitOne', async () => {
    const update = docTable.update({
      set: ['created_by'],
      where: [any('id'), 'title'],
      limitOne: true,
    });
    update;
    // ^? const update: (db: Queryable, where: {
    //        title: string | null;
    //        id: Set<string> | readonly string[];
    //    }, update: {
    //        created_by: string;
    //    }) => Promise<Doc | null>
  });
});
