# Architecture

## Overview

DB Agent follows a clean layered architecture. The backend is a FastAPI application that exposes a REST API; the frontend is a React SPA that consumes it. In production, FastAPI also serves the built frontend as static files.

```
┌─────────────────────────────────────────────────┐
│                   Browser                        │
│         React SPA (Vite + Tailwind)              │
└──────────────────────┬──────────────────────────┘
                       │ HTTP / JSON
┌──────────────────────▼──────────────────────────┐
│              FastAPI Application                 │
│  ┌──────────┐  ┌─────────────┐  ┌────────────┐  │
│  │   Auth   │  │ Onboarding  │  │   Chat /   │  │
│  │  Router  │  │   Router    │  │   Agents   │  │
│  └──────────┘  └──────┬──────┘  └─────┬──────┘  │
│                       │               │          │
│  ┌────────────────────▼───────────────▼───────┐  │
│  │              Service Layer                  │  │
│  │  ┌─────────────┐        ┌───────────────┐  │  │
│  │  │ Onboarding  │        │  QueryEngine  │  │  │
│  │  │ Introspector│        │  ScopeGuard   │  │  │
│  │  │ SchemaStore │        │  Formatter    │  │  │
│  │  └──────┬──────┘        └──────┬────────┘  │  │
│  └─────────┼──────────────────────┼───────────┘  │
│            │                      │               │
│  ┌─────────▼──────────────────────▼───────────┐  │
│  │              Infrastructure                 │  │
│  │  ┌───────────┐  ┌──────────┐  ┌─────────┐  │  │
│  │  │ DB Factory│  │AgentStore│  │UserStore│  │  │
│  │  │ + Adapters│  │(JSON)    │  │(JSON)   │  │  │
│  │  └─────┬─────┘  └──────────┘  └─────────┘  │  │
│  └────────┼─────────────────────────────────────┘  │
└───────────┼─────────────────────────────────────┘
            │
  ┌─────────▼──────────────────────────────┐
  │  Databases: SQLite / Postgres / MySQL  │
  │             / MongoDB                  │
  └────────────────────────────────────────┘
```

## Backend Layers

### API Layer (`app/api/`)

Three routers, each mounted in `app/main.py`:

| Router | Prefix | Responsibility |
|---|---|---|
| `auth.py` | `/auth` | Signup, login, current user |
| `onboarding.py` | `/onboarding` | 5-step agent creation flow |
| `chat.py` | _(root)_ | Agent CRUD + chat endpoint |

The API layer handles HTTP concerns: request parsing, auth dependency injection, access control checks, and error responses. It does not contain business logic.

### Service Layer

**Onboarding pipeline** (`app/onboarding/`)

- `introspector.py` — Connects to the database via the adapter and returns `SchemaKnowledge`: tables, columns, types, and for SQL databases, foreign-key relationships.
- `schema_store.py` — Applies user-supplied enrichments (descriptions) onto the introspected schema; merges partial updates without overwriting existing data.

**Query pipeline** (`app/agent/`)

- `query_engine.py` — Orchestrates the full NL→answer pipeline (see [Query Pipeline](#query-pipeline)).
- `scope_guard.py` — Validates and rewrites queries for safety and row-level filtering.
- `formatter.py` — Formats raw query results (list of dicts) into a markdown table string for display.

### Infrastructure Layer

**DB Adapters** (`app/db/adapters/`)

All adapters implement the `DBAdapter` abstract base class from `base.py`:

```python
class DBAdapter:
    def test_connection(self) -> None: ...
    def introspect_schema(self) -> SchemaKnowledge: ...
    def execute_query(self, query: str, params: dict) -> list[dict]: ...
```

SQL adapters (Postgres, MySQL, SQLite) share a common base `_sql_base.py` (SQLAlchemyBase) which implements the connection, introspection, and execution logic using SQLAlchemy's inspection API. Each concrete SQL adapter only needs to set up the engine.

The MongoDB adapter implements the same interface using PyMongo, with `introspect_schema` sampling collection documents to infer field types.

**Storage** (`app/storage/`)

File-based JSON persistence. No database is required to run the app itself.

- `AgentStore` — Reads/writes `AgentConfig` JSON to the `agents/` directory. Drafts live in `agents/drafts/`. Published agents live at `agents/{agent_id}.json`.
- `UserStore` — Reads/writes `User` JSON to the `users/` directory. One file per user, keyed by email.

### Domain Models (`app/models/`)

- `schema.py` — Core domain types: `AgentConfig`, `User`, `SchemaKnowledge`, `TableInfo`, `ColumnInfo`, `RelationshipInfo`, and the enums `AccessMode`, `ScopeMode`, `AgentStatus`.
- `api.py` — Pydantic request/response models used exclusively in the API layer. Keeps the domain layer decoupled from HTTP concerns.

---

## Query Pipeline

The `QueryEngine.run(message, user_id)` method executes these steps:

```
1. Build system prompt
   ├─ Serialize schema knowledge (tables, columns, descriptions, relationships)
   ├─ Include db_type so Claude uses the correct query syntax
   └─ Prepend agent's global_prompt if set

2. Call Claude Sonnet (claude-sonnet-4-6)
   └─ Returns generated SQL or MQL string

3. _looks_like_query() guard
   └─ Raises ValueError if the response looks like prose, not a query

4. ScopeGuard.check(query, user_id)
   ├─ Blocks write statements: INSERT, UPDATE, DELETE, DROP, CREATE, ALTER, TRUNCATE
   └─ If scope_mode == user_scoped:
       └─ Wraps query: SELECT * FROM ({query}) AS _scoped WHERE _scoped.{col} = :__scope_user_id

5. DB Adapter executes the (possibly rewritten) query
   └─ Returns list[dict] (up to max_query_rows rows)

6. Call Claude Haiku (claude-haiku-4-5-20251001)
   └─ Summarizes raw results in plain English

7. Return (answer, generated_query, results)
```

The user_id parameter passed to ScopeGuard is always used as a bound parameter (`:__scope_user_id`), never interpolated into the query string.

---

## Authentication Flow

```
Client                          Server
  │                               │
  │  POST /auth/signup            │
  │  { email, password }          │
  │ ─────────────────────────────>│
  │                               │ hash_password(password)
  │                               │   SHA-256(password) → bcrypt(hash)
  │                               │ save User to users/{email}.json
  │                               │ create_token(user_id, email)
  │  { access_token }             │   JWT HS256, 7-day expiry
  │ <─────────────────────────────│
  │                               │
  │  GET /agents                  │
  │  Authorization: Bearer <tok>  │
  │ ─────────────────────────────>│
  │                               │ verify_token(tok)
  │                               │   decode JWT, check expiry
  │                               │   load User from store
  │  [ ...agents ]                │
  │ <─────────────────────────────│
```

The SHA-256 pre-hash step ensures passwords longer than 72 bytes are handled correctly (bcrypt silently truncates at 72 bytes).

---

## Access Control

Access checks are performed by `_check_access()` in `app/api/chat.py`. The logic is:

```
agent.owner_id is None      → allow (legacy agent)
access_mode == PUBLIC       → allow
access_mode == LINK_ONLY    → allow
user is None                → 401 Unauthorized
owner_id == user.user_id    → allow
access_mode == PRIVATE      → 403 Forbidden
access_mode == RESTRICTED
  user.email in allowed_users → allow
  else                        → 403 Forbidden
```

Only the owner can call `GET /agents/{id}/detail`, `PATCH /agents/{id}`, and `DELETE /agents/{id}`. These endpoints use `_require_owner()` which raises 403 for any non-owner authenticated user.

---

## Frontend Architecture

The React SPA uses a simple structure without a global state library:

- `AuthContext` — Stores the JWT in `localStorage`, exposes `user`, `setToken`, and `logout`. Decodes the token payload to get `user_id` and `email` without an extra API call.
- Route guards — `ProtectedRoute` redirects unauthenticated users to `/login`. `PublicOnlyRoute` redirects already-authenticated users to `/dashboard`.
- `api.ts` — Centralizes all `fetch` calls. Reads the token from `localStorage` and attaches it to the `Authorization` header automatically.

### Page Map

| Route | Component | Auth |
|---|---|---|
| `/` | `Landing` | Public |
| `/login` | `Login` | Public only |
| `/signup` | `Signup` | Public only |
| `/dashboard` | `Home` | Required |
| `/new` | `onboard/index` | Required |
| `/agents/:id` | `Chat` | Depends on agent |

---

## Storage Layout

```
agents/
  drafts/
    {draft_id}.json      ← In-progress onboarding (AgentConfig, status=draft)
  {agent_id}.json        ← Published agent (AgentConfig, status=active)

users/
  {email_hash_or_id}.json  ← User record
```

All files are UTF-8 JSON serialized via Pydantic's `model_dump_json()`. The format matches the Pydantic model exactly, so loading is always `Model.model_validate_json(text)`.
