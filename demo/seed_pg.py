"""
Creates the demo e-commerce dataset in the Neon PostgreSQL database and
publishes a pre-configured public agent that points to it.

Run once after DATABASE_URL is set in .env:
    python demo/seed_pg.py

Safe to re-run — all operations are idempotent.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.config import settings
from app.storage.pg import get_conn, init_db
from app.storage.agent_store import AgentStore
from app.models.schema import (
    AccessMode,
    AgentConfig,
    AgentStatus,
    ColumnInfo,
    DbType,
    RelationshipInfo,
    SchemaKnowledge,
    ScopeMode,
    TableInfo,
)

# Fixed ID so the script is idempotent — re-running updates the same agent.
DEMO_AGENT_ID = "00000000-0000-0000-0000-000000000001"


# ---------------------------------------------------------------------------
# Step 1 — Create demo tables in Neon
# ---------------------------------------------------------------------------

_CREATE = """
CREATE TABLE IF NOT EXISTS customers (
    id        SERIAL PRIMARY KEY,
    name      TEXT   NOT NULL,
    email     TEXT   UNIQUE NOT NULL,
    country   TEXT   NOT NULL DEFAULT 'US',
    joined_at TEXT   NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
    id       SERIAL PRIMARY KEY,
    name     TEXT   NOT NULL,
    category TEXT   NOT NULL,
    price    NUMERIC(10,2) NOT NULL,
    stock    INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS orders (
    id          SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id),
    status      TEXT    NOT NULL DEFAULT 'pending',
    total       NUMERIC(10,2) NOT NULL,
    created_at  TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS order_items (
    id         SERIAL PRIMARY KEY,
    order_id   INTEGER NOT NULL REFERENCES orders(id),
    product_id INTEGER NOT NULL REFERENCES products(id),
    quantity   INTEGER NOT NULL,
    unit_price NUMERIC(10,2) NOT NULL
);
"""

_SEED = """
INSERT INTO customers (id, name, email, country, joined_at) VALUES
    (1, 'Alice Johnson', 'alice@example.com', 'US', '2023-01-15'),
    (2, 'Bob Smith',     'bob@example.com',   'UK', '2023-03-22'),
    (3, 'Carol Davis',   'carol@example.com', 'US', '2023-06-01'),
    (4, 'David Lee',     'david@example.com', 'CA', '2024-01-10')
ON CONFLICT (id) DO NOTHING;

INSERT INTO products (id, name, category, price, stock) VALUES
    (1, 'Wireless Headphones', 'Electronics',  79.99, 45),
    (2, 'Mechanical Keyboard',  'Electronics', 129.99, 20),
    (3, 'Desk Lamp',            'Home',         34.99, 80),
    (4, 'Notebook (A5)',        'Stationery',    8.99, 200),
    (5, 'USB-C Hub',            'Electronics',  49.99, 60)
ON CONFLICT (id) DO NOTHING;

INSERT INTO orders (id, customer_id, status, total, created_at) VALUES
    (1, 1, 'completed', 209.97, '2024-01-20'),
    (2, 1, 'completed',  43.98, '2024-02-14'),
    (3, 2, 'completed', 129.99, '2024-02-28'),
    (4, 3, 'pending',    84.98, '2024-03-05'),
    (5, 4, 'completed', 179.98, '2024-03-12'),
    (6, 2, 'cancelled',  34.99, '2024-03-18')
ON CONFLICT (id) DO NOTHING;

INSERT INTO order_items (id, order_id, product_id, quantity, unit_price) VALUES
    (1,  1, 1, 1,  79.99),
    (2,  1, 2, 1, 129.99),
    (3,  2, 3, 1,  34.99),
    (4,  2, 4, 1,   8.99),
    (5,  3, 2, 1, 129.99),
    (6,  4, 1, 1,  79.99),
    (7,  4, 4, 1,   8.99),
    (8,  5, 1, 1,  79.99),
    (9,  5, 5, 2,  49.99),
    (10, 6, 3, 1,  34.99)
ON CONFLICT (id) DO NOTHING;
"""


def seed_tables() -> None:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(_CREATE)
            cur.execute(_SEED)
    print("  Demo tables created and seeded.")


# ---------------------------------------------------------------------------
# Step 2 — Build schema knowledge (only the 4 demo tables)
# ---------------------------------------------------------------------------

def build_schema() -> SchemaKnowledge:
    return SchemaKnowledge(
        db_type=DbType.POSTGRESQL,
        tables=[
            TableInfo(
                name="customers",
                label="Customers",
                description="Registered buyers on the platform.",
                columns=[
                    ColumnInfo(name="id",        db_type="INTEGER", is_primary_key=True),
                    ColumnInfo(name="name",       db_type="TEXT",    description="Full name of the customer"),
                    ColumnInfo(name="email",      db_type="TEXT",    description="Unique email address"),
                    ColumnInfo(name="country",    db_type="TEXT",    description="ISO 3166-1 alpha-2 country code (e.g. US, UK, CA)"),
                    ColumnInfo(name="joined_at",  db_type="TEXT",    description="Date the customer signed up (YYYY-MM-DD)"),
                ],
            ),
            TableInfo(
                name="products",
                label="Products",
                description="Items available in the store catalogue.",
                columns=[
                    ColumnInfo(name="id",       db_type="INTEGER", is_primary_key=True),
                    ColumnInfo(name="name",     db_type="TEXT",    description="Product display name"),
                    ColumnInfo(name="category", db_type="TEXT",    description="Category: Electronics, Home, or Stationery"),
                    ColumnInfo(name="price",    db_type="NUMERIC", description="Unit price in USD"),
                    ColumnInfo(name="stock",    db_type="INTEGER", description="Units currently in stock"),
                ],
            ),
            TableInfo(
                name="orders",
                label="Orders",
                description="Purchase orders placed by customers.",
                columns=[
                    ColumnInfo(name="id",          db_type="INTEGER", is_primary_key=True),
                    ColumnInfo(name="customer_id", db_type="INTEGER", is_foreign_key=True, description="References customers.id"),
                    ColumnInfo(name="status",      db_type="TEXT",    description="Order status: pending, completed, or cancelled"),
                    ColumnInfo(name="total",       db_type="NUMERIC", description="Total order value in USD"),
                    ColumnInfo(name="created_at",  db_type="TEXT",    description="Order date (YYYY-MM-DD)"),
                ],
            ),
            TableInfo(
                name="order_items",
                label="Order Lines",
                description="Individual product lines within each order.",
                columns=[
                    ColumnInfo(name="id",         db_type="INTEGER", is_primary_key=True),
                    ColumnInfo(name="order_id",   db_type="INTEGER", is_foreign_key=True, description="References orders.id"),
                    ColumnInfo(name="product_id", db_type="INTEGER", is_foreign_key=True, description="References products.id"),
                    ColumnInfo(name="quantity",   db_type="INTEGER", description="Number of units ordered"),
                    ColumnInfo(name="unit_price", db_type="NUMERIC", description="Price per unit at time of purchase in USD"),
                ],
            ),
        ],
        relationships=[
            RelationshipInfo(
                from_table="orders",
                from_column="customer_id",
                to_table="customers",
                to_column="id",
                description="the customer who placed this order",
            ),
            RelationshipInfo(
                from_table="order_items",
                from_column="order_id",
                to_table="orders",
                to_column="id",
                description="the order this line item belongs to",
            ),
            RelationshipInfo(
                from_table="order_items",
                from_column="product_id",
                to_table="products",
                to_column="id",
                description="the product in this line item",
            ),
        ],
    )


# ---------------------------------------------------------------------------
# Step 3 — Create and save the public demo agent
# ---------------------------------------------------------------------------

def create_agent() -> None:
    config = AgentConfig(
        agent_id=DEMO_AGENT_ID,
        name="Demo Store Agent",
        description="Try DB Agent — ask anything about a sample e-commerce store with customers, products, and orders.",
        db_type=DbType.POSTGRESQL,
        db_uri=settings.database_url,
        global_prompt=(
            "You are an e-commerce analytics assistant for a demo store. "
            "Only query the customers, products, orders, and order_items tables. "
            "Answer questions clearly and include relevant numbers or summaries."
        ),
        scope_mode=ScopeMode.FULL_DB,
        access_mode=AccessMode.PUBLIC,
        owner_id=None,  # ownerless — visible and accessible to all users
        schema_knowledge=build_schema(),
        status=AgentStatus.ACTIVE,
    )
    AgentStore().save_agent(config)
    print(f"  Agent saved.  ID: {DEMO_AGENT_ID}")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    if not settings.database_url:
        print("ERROR: DATABASE_URL is not set. Add it to .env and retry.")
        sys.exit(1)

    print("Ensuring storage tables exist...")
    init_db()

    print("Seeding demo tables...")
    seed_tables()

    print("Creating demo agent...")
    create_agent()

    print("\nDone.")
    print(f"  Agent ID : {DEMO_AGENT_ID}")
    print(f"  Try it at: http://localhost:8000/agents/{DEMO_AGENT_ID}")


if __name__ == "__main__":
    main()
