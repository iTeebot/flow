use crate::db;
use rusqlite::params;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct InvoiceItem {
    pub id: i64,
    pub product_id: Option<i64>,
    pub description: String,
    pub quantity: f64,
    pub unit_price: f64,
    pub amount: f64,
    pub tax_rate: Option<String>,
    pub hs_code: Option<String>,
    pub uom: Option<String>,
    pub value_sales_excluding_st: Option<f64>,
    pub fixed_notified_value_or_retail_price: Option<f64>,
    pub sales_tax_applicable: Option<f64>,
    pub sales_tax_withheld_at_source: Option<f64>,
    pub extra_tax: Option<f64>,
    pub further_tax: Option<f64>,
    pub sro_schedule_no: Option<String>,
    pub fed_payable: Option<f64>,
    pub discount: Option<f64>,
    pub sale_type: Option<String>,
    pub sro_item_serial_no: Option<String>,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize)]
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
    pub invoice_type: Option<String>,
    pub invoice_date: Option<String>,
    pub seller_ntn_cnic: Option<String>,
    pub seller_province: Option<String>,
    pub buyer_ntn_cnic: Option<String>,
    pub buyer_province: Option<String>,
    pub buyer_registration_type: Option<String>,
    pub invoice_ref_no: Option<String>,
    pub items: Vec<InvoiceItem>,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct CreateInvoiceFromChallanInput {
    pub company_id: i64,
    pub dc_id: i64,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct DetailedInvoiceItemInput {
    pub product_id: Option<i64>,
    pub description: String,
    pub quantity: f64,
    pub unit_price: f64,
    pub tax_rate: Option<String>,
    pub hs_code: Option<String>,
    pub uom: Option<String>,
    pub value_sales_excluding_st: Option<f64>,
    pub fixed_notified_value_or_retail_price: Option<f64>,
    pub sales_tax_applicable: Option<f64>,
    pub sales_tax_withheld_at_source: Option<f64>,
    pub extra_tax: Option<f64>,
    pub further_tax: Option<f64>,
    pub sro_schedule_no: Option<String>,
    pub fed_payable: Option<f64>,
    pub discount: Option<f64>,
    pub sale_type: Option<String>,
    pub sro_item_serial_no: Option<String>,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct CreateDetailedInvoiceInput {
    pub company_id: i64,
    pub customer_id: i64,
    pub invoice_type: String,
    pub invoice_date: String,
    pub seller_ntn_cnic: Option<String>,
    pub seller_province: Option<String>,
    pub buyer_ntn_cnic: Option<String>,
    pub buyer_province: Option<String>,
    pub buyer_registration_type: Option<String>,
    pub invoice_ref_no: Option<String>,
    pub notes: Option<String>,
    pub items: Vec<DetailedInvoiceItemInput>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateInvoiceInput {
    pub id: i64,
    pub customer_id: i64,
    pub invoice_type: String,
    pub invoice_date: String,
    pub seller_ntn_cnic: Option<String>,
    pub seller_province: Option<String>,
    pub buyer_ntn_cnic: Option<String>,
    pub buyer_province: Option<String>,
    pub buyer_registration_type: Option<String>,
    pub invoice_ref_no: Option<String>,
    pub notes: Option<String>,
    pub items: Vec<DetailedInvoiceItemInput>,
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
        params![
            invoice_number,
            dc_id,
            customer_id,
            input.company_id,
            input.notes
        ],
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
                    row.get::<_, f64>(1)?, // quantity is f64
                    row.get::<_, f64>(2)?, // rate is f64
                ))
            })
            .map_err(|e| format!("Failed to read challan items: {e}"))?;

        for row in rows {
            let (product_id, quantity, rate) =
                row.map_err(|e| format!("Failed to map challan item: {e}"))?;
            let description: String = tx
                .query_row(
                    "SELECT name FROM products WHERE id = ?1",
                    [product_id],
                    |r| r.get(0),
                )
                .map_err(|e| format!("Failed to read product name: {e}"))?;
            let amount = quantity * rate;
            tx.execute(
                "INSERT INTO invoice_items (invoice_id, product_id, description, quantity, unit_price, rate, amount)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                params![invoice_id, product_id, description, quantity, rate, rate, amount],
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
                COALESCE(SUM(ii.amount), 0.0) as total_amount,
                i.invoice_type, i.invoice_date, i.seller_ntn_cnic, i.seller_province,
                i.buyer_ntn_cnic, i.buyer_province, i.buyer_registration_type, i.invoice_ref_no,
                i.metadata
            FROM invoices i
            JOIN customers c ON i.customer_id = c.id
            LEFT JOIN delivery_challans dc ON i.dc_id = dc.id
            LEFT JOIN invoice_items ii ON i.id = ii.invoice_id AND ii.deleted_at IS NULL
            WHERE i.company_id = ?1 AND i.deleted_at IS NULL
            GROUP BY 
                i.id, i.invoice_number, i.dc_id, i.customer_id, i.company_id, i.status, i.notes, i.created_at, c.name, dc.dc_number,
                i.invoice_type, i.invoice_date, i.seller_ntn_cnic, i.seller_province, i.buyer_ntn_cnic, i.buyer_province, i.buyer_registration_type, i.invoice_ref_no,
                i.metadata
            ORDER BY i.created_at DESC
            "#,
        )
        .map_err(|e| format!("Failed to prepare invoice query: {e}"))?;

    let rows = stmt
        .query_map([company_id], |row| {
            let metadata_str: Option<String> = row.get(19)?;
            let metadata = metadata_str.and_then(|s| serde_json::from_str(&s).ok());

            Ok(Invoice {
                id: row.get(0)?,
                invoice_number: row.get(1)?,
                dc_id: row.get(2)?,
                customer_id: row.get(3)?,
                company_id: row.get(4)?,
                status: row.get(5)?,
                notes: row.get(6)?,
                created_at: row.get(7)?,
                customer_name: row.get(8)?,
                dc_number: row.get(9)?,
                total_amount: row.get(10)?,
                invoice_type: row.get(11)?,
                invoice_date: row.get(12)?,
                seller_ntn_cnic: row.get(13)?,
                seller_province: row.get(14)?,
                buyer_ntn_cnic: row.get(15)?,
                buyer_province: row.get(16)?,
                buyer_registration_type: row.get(17)?,
                invoice_ref_no: row.get(18)?,
                metadata,
                items: Vec::new(), // Populated below
            })
        })
        .map_err(|e| format!("Failed to fetch invoices: {e}"))?;

    let mut invoices = Vec::new();
    for row in rows {
        let mut inv = row.map_err(|e| format!("Failed to map invoice row: {e}"))?;
        inv.items = get_invoice_items(&conn, inv.id)?;
        invoices.push(inv);
    }

    Ok(invoices)
}

#[tauri::command]
pub fn create_detailed_invoice(
    app: tauri::AppHandle,
    input: CreateDetailedInvoiceInput,
) -> Result<InvoiceResult, String> {
    if input.company_id <= 0 {
        return Err("Company profile is required".to_string());
    }

    let mut conn = db::open_connection(&app)?;
    let tx = conn
        .transaction()
        .map_err(|e| format!("Failed to start transaction: {e}"))?;

    let invoice_number = generate_invoice_number(&tx)?;

    let metadata_str = input.notes.as_ref().map(|_| {
        // Here we could store extra info if needed, but for now we just use the metadata from input if provided
        // Assuming input might have metadata in future
        serde_json::to_string(&serde_json::json!({})).unwrap()
    });

    tx.execute(
        r#"
        INSERT INTO invoices (
            invoice_number, customer_id, company_id, status, notes,
            invoice_type, invoice_date, seller_ntn_cnic, seller_province,
            buyer_ntn_cnic, buyer_province, buyer_registration_type, invoice_ref_no,
            metadata
        )
        VALUES (?1, ?2, ?3, 'issued', ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)
        "#,
        params![
            invoice_number,
            input.customer_id,
            input.company_id,
            input.notes,
            input.invoice_type,
            input.invoice_date,
            input.seller_ntn_cnic,
            input.seller_province,
            input.buyer_ntn_cnic,
            input.buyer_province,
            input.buyer_registration_type,
            input.invoice_ref_no,
            metadata_str
        ],
    )
    .map_err(|e| format!("Failed to create detailed invoice: {e}"))?;

    let invoice_id = tx.last_insert_rowid();

    for item in input.items {
        let amount = item.quantity * item.unit_price;
        let item_metadata = item
            .metadata
            .as_ref()
            .map(|m| serde_json::to_string(m).unwrap());

        tx.execute(
            r#"
            INSERT INTO invoice_items (
                invoice_id, product_id, description, quantity, unit_price, rate, amount,
                tax_rate, hs_code, uom, value_sales_excluding_st, fixed_notified_value_or_retail_price,
                sales_tax_applicable, sales_tax_withheld_at_source, extra_tax, further_tax,
                sro_schedule_no, fed_payable, discount, sale_type, sro_item_serial_no,
                metadata
            )
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22)
            "#,
            params![
                invoice_id, item.product_id, item.description, item.quantity, item.unit_price, item.unit_price, amount,
                item.tax_rate, item.hs_code, item.uom, item.value_sales_excluding_st, item.fixed_notified_value_or_retail_price,
                item.sales_tax_applicable, item.sales_tax_withheld_at_source, item.extra_tax, item.further_tax,
                item.sro_schedule_no, item.fed_payable, item.discount, item.sale_type, item.sro_item_serial_no,
                item_metadata
            ],
        )
        .map_err(|e| format!("Failed to create detailed invoice item: {e}"))?;
    }

    tx.commit()
        .map_err(|e| format!("Failed to commit detailed invoice transaction: {e}"))?;

    Ok(InvoiceResult {
        id: invoice_id,
        invoice_number,
    })
}

#[tauri::command]
pub fn get_invoice(app: tauri::AppHandle, invoice_id: i64) -> Result<Invoice, String> {
    if invoice_id <= 0 {
        return Err("Invalid invoice ID".to_string());
    }

    let conn = db::open_connection(&app)?;
    let mut stmt = conn
        .prepare(
            r#"
            SELECT
                i.id, i.invoice_number, i.dc_id, i.customer_id, i.company_id, i.status, i.notes, i.created_at,
                c.name as customer_name, dc.dc_number,
                COALESCE(SUM(ii.amount), 0.0) as total_amount,
                i.invoice_type, i.invoice_date, i.seller_ntn_cnic, i.seller_province,
                i.buyer_ntn_cnic, i.buyer_province, i.buyer_registration_type, i.invoice_ref_no,
                i.metadata
            FROM invoices i
            JOIN customers c ON i.customer_id = c.id
            LEFT JOIN delivery_challans dc ON i.dc_id = dc.id
            LEFT JOIN invoice_items ii ON i.id = ii.invoice_id AND ii.deleted_at IS NULL
            WHERE i.id = ?1 AND i.deleted_at IS NULL
            GROUP BY 
                i.id, i.invoice_number, i.dc_id, i.customer_id, i.company_id, i.status, i.notes, i.created_at, c.name, dc.dc_number,
                i.invoice_type, i.invoice_date, i.seller_ntn_cnic, i.seller_province, i.buyer_ntn_cnic, i.buyer_province, i.buyer_registration_type, i.invoice_ref_no,
                i.metadata
            "#,
        )
        .map_err(|e| format!("Failed to prepare invoice query: {e}"))?;

    let invoice = stmt
        .query_row([invoice_id], |row| {
            let metadata_str: Option<String> = row.get(19)?;
            let metadata = metadata_str.and_then(|s| serde_json::from_str(&s).ok());

            Ok(Invoice {
                id: row.get(0)?,
                invoice_number: row.get(1)?,
                dc_id: row.get(2)?,
                customer_id: row.get(3)?,
                company_id: row.get(4)?,
                status: row.get(5)?,
                notes: row.get(6)?,
                created_at: row.get(7)?,
                customer_name: row.get(8)?,
                dc_number: row.get(9)?,
                total_amount: row.get(10)?,
                invoice_type: row.get(11)?,
                invoice_date: row.get(12)?,
                seller_ntn_cnic: row.get(13)?,
                seller_province: row.get(14)?,
                buyer_ntn_cnic: row.get(15)?,
                buyer_province: row.get(16)?,
                buyer_registration_type: row.get(17)?,
                invoice_ref_no: row.get(18)?,
                metadata,
                items: Vec::new(),
            })
        })
        .map_err(|e| format!("Invoice not found: {e}"))?;

    let mut inv = invoice;
    inv.items = get_invoice_items(&conn, inv.id)?;

    Ok(inv)
}

#[tauri::command]
pub fn update_invoice(app: tauri::AppHandle, input: UpdateInvoiceInput) -> Result<(), String> {
    let mut conn = db::open_connection(&app)?;
    let tx = conn
        .transaction()
        .map_err(|e| format!("Failed to start transaction: {e}"))?;

    tx.execute(
        r#"
        UPDATE invoices SET
            customer_id = ?1,
            invoice_type = ?2,
            invoice_date = ?3,
            seller_ntn_cnic = ?4,
            seller_province = ?5,
            buyer_ntn_cnic = ?6,
            buyer_province = ?7,
            buyer_registration_type = ?8,
            invoice_ref_no = ?9,
            notes = ?10
        WHERE id = ?11 AND deleted_at IS NULL
        "#,
        params![
            input.customer_id,
            input.invoice_type,
            input.invoice_date,
            input.seller_ntn_cnic,
            input.seller_province,
            input.buyer_ntn_cnic,
            input.buyer_province,
            input.buyer_registration_type,
            input.invoice_ref_no,
            input.notes,
            input.id
        ],
    )
    .map_err(|e| format!("Failed to update invoice: {e}"))?;

    // Soft delete existing items
    tx.execute(
        "UPDATE invoice_items SET deleted_at = CURRENT_TIMESTAMP WHERE invoice_id = ?1 AND deleted_at IS NULL",
        [input.id],
    )
    .map_err(|e| format!("Failed to clear existing items: {e}"))?;

    // Insert new items
    for item in input.items {
        let amount = item.quantity * item.unit_price;
        let item_metadata = item
            .metadata
            .as_ref()
            .map(|m| serde_json::to_string(m).unwrap());

        tx.execute(
            r#"
            INSERT INTO invoice_items (
                invoice_id, product_id, description, quantity, unit_price, rate, amount,
                tax_rate, hs_code, uom, value_sales_excluding_st, fixed_notified_value_or_retail_price,
                sales_tax_applicable, sales_tax_withheld_at_source, extra_tax, further_tax,
                sro_schedule_no, fed_payable, discount, sale_type, sro_item_serial_no,
                metadata
            )
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22)
            "#,
            params![
                input.id, item.product_id, item.description, item.quantity, item.unit_price, item.unit_price, amount,
                item.tax_rate, item.hs_code, item.uom, item.value_sales_excluding_st, item.fixed_notified_value_or_retail_price,
                item.sales_tax_applicable, item.sales_tax_withheld_at_source, item.extra_tax, item.further_tax,
                item.sro_schedule_no, item.fed_payable, item.discount, item.sale_type, item.sro_item_serial_no,
                item_metadata
            ],
        )
        .map_err(|e| format!("Failed to insert updated invoice item: {e}"))?;
    }

    tx.commit()
        .map_err(|e| format!("Failed to commit update transaction: {e}"))?;

    Ok(())
}

#[tauri::command]
pub fn delete_invoice(app: tauri::AppHandle, invoice_id: i64) -> Result<(), String> {
    if invoice_id <= 0 {
        return Err("Invalid invoice ID".to_string());
    }

    let conn = db::open_connection(&app)?;

    // Soft delete the invoice
    conn.execute(
        "UPDATE invoices SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?1 AND deleted_at IS NULL",
        [invoice_id],
    )
    .map_err(|e| format!("Failed to delete invoice: {e}"))?;

    // Soft delete the invoice items
    conn.execute(
        "UPDATE invoice_items SET deleted_at = CURRENT_TIMESTAMP WHERE invoice_id = ?1 AND deleted_at IS NULL",
        [invoice_id],
    )
    .map_err(|e| format!("Failed to delete invoice items: {e}"))?;

    Ok(())
}

fn get_invoice_items(
    conn: &rusqlite::Connection,
    invoice_id: i64,
) -> Result<Vec<InvoiceItem>, String> {
    let mut stmt = conn
        .prepare(
            r#"
            SELECT 
                id, product_id, description, quantity, unit_price, amount,
                tax_rate, hs_code, uom, value_sales_excluding_st, fixed_notified_value_or_retail_price,
                sales_tax_applicable, sales_tax_withheld_at_source, extra_tax, further_tax,
                sro_schedule_no, fed_payable, discount, sale_type, sro_item_serial_no,
                metadata
            FROM invoice_items
            WHERE invoice_id = ?1 AND deleted_at IS NULL
            ORDER BY id ASC
            "#,
        )
        .map_err(|e| format!("Failed to prepare invoice items query: {e}"))?;

    let rows = stmt
        .query_map([invoice_id], |row| {
            let metadata_str: Option<String> = row.get(20)?;
            let metadata = metadata_str.and_then(|s| serde_json::from_str(&s).ok());

            Ok(InvoiceItem {
                id: row.get(0)?,
                product_id: row.get(1)?,
                description: row.get(2)?,
                quantity: row.get(3)?,
                unit_price: row.get(4)?,
                amount: row.get(5)?,
                tax_rate: row.get(6)?,
                hs_code: row.get(7)?,
                uom: row.get(8)?,
                value_sales_excluding_st: row.get(9)?,
                fixed_notified_value_or_retail_price: row.get(10)?,
                sales_tax_applicable: row.get(11)?,
                sales_tax_withheld_at_source: row.get(12)?,
                extra_tax: row.get(13)?,
                further_tax: row.get(14)?,
                sro_schedule_no: row.get(15)?,
                fed_payable: row.get(16)?,
                discount: row.get(17)?,
                sale_type: row.get(18)?,
                sro_item_serial_no: row.get(19)?,
                metadata,
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
