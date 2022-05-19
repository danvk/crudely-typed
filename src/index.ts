export interface QueryResult {
  rowCount: number;
  rows: any[];
}

// The node-postgres Pool and Client conform to this interface.
export interface Queryable {
  query(...args: any[]): Promise<QueryResult>;
}

export class TypedSQL<SchemaT> {
  schema: SchemaT;
  constructor(schema: SchemaT) {
    this.schema = schema;
  }

  table<Table extends keyof SchemaT>(
    tableName: Table,
  ): TableBuilder<SchemaT, Table, LooseKey3<SchemaT, Table, '$type'>> {
    return new TableBuilder<SchemaT, Table, LooseKey3<SchemaT, Table, '$type'>>(
      this.schema,
      tableName,
    );
  }
}

export class TableBuilder<SchemaT, Table extends keyof SchemaT, TableT> {
  schema: SchemaT;
  tableName: keyof SchemaT;
  constructor(schema: SchemaT, tableName: keyof SchemaT) {
    this.schema = schema;
    this.tableName = tableName;
  }

  select<
    Cols extends null | keyof TableT = null,
    WhereCols extends keyof TableT | SQLAny<keyof TableT & string> = never,
    Joins extends Record<
      string,
      keyof LooseKey3<SchemaT, Table, 'foreignKeys'>
    > = never,
    IsSingular extends boolean = false,
  >(opts?: {
    columns?: Cols[];
    where?: WhereCols[];
    join?: Joins;
    orderBy?: OrderBy<keyof TableT>;
    limitOne?: IsSingular;
  }) {
    const where = (opts?.where ?? []) as (string | SQLAny<string>)[];
    const whereCols = where.filter(col => !isSQLAny(col));
    const whereAnyCols = where.filter(isSQLAny);

    // TODO: eliminate Select<> entirely.
    return new Select<
      LooseKey<SchemaT, Table>,
      LooseKey3<SchemaT, Table, '$type'>,
      Cols,
      Extract<WhereCols, string>,
      WhereCols extends SQLAny<infer C> ? C : never,
      Joins,
      IsSingular
    >(
      (this.schema as any)[this.tableName],
      this.tableName as any,
      (opts?.columns ?? null) as any,
      whereCols as any,
      whereAnyCols as any,
      (opts?.orderBy ?? null) as any,
      (opts?.join ?? null) as any,
      opts?.limitOne ?? false,
    ).build();
  }

  // TODO: disallow this method if primaryKey=null
  selectByPrimaryKey<
    Cols extends null | keyof TableT = null,
    Joins extends Record<
      string,
      keyof LooseKey3<SchemaT, Table, 'foreignKeys'>
    > = never,
  >(opts?: {columns?: Cols[]; join?: Joins}) {
    return this.select<
      Cols,
      LooseKey3<SchemaT, Table, 'primaryKey'> & keyof TableT,
      Joins,
      true
    >({
      ...opts,
      where: [(this.schema[this.tableName] as any).primaryKey],
      limitOne: true,
    });
  }

  insert<DisallowedColumns extends keyof TableT = never>(opts?: {
    disallowColumns?: DisallowedColumns[];
  }) {
    return new Insert<
      LooseKey<SchemaT, Table>,
      LooseKey3<SchemaT, Table, '$type'>,
      LooseKey3<SchemaT, Table, '$input'>,
      DisallowedColumns
    >(
      (this.schema as any)[this.tableName],
      this.tableName as any,
      (opts?.disallowColumns ?? null) as any,
    ).build();
  }

  insertMultiple<DisallowedColumns extends keyof TableT = never>(opts?: {
    disallowColumns?: DisallowedColumns[];
  }) {
    return new InsertMultiple<
      LooseKey<SchemaT, Table>,
      LooseKey3<SchemaT, Table, '$type'>,
      LooseKey3<SchemaT, Table, '$input'>,
      DisallowedColumns
    >(
      (this.schema as any)[this.tableName],
      this.tableName as any,
      (opts?.disallowColumns ?? null) as any,
    ).build();
  }

  // TODO: this should include a disallowColumns for dynamic set
  update<
    SetCols extends null | keyof TableT = null,
    WhereCols extends keyof TableT | SQLAny<keyof TableT & string> = never,
    IsSingular extends boolean = false,
  >(opts?: {set?: SetCols[]; where?: WhereCols[]; limitOne?: IsSingular}) {
    const where = (opts?.where ?? []) as (string | SQLAny<string>)[];
    const whereCols = where.filter(col => !isSQLAny(col));
    const whereAnyCols = where.filter(isSQLAny);
    return new Update<
      TableT,
      Extract<WhereCols, string>,
      WhereCols extends SQLAny<infer C> ? C : never,
      SetCols,
      IsSingular
    >(
      this.tableName as any,
      whereCols as any,
      whereAnyCols as any,
      (opts?.set ?? null) as any,
      (opts?.limitOne ?? false) as any,
    ).build();
  }

  updateByPrimaryKey<SetCols extends null | keyof TableT = null>(opts?: {
    set?: SetCols[];
  }) {
    return this.update<
      SetCols,
      LooseKey3<SchemaT, Table, 'primaryKey'> & keyof TableT,
      true
    >({
      ...opts,
      where: [(this.schema[this.tableName] as any).primaryKey],
      limitOne: true,
    });
  }

  delete<
    WhereCols extends keyof TableT | SQLAny<keyof TableT & string> = never,
    IsSingular extends boolean = false,
  >(opts: {where?: WhereCols[]; limitOne?: IsSingular}) {
    const where = (opts?.where ?? []) as (string | SQLAny<string>)[];
    const whereCols = where.filter(col => !isSQLAny(col));
    const whereAnyCols = where.filter(isSQLAny);
    return new Delete<
      TableT,
      Extract<WhereCols, string>,
      WhereCols extends SQLAny<infer C> ? C : never,
      IsSingular
    >(
      this.tableName as any,
      whereCols as any,
      whereAnyCols as any,
      (opts?.limitOne ?? false) as any,
    ).build();
  }

  deleteByPrimaryKey() {
    return this.delete<
      LooseKey3<SchemaT, Table, 'primaryKey'> & keyof TableT,
      true
    >({
      where: [(this.schema[this.tableName] as any).primaryKey] as any,
      limitOne: true,
    });
  }
}

type SQLAny<C extends string> = {
  __any: C;
};

export function any<C extends string>(column: C): SQLAny<C> {
  return {__any: column};
}

function isSQLAny(v: unknown): v is SQLAny<string> {
  return !!v && typeof v === 'object' && '__any' in v;
}

type Unionize<O> = {[K in keyof O]: {k: K; v: O[K]}}[keyof O];

type LooseKey<T, K> = T[K & keyof T];
type LooseKey3<T, K1, K2> = LooseKey<LooseKey<T, K1>, K2>;
type LooseKey4<T, K1, K2, K3> = LooseKey<LooseKey3<T, K1, K2>, K3>;

type LoosePick<T, K> = Resolve<Pick<T, K & keyof T>>;

// eslint-disable-next-line @typescript-eslint/ban-types
type Resolve<T> = T extends Function ? T : {[K in keyof T]: T[K]};

type Order<Cols> = readonly [column: Cols, order: 'ASC' | 'DESC'];
type OrderBy<Cols> = readonly Order<Cols>[];

// This simplifies some definitions, but makes the display less clear.
// Using Resolve<SetOrArray<T>> also resolves the Set<T> :(
// type SetOrArray<T> = readonly T[] | Set<T>;

type Join<TableSchemaT, Joins> = {
  [KV in Unionize<Joins> as KV['k'] & string]: LooseKey4<
    TableSchemaT,
    'foreignKeys',
    KV['v'],
    '$type'
  >;
};

type Result<T, IsSingular> = IsSingular extends true ? T | null : T[];

// In the case that the user is trying to match against a NULL value, we
// need to replace "col = $1" with "col IS NULL". We keep the "col = $1"
// clause, even though it can never match, to avoid having to renumber.
function updateQueryWithIsNull(
  query: string,
  whereValues: any[],
  whereNames: string[],
): string {
  let thisQuery = query;
  const whereIdx = query.indexOf('WHERE'); // only tweak WHERE clause, not SET clause for UPDATE.
  whereValues.forEach((value, i) => {
    if (value === null || (Array.isArray(value) && value.includes(null))) {
      const name = whereNames[i];
      let pat = `${name} = $`;
      let idx = thisQuery.indexOf(pat, whereIdx);
      if (idx === -1) {
        pat = `${name} = ANY($`;
        idx = thisQuery.indexOf(pat, whereIdx);
      }
      if (idx >= 0) {
        const pre = thisQuery.slice(0, idx);
        const post = thisQuery.slice(idx + pat.length);
        const m = /^(\d+)(.*)/.exec(post);
        if (!m) {
          throw new Error('Unable to match null in ' + query);
        }
        const [, dig, rest] = m;
        thisQuery = `${pre}(${name} IS NULL OR ${pat}${dig})${rest}`;
      }
    }
  });
  return thisQuery;
}

class Select<
  TableSchemaT,
  TableT,
  // TODO: remove all the defaults to force them to be set explicitly
  // TODO: maybe keyof TableT would be a more logical default for Cols
  Cols = null,
  WhereCols = never,
  WhereAnyCols = never,
  Joins = never,
  IsSingular = false,
> {
  constructor(
    private tableSchema: TableSchemaT,
    private table: TableT,
    private cols: Cols,
    private whereCols: WhereCols,
    private whereAnyCols: WhereAnyCols,
    private order: OrderBy<keyof TableT> | null,
    private joins: Joins,
    private isSingular: boolean,
  ) {}

  build(): (
    ...args: [WhereCols, WhereAnyCols] extends [never, never]
      ? [db: Queryable]
      : [
          db: Queryable,
          where: Resolve<
            LoosePick<TableT, WhereCols> & {
              [K in WhereAnyCols & string]:
                | readonly TableT[K & keyof TableT][]
                | Set<TableT[K & keyof TableT]>;
            }
          >,
        ]
  ) => [Cols, Joins] extends [null, never]
    ? Promise<Result<TableT, IsSingular>>
    : [Cols] extends [null]
    ? Promise<Result<TableT & Resolve<Join<TableSchemaT, Joins>>, IsSingular>>
    : Promise<
        Result<
          Resolve<LoosePick<TableT, Cols> & Join<TableSchemaT, Joins>>,
          IsSingular
        >
      > {
    let what: string[] = ['*'];
    if (this.cols) {
      what = this.cols as any;
    }
    let query = `SELECT ${what.join(', ')} FROM ${this.table}`;
    let joins: string[] = [];
    if (this.joins) {
      const joinNameCols = Object.entries(this.joins);
      query = `SELECT ${what.map(c => `t1.${c}`).join(', ')}, `;
      query += joinNameCols
        .map(([joinName], i) => `to_jsonb(t${i + 2}.*) as ${joinName}`)
        .join(', ');
      query += ` FROM ${this.table} as t1`;

      joins = joinNameCols.map(([_, col], i) => {
        const fkey = (this.tableSchema as any).foreignKeys[col];
        const n = i + 2;
        return ` JOIN ${fkey.table} AS t${n} ON t1.${col} = t${n}.${fkey.column}`;
      });
      query += joins.join('');
    }
    const whereNames: string[] = [];
    const whereKeys: string[] = [];
    const whereClauses: string[] = [];
    const tab = this.joins ? 't1.' : '';
    if (this.whereCols) {
      for (const col of this.whereCols as unknown as string[]) {
        whereKeys.push(col);
        const n = whereKeys.length;
        // XXX pg-promise requires a cast here for UUID columns (${tab}${col}::text)
        //     while node-postgres does not require it.
        const name = `${tab}${col}`;
        whereClauses.push(`${name} = $${n}`);
        whereNames.push(name);
      }
    }
    if (this.whereAnyCols) {
      for (const anyCol of this.whereAnyCols as unknown as SQLAny<string>[]) {
        const col = anyCol.__any;
        whereKeys.push(col);
        const n = whereKeys.length;
        const name = `${tab}${col}`;
        whereClauses.push(`${tab}${col} = ANY($${n})`);
        whereNames.push(name);
      }
    }
    if (whereClauses.length) {
      query += ` WHERE ${whereClauses.join(' AND ')}`;
    }
    if (this.order) {
      const orderClause = this.order.map(([col, dir]) => `${col} ${dir}`);
      query += ` ORDER BY ${orderClause}`;
    }
    return async (db: Queryable, whereObj?: any) => {
      const where = whereKeys.map(col =>
        whereObj[col] instanceof Set
          ? Array.from(whereObj[col])
          : whereObj[col],
      );
      const thisQuery = updateQueryWithIsNull(query, where, whereNames);

      const result = await db.query(thisQuery, where);
      if (this.isSingular) {
        if (result.rowCount === 0) {
          return null;
        } else if (result.rowCount === 1) {
          return result.rows[0];
        }
        // TODO: is it helpful or harmful to add a LIMIT 1 to the query?
        throw new Error('Got multiple results for singular query');
      }
      return result.rows;
    };
  }
}

// taken from ts-essentials
/** Gets keys of an object which are optional */
export type OptionalKeys<T> = T extends unknown
  ? {
      [K in keyof T]-?: undefined extends {[K2 in keyof T]: K2}[K] ? K : never;
    }[keyof T]
  : never;

class Insert<TableSchemaT, TableT, InsertT, DisallowedColumns = never> {
  constructor(
    private tableSchema: TableSchemaT,
    private table: string,
    private disallowedColumns: DisallowedColumns,
  ) {}

  build(): (
    db: Queryable,
    // XXX this is a great example of where distribution must be prevented
    row: [DisallowedColumns] extends [never]
      ? InsertT
      : Omit<InsertT, DisallowedColumns & keyof InsertT>,
  ) => Promise<TableT> {
    // TODO: define an interface for this
    const allColumns = (this.tableSchema as any).columns as string[];
    const disallowedColumns = this.disallowedColumns as unknown as
      | string[]
      | null;
    const allowedColumns = disallowedColumns
      ? allColumns.filter(col => !disallowedColumns.includes(col))
      : allColumns;

    return async (db: Queryable, obj: any) => {
      if (disallowedColumns) {
        const illegalCols = disallowedColumns.filter(
          col => obj[col] !== undefined,
        );
        if (illegalCols.length > 0) {
          throw new Error(`Cannot insert disallowed column(s) ${illegalCols}`);
        }
      }
      const keys = allowedColumns.filter(col => obj[col] !== undefined);
      const placeholders = keys.map((_col, i) => `$${i + 1}`);
      // TODO: quoting for table / column names everywhere
      const colsSql = keys.join(', ');
      const placeholderSql = placeholders.join(', ');
      const query = `INSERT INTO ${this.table}(${colsSql}) VALUES (${placeholderSql}) RETURNING *`;

      const vals = keys.map(col => obj[col]);
      const result = await db.query(query, vals);
      if (result.rowCount === 0) {
        return null; // should be an error?
      }
      return result.rows[0];
    };
  }
}

class InsertMultiple<TableSchemaT, TableT, InsertT, DisallowedColumns = never> {
  constructor(
    private tableSchema: TableSchemaT,
    private table: string,
    private disallowedColumns: DisallowedColumns,
  ) {}

  build(): (
    db: Queryable,
    rows: [DisallowedColumns] extends [never]
      ? readonly InsertT[]
      : readonly Omit<InsertT, DisallowedColumns & keyof InsertT>[],
  ) => Promise<TableT[]> {
    const allColumns = (this.tableSchema as any).columns as string[];
    const disallowedColumns = this.disallowedColumns as unknown as
      | string[]
      | null;
    const allowedColumns = disallowedColumns
      ? allColumns.filter(col => !disallowedColumns.includes(col))
      : allColumns;

    return async (db: Queryable, rows: readonly any[]) => {
      if (disallowedColumns) {
        const illegalCols = disallowedColumns.filter(col =>
          rows.some(row => row[col] !== undefined),
        );
        if (illegalCols.length > 0) {
          throw new Error(`Cannot insert disallowed column(s) ${illegalCols}`);
        }
      }
      if (rows.length === 0) {
        return []; // TODO(danvk): consider throwing in this case
      }
      const keys = allowedColumns.filter(col => rows[0][col] !== undefined);
      const colsSql = keys.join(', ');
      let placeholder = 1;
      const insertSqls = [];
      let vals: any[] = [];
      for (const row of rows) {
        insertSqls.push(
          '(' + keys.map((_col, i) => `$${placeholder + i}`).join(',') + ')',
        );
        placeholder += keys.length;
        vals = vals.concat(keys.map(k => row[k]));
      }
      // TODO: quoting for table / column names everywhere
      const placeholderSql = insertSqls.join(', ');
      // TODO: some ability to control 'returning' would be especially useful here.
      const query = `INSERT INTO ${this.table}(${colsSql}) VALUES ${placeholderSql} RETURNING *`;

      const result = await db.query(query, vals);
      return result.rows;
    };
  }
}

class Update<
  TableT,
  WhereCols = null,
  WhereAnyCols = never,
  SetCols = null,
  LimitOne = false,
> {
  constructor(
    private table: TableT,
    private whereCols: WhereCols,
    private whereAnyCols: WhereAnyCols,
    private setCols: SetCols,
    private isSingular: LimitOne,
  ) {}

  build(): (
    db: Queryable,
    where: Resolve<
      LoosePick<TableT, WhereCols> & {
        [K in WhereAnyCols & string]:
          | Set<TableT[K & keyof TableT]>
          | readonly TableT[K & keyof TableT][];
      }
    >,
    update: [SetCols] extends [null]
      ? Partial<TableT>
      : LoosePick<TableT, SetCols>,
  ) => Promise<LimitOne extends false ? TableT[] : TableT | null> {
    let placeholder = 1;
    const setKeys: string[] = [];
    const setClauses: string[] = [];
    const setCols = this.setCols as unknown as string[] | null;
    if (setCols) {
      for (const col of setCols) {
        setKeys.push(col);
        const n = placeholder++;
        setClauses.push(`${col} = $${n}`);
      }
    }

    const whereKeys: string[] = [];
    const whereClauses: string[] = [];
    const whereNames: string[] = [];
    if (this.whereCols) {
      for (const col of this.whereCols as unknown as string[]) {
        whereKeys.push(col);
        const n = placeholder++;
        whereClauses.push(`${col} = $${n}`);
        whereNames.push(col);
      }
    }
    if (this.whereAnyCols) {
      for (const anyCol of this.whereAnyCols as unknown as SQLAny<string>[]) {
        const col = anyCol.__any;
        whereKeys.push(col);
        const n = placeholder++;
        whereClauses.push(`${col} = ANY($${n})`);
        whereNames.push(col);
      }
    }
    const whereClause = whereClauses.length
      ? ` WHERE ${whereClauses.join(' AND ')}`
      : '';

    const limitClause = ''; // this.isSingular ? ' LIMIT 1' : '';

    if (setCols) {
      // In this case the query can be determined in advance
      const setSql = setClauses.join(', ');
      const query = `UPDATE ${this.table} SET ${setSql}${whereClause}${limitClause} RETURNING *`;

      return async (db, whereObj: any, updateObj: any) => {
        const whereVals = whereKeys.map(col =>
          whereObj[col] instanceof Set
            ? Array.from(whereObj[col])
            : whereObj[col],
        );
        const vals = setCols.map(col => updateObj[col]).concat(whereVals);
        const thisQuery = updateQueryWithIsNull(query, whereVals, whereNames);
        const result = await db.query(thisQuery, vals);
        if (this.isSingular) {
          return result.rowCount === 0 ? null : result.rows[0];
        }
        return result.rows;
      };
    }

    // In this case the query is dynamic.
    // TODO: reduce duplication here, the code paths are pretty similar.
    // TODO: major shadowing bugs here
    return async (db, whereObj: any, updateObj: any) => {
      // TODO: maybe better to get this from the schema?
      const dynamicSetCols = Object.keys(updateObj);
      const whereVals = whereKeys.map(col =>
        whereObj[col] instanceof Set
          ? Array.from(whereObj[col])
          : whereObj[col],
      );
      const vals = whereVals.concat(dynamicSetCols.map(col => updateObj[col]));

      let dynamicPlaceholder = placeholder;
      const dynamicSetKeys: string[] = [];
      const dynamicSetClauses: string[] = [];
      for (const col of dynamicSetCols) {
        dynamicSetKeys.push(col);
        const n = dynamicPlaceholder++;
        dynamicSetClauses.push(`${col} = $${n}`);
      }
      const setSql = dynamicSetClauses.join(', ');
      let query = `UPDATE ${this.table} SET ${setSql}${whereClause}${limitClause} RETURNING *`;
      query = updateQueryWithIsNull(query, whereVals, whereNames);
      console.log(query);
      const result = await db.query(query, vals);
      if (this.isSingular) {
        return result.rowCount === 0 ? null : result.rows[0];
      }
      return result.rows;
    };
  }
}

class Delete<TableT, WhereCols = null, WhereAnyCols = never, LimitOne = false> {
  constructor(
    private table: TableT,
    private whereCols: WhereCols,
    private whereAnyCols: WhereAnyCols,
    private isSingular: LimitOne,
  ) {}

  build(): (
    db: Queryable,
    where: Resolve<
      LoosePick<TableT, WhereCols> & {
        [K in WhereAnyCols & string]:
          | Set<TableT[K & keyof TableT]>
          | readonly TableT[K & keyof TableT][];
      }
    >,
  ) => Promise<LimitOne extends false ? TableT[] : TableT | null> {
    let placeholder = 1;

    const whereKeys: string[] = [];
    const whereClauses: string[] = [];
    const whereNames: string[] = [];
    if (this.whereCols) {
      for (const col of this.whereCols as unknown as string[]) {
        whereKeys.push(col);
        const n = placeholder++;
        whereClauses.push(`${col} = $${n}`);
        whereNames.push(col);
      }
    }
    if (this.whereAnyCols) {
      for (const anyCol of this.whereAnyCols as unknown as SQLAny<string>[]) {
        const col = anyCol.__any;
        whereKeys.push(col);
        const n = placeholder++;
        whereClauses.push(`${col} = ANY($${n})`);
        whereNames.push(col);
      }
    }
    const whereClause = whereClauses.length
      ? ` WHERE ${whereClauses.join(' AND ')}`
      : '';

    const limitClause = ''; // this.isSingular ? ' LIMIT 1' : '';

    const query = `DELETE FROM ${this.table}${whereClause}${limitClause} RETURNING *`;

    return async (db, whereObj: any) => {
      const vals = whereKeys.map(col =>
        whereObj[col] instanceof Set
          ? Array.from(whereObj[col])
          : whereObj[col],
      );
      const thisQuery = updateQueryWithIsNull(query, vals, whereNames);
      const result = await db.query(thisQuery, vals);
      if (this.isSingular) {
        return result.rowCount === 0 ? null : result.rows[0];
      }
      return result.rows;
    };
  }
}
