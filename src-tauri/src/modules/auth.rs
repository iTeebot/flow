use crate::db;
use rusqlite::OptionalExtension;
use bcrypt::{hash, verify, DEFAULT_COST};
use serde::{Deserialize, Serialize};
use tauri::AppHandle;

#[derive(Debug, Serialize, Deserialize)]
pub struct User {
    pub id: i64,
    pub username: String,
    pub full_name: Option<String>,
    pub role: String,
}

#[derive(Debug, Deserialize)]
pub struct RegisterInput {
    pub username: String,
    pub password: String,
    pub full_name: Option<String>,
    pub company_name: String,
    pub tax_registration_number: Option<String>,
    pub sales_tax_number: Option<String>,
    pub business_type: Option<String>,
    pub currency: Option<String>,
    pub website: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct LoginResponse {
    pub user: User,
    pub company_id: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateUserProfileInput {
    pub id: i64,
    pub full_name: Option<String>,
}

#[tauri::command]
pub fn is_registered(app: AppHandle) -> Result<bool, String> {
    let conn = db::open_connection(&app)?;
    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM users", [], |row| row.get(0))
        .map_err(|e| format!("Failed to check users: {e}"))?;
    Ok(count > 0)
}

#[tauri::command]
pub fn register(app: AppHandle, input: RegisterInput) -> Result<LoginResponse, String> {
    if input.username.trim().is_empty() || input.password.trim().is_empty() {
        return Err("Username and password are required".to_string());
    }

    let mut conn = db::open_connection(&app)?;
    let tx = conn.transaction().map_err(|e| format!("Failed to start transaction: {e}"))?;

    // Hash password
    let hashed = hash(input.password, DEFAULT_COST)
        .map_err(|e| format!("Failed to hash password: {e}"))?;

    // Create user
    tx.execute(
        "INSERT INTO users (username, password_hash, full_name) VALUES (?1, ?2, ?3)",
        (&input.username, &hashed, &input.full_name),
    )
    .map_err(|e| format!("Failed to create user: {e}"))?;

    let user_id = tx.last_insert_rowid();

    // Create company profile
    tx.execute(
        "INSERT INTO company_profiles (company_name, owner_name, user_id, tax_registration_number, sales_tax_number, business_type, currency, website) 
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        (
            &input.company_name, 
            &input.full_name, 
            &user_id,
            &input.tax_registration_number,
            &input.sales_tax_number,
            &input.business_type,
            &input.currency.unwrap_or_else(|| "PKR".to_string()),
            &input.website
        ),
    )
    .map_err(|e| format!("Failed to create company profile: {e}"))?;

    let company_id = tx.last_insert_rowid();

    tx.commit().map_err(|e| format!("Failed to commit transaction: {e}"))?;

    Ok(LoginResponse {
        user: User {
            id: user_id,
            username: input.username,
            full_name: input.full_name,
            role: "admin".to_string(),
        },
        company_id: Some(company_id),
    })
}

#[tauri::command]
pub fn login(app: AppHandle, username: String, password: String) -> Result<LoginResponse, String> {
    let conn = db::open_connection(&app)?;
    
    let (id, password_hash, full_name, role): (i64, String, Option<String>, String) = conn
        .query_row(
            "SELECT id, password_hash, full_name, role FROM users WHERE username = ?1",
            [&username],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
        )
        .map_err(|_| "Invalid username or password".to_string())?;

    let valid = verify(password, &password_hash).map_err(|e| format!("Error verifying password: {e}"))?;

    if !valid {
        return Err("Invalid username or password".to_string());
    }

    // Get company ID for this user
    let company_id: Option<i64> = conn
        .query_row(
            "SELECT id FROM company_profiles WHERE user_id = ?1",
            [&id],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| format!("Failed to fetch company: {e}"))?;

    Ok(LoginResponse {
        user: User {
            id,
            username,
            full_name,
            role,
        },
        company_id,
    })
}

#[tauri::command]
pub fn update_user_profile(app: AppHandle, input: UpdateUserProfileInput) -> Result<User, String> {
    if input.id <= 0 {
        return Err("Invalid user id".to_string());
    }

    let conn = db::open_connection(&app)?;
    conn.execute(
        "UPDATE users SET full_name = ?1 WHERE id = ?2",
        (&input.full_name, input.id),
    )
    .map_err(|e| format!("Failed to update user profile: {e}"))?;

    let user = conn
        .query_row(
            "SELECT id, username, full_name, role FROM users WHERE id = ?1",
            [input.id],
            |row| {
                Ok(User {
                    id: row.get(0)?,
                    username: row.get(1)?,
                    full_name: row.get(2)?,
                    role: row.get(3)?,
                })
            },
        )
        .map_err(|_| "Updated user not found".to_string())?;

    Ok(user)
}
