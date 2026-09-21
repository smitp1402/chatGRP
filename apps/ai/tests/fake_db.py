"""In-memory stand-in for the supabase-py client.

Supports exactly the query chains the AI layer uses —
``table().select/insert/update/delete ... .eq/.gte/.in_/.order/.limit .execute()``
and ``rpc(name, params).execute()`` — so the request lifecycle can be exercised
without a Postgres. Rows are plain dicts; ids and created_at are filled in on
insert the way the real schema defaults would.
"""
import copy
import uuid
from collections.abc import Callable
from datetime import datetime, timezone

RpcHandler = Callable[["FakeDB", dict], object]


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


class FakeResult:
    def __init__(self, data: object) -> None:
        self.data = data


class FakeQuery:
    def __init__(self, tables: dict[str, list[dict]], name: str) -> None:
        self._tables = tables
        self._name = name
        self._op = "select"
        self._payload: object = None
        self._filters: list[Callable[[dict], bool]] = []
        self._order: tuple[str, bool] | None = None
        self._limit: int | None = None

    # ── builders ──────────────────────────────────────────────────────
    def select(self, _columns: str = "*") -> "FakeQuery":
        self._op = "select"
        return self

    def insert(self, rows: dict | list[dict]) -> "FakeQuery":
        self._op = "insert"
        self._payload = rows
        return self

    def update(self, patch: dict) -> "FakeQuery":
        self._op = "update"
        self._payload = patch
        return self

    def delete(self) -> "FakeQuery":
        self._op = "delete"
        return self

    def eq(self, column: str, value: object) -> "FakeQuery":
        self._filters.append(lambda r: r.get(column) == value)
        return self

    def gte(self, column: str, value: object) -> "FakeQuery":
        self._filters.append(lambda r: r.get(column) is not None and r[column] >= value)
        return self

    def in_(self, column: str, values: list) -> "FakeQuery":
        self._filters.append(lambda r: r.get(column) in values)
        return self

    def order(self, column: str, desc: bool = False) -> "FakeQuery":
        self._order = (column, desc)
        return self

    def limit(self, n: int) -> "FakeQuery":
        self._limit = n
        return self

    # ── execution ─────────────────────────────────────────────────────
    def _matching(self, rows: list[dict]) -> list[dict]:
        return [r for r in rows if all(f(r) for f in self._filters)]

    def execute(self) -> FakeResult:
        rows = self._tables.setdefault(self._name, [])

        if self._op == "insert":
            payload = self._payload if isinstance(self._payload, list) else [self._payload]
            inserted = []
            for p in payload:
                row = {"id": str(uuid.uuid4()), "created_at": _now(), **p}
                rows.append(row)
                inserted.append(copy.deepcopy(row))
            return FakeResult(inserted)

        if self._op == "update":
            hit = self._matching(rows)
            for r in hit:
                r.update(self._payload)  # type: ignore[arg-type]
            return FakeResult(copy.deepcopy(hit))

        if self._op == "delete":
            hit_ids = {r["id"] for r in self._matching(rows)}
            removed = [r for r in rows if r["id"] in hit_ids]
            rows[:] = [r for r in rows if r["id"] not in hit_ids]
            return FakeResult(copy.deepcopy(removed))

        out = self._matching(rows)
        if self._order:
            column, desc = self._order
            out = sorted(out, key=lambda r: r.get(column) or "", reverse=desc)
        if self._limit is not None:
            out = out[: self._limit]
        return FakeResult(copy.deepcopy(out))


class _Executable:
    def __init__(self, result: FakeResult) -> None:
        self._result = result

    def execute(self) -> FakeResult:
        return self._result


class FakeDB:
    def __init__(self) -> None:
        self.tables: dict[str, list[dict]] = {}
        self.rpc_handlers: dict[str, RpcHandler] = {}
        self.rpc_calls: list[tuple[str, dict]] = []

    def table(self, name: str) -> FakeQuery:
        return FakeQuery(self.tables, name)

    def rpc(self, name: str, params: dict | None = None) -> _Executable:
        params = params or {}
        self.rpc_calls.append((name, params))
        handler = self.rpc_handlers.get(name)
        if handler is None:
            raise KeyError(f"no fake handler registered for rpc {name!r}")
        return _Executable(FakeResult(handler(self, params)))

    def rows(self, name: str) -> list[dict]:
        return self.tables.get(name, [])
