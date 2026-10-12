# Database validation

Run the disposable SQL integration suite from the project root:

```sh
npm run test:database
```

`tests/database.test.ts` replays checked-in migrations against PGlite (a real
PostgreSQL WASM engine), creates synthetic Auth users, and executes commands
under the `authenticated` and `anon` roles. No hosted database or real player
rows are used. Fixture updates run as the test database owner only.

This validates SQL syntax, constraints, role grants, RLS configuration, command
semantics, and receipt replay. The Auth helper is a test stub and PGlite has a
single connection. It does **not** prove real Supabase Auth/PostgREST behavior,
concurrent transactions, or mobile session recovery.

Before a hosted release, repeat access and functional checks on a disposable
Supabase staging project and test with two independent database connections:

- Simultaneous `start_run` calls produce one active run.
- Two same-revision spending commands yield one accepted command and one
  conflict, without an overdraw or deadlock.
- Identical simultaneous request IDs pay once and return the same receipt.
- Two users operate independently; one user's busy row does not block the
  other's entire game.
- Concurrent work requests share one owner rate budget across devices.

Use synthetic accounts and transaction rollback/isolated staging fixtures.
Never run destructive fixtures against the configured production project.
