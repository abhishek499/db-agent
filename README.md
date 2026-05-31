# DB Agent

Ask your database anything in plain English. DB Agent is a full-stack application that connects AI to your databases — turning natural language questions into SQL or MongoDB queries, executing them safely, and returning a human-readable answer.

## Features

- **Natural language queries** — Type a question, get an answer. No SQL required.
- **Multi-database support** — PostgreSQL, MySQL, SQLite, and MongoDB.
- **5-step onboarding wizard** — Connect a database, review its schema, declare relationships, enrich with descriptions, and publish an agent in minutes.
- **Access control** — Four access modes: private, public, link-only, and restricted (email allowlist).
- **User scoping** — Optional per-user row filtering so each user only sees their own data.
- **Secure by default** — Read-only query execution; write statements are blocked at the scope-guard layer.
- **Auth system** — JWT-based authentication with signup/login.

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.11+, FastAPI 0.115+, Uvicorn |
| ORM / DB | SQLAlchemy 2.0 (SQL), PyMongo (MongoDB) |
| AI | Anthropic Claude (`claude-sonnet-4-6` for queries, `claude-haiku-4-5-20251001` for summaries) |
| Auth | python-jose (JWT HS256), bcrypt |
| Validation | Pydantic v2, pydantic-settings |
| Frontend | React 18, TypeScript 5, Vite 5, Tailwind CSS 3 |
| Routing | React Router v6 |
| Storage | File-based JSON (`agents/` and `users/` directories) |

---

## Getting Started

### Prerequisites

- Python 3.11 or higher
- Node.js 18 or higher
- An Anthropic API key

### 1. Clone and install backend dependencies

```bash
git clone <repo-url>
cd "DB Agent"
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -e .
```

### 2. Configure environment

Copy the example environment file and fill in your values:

```bash
cp .env.example .env
```

Edit `.env`:

```env
ANTHROPIC_API_KEY=sk-ant-...
JWT_SECRET=your-random-secret-here
# Optional overrides (defaults shown)
# AGENTS_DIR=agents
# USERS_DIR=users
# JWT_EXPIRE_MINUTES=10080
# MAX_QUERY_ROWS=500
```

See [Configuration Reference](#configuration-reference) for all options.

### 3. Install frontend dependencies

```bash
cd frontend
npm install
```

### 4. Run in development mode

Start the backend (from the project root):

```bash
uvicorn app.main:app --reload --port 8000
```

Start the frontend (from `frontend/`):

```bash
npm run dev
```

The app is available at `http://localhost:5173`. The Vite dev server proxies `/onboarding`, `/agents`, `/auth`, and `/health` to `http://localhost:8000`.

### 5. Build for production

```bash
cd frontend
npm run build
```

Then run the backend — it will serve the built frontend automatically:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Visit `http://localhost:8000`.

---

## Project Structure

```
DB Agent/
├── app/
│   ├── main.py               # FastAPI app, routers, CORS, SPA fallback
│   ├── config.py             # Settings via pydantic-settings (.env)
│   ├── models/
│   │   ├── schema.py         # Domain models: AgentConfig, User, enums
│   │   └── api.py            # Request/response Pydantic models
│   ├── auth/
│   │   ├── dependencies.py   # require_auth / get_optional_user FastAPI deps
│   │   ├── jwt.py            # Token creation and verification
│   │   └── password.py       # bcrypt hash/verify (SHA-256 pre-hash)
│   ├── db/
│   │   ├── factory.py        # get_adapter(db_type, db_uri) factory
│   │   └── adapters/
│   │       ├── base.py       # Abstract DBAdapter interface
│   │       ├── _sql_base.py  # Shared SQLAlchemy logic
│   │       ├── sqlite.py     # SQLiteAdapter
│   │       ├── postgres.py   # PostgresAdapter
│   │       ├── mysql.py      # MySQLAdapter
│   │       └── mongodb.py    # MongoDBAdapter
│   ├── onboarding/
│   │   ├── introspector.py   # Schema introspection per DB type
│   │   └── schema_store.py   # Schema enrichment logic
│   ├── agent/
│   │   ├── query_engine.py   # NL → query → execute → summarize pipeline
│   │   ├── scope_guard.py    # Injects user filter; blocks writes
│   │   └── formatter.py      # Formats raw DB results to markdown table
│   ├── storage/
│   │   ├── agent_store.py    # File-based CRUD for AgentConfig
│   │   └── user_store.py     # File-based CRUD for User
│   └── api/
│       ├── auth.py           # POST /auth/signup, /auth/login, GET /auth/me
│       ├── onboarding.py     # 5-step onboarding endpoints
│       └── chat.py           # Agent CRUD + POST /agents/{id}/chat
├── frontend/
│   ├── src/
│   │   ├── App.tsx           # Router: /, /dashboard, /new, /agents/:id, /login, /signup
│   │   ├── api.ts            # All fetch calls to the backend
│   │   ├── types.ts          # TypeScript interfaces
│   │   ├── context/
│   │   │   └── AuthContext.tsx
│   │   ├── components/
│   │   │   ├── AppLogo.tsx
│   │   │   ├── AgentCard.tsx
│   │   │   └── EditAgentModal.tsx
│   │   └── pages/
│   │       ├── Landing.tsx
│   │       ├── Home.tsx      # /dashboard
│   │       ├── Login.tsx
│   │       ├── Signup.tsx
│   │       ├── Chat.tsx      # /agents/:id
│   │       └── onboard/      # 5-step wizard
│   ├── public/
│   │   ├── favicon.svg
│   │   ├── mongodb-original.svg
│   │   ├── postgresql-original.svg
│   │   ├── mysql-original.svg
│   │   └── sqlite-original.svg
│   └── vite.config.ts
├── agents/                   # Runtime: published agent JSON files
│   └── drafts/               # Runtime: in-progress onboarding sessions
├── users/                    # Runtime: user account JSON files
├── tests/                    # pytest test suite
├── pyproject.toml
└── .env
```

---

## How It Works

### Onboarding a Database

Creating an agent is a 5-step wizard:

| Step | Action |
|---|---|
| 1. Connect | Provide a DB URI and optional name/description. The backend introspects the schema and stores a draft. |
| 2. Review Schema | View all discovered tables and columns. |
| 3. Relationships | Declare foreign-key relationships (auto-detected for SQL; manual for MongoDB). |
| 4. Enrich | Add plain-English descriptions to tables and columns to improve query accuracy. |
| 5. Finalize | Set access mode and user-scoping, then publish the agent. |

### Query Pipeline

When a user sends a message to an agent:

```
User message
    │
    ▼
Build system prompt
  (schema knowledge, table/column descriptions, global prompt)
    │
    ▼
Claude Sonnet generates SQL or MQL
    │
    ▼
_looks_like_query guard
  (validates Claude returned an actual query)
    │
    ▼
ScopeGuard
  ├─ Blocks write statements (INSERT/UPDATE/DELETE/DROP/etc.)
  └─ Injects WHERE clause if scope_mode = user_scoped
    │
    ▼
DB Adapter executes query (read-only)
    │
    ▼
Claude Haiku summarizes results in plain English
    │
    ▼
ChatResponse { answer, generated_query, results }
```

---

## Access Control

Each agent has an `access_mode` field:

| Mode | Who can access |
|---|---|
| `private` | Owner only |
| `public` | Anyone (including unauthenticated users) |
| `link_only` | Anyone with the URL (same as public, semantically "unlisted") |
| `restricted` | Owner + users whose email is in the `allowed_users` list |

Only the **owner** can view and edit agent settings (name, description, prompt, scope, access mode).

---

## User Scoping

When `scope_mode` is set to `user_scoped`, the agent automatically injects a row-level filter into every query:

```sql
-- Original query:
SELECT * FROM orders

-- After ScopeGuard:
SELECT * FROM (SELECT * FROM orders) AS _scoped
WHERE _scoped.user_id = :__scope_user_id
```

The `user_id_column` field specifies which column to filter on. The value is always parameterized — never string-interpolated — preventing SQL injection.

---

## API Reference

See [docs/api.md](docs/api.md) for the full API reference.

### Quick reference

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/signup` | — | Create account, returns JWT |
| POST | `/auth/login` | — | Sign in, returns JWT |
| GET | `/auth/me` | Required | Current user info |
| POST | `/onboarding/connect` | Required | Start onboarding, returns draft_id |
| GET | `/onboarding/{id}/schema` | Required | View draft schema |
| PUT | `/onboarding/{id}/relationships` | Required | Set relationships |
| PUT | `/onboarding/{id}/enrich` | Required | Add descriptions |
| POST | `/onboarding/{id}/finalize` | Required | Publish agent |
| GET | `/agents` | Required | List accessible agents |
| GET | `/agents/{id}` | Optional | Get agent summary |
| GET | `/agents/{id}/schema` | Optional | Get agent schema |
| GET | `/agents/{id}/detail` | Owner | Get full agent config |
| PATCH | `/agents/{id}` | Owner | Update agent settings |
| DELETE | `/agents/{id}` | Owner | Delete agent |
| POST | `/agents/{id}/chat` | Optional* | Send a message |
| GET | `/health` | — | Health check |

*Chat auth depends on the agent's `access_mode`.

---

## Configuration Reference

All settings are read from environment variables (or `.env` via python-dotenv):

| Variable | Default | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | _(required)_ | Anthropic API key |
| `JWT_SECRET` | _(required)_ | Secret for signing JWTs |
| `JWT_ALGORITHM` | `HS256` | JWT signing algorithm |
| `JWT_EXPIRE_MINUTES` | `10080` | Token lifetime (7 days) |
| `AGENTS_DIR` | `agents` | Directory for agent JSON files |
| `USERS_DIR` | `users` | Directory for user JSON files |
| `MAX_QUERY_ROWS` | `500` | Max rows returned per query |

---

## Running Tests

```bash
pytest
```

The test suite has 67 passing tests and 2 skipped by default:

- `TEST_POSTGRES_URI` — set to run live PostgreSQL tests
- `ANTHROPIC_API_KEY` — set to run live Claude query tests (uses real API credits)

```bash
# Run with coverage report
pytest --cov=app --cov-report=term-missing
```

---

## Supported Databases

| Database | URI format |
|---|---|
| SQLite | `sqlite:///path/to/file.db` or `sqlite:////absolute/path.db` |
| PostgreSQL | `postgresql://user:pass@host:5432/dbname` |
| MySQL | `mysql+pymysql://user:pass@host:3306/dbname` |
| MongoDB | `mongodb://user:pass@host:27017/dbname` |

---

## Further Reading

- [docs/api.md](docs/api.md) — Complete API reference with request/response shapes
- [docs/architecture.md](docs/architecture.md) — Architecture deep-dive
- [docs/deployment.md](docs/deployment.md) — Production deployment guide
