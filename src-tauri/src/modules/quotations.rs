use crate::db;
use rusqlite::params;
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
pub struct CreateQuotationItemInput {
    pub product_id: Option<i64>,
    pub description: String,
    pub quantity: i64,
    pub rate: f64,
}

#[derive(Debug, Deserialize)]
pub struct CreateQuotationInput {
    pub company_id: i64,
    pub customer_id: i64,
    pub items: Vec<CreateQuotationItemInput>,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct QuotationResult {
    pub id: i64,
    pub quote_number: String,
}

#[derive(Debug, Serialize)]
pub struct QuotationItem {
    pub id: i64,
    pub product_id: Option<i64>,
    pub product_name: String,
    pub product_sku: Option<String>,
    pub description: String,
    pub quantity: i64,
    pub rate: f64,
    pub amount: f64,
}

#[derive(Debug, Serialize)]
pub struct Quotation {
    pub id: i64,
    pub quote_number: String,
    pub customer_id: i64,
    pub customer_name: String,
    pub customer_address: Option<String>,
    pub customer_phone: Option<String>,
    pub company_id: i64,
    pub items: Vec<QuotationItem>,
    pub total_amount: f64,
    pub notes: Option<String>,
    pub status: String,
    pub created_at: String,
}

#[tauri::command]
pub fn create_quotation(
    app: tauri::AppHandle,
    input: CreateQuotationInput,
) -> Result<QuotationResult, String> {
    if input.company_id <= 0 {
        return Err("Company profile is required".to_string());
    }
    if input.customer_id <= 0 {
        return Err("Customer is required".to_string());
    }
    if input.items.is_empty() {
        return Err("At least one item is required".to_string());
    }

    let mut conn = db::open_connection(&app)?;

    let tx = conn
        .transaction()
        .map_err(|e| format!("Failed to start transaction: {e}"))?;

    let quote_number = generate_quote_number(&tx)?;
    
    tx.execute(
        "INSERT INTO quotations (quote_number, customer_id, company_id, notes, status) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![quote_number, input.customer_id, input.company_id, input.notes, "draft"],
    )
    .map_err(|e| format!("Failed to create quotation: {e}"))?;

    let quote_id = tx.last_insert_rowid();

    for item in &input.items {
        let amount = item.quantity as f64 * item.rate;
        tx.execute(
            "INSERT INTO quotation_items (quote_id, product_id, description, quantity, rate, amount) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![quote_id, item.product_id, item.description, item.quantity, item.rate, amount],
        )
        .map_err(|e| format!("Failed to insert quotation item: {e}"))?;
    }

    tx.commit()
        .map_err(|e| format!("Failed to commit quotation transaction: {e}"))?;

    Ok(QuotationResult {
        id: quote_id,
        quote_number,
    })
}

#[tauri::command]
pub fn list_quotations(app: tauri::AppHandle, company_id: i64) -> Result<Vec<Quotation>, String> {
    if company_id <= 0 {
        return Err("Company profile is required".to_string());
    }

    let conn = db::open_connection(&app)?;
    let mut stmt = conn
        .prepare(
            r#"
            SELECT 
                q.id, q.quote_number, q.customer_id, q.company_id, q.notes, q.status, q.created_at,
                c.name as customer_name, c.address as customer_address, c.phone as customer_phone,
                COALESCE(SUM(qi.amount), 0) as total_amount
            FROM quotations q
            JOIN customers c ON q.customer_id = c.id
            LEFT JOIN quotation_items qi ON q.id = qi.quote_id
            WHERE q.company_id = ?1 AND q.deleted_at IS NULL
            GROUP BY q.id, q.quote_number, q.customer_id, q.company_id, q.notes, q.status, q.created_at, c.name, c.address, c.phone
            ORDER BY q.created_at DESC
            "#,
        )
        .map_err(|e| format!("Failed to prepare quotations query: {e}"))?;

    let rows = stmt
        .query_map([company_id], |row| {
            Ok(Quotation {
                id: row.get(0)?,
                quote_number: row.get(1)?,
                customer_id: row.get(2)?,
                company_id: row.get(3)?,
                notes: row.get(4)?,
                status: row.get(5)?,
                created_at: row.get(6)?,
                customer_name: row.get(7)?,
                customer_address: row.get(8)?,
                customer_phone: row.get(9)?,
                total_amount: row.get(10)?,
                items: Vec::new(), // Will be filled below
            })
        })
        .map_err(|e| format!("Failed to fetch quotations: {e}"))?;

    let mut quotations = Vec::new();
    for row_result in rows {
        let mut quote = row_result.map_err(|e| format!("Failed to map row: {e}"))?;
        quote.items = get_quotation_items(&conn, quote.id)?;
        quotations.push(quote);
    }
    
    Ok(quotations)
}

#[tauri::command]
pub fn delete_quotation(app: tauri::AppHandle, quote_id: i64) -> Result<(), String> {
    let mut conn = db::open_connection(&app)?;
    conn.execute(
        "UPDATE quotations SET deleted_at = datetime('now') WHERE id = ?1",
        [quote_id],
    )
    .map_err(|e| format!("Failed to delete quotation: {e}"))?;
    Ok(())
}

fn get_quotation_items(conn: &rusqlite::Connection, quote_id: i64) -> Result<Vec<QuotationItem>, String> {
    let mut stmt = conn
        .prepare(
            r#"
            SELECT 
                qi.id, qi.product_id, qi.description, qi.quantity, qi.rate, qi.amount,
                p.name as product_name, p.sku as product_sku
            FROM quotation_items qi
            LEFT JOIN products p ON qi.product_id = p.id
            WHERE qi.quote_id = ?1 AND qi.deleted_at IS NULL
            ORDER BY qi.id
            "#,
        )
        .map_err(|e| format!("Failed to prepare quotation items query: {e}"))?;

    let rows = stmt
        .query_map([quote_id], |row| {
            Ok(QuotationItem {
                id: row.get(0)?,
                product_id: row.get(1)?,
                description: row.get(2)?,
                quantity: row.get(3)?,
                rate: row.get(4)?,
                amount: row.get(5)?,
                product_name: row.get::<_, Option<String>>(6)?.unwrap_or_else(|| row.get::<_, String>(2).unwrap_or_default()),
                product_sku: row.get(7)?,
            })
        })
        .map_err(|e| format!("Failed to fetch quotation items: {e}"))?;

    let mut items = Vec::new();
    for row in rows {
        items.push(row.map_err(|e| format!("Failed to map quotation item row: {e}"))?);
    }
    Ok(items)
}

fn generate_quote_number(tx: &rusqlite::Transaction) -> Result<String, String> {
    let count: i64 = tx
        .query_row("SELECT COUNT(*) FROM quotations", [], |row| row.get(0))
        .map_err(|e| format!("Failed to generate quote number: {e}"))?;

    Ok(format!("QTN-{:05}", count + 1))
}
