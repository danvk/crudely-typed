# Crudely Typed

Simple "everyday CRUD" Postgres queries with perfect TypeScript types.

TODO:

- [ ] Publish to npm
- [ ] Write docs
- [ ] Set up CI
- [ ] Split select unit/type tests
- [ ] Check types in type tests
- [ ] Write type tests for:
  - [ ] Update
  - [ ] Delete
  - [ ] Insert
- [ ] Add unit tests to check that all queries are idempotent
- [x] Settle on name (crudely-typed it is!)
- [x] Test in cityci (requires publishing new pg-to-ts with `$type`)

For issues:

- [ ] Limit joins to join-able columns
- [ ] Support both node-postgres _and_ pg-promise
- [ ] Add upsert
- [ ] Prevent omitting non-optional columns in insert / insertMultiple

From cityci testing:

- [ ] Should insertMultiple with zero rows throw?
