# AI layer tests

```
.venv/Scripts/python.exe -m pip install -r requirements-dev.txt
.venv/Scripts/python.exe -m pytest
```

No database or secrets are needed: `fake_db.py` is an in-memory stand-in for
the supabase-py client that supports the query chains the app uses, and
`conftest.py` re-implements the `reserve_credits` / `refund_credits` RPCs from
`supabase/migrations/0008_reserve_credits.sql` against it (minus the row lock).

The lock itself — the part that makes reservation safe under concurrency — is
Postgres behaviour and is not exercised here. Verify it against a real database
by firing parallel `/generate` calls at a user with credits for only one.
