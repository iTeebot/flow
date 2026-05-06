use crate::db;
use base64::Engine;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Deserialize)]
pub struct CreateDeliveryChallanItemInput {
    pub product_id: i64,
    pub quantity: f64,
}

#[derive(Debug, Deserialize)]
pub struct CreateDeliveryChallanInput {
    pub company_id: i64,
    pub customer_id: i64,
    pub items: Vec<CreateDeliveryChallanItemInput>,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateDeliveryChallanInput {
    pub id: i64,
    pub company_id: i64,
    pub customer_id: i64,
    pub items: Vec<CreateDeliveryChallanItemInput>,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Serialize)]
pub struct DeliveryChallanResult {
    pub id: i64,
    pub dc_number: String,
}

#[derive(Debug, Serialize)]
pub struct DeliveryChallanItem {
    pub id: i64,
    pub product_id: i64,
    pub product_name: String,
    pub product_sku: String,
    pub quantity: f64,
    pub rate: f64,
    pub amount: f64,
}

#[derive(Debug, Serialize)]
pub struct DeliveryChallan {
    pub id: i64,
    pub dc_number: String,
    pub customer_id: i64,
    pub customer_name: String,
    pub company_id: i64,
    pub items: Vec<DeliveryChallanItem>,
    pub total_amount: f64,
    pub created_at: String,
    pub metadata: Option<serde_json::Value>,
}

#[tauri::command]
pub fn create_delivery_challan(
    app: tauri::AppHandle,
    input: CreateDeliveryChallanInput,
) -> Result<DeliveryChallanResult, String> {
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

    let company_exists: bool = conn
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM company_profiles WHERE id = ?1)",
            [input.company_id],
            |row| row.get(0),
        )
        .map_err(|e| format!("Failed to validate company profile: {e}"))?;
    if !company_exists {
        return Err("Company profile not found".to_string());
    }

    let customer_exists: bool = conn
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM customers WHERE id = ?1 AND company_id = ?2)",
            params![input.customer_id, input.company_id],
            |row| row.get(0),
        )
        .map_err(|e| format!("Failed to validate customer: {e}"))?;
    if !customer_exists {
        return Err("Customer not found".to_string());
    }

    let tx = conn
        .transaction()
        .map_err(|e| format!("Failed to start transaction: {e}"))?;

    for item in &input.items {
        if item.product_id <= 0 {
            return Err("Invalid product in items".to_string());
        }
        if item.quantity <= 0.0 {
            return Err("Item quantity must be greater than zero".to_string());
        }

        let stock: f64 = tx
            .query_row(
                "SELECT stock_qty FROM products WHERE id = ?1 AND company_id = ?2",
                params![item.product_id, input.company_id],
                |row| row.get(0),
            )
            .map_err(|_| format!("Product {} not found", item.product_id))?;

        if stock < item.quantity {
            return Err(format!(
                "Insufficient stock for product {} (available: {:.2}, requested: {:.2})",
                item.product_id, stock, item.quantity
            ));
        }
    }

    let dc_number = generate_dc_number(&tx)?;
    let metadata_str = input.metadata.as_ref().map(|m| serde_json::to_string(m).unwrap());

    tx.execute(
        "INSERT INTO delivery_challans (dc_number, customer_id, company_id, metadata) VALUES (?1, ?2, ?3, ?4)",
        params![dc_number, input.customer_id, input.company_id, metadata_str],
    )
    .map_err(|e| format!("Failed to create delivery challan: {e}"))?;

    let dc_id = tx.last_insert_rowid();
    for item in &input.items {
        let rate: f64 = tx
            .query_row(
                "SELECT price FROM products WHERE id = ?1 AND company_id = ?2",
                params![item.product_id, input.company_id],
                |row| row.get(0),
            )
            .map_err(|e| format!("Failed to get product rate: {e}"))?;

        tx.execute(
            "INSERT INTO dc_items (dc_id, product_id, quantity, rate) VALUES (?1, ?2, ?3, ?4)",
            params![dc_id, item.product_id, item.quantity, rate],
        )
        .map_err(|e| format!("Failed to insert DC item: {e}"))?;

        tx.execute(
            "UPDATE products SET stock_qty = stock_qty - ?1 WHERE id = ?2",
            params![item.quantity, item.product_id],
        )
        .map_err(|e| format!("Failed to update stock: {e}"))?;
    }

    tx.commit()
        .map_err(|e| format!("Failed to commit delivery challan transaction: {e}"))?;

    Ok(DeliveryChallanResult {
        id: dc_id,
        dc_number,
    })
}

#[tauri::command]
pub fn list_delivery_challans(app: tauri::AppHandle, company_id: i64) -> Result<Vec<DeliveryChallan>, String> {
    if company_id <= 0 {
        return Err("Company profile is required".to_string());
    }

    let conn = db::open_connection(&app)?;
    let mut stmt = conn
        .prepare(
            r#"
            SELECT 
                dc.id, dc.dc_number, dc.customer_id, dc.created_at,
                c.name as customer_name,
                SUM(dci.quantity * dci.rate) as total_amount,
                dc.metadata
            FROM delivery_challans dc
            JOIN customers c ON dc.customer_id = c.id
            LEFT JOIN dc_items dci ON dc.id = dci.dc_id AND dci.deleted_at IS NULL
            WHERE dc.company_id = ?1 AND dc.deleted_at IS NULL
            GROUP BY dc.id, dc.dc_number, dc.customer_id, dc.created_at, c.name, dc.metadata
            ORDER BY dc.created_at DESC
            "#,
        )
        .map_err(|e| format!("Failed to prepare delivery challan query: {e}"))?;

    let rows = stmt
        .query_map([company_id], |row| {
            let metadata_str: Option<String> = row.get(6)?;
            let metadata = metadata_str.and_then(|s| serde_json::from_str(&s).ok());
            Ok((
                row.get::<_, i64>(0)?, // id
                row.get::<_, String>(1)?, // dc_number
                row.get::<_, i64>(2)?, // customer_id
                row.get::<_, String>(3)?, // created_at
                row.get::<_, String>(4)?, // customer_name
                row.get::<_, Option<f64>>(5)?.unwrap_or(0.0), // total_amount
                metadata,
            ))
        })
        .map_err(|e| format!("Failed to fetch delivery challans: {e}"))?;

    let mut delivery_challans = Vec::new();
    for row_result in rows {
        let (id, dc_number, customer_id, created_at, customer_name, total_amount, metadata): (i64, String, i64, String, String, f64, Option<serde_json::Value>) = row_result.map_err(|e| format!("Failed to map row: {e}"))?;
        
        // Get items for this delivery challan
        let items = get_delivery_challan_items(&conn, id)?;
        
        delivery_challans.push(DeliveryChallan {
            id,
            dc_number,
            customer_id,
            customer_name,
            company_id,
            items,
            total_amount,
            created_at,
            metadata,
        });
    }
    
    Ok(delivery_challans)
}

#[tauri::command]
pub fn get_delivery_challan(app: tauri::AppHandle, dc_id: i64) -> Result<DeliveryChallan, String> {
    if dc_id <= 0 {
        return Err("Invalid delivery challan ID".to_string());
    }

    let conn = db::open_connection(&app)?;
    let (id, dc_number, customer_id, company_id, created_at, customer_name, total_amount, metadata) = conn
        .query_row(
            r#"
            SELECT 
                dc.id, dc.dc_number, dc.customer_id, dc.company_id, dc.created_at,
                c.name as customer_name,
                COALESCE(SUM(dci.quantity * dci.rate), 0.0) as total_amount,
                dc.metadata
            FROM delivery_challans dc
            JOIN customers c ON dc.customer_id = c.id
            LEFT JOIN dc_items dci ON dc.id = dci.dc_id AND dci.deleted_at IS NULL
            WHERE dc.id = ?1 AND dc.deleted_at IS NULL
            GROUP BY dc.id, dc.dc_number, dc.customer_id, dc.company_id, dc.created_at, c.name, dc.metadata
            "#,
            [dc_id],
            |row| {
                let metadata_str: Option<String> = row.get(7)?;
                let metadata = metadata_str.and_then(|s| serde_json::from_str(&s).ok());
                Ok((
                    row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?, row.get(4)?, row.get(5)?, row.get(6)?, metadata
                ))
            },
        )
        .map_err(|_| "Delivery challan not found".to_string())?;

    let items = get_delivery_challan_items(&conn, id)?;
    
    Ok(DeliveryChallan {
        id,
        dc_number,
        customer_id,
        customer_name,
        company_id,
        items,
        total_amount,
        created_at,
        metadata,
    })
}

fn get_delivery_challan_items(conn: &rusqlite::Connection, dc_id: i64) -> Result<Vec<DeliveryChallanItem>, String> {
    let mut stmt = conn
        .prepare(
            r#"
            SELECT 
                dci.id, dci.product_id, dci.quantity, dci.rate,
                p.name as product_name, p.sku as product_sku
            FROM dc_items dci
            JOIN products p ON dci.product_id = p.id
            WHERE dci.dc_id = ?1 AND dci.deleted_at IS NULL
            ORDER BY dci.id
            "#,
        )
        .map_err(|e| format!("Failed to prepare DC items query: {e}"))?;

    let rows = stmt
        .query_map([dc_id], |row| {
            let quantity: f64 = row.get(2)?;
            let rate: f64 = row.get(3)?;
            Ok(DeliveryChallanItem {
                id: row.get(0)?,
                product_id: row.get(1)?,
                product_name: row.get(4)?,
                product_sku: row.get(5)?,
                quantity,
                rate,
                amount: quantity * rate,
            })
        })
        .map_err(|e| format!("Failed to fetch DC items: {e}"))?;

    let mut items = Vec::new();
    for row in rows {
        items.push(row.map_err(|e| format!("Failed to map DC item row: {e}"))?);
    }
    Ok(items)
}

fn generate_dc_number(tx: &rusqlite::Transaction) -> Result<String, String> {
    let count: i64 = tx
        .query_row("SELECT COUNT(*) FROM delivery_challans", [], |row| row.get(0))
        .map_err(|e| format!("Failed to generate challan number: {e}"))?;

    Ok(format!("DC-{:05}", count + 1))
}

#[tauri::command]
pub fn update_delivery_challan(
    app: tauri::AppHandle,
    input: UpdateDeliveryChallanInput,
) -> Result<(), String> {
    if input.id <= 0 {
        return Err("Invalid delivery challan ID".to_string());
    }
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

    // 1. Verify existence
    let exists: bool = tx
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM delivery_challans WHERE id = ?1 AND company_id = ?2 AND deleted_at IS NULL)",
            params![input.id, input.company_id],
            |row| row.get(0),
        )
        .map_err(|e| format!("Failed to validate delivery challan: {e}"))?;
    if !exists {
        return Err("Delivery challan not found".to_string());
    }

    // 2. Restore stock for old items
    let mut stmt = tx
        .prepare("SELECT product_id, quantity FROM dc_items WHERE dc_id = ?1 AND deleted_at IS NULL")
        .map_err(|e| format!("Failed to prepare old items query: {e}"))?;
    let old_items: Vec<(i64, f64)> = stmt
        .query_map([input.id], |row| Ok((row.get(0)?, row.get(1)?)))
        .map_err(|e| format!("Failed to fetch old items: {e}"))?
        .filter_map(|r| r.ok())
        .collect();
    drop(stmt);

    for (product_id, quantity) in old_items {
        tx.execute(
            "UPDATE products SET stock_qty = stock_qty + ?1 WHERE id = ?2",
            params![quantity, product_id],
        )
        .map_err(|e| format!("Failed to restore stock: {e}"))?;
    }

    // 3. Mark old items as deleted
    tx.execute(
        "UPDATE dc_items SET deleted_at = datetime('now') WHERE dc_id = ?1 AND deleted_at IS NULL",
        [input.id],
    )
    .map_err(|e| format!("Failed to clear old items: {e}"))?;

    // 4. Update header
    let metadata_str = input.metadata.as_ref().map(|m| serde_json::to_string(m).unwrap());
    tx.execute(
        "UPDATE delivery_challans SET customer_id = ?1, metadata = ?2 WHERE id = ?3",
        params![input.customer_id, metadata_str, input.id],
    )
    .map_err(|e| format!("Failed to update delivery challan: {e}"))?;

    // 5. Insert new items and deduct stock
    for item in &input.items {
        let rate: f64 = tx
            .query_row(
                "SELECT price FROM products WHERE id = ?1 AND company_id = ?2",
                params![item.product_id, input.company_id],
                |row| row.get(0),
            )
            .map_err(|e| format!("Failed to get product rate for product {}: {e}", item.product_id))?;

        tx.execute(
            "INSERT INTO dc_items (dc_id, product_id, quantity, rate) VALUES (?1, ?2, ?3, ?4)",
            params![input.id, item.product_id, item.quantity, rate],
        )
        .map_err(|e| format!("Failed to insert new DC item: {e}"))?;

        tx.execute(
            "UPDATE products SET stock_qty = stock_qty - ?1 WHERE id = ?2",
            params![item.quantity, item.product_id],
        )
        .map_err(|e| format!("Failed to update stock for product {}: {e}", item.product_id))?;
    }

    tx.commit()
        .map_err(|e| format!("Failed to commit update: {e}"))?;

    Ok(())
}

#[tauri::command]
pub fn save_delivery_challan_pdf(filename: String, base64_data: String) -> Result<String, String> {
    if filename.trim().is_empty() {
        return Err("Filename is required".to_string());
    }
    if base64_data.trim().is_empty() {
        return Err("PDF content is required".to_string());
    }

    let bytes = base64::engine::general_purpose::STANDARD
        .decode(base64_data)
        .map_err(|e| format!("Failed to decode PDF data: {e}"))?;

    let mut output_path: PathBuf = dirs::download_dir().unwrap_or_else(|| {
        std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."))
    });
    output_path.push(filename);

    fs::write(&output_path, bytes).map_err(|e| format!("Failed to save PDF file: {e}"))?;

    Ok(output_path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn delete_delivery_challan(app: tauri::AppHandle, dc_id: i64) -> Result<(), String> {
    if dc_id <= 0 {
        return Err("Invalid delivery challan ID".to_string());
    }

    let mut conn = db::open_connection(&app)?;
    let tx = conn
        .transaction()
        .map_err(|e| format!("Failed to start transaction: {e}"))?;

    // Verify the challan exists and isn't already deleted
    let exists: bool = tx
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM delivery_challans WHERE id = ?1 AND deleted_at IS NULL)",
            [dc_id],
            |row| row.get(0),
        )
        .map_err(|e| format!("Failed to check delivery challan: {e}"))?;

    if !exists {
        return Err("Delivery challan not found".to_string());
    }

    // Restore stock for all items in this challan
    let mut stmt = tx
        .prepare("SELECT product_id, quantity FROM dc_items WHERE dc_id = ?1 AND deleted_at IS NULL")
        .map_err(|e| format!("Failed to prepare items query: {e}"))?;

    let items: Vec<(i64, f64)> = stmt
        .query_map([dc_id], |row| Ok((row.get(0)?, row.get(1)?)))
        .map_err(|e| format!("Failed to fetch items: {e}"))?
        .filter_map(|r| r.ok())
        .collect();

    drop(stmt);

    for (product_id, quantity) in &items {
        tx.execute(
            "UPDATE products SET stock_qty = stock_qty + ?1 WHERE id = ?2",
            params![quantity, product_id],
        )
        .map_err(|e| format!("Failed to restore stock: {e}"))?;
    }

    // Soft-delete the items
    tx.execute(
        "UPDATE dc_items SET deleted_at = datetime('now') WHERE dc_id = ?1",
        [dc_id],
    )
    .map_err(|e| format!("Failed to delete challan items: {e}"))?;

    // Soft-delete the challan
    tx.execute(
        "UPDATE delivery_challans SET deleted_at = datetime('now') WHERE id = ?1",
        [dc_id],
    )
    .map_err(|e| format!("Failed to delete delivery challan: {e}"))?;

    tx.commit()
        .map_err(|e| format!("Failed to commit deletion: {e}"))?;

    Ok(())
}
