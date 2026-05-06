use crate::db;
use rusqlite::params;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize)]
pub struct InvoiceItem {
    pub id: i64,
    pub product_id: Option<i64>,
    pub description: String,
    pub quantity: i64,
    pub rate: f64,
    pub amount: f64,
}

#[derive(Debug, Serialize)]
pub struct Invoice {
    pub id: i64,
    pub invoice_number: String,
    pub dc_id: Option<i64>,
    pub dc_number: Option<String>,
    pub customer_id: i64,
    pub customer_name: String,
    pub company_id: i64,
    pub status: String,
    pub notes: Option<String>,
    pub total_amount: f64,
    pub created_at: String,
    pub items: Vec<InvoiceItem>,
}

#[derive(Debug, Deserialize)]
pub struct CreateInvoiceFromChallanInput {
    pub company_id: i64,
    pub dc_id: i64,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct InvoiceResult {
    pub id: i64,
    pub invoice_number: String,
}

#[tauri::command]
pub fn create_invoice_from_challan(
    app: tauri::AppHandle,
    input: CreateInvoiceFromChallanInput,
) -> Result<InvoiceResult, String> {
    if input.company_id <= 0 {
        return Err("Company profile is required".to_string());
    }
    if input.dc_id <= 0 {
        return Err("Delivery challan is required".to_string());
    }

    let mut conn = db::open_connection(&app)?;
    let tx = conn
        .transaction()
        .map_err(|e| format!("Failed to start transaction: {e}"))?;

    let (dc_id, customer_id): (i64, i64) = tx
        .query_row(
            "SELECT id, customer_id FROM delivery_challans WHERE id = ?1 AND company_id = ?2 AND deleted_at IS NULL",
            params![input.dc_id, input.company_id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(|_| "Delivery challan not found".to_string())?;

    let invoice_number = generate_invoice_number(&tx)?;

    tx.execute(
        "INSERT INTO invoices (invoice_number, dc_id, customer_id, company_id, status, notes)
         VALUES (?1, ?2, ?3, ?4, 'issued', ?5)",
        params![invoice_number, dc_id, customer_id, input.company_id, input.notes],
    )
    .map_err(|e| format!("Failed to create invoice: {e}"))?;
    let invoice_id = tx.last_insert_rowid();

    {
        let mut stmt = tx
            .prepare(
                "SELECT product_id, quantity, rate
                 FROM dc_items
                 WHERE dc_id = ?1 AND deleted_at IS NULL",
            )
            .map_err(|e| format!("Failed to prepare challan items query: {e}"))?;
        let rows = stmt
            .query_map([dc_id], |row| {
                Ok((
                    row.get::<_, i64>(0)?,
                    row.get::<_, i64>(1)?,
                    row.get::<_, f64>(2)?,
                ))
            })
            .map_err(|e| format!("Failed to read challan items: {e}"))?;

        for row in rows {
            let (product_id, quantity, rate) = row.map_err(|e| format!("Failed to map challan item: {e}"))?;
            let description: String = tx
                .query_row(
                    "SELECT name FROM products WHERE id = ?1",
                    [product_id],
                    |r| r.get(0),
                )
                .map_err(|e| format!("Failed to read product name: {e}"))?;
            let amount = quantity as f64 * rate;
            tx.execute(
                "INSERT INTO invoice_items (invoice_id, product_id, description, quantity, rate, amount)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                params![invoice_id, product_id, description, quantity, rate, amount],
            )
            .map_err(|e| format!("Failed to create invoice item: {e}"))?;
        }
    }

    tx.commit()
        .map_err(|e| format!("Failed to commit invoice transaction: {e}"))?;

    Ok(InvoiceResult {
        id: invoice_id,
        invoice_number,
    })
}

#[tauri::command]
pub fn list_invoices(app: tauri::AppHandle, company_id: i64) -> Result<Vec<Invoice>, String> {
    if company_id <= 0 {
        return Err("Company profile is required".to_string());
    }

    let conn = db::open_connection(&app)?;
    let mut stmt = conn
        .prepare(
            r#"
            SELECT
                i.id, i.invoice_number, i.dc_id, i.customer_id, i.company_id, i.status, i.notes, i.created_at,
                c.name as customer_name, dc.dc_number,
                COALESCE(SUM(ii.amount), 0) as total_amount
            FROM invoices i
            JOIN customers c ON i.customer_id = c.id
            LEFT JOIN delivery_challans dc ON i.dc_id = dc.id
            LEFT JOIN invoice_items ii ON i.id = ii.invoice_id AND ii.deleted_at IS NULL
            WHERE i.company_id = ?1 AND i.deleted_at IS NULL
            GROUP BY i.id, i.invoice_number, i.dc_id, i.customer_id, i.company_id, i.status, i.notes, i.created_at, c.name, dc.dc_number
            ORDER BY i.created_at DESC
            "#,
        )
        .map_err(|e| format!("Failed to prepare invoice query: {e}"))?;

    let rows = stmt
        .query_map([company_id], |row| {
            Ok((
                row.get::<_, i64>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, Option<i64>>(2)?,
                row.get::<_, i64>(3)?,
                row.get::<_, i64>(4)?,
                row.get::<_, String>(5)?,
                row.get::<_, Option<String>>(6)?,
                row.get::<_, String>(7)?,
                row.get::<_, String>(8)?,
                row.get::<_, Option<String>>(9)?,
                row.get::<_, f64>(10)?,
            ))
        })
        .map_err(|e| format!("Failed to fetch invoices: {e}"))?;

    let mut invoices = Vec::new();
    for row in rows {
        let (id, invoice_number, dc_id, customer_id, company_id, status, notes, created_at, customer_name, dc_number, total_amount) =
            row.map_err(|e| format!("Failed to map invoice row: {e}"))?;
        let items = get_invoice_items(&conn, id)?;
        invoices.push(Invoice {
            id,
            invoice_number,
            dc_id,
            dc_number,
            customer_id,
            customer_name,
            company_id,
            status,
            notes,
            total_amount,
            created_at,
            items,
        });
    }

    Ok(invoices)
}

fn get_invoice_items(conn: &rusqlite::Connection, invoice_id: i64) -> Result<Vec<InvoiceItem>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, product_id, description, quantity, rate, amount
             FROM invoice_items
             WHERE invoice_id = ?1 AND deleted_at IS NULL
             ORDER BY id ASC",
        )
        .map_err(|e| format!("Failed to prepare invoice items query: {e}"))?;
    let rows = stmt
        .query_map([invoice_id], |row| {
            Ok(InvoiceItem {
                id: row.get(0)?,
                product_id: row.get(1)?,
                description: row.get(2)?,
                quantity: row.get(3)?,
                rate: row.get(4)?,
                amount: row.get(5)?,
            })
        })
        .map_err(|e| format!("Failed to fetch invoice items: {e}"))?;
    let mut items = Vec::new();
    for row in rows {
        items.push(row.map_err(|e| format!("Failed to map invoice item row: {e}"))?);
    }
    Ok(items)
}

fn generate_invoice_number(tx: &rusqlite::Transaction) -> Result<String, String> {
    let count: i64 = tx
        .query_row("SELECT COUNT(*) FROM invoices", [], |row| row.get(0))
        .map_err(|e| format!("Failed to generate invoice number: {e}"))?;
    Ok(format!("INV-{:05}", count + 1))
}

#[tauri::command]
pub fn delete_invoice(app: tauri::AppHandle, invoice_id: i64) -> Result<(), String> {
    if invoice_id <= 0 {
        return Err("Invalid invoice ID".to_string());
    }
    let mut conn = db::open_connection(&app)?;
    let tx = conn.transaction().map_err(|e| format!("Failed to start transaction: {e}"))?;
    
    let exists: bool = tx.query_row("SELECT EXISTS(SELECT 1 FROM invoices WHERE id = ?1 AND deleted_at IS NULL)", [invoice_id], |r| r.get(0))
        .map_err(|e| format!("Failed to check invoice: {e}"))?;
    if !exists { return Err("Invoice not found".to_string()); }

    tx.execute("UPDATE invoice_items SET deleted_at = datetime('now') WHERE invoice_id = ?1", [invoice_id])
        .map_err(|e| format!("Failed to delete invoice items: {e}"))?;
    tx.execute("UPDATE invoices SET deleted_at = datetime('now') WHERE id = ?1", [invoice_id])
        .map_err(|e| format!("Failed to delete invoice: {e}"))?;
        
    tx.commit().map_err(|e| format!("Failed to commit deletion: {e}"))?;
    Ok(())
}

#[derive(Debug, Deserialize)]
pub struct UpdateInvoiceInput {
    pub invoice_id: i64,
    pub status: String,
    pub notes: Option<String>,
}

#[tauri::command]
pub fn update_invoice(
    app: tauri::AppHandle,
    input: UpdateInvoiceInput,
) -> Result<(), String> {
    let conn = db::open_connection(&app)?;
    conn.execute(
        "UPDATE invoices SET status = ?1, notes = ?2, updated_at = datetime('now') WHERE id = ?3 AND deleted_at IS NULL",
        params![input.status, input.notes, input.invoice_id],
    )
    .map_err(|e| format!("Failed to update invoice: {e}"))?;
    Ok(())
}
