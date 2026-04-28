use rusqlite::Connection;
use std::fs;
use std::path::PathBuf;
use tauri::Manager;

pub const DB_FILE_NAME: &str = "teebot-flow.db";

pub fn open_connection(app: &tauri::AppHandle) -> Result<Connection, String> {
    let db_path = resolve_db_path(app)?;
    Connection::open(db_path).map_err(|e| format!("Failed to open SQLite connection: {e}"))
}

pub fn init_db(app: &tauri::AppHandle) -> Result<(), String> {
    let mut conn = open_connection(app).or_else(|_| {
        let db_path = resolve_db_path(app)?;
        let _ = std::fs::remove_file(&db_path);
        open_connection(app)
    })?;

    // Self-heal: If the database is corrupted (e.g. overwritten by an encrypted file without decryption),
    // we must do a real disk read to detect it. PRAGMAs do not trigger disk reads.
    if conn.query_row("SELECT COUNT(*) FROM sqlite_master", [], |_| Ok(())).is_err() {
        drop(conn); // Must release the SQLite file lock before deleting!
        let db_path = resolve_db_path(app)?;
        let _ = std::fs::remove_file(&db_path);
        conn = open_connection(app)?;
    }

    conn.execute_batch(
        r#"
        PRAGMA foreign_keys = ON;

        CREATE TABLE IF NOT EXISTS users (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            username     TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            full_name    TEXT,
            role         TEXT NOT NULL DEFAULT 'admin',
            created_at   TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS company_profiles (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            company_name TEXT NOT NULL,
            owner_name   TEXT,
            email        TEXT,
            phone        TEXT,
            address      TEXT,
            city         TEXT,
            state        TEXT,
            postal_code  TEXT,
            country      TEXT,
            tax_registration_number TEXT,
            sales_tax_number TEXT,
            business_type TEXT,
            currency     TEXT DEFAULT 'PKR',
            website      TEXT,
            external_id  TEXT UNIQUE NOT NULL DEFAULT (lower(hex(randomblob(16)))),
            sync_status  TEXT NOT NULL DEFAULT 'local_only',
            sync_version INTEGER NOT NULL DEFAULT 1,
            last_synced_at TEXT,
            deleted_at   TEXT,
            user_id      INTEGER,
            created_at   TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS products (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            name        TEXT NOT NULL,
            description TEXT,
            sku         TEXT NOT NULL UNIQUE,
            stock_qty   INTEGER NOT NULL DEFAULT 0,
            price       REAL NOT NULL DEFAULT 0,
            company_id  INTEGER,
            external_id  TEXT UNIQUE NOT NULL DEFAULT (lower(hex(randomblob(16)))),
            sync_status  TEXT NOT NULL DEFAULT 'local_only',
            sync_version INTEGER NOT NULL DEFAULT 1,
            last_synced_at TEXT,
            deleted_at   TEXT,
            created_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS customers (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            name        TEXT NOT NULL,
            phone       TEXT,
            address     TEXT,
            company_id  INTEGER,
            tax_registration_number TEXT,
            external_id  TEXT UNIQUE NOT NULL DEFAULT (lower(hex(randomblob(16)))),
            sync_status  TEXT NOT NULL DEFAULT 'local_only',
            sync_version INTEGER NOT NULL DEFAULT 1,
            last_synced_at TEXT,
            deleted_at   TEXT,
            created_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS delivery_challans (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            dc_number    TEXT NOT NULL UNIQUE,
            customer_id  INTEGER NOT NULL,
            company_id   INTEGER,
            external_id  TEXT UNIQUE NOT NULL DEFAULT (lower(hex(randomblob(16)))),
            sync_status  TEXT NOT NULL DEFAULT 'local_only',
            sync_version INTEGER NOT NULL DEFAULT 1,
            last_synced_at TEXT,
            deleted_at   TEXT,
            created_at   TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(customer_id) REFERENCES customers(id)
        );

        CREATE TABLE IF NOT EXISTS dc_items (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            dc_id       INTEGER NOT NULL,
            product_id  INTEGER NOT NULL,
            quantity    INTEGER NOT NULL,
            rate        REAL NOT NULL,
            external_id  TEXT UNIQUE NOT NULL DEFAULT (lower(hex(randomblob(16)))),
            sync_status  TEXT NOT NULL DEFAULT 'local_only',
            sync_version INTEGER NOT NULL DEFAULT 1,
            last_synced_at TEXT,
            deleted_at   TEXT,
            created_at   TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(dc_id) REFERENCES delivery_challans(id) ON DELETE CASCADE,
            FOREIGN KEY(product_id) REFERENCES products(id)
        );

        CREATE TABLE IF NOT EXISTS invoices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            invoice_number TEXT NOT NULL UNIQUE,
            dc_id INTEGER,
            customer_id INTEGER NOT NULL,
            company_id INTEGER,
            status TEXT NOT NULL DEFAULT 'draft',
            notes TEXT,
            external_id  TEXT UNIQUE NOT NULL DEFAULT (lower(hex(randomblob(16)))),
            sync_status  TEXT NOT NULL DEFAULT 'local_only',
            sync_version INTEGER NOT NULL DEFAULT 1,
            last_synced_at TEXT,
            deleted_at TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(dc_id) REFERENCES delivery_challans(id),
            FOREIGN KEY(customer_id) REFERENCES customers(id)
        );

        CREATE TABLE IF NOT EXISTS invoice_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            invoice_id INTEGER NOT NULL,
            product_id INTEGER,
            description TEXT NOT NULL,
            quantity INTEGER NOT NULL,
            rate REAL NOT NULL,
            amount REAL NOT NULL,
            external_id  TEXT UNIQUE NOT NULL DEFAULT (lower(hex(randomblob(16)))),
            sync_status  TEXT NOT NULL DEFAULT 'local_only',
            sync_version INTEGER NOT NULL DEFAULT 1,
            last_synced_at TEXT,
            deleted_at TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
            FOREIGN KEY(product_id) REFERENCES products(id)
        );

        CREATE TABLE IF NOT EXISTS app_meta (
            key TEXT PRIMARY KEY,
            value TEXT,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS quotations (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            quote_number TEXT NOT NULL UNIQUE,
            customer_id  INTEGER NOT NULL,
            company_id   INTEGER,
            status       TEXT NOT NULL DEFAULT 'draft',
            notes        TEXT,
            external_id  TEXT UNIQUE NOT NULL DEFAULT (lower(hex(randomblob(16)))),
            sync_status  TEXT NOT NULL DEFAULT 'local_only',
            sync_version INTEGER NOT NULL DEFAULT 1,
            last_synced_at TEXT,
            deleted_at   TEXT,
            created_at   TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(customer_id) REFERENCES customers(id)
        );

        CREATE TABLE IF NOT EXISTS quotation_items (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            quote_id    INTEGER NOT NULL,
            product_id  INTEGER,
            description TEXT NOT NULL,
            quantity    INTEGER NOT NULL,
            rate        REAL NOT NULL,
            amount      REAL NOT NULL,
            external_id  TEXT UNIQUE NOT NULL DEFAULT (lower(hex(randomblob(16)))),
            sync_status  TEXT NOT NULL DEFAULT 'local_only',
            sync_version INTEGER NOT NULL DEFAULT 1,
            last_synced_at TEXT,
            deleted_at   TEXT,
            created_at   TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(quote_id) REFERENCES quotations(id) ON DELETE CASCADE,
            FOREIGN KEY(product_id) REFERENCES products(id)
        );
        "#,
    )
    .map_err(|e| format!("Failed to initialize database schema: {e}"))?;

    ensure_column(&conn, "products", "company_id", "INTEGER")?;
    ensure_column(&conn, "products", "description", "TEXT")?;
    ensure_column(&conn, "customers", "company_id", "INTEGER")?;
    ensure_column(&conn, "delivery_challans", "company_id", "INTEGER")?;
    ensure_column(&conn, "invoices", "company_id", "INTEGER")?;
    ensure_column(&conn, "invoices", "dc_id", "INTEGER")?;
    ensure_column(&conn, "invoices", "status", "TEXT NOT NULL DEFAULT 'draft'")?;
    ensure_column(&conn, "invoices", "notes", "TEXT")?;
    ensure_column(&conn, "company_profiles", "user_id", "INTEGER")?;
    ensure_column(&conn, "company_profiles", "tax_registration_number", "TEXT")?;
    ensure_column(&conn, "company_profiles", "sales_tax_number", "TEXT")?;
    ensure_column(&conn, "company_profiles", "business_type", "TEXT")?;
    ensure_column(&conn, "company_profiles", "currency", "TEXT DEFAULT 'PKR'")?;
    ensure_column(&conn, "company_profiles", "website", "TEXT")?;
    ensure_column(&conn, "company_profiles", "city", "TEXT")?;
    ensure_column(&conn, "company_profiles", "state", "TEXT")?;
    ensure_column(&conn, "company_profiles", "postal_code", "TEXT")?;
    ensure_column(&conn, "company_profiles", "country", "TEXT")?;
    ensure_column(&conn, "customers", "tax_registration_number", "TEXT")?;
    ensure_column(
        &conn,
        "company_profiles",
        "external_id",
        "TEXT NOT NULL DEFAULT (lower(hex(randomblob(16))))",
    )?;
    ensure_column(
        &conn,
        "products",
        "external_id",
        "TEXT NOT NULL DEFAULT (lower(hex(randomblob(16))))",
    )?;
    ensure_column(
        &conn,
        "customers",
        "external_id",
        "TEXT NOT NULL DEFAULT (lower(hex(randomblob(16))))",
    )?;
    ensure_column(
        &conn,
        "delivery_challans",
        "external_id",
        "TEXT NOT NULL DEFAULT (lower(hex(randomblob(16))))",
    )?;
    ensure_column(
        &conn,
        "dc_items",
        "external_id",
        "TEXT NOT NULL DEFAULT (lower(hex(randomblob(16))))",
    )?;
    ensure_column(
        &conn,
        "invoices",
        "external_id",
        "TEXT NOT NULL DEFAULT (lower(hex(randomblob(16))))",
    )?;
    ensure_column(
        &conn,
        "invoice_items",
        "external_id",
        "TEXT NOT NULL DEFAULT (lower(hex(randomblob(16))))",
    )?;
    ensure_column(&conn, "company_profiles", "sync_status", "TEXT NOT NULL DEFAULT 'local_only'")?;
    ensure_column(&conn, "products", "sync_status", "TEXT NOT NULL DEFAULT 'local_only'")?;
    ensure_column(&conn, "customers", "sync_status", "TEXT NOT NULL DEFAULT 'local_only'")?;
    ensure_column(&conn, "delivery_challans", "sync_status", "TEXT NOT NULL DEFAULT 'local_only'")?;
    ensure_column(&conn, "dc_items", "sync_status", "TEXT NOT NULL DEFAULT 'local_only'")?;
    ensure_column(&conn, "invoices", "sync_status", "TEXT NOT NULL DEFAULT 'local_only'")?;
    ensure_column(&conn, "invoice_items", "sync_status", "TEXT NOT NULL DEFAULT 'local_only'")?;
    ensure_column(&conn, "company_profiles", "sync_version", "INTEGER NOT NULL DEFAULT 1")?;
    ensure_column(&conn, "products", "sync_version", "INTEGER NOT NULL DEFAULT 1")?;
    ensure_column(&conn, "customers", "sync_version", "INTEGER NOT NULL DEFAULT 1")?;
    ensure_column(&conn, "delivery_challans", "sync_version", "INTEGER NOT NULL DEFAULT 1")?;
    ensure_column(&conn, "dc_items", "sync_version", "INTEGER NOT NULL DEFAULT 1")?;
    ensure_column(&conn, "invoices", "sync_version", "INTEGER NOT NULL DEFAULT 1")?;
    ensure_column(&conn, "invoice_items", "sync_version", "INTEGER NOT NULL DEFAULT 1")?;
    ensure_column(&conn, "company_profiles", "last_synced_at", "TEXT")?;
    ensure_column(&conn, "products", "last_synced_at", "TEXT")?;
    ensure_column(&conn, "customers", "last_synced_at", "TEXT")?;
    ensure_column(&conn, "delivery_challans", "last_synced_at", "TEXT")?;
    ensure_column(&conn, "dc_items", "last_synced_at", "TEXT")?;
    ensure_column(&conn, "invoices", "last_synced_at", "TEXT")?;
    ensure_column(&conn, "invoice_items", "last_synced_at", "TEXT")?;
    ensure_column(&conn, "company_profiles", "deleted_at", "TEXT")?;
    ensure_column(&conn, "products", "deleted_at", "TEXT")?;
    ensure_column(&conn, "customers", "deleted_at", "TEXT")?;
    ensure_column(&conn, "delivery_challans", "deleted_at", "TEXT")?;
    ensure_column(&conn, "dc_items", "deleted_at", "TEXT")?;
    ensure_column(&conn, "invoices", "deleted_at", "TEXT")?;
    ensure_column(&conn, "invoice_items", "deleted_at", "TEXT")?;
    ensure_column(&conn, "dc_items", "created_at", "TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP")?;
    ensure_column(&conn, "invoices", "created_at", "TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP")?;
    ensure_column(&conn, "invoice_items", "created_at", "TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP")?;
    ensure_index(
        &conn,
        "idx_products_company_active",
        "CREATE INDEX IF NOT EXISTS idx_products_company_active ON products(company_id, deleted_at)",
    )?;
    ensure_index(
        &conn,
        "idx_customers_company_active",
        "CREATE INDEX IF NOT EXISTS idx_customers_company_active ON customers(company_id, deleted_at)",
    )?;
    ensure_index(
        &conn,
        "idx_dc_company_created",
        "CREATE INDEX IF NOT EXISTS idx_dc_company_created ON delivery_challans(company_id, created_at)",
    )?;
    ensure_index(
        &conn,
        "idx_dc_items_dc",
        "CREATE INDEX IF NOT EXISTS idx_dc_items_dc ON dc_items(dc_id)",
    )?;
    ensure_index(
        &conn,
        "idx_invoices_company_created",
        "CREATE INDEX IF NOT EXISTS idx_invoices_company_created ON invoices(company_id, created_at)",
    )?;
    ensure_index(
        &conn,
        "idx_invoice_items_invoice",
        "CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id)",
    )?;
    ensure_index(
        &conn,
        "idx_quotations_company_created",
        "CREATE INDEX IF NOT EXISTS idx_quotations_company_created ON quotations(company_id, created_at)",
    )?;
    ensure_index(
        &conn,
        "idx_quotation_items_quote",
        "CREATE INDEX IF NOT EXISTS idx_quotation_items_quote ON quotation_items(quote_id)",
    )?;
    ensure_index(
        &conn,
        "idx_company_profiles_external_id",
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_company_profiles_external_id ON company_profiles(external_id)",
    )?;

    Ok(())
}

pub fn resolve_db_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve app data directory: {e}"))?;

    fs::create_dir_all(&app_data_dir)
        .map_err(|e| format!("Failed to create app data directory: {e}"))?;

    Ok(app_data_dir.join(DB_FILE_NAME))
}

fn ensure_column(conn: &Connection, table_name: &str, column_name: &str, column_type: &str) -> Result<(), String> {
    let mut stmt = conn
        .prepare(&format!("PRAGMA table_info({table_name})"))
        .map_err(|e| format!("Failed to inspect table {table_name}: {e}"))?;

    let columns = stmt
        .query_map([], |row| row.get::<usize, String>(1))
        .map_err(|e| format!("Failed to read table info for {table_name}: {e}"))?;

    for col in columns {
        if col.map_err(|e| format!("Failed to map table column for {table_name}: {e}"))? == column_name {
            return Ok(());
        }
    }

    conn.execute(
        &format!("ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type}"),
        [],
    )
    .map_err(|e| format!("Failed to add {column_name} to {table_name}: {e}"))?;

    Ok(())
}

fn ensure_index(conn: &Connection, _index_name: &str, ddl: &str) -> Result<(), String> {
    // Best-effort: if the index already exists or data prevents creation (e.g. NULLs in UNIQUE column),
    // we silently skip rather than crashing the app.
    let _ = conn.execute(ddl, []);
    Ok(())
}
