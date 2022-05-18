import {any, TypedSQL} from '../../src';
import {tables} from '../dbschema';
import {getDbForTests} from '../test-utils';

const typedDb = new TypedSQL(tables);

const userTable = typedDb.table('users');
// const commentsTable = typedDb.table('comment');
const docTable = typedDb.table('doc');

const getUserById = userTable.selectByPrimaryKey({
  columns: ['name', 'pronoun'],
});

const getDocByTitle = docTable.select({
  columns: ['title', 'contents'],
  where: ['title'],
});

const JOHN_DEERE_ID = 'dee5e220-1f62-4f80-ad29-3ad48a03a36e';

describe('update e2e', () => {
  const db = getDbForTests();

  it('should update by primary key', async () => {
    expect(await getUserById(db, {id: JOHN_DEERE_ID})).toMatchInlineSnapshot(`
      Object {
        "name": "John Deere",
        "pronoun": "he/him",
      }
    `);
    const updateByKey = userTable.updateByPrimaryKey();
    expect(
      await updateByKey(
        db,
        {id: JOHN_DEERE_ID},
        {name: 'John Doe', pronoun: 'he/him/his'},
      ),
    ).toEqual({
      id: JOHN_DEERE_ID,
      name: 'John Doe',
      pronoun: 'he/him/his',
    });
    expect(await getUserById(db, {id: JOHN_DEERE_ID})).toMatchInlineSnapshot(`
      Object {
        "name": "John Doe",
        "pronoun": "he/him/his",
      }
    `);
  });

  it('should update with a where clause', async () => {
    expect(await getDocByTitle(db, {title: 'Vision 2023'}))
      .toMatchInlineSnapshot(`
      Array [
        Object {
          "contents": "Future so bright",
          "title": "Vision 2023",
        },
      ]
    `);
    const update = docTable.update({
      where: ['title'],
    });
    expect(
      await update(db, {title: 'Vision 2023'}, {contents: 'Looking gloomy'}),
    ).toMatchInlineSnapshot(`
      Array [
        Object {
          "contents": "Looking gloomy",
          "created_by": "d0e23a20-1f62-4f80-ad29-3ad48a03a47f",
          "id": "01234b31-1f62-4f80-ad29-3ad48a03a36e",
          "title": "Vision 2023",
        },
      ]
    `);
    expect(await getDocByTitle(db, {title: 'Vision 2023'}))
      .toMatchInlineSnapshot(`
      Array [
        Object {
          "contents": "Looking gloomy",
          "title": "Vision 2023",
        },
      ]
    `);
  });

  it('should update with a where any clause', async () => {
    const update = docTable.update({
      where: [any('title')],
    });
    expect(
      await update(
        db,
        {title: ['Vision 2023', 'Annual Plan for 2022']},
        {contents: 'Looking gloomy'},
      ),
    ).toMatchInlineSnapshot(`
      Array [
        Object {
          "contents": "Looking gloomy",
          "created_by": "dee5e220-1f62-4f80-ad29-3ad48a03a36e",
          "id": "cde34b31-1f62-4f80-ad29-3ad48a03a36e",
          "title": "Annual Plan for 2022",
        },
        Object {
          "contents": "Looking gloomy",
          "created_by": "d0e23a20-1f62-4f80-ad29-3ad48a03a47f",
          "id": "01234b31-1f62-4f80-ad29-3ad48a03a36e",
          "title": "Vision 2023",
        },
      ]
    `);
    expect(await docTable.select()(db)).toMatchObject([
      {
        title: 'Blank Slate',
        contents: null,
      },
      {
        title: 'Annual Plan for 2022',
        contents: 'Looking gloomy',
      },
      {
        title: 'Vision 2023',
        contents: 'Looking gloomy',
      },
    ]);
  });

  it('should update with fixed columns', async () => {
    const update = docTable.update({set: ['contents'], where: ['title']});
    expect(
      await update(
        db,
        {title: 'Annual Plan for 2022'},
        {contents: 'Twas the best of times, err, I mean…'},
      ),
    ).toMatchInlineSnapshot(`
      Array [
        Object {
          "contents": "Twas the best of times, err, I mean…",
          "created_by": "dee5e220-1f62-4f80-ad29-3ad48a03a36e",
          "id": "cde34b31-1f62-4f80-ad29-3ad48a03a36e",
          "title": "Annual Plan for 2022",
        },
      ]
    `);
    expect(await getDocByTitle(db, {title: 'Annual Plan for 2022'}))
      .toMatchInlineSnapshot(`
      Array [
        Object {
          "contents": "Twas the best of times, err, I mean…",
          "title": "Annual Plan for 2022",
        },
      ]
    `);
  });

  it('should update with fixed columns and limitOne', async () => {
    const update = docTable.update({
      set: ['contents'],
      where: ['title'],
      limitOne: true,
    });
    expect(
      await update(
        db,
        {title: 'Annual Plan for 2022'},
        {contents: 'Twas the best of times, err, I mean…'},
      ),
    ).toMatchInlineSnapshot(`
      Object {
        "contents": "Twas the best of times, err, I mean…",
        "created_by": "dee5e220-1f62-4f80-ad29-3ad48a03a36e",
        "id": "cde34b31-1f62-4f80-ad29-3ad48a03a36e",
        "title": "Annual Plan for 2022",
      }
    `);
    expect(await getDocByTitle(db, {title: 'Annual Plan for 2022'}))
      .toMatchInlineSnapshot(`
      Array [
        Object {
          "contents": "Twas the best of times, err, I mean…",
          "title": "Annual Plan for 2022",
        },
      ]
    `);
  });

  it('should update without a where clause (update all)', async () => {
    const getAllDocs = docTable.select();
    const update = docTable.update({set: ['contents']});
    expect(await update(db, {}, {contents: 'This and that'})).toMatchObject([
      {title: 'Annual Plan for 2022', contents: 'This and that'},
      {title: 'Vision 2023', contents: 'This and that'},
      {title: 'Blank Slate', contents: 'This and that'},
    ]);
    expect(await getAllDocs(db)).toMatchObject([
      {title: 'Annual Plan for 2022', contents: 'This and that'},
      {title: 'Vision 2023', contents: 'This and that'},
      {title: 'Blank Slate', contents: 'This and that'},
    ]);
  });

  it('should update with an any clause', async () => {
    const getAllDocs = docTable.select();
    const update = docTable.update({
      set: ['contents'],
      where: [any('title')],
    });
    expect(
      await update(
        db,
        {title: ['Vision 2023', 'Annual Plan for 2022']},
        {contents: 'To Be Written'},
      ),
    ).toMatchObject([
      {title: 'Annual Plan for 2022', contents: 'To Be Written'},
      {title: 'Vision 2023', contents: 'To Be Written'},
    ]);

    expect(await getAllDocs(db)).toMatchObject([
      {title: 'Blank Slate', contents: null},
      {title: 'Annual Plan for 2022', contents: 'To Be Written'},
      {title: 'Vision 2023', contents: 'To Be Written'},
    ]);
  });

  it('should update with an any clause and a Set parameter', async () => {
    const getAllDocs = docTable.select();
    const update = docTable.update({
      set: ['contents'],
      where: [any('title')],
    });
    expect(
      await update(
        db,
        {title: new Set(['Vision 2023', 'Annual Plan for 2022'])},
        {contents: 'To Be Written'},
      ),
    ).toMatchObject([
      {title: 'Annual Plan for 2022', contents: 'To Be Written'},
      {title: 'Vision 2023', contents: 'To Be Written'},
    ]);

    expect(await getAllDocs(db)).toMatchObject([
      {title: 'Blank Slate', contents: null},
      {title: 'Annual Plan for 2022', contents: 'To Be Written'},
      {title: 'Vision 2023', contents: 'To Be Written'},
    ]);
  });
});
