use crate::db;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize)]
pub struct Customer {
    pub id: i64,
    pub company_id: i64,
    pub name: String,
    pub tax_registration_number: Option<String>,
    pub phone: Option<String>,
    pub address: Option<String>,
    pub city: Option<String>,
    pub state: Option<String>,
    pub province: Option<String>,
    pub registration_type: Option<String>,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct CreateCustomerInput {
    pub company_id: i64,
    pub name: String,
    pub tax_registration_number: Option<String>,
    pub phone: Option<String>,
    pub address: Option<String>,
    pub city: Option<String>,
    pub state: Option<String>,
    pub province: Option<String>,
    pub registration_type: Option<String>,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateCustomerInput {
    pub id: i64,
    pub name: String,
    pub tax_registration_number: Option<String>,
    pub phone: Option<String>,
    pub address: Option<String>,
    pub city: Option<String>,
    pub state: Option<String>,
    pub province: Option<String>,
    pub registration_type: Option<String>,
    pub metadata: Option<serde_json::Value>,
}

#[tauri::command]
pub fn create_customer(app: tauri::AppHandle, input: CreateCustomerInput) -> Result<Customer, String> {
    if input.company_id <= 0 {
        return Err("Company profile is required".to_string());
    }
    if input.name.trim().is_empty() {
        return Err("Customer name is required".to_string());
    }

    let conn = db::open_connection(&app)?;
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

    let metadata_str = input.metadata.as_ref().map(|m| serde_json::to_string(m).unwrap());

    conn.execute(
        "INSERT INTO customers (company_id, name, tax_registration_number, phone, address, city, state, province, registration_type, metadata) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        (
            &input.company_id,
            &input.name,
            &input.tax_registration_number,
            &input.phone,
            &input.address,
            &input.city,
            &input.state,
            &input.province,
            &input.registration_type,
            &metadata_str,
        ),
    )
    .map_err(|e| format!("Failed to insert customer: {e}"))?;

    let id = conn.last_insert_rowid();
    Ok(Customer {
        id,
        company_id: input.company_id,
        name: input.name,
        tax_registration_number: input.tax_registration_number,
        phone: input.phone,
        address: input.address,
        city: input.city,
        state: input.state,
        province: input.province,
        registration_type: input.registration_type,
        metadata: input.metadata,
    })
}

#[tauri::command]
pub fn list_customers(app: tauri::AppHandle, company_id: i64) -> Result<Vec<Customer>, String> {
    if company_id <= 0 {
        return Err("Company profile is required".to_string());
    }

    let conn = db::open_connection(&app)?;
    let mut stmt = conn
        .prepare(
            "SELECT id, company_id, name, phone, address, tax_registration_number, city, state, province, registration_type, metadata
             FROM customers
             WHERE company_id = ?1 AND deleted_at IS NULL
             ORDER BY id DESC",
        )
        .map_err(|e| format!("Failed to prepare customer query: {e}"))?;

    let rows = stmt
        .query_map([company_id], |row| {
            Ok(Customer {
                id: row.get(0)?,
                company_id: row.get(1)?,
                name: row.get(2)?,
                phone: row.get(3)?,
                address: row.get(4)?,
                tax_registration_number: row.get(5)?,
                city: row.get(6)?,
                state: row.get(7)?,
                province: row.get(8)?,
                registration_type: row.get(9)?,
                metadata: row.get::<_, Option<String>>(10)?.and_then(|s| serde_json::from_str(&s).ok()),
            })
        })
        .map_err(|e| format!("Failed to fetch customers: {e}"))?;

    let mut customers = Vec::new();
    for row in rows {
        customers.push(row.map_err(|e| format!("Failed to map customer row: {e}"))?);
    }
    Ok(customers)
}

#[tauri::command]
pub fn update_customer(app: tauri::AppHandle, input: UpdateCustomerInput) -> Result<Customer, String> {
    if input.id <= 0 {
        return Err("Invalid customer ID".to_string());
    }
    if input.name.trim().is_empty() {
        return Err("Customer name is required".to_string());
    }

    let conn = db::open_connection(&app)?;
    let metadata_str = input.metadata.as_ref().map(|m| serde_json::to_string(m).unwrap());
    
    conn.execute(
        "UPDATE customers SET name = ?1, tax_registration_number = ?2, phone = ?3, address = ?4, city = ?5, state = ?6, province = ?7, registration_type = ?8, metadata = ?9 WHERE id = ?10",
        (&input.name, &input.tax_registration_number, &input.phone, &input.address, &input.city, &input.state, &input.province, &input.registration_type, &metadata_str, input.id),
    )
    .map_err(|e| format!("Failed to update customer: {e}"))?;

    let company_id: i64 = conn
        .query_row(
            "SELECT company_id FROM customers WHERE id = ?1",
            [input.id],
            |row| row.get(0),
        )
        .map_err(|_| "Customer not found".to_string())?;

    Ok(Customer {
        id: input.id,
        company_id,
        name: input.name,
        tax_registration_number: input.tax_registration_number,
        phone: input.phone,
        address: input.address,
        city: input.city,
        state: input.state,
        province: input.province,
        registration_type: input.registration_type,
        metadata: input.metadata,
    })
}

#[tauri::command]
pub fn delete_customer(app: tauri::AppHandle, customer_id: i64) -> Result<String, String> {
    if customer_id <= 0 {
        return Err("Invalid customer ID".to_string());
    }

    let conn = db::open_connection(&app)?;
    
    conn.execute(
        "UPDATE customers SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?1",
        [customer_id],
    )
    .map_err(|e| format!("Failed to delete customer: {e}"))?;

    Ok("Customer deleted successfully".to_string())
}
