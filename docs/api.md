# API Reference

All endpoints are served at `http://localhost:8000` by default.

## Authentication

DB Agent uses **Bearer token** (JWT) authentication.

Include the token in the `Authorization` header:

```
Authorization: Bearer <access_token>
```

Tokens are issued by the signup and login endpoints. They expire after **7 days** by default.

---

## Auth Endpoints

### POST /auth/signup

Create a new account.

**Request body**

```json
{
  "email": "you@example.com",
  "password": "atleast6chars"
}
```

**Response** `201 Created`

```json
{
  "access_token": "eyJ...",
  "token_type": "bearer"
}
```

**Errors**

| Status | Reason |
|---|---|
| 400 | Invalid email or password too short (< 6 chars) |
| 409 | Email already registered |

---

### POST /auth/login

Sign in to an existing account.

**Request body**

```json
{
  "email": "you@example.com",
  "password": "yourpassword"
}
```

**Response** `200 OK`

```json
{
  "access_token": "eyJ...",
  "token_type": "bearer"
}
```

**Errors**

| Status | Reason |
|---|---|
| 401 | Invalid email or password |

---

### GET /auth/me

Returns the currently authenticated user.

**Auth:** Required

**Response** `200 OK`

```json
{
  "user_id": "usr_abc123",
  "email": "you@example.com"
}
```

---

## Onboarding Endpoints

The 5-step onboarding flow creates a new agent. Each step operates on a `draft_id` returned by the first step.

### POST /onboarding/connect

Step 1 — Connect a database and introspect its schema.

**Auth:** Required

**Request body**

```json
{
  "db_type": "sqlite",
  "db_uri": "sqlite:///./mydb.db",
  "name": "My Database Agent",
  "description": "Optional description"
}
```

`db_type` must be one of: `sqlite`, `postgres`, `mysql`, `mongodb`

**Response** `200 OK`

```json
{
  "draft_id": "agt_xyz789",
  "tables": [
    {
      "name": "users",
      "description": null,
      "columns": [
        {
          "name": "id",
          "type": "INTEGER",
          "nullable": false,
          "description": null
        },
        {
          "name": "email",
          "type": "VARCHAR",
          "nullable": false,
          "description": null
        }
      ]
    }
  ],
  "relationships": []
}
```

**Errors**

| Status | Reason |
|---|---|
| 400 | Could not connect to the database |

---

### GET /onboarding/{draft_id}/schema

Step 2 — Retrieve the draft's current schema.

**Auth:** Required

**Response** `200 OK`

Same shape as the connect response (`draft_id`, `tables`, `relationships`).

---

### PUT /onboarding/{draft_id}/relationships

Step 3 — Set foreign-key relationships between tables.

**Auth:** Required

**Request body**

```json
{
  "relationships": [
    {
      "from_table": "orders",
      "from_column": "user_id",
      "to_table": "users",
      "to_column": "id"
    }
  ]
}
```

**Response** `200 OK` — Updated schema response.

---

### PUT /onboarding/{draft_id}/enrich

Step 4 — Add plain-English descriptions to tables and columns.

**Auth:** Required

**Request body**

```json
{
  "tables": [
    {
      "name": "orders",
      "description": "Customer purchase orders",
      "columns": [
        {
          "name": "status",
          "description": "Order status: pending, shipped, delivered, cancelled"
        }
      ]
    }
  ]
}
```

Omitted tables and columns retain their existing descriptions.

**Response** `200 OK` — Updated schema response.

---

### POST /onboarding/{draft_id}/finalize

Step 5 — Publish the draft as a live agent.

**Auth:** Required

**Request body**

```json
{
  "name": "My Database Agent",
  "description": "Optional description shown on the dashboard",
  "global_prompt": "Always be concise. Format currency as USD.",
  "scope_mode": "full_db",
  "user_id_column": null,
  "access_mode": "private"
}
```

| Field | Type | Default | Description |
|---|---|---|---|
| `name` | string | required | Agent display name |
| `description` | string | `""` | Short description |
| `global_prompt` | string | `""` | Extra instructions prepended to every query |
| `scope_mode` | enum | `full_db` | `full_db` or `user_scoped` |
| `user_id_column` | string | `null` | Required when `scope_mode` is `user_scoped` |
| `access_mode` | enum | `private` | `private`, `public`, `link_only`, or `restricted` |

**Response** `200 OK`

```json
{
  "agent_id": "agt_xyz789",
  "name": "My Database Agent",
  "description": "...",
  "db_type": "sqlite",
  "scope_mode": "full_db",
  "access_mode": "private",
  "owner_id": "usr_abc123",
  "table_count": 5,
  "status": "active",
  "created_at": "2025-05-31T12:00:00+00:00"
}
```

---

## Agent Endpoints

### GET /agents

List all agents accessible to the authenticated user.

**Auth:** Required

Returns agents where the user is the owner, or where `access_mode` is `public`, `link_only`, or `restricted` with the user's email in the allowlist.

**Response** `200 OK` — Array of agent summaries (same shape as finalize response).

---

### GET /agents/{agent_id}

Get a single agent summary.

**Auth:** Optional (depends on access_mode)

**Response** `200 OK` — Agent summary.

**Errors**

| Status | Reason |
|---|---|
| 401 | Agent requires authentication |
| 403 | Access denied |
| 404 | Agent not found |

---

### GET /agents/{agent_id}/schema

Get the schema (tables and relationships) for an agent.

**Auth:** Optional (depends on access_mode)

**Response** `200 OK`

```json
{
  "draft_id": "agt_xyz789",
  "tables": [...],
  "relationships": [...]
}
```

---

### GET /agents/{agent_id}/detail

Get the full agent configuration including the global prompt and access settings.

**Auth:** Required (owner only)

**Response** `200 OK`

```json
{
  "name": "My Agent",
  "description": "...",
  "global_prompt": "...",
  "scope_mode": "full_db",
  "user_id_column": null,
  "access_mode": "private",
  "allowed_users": []
}
```

---

### PATCH /agents/{agent_id}

Update agent settings.

**Auth:** Required (owner only)

**Request body** — All fields required:

```json
{
  "name": "Updated Name",
  "description": "Updated description",
  "global_prompt": "Be concise.",
  "scope_mode": "full_db",
  "user_id_column": null,
  "access_mode": "restricted",
  "allowed_users": ["alice@example.com", "bob@example.com"]
}
```

**Response** `200 OK` — Updated agent summary.

**Errors**

| Status | Reason |
|---|---|
| 400 | `user_id_column` missing when `scope_mode` is `user_scoped` |
| 403 | Not the owner |

---

### DELETE /agents/{agent_id}

Delete an agent permanently.

**Auth:** Required (owner only)

**Response** `200 OK`

```json
{
  "success": true,
  "message": "Agent 'agt_xyz789' deleted."
}
```

---

### POST /agents/{agent_id}/chat

Send a message to an agent and get a response.

**Auth:** Optional (depends on agent's access_mode)

**Request body**

```json
{
  "message": "How many users signed up last month?",
  "user_id": null
}
```

`user_id` is required when the agent's `scope_mode` is `user_scoped`.

**Response** `200 OK`

```json
{
  "answer": "There were 42 users who signed up last month.",
  "generated_query": "SELECT COUNT(*) FROM users WHERE created_at >= '2025-04-01' AND created_at < '2025-05-01'",
  "results": [
    {"count": 42}
  ],
  "error": null
}
```

If the AI cannot generate a query, or the query fails, `answer` will be empty and `error` will contain the reason.

---

## Health Check

### GET /health

Returns `{"status": "ok"}`. No authentication required. Used for liveness probes.

---

## Error Response Format

All error responses follow FastAPI's standard format:

```json
{
  "detail": "Human-readable error message"
}
```
