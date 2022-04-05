# Crudely Typed

[![codecov](https://codecov.io/gh/danvk/crudely-typed/branch/main/graph/badge.svg?token=2C0SU9X0EM)](https://codecov.io/gh/danvk/crudely-typed)

Simple "everyday CRUD" Postgres queries with perfect TypeScript types.
Zero dependencies.

Designed to work with [pg-to-ts][].

- [ ] Write docs
- [ ] Split select unit/type tests
- [ ] Check types in type tests
- [ ] Write type tests for:
  - [ ] Update
  - [ ] Delete
  - [ ] Insert
- [ ] Add unit tests to check that all queries are idempotent

For issues:

- [ ] Limit joins to join-able columns
- [ ] Support both node-postgres _and_ pg-promise
- [ ] Add upsert
- [ ] Prevent omitting non-optional columns in insert / insertMultiple

From cityci testing:

- [ ] Should insertMultiple with zero rows throw?

[pg-to-ts]: https://github.com/danvk/pg-to-ts
