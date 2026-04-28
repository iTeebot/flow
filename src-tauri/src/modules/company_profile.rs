use crate::db;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize)]
pub struct CompanyProfile {
    pub id: i64,
    pub company_name: String,
    pub tax_registration_number: Option<String>,
    pub owner_name: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub address: Option<String>,
    pub sales_tax_number: Option<String>,
    pub business_type: Option<String>,
    pub currency: Option<String>,
    pub website: Option<String>,
    pub city: Option<String>,
    pub state: Option<String>,
    pub postal_code: Option<String>,
    pub country: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateCompanyProfileInput {
    pub company_name: String,
    pub tax_registration_number: Option<String>,
    pub owner_name: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub address: Option<String>,
    pub sales_tax_number: Option<String>,
    pub business_type: Option<String>,
    pub currency: Option<String>,
    pub website: Option<String>,
    pub city: Option<String>,
    pub state: Option<String>,
    pub postal_code: Option<String>,
    pub country: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateCompanyProfileInput {
    pub id: i64,
    pub company_name: String,
    pub tax_registration_number: Option<String>,
    pub owner_name: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub address: Option<String>,
    pub sales_tax_number: Option<String>,
    pub business_type: Option<String>,
    pub currency: Option<String>,
    pub website: Option<String>,
    pub city: Option<String>,
    pub state: Option<String>,
    pub postal_code: Option<String>,
    pub country: Option<String>,
}

#[tauri::command]
pub fn create_company_profile(
    app: tauri::AppHandle,
    input: CreateCompanyProfileInput,
) -> Result<CompanyProfile, String> {
    if input.company_name.trim().is_empty() {
        return Err("Company name is required".to_string());
    }

    let conn = db::open_connection(&app)?;
    conn.execute(
        "INSERT INTO company_profiles (company_name, tax_registration_number, owner_name, email, phone, address, sales_tax_number, business_type, currency, website, city, state, postal_code, country) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)",
        (
            &input.company_name,
            &input.tax_registration_number,
            &input.owner_name,
            &input.email,
            &input.phone,
            &input.address,
            &input.sales_tax_number,
            &input.business_type,
            &input.currency,
            &input.website,
            &input.city,
            &input.state,
            &input.postal_code,
            &input.country,
        ),
    )
    .map_err(|e| format!("Failed to create company profile: {e}"))?;

    let id = conn.last_insert_rowid();
    Ok(CompanyProfile {
        id,
        company_name: input.company_name,
        tax_registration_number: input.tax_registration_number,
        owner_name: input.owner_name,
        email: input.email,
        phone: input.phone,
        address: input.address,
        sales_tax_number: input.sales_tax_number,
        business_type: input.business_type,
        currency: input.currency,
        website: input.website,
        city: input.city,
        state: input.state,
        postal_code: input.postal_code,
        country: input.country,
    })
}

#[tauri::command]
pub fn list_company_profiles(app: tauri::AppHandle) -> Result<Vec<CompanyProfile>, String> {
    let conn = db::open_connection(&app)?;
    let mut stmt = conn
        .prepare(
            "SELECT id, company_name, tax_registration_number, owner_name, email, phone, address, sales_tax_number, business_type, currency, website, city, state, postal_code, country
             FROM company_profiles
             WHERE deleted_at IS NULL
             ORDER BY id DESC",
        )
        .map_err(|e| format!("Failed to prepare company query: {e}"))?;

    let rows = stmt
        .query_map([], |row| {
            Ok(CompanyProfile {
                id: row.get(0)?,
                company_name: row.get(1)?,
                tax_registration_number: row.get(2)?,
                owner_name: row.get(3)?,
                email: row.get(4)?,
                phone: row.get(5)?,
                address: row.get(6)?,
                sales_tax_number: row.get(7)?,
                business_type: row.get(8)?,
                currency: row.get(9)?,
                website: row.get(10)?,
                city: row.get(11)?,
                state: row.get(12)?,
                postal_code: row.get(13)?,
                country: row.get(14)?,
            })
        })
        .map_err(|e| format!("Failed to fetch company profiles: {e}"))?;

    let mut profiles = Vec::new();
    for row in rows {
        profiles.push(row.map_err(|e| format!("Failed to map company row: {e}"))?);
    }
    Ok(profiles)
}

#[tauri::command]
pub fn get_company_profile(app: tauri::AppHandle, company_id: i64) -> Result<CompanyProfile, String> {
    if company_id <= 0 {
        return Err("Invalid company profile id".to_string());
    }
    let conn = db::open_connection(&app)?;
    conn.query_row(
        "SELECT id, company_name, tax_registration_number, owner_name, email, phone, address, sales_tax_number, business_type, currency, website, city, state, postal_code, country
         FROM company_profiles
         WHERE id = ?1 AND deleted_at IS NULL",
        [company_id],
        |row| {
            Ok(CompanyProfile {
                id: row.get(0)?,
                company_name: row.get(1)?,
                tax_registration_number: row.get(2)?,
                owner_name: row.get(3)?,
                email: row.get(4)?,
                phone: row.get(5)?,
                address: row.get(6)?,
                sales_tax_number: row.get(7)?,
                business_type: row.get(8)?,
                currency: row.get(9)?,
                website: row.get(10)?,
                city: row.get(11)?,
                state: row.get(12)?,
                postal_code: row.get(13)?,
                country: row.get(14)?,
            })
        },
    )
    .map_err(|_| "Company profile not found".to_string())
}

#[tauri::command]
pub fn update_company_profile(
    app: tauri::AppHandle,
    input: UpdateCompanyProfileInput,
) -> Result<CompanyProfile, String> {
    if input.id <= 0 {
        return Err("Invalid company profile id".to_string());
    }
    if input.company_name.trim().is_empty() {
        return Err("Company name is required".to_string());
    }
    let conn = db::open_connection(&app)?;
    conn.execute(
        "UPDATE company_profiles
         SET company_name = ?1, tax_registration_number = ?2, owner_name = ?3, email = ?4, phone = ?5, address = ?6,
             sales_tax_number = ?7, business_type = ?8, currency = ?9, website = ?10,
             city = ?11, state = ?12, postal_code = ?13, country = ?14
         WHERE id = ?15",
        (
            &input.company_name,
            &input.tax_registration_number,
            &input.owner_name,
            &input.email,
            &input.phone,
            &input.address,
            &input.sales_tax_number,
            &input.business_type,
            &input.currency,
            &input.website,
            &input.city,
            &input.state,
            &input.postal_code,
            &input.country,
            &input.id,
        ),
    )
    .map_err(|e| format!("Failed to update company profile: {e}"))?;

    get_company_profile(app, input.id)
}
