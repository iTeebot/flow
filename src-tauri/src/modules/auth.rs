use crate::db;
use bcrypt::{hash, verify, DEFAULT_COST};
use serde::{Deserialize, Serialize};
use std::fs;
use tauri::{AppHandle, Manager};

#[derive(Debug, Serialize, Deserialize)]
pub struct User {
    pub id: i64,
    pub username: String,
    pub full_name: Option<String>,
    pub role: String,
    pub currency: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct RegisterInput {
    pub username: String,
    pub password: String,
    pub full_name: Option<String>,
    pub company_name: String,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub address: Option<String>,
    pub city: Option<String>,
    pub state: Option<String>,
    pub postal_code: Option<String>,
    pub country: Option<String>,
    pub tax_registration_number: Option<String>,
    pub sales_tax_number: Option<String>,
    pub business_type: Option<String>,
    pub currency: Option<String>,
    pub website: Option<String>,
}

#[derive(Debug, serde::Serialize)]
pub struct LoginResponse {
    pub user: User,
    pub company_id: Option<i64>,
    pub session_id: Option<i64>,
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
    let tx = conn
        .transaction()
        .map_err(|e| format!("Failed to start transaction: {e}"))?;

    // Hash password
    let hashed =
        hash(input.password, DEFAULT_COST).map_err(|e| format!("Failed to hash password: {e}"))?;

    // Create user
    tx.execute(
        "INSERT INTO users (username, password_hash, full_name) VALUES (?1, ?2, ?3)",
        (&input.username, &hashed, &input.full_name),
    )
    .map_err(|e| format!("Failed to create user: {e}"))?;

    let user_id = tx.last_insert_rowid();

    let currency_val = input.currency.unwrap_or_else(|| "PKR".to_string());

    // Create company profile
    tx.execute(
        "INSERT INTO company_profiles (
            company_name, owner_name, user_id, email, phone, 
            address, city, state, postal_code, country,
            tax_registration_number, sales_tax_number, business_type, 
            currency, website
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)",
        (
            &input.company_name,
            &input.full_name,
            &user_id,
            &input.email,
            &input.phone,
            &input.address,
            &input.city,
            &input.state,
            &input.postal_code,
            &input.country,
            &input.tax_registration_number,
            &input.sales_tax_number,
            &input.business_type,
            &currency_val,
            &input.website,
        ),
    )
    .map_err(|e| format!("Failed to create company profile: {e}"))?;

    let company_id = tx.last_insert_rowid();

    tx.commit()
        .map_err(|e| format!("Failed to commit transaction: {e}"))?;

    Ok(LoginResponse {
        user: User {
            id: user_id,
            username: input.username,
            full_name: input.full_name,
            role: "admin".to_string(),
            currency: Some(currency_val),
        },
        company_id: Some(company_id),
        session_id: None,
    })
}

#[tauri::command]
pub fn login(app: AppHandle, username: String, password: String) -> Result<LoginResponse, String> {
    let conn = db::open_connection(&app)?;

    // Authenticate via username OR tax_registration_number (NTN/EIN) for backward compatibility
    let (id, password_hash, full_name, role, actual_username): (
        i64,
        String,
        Option<String>,
        String,
        String,
    ) = conn
        .query_row(
            "SELECT u.id, u.password_hash, u.full_name, u.role, u.username 
             FROM users u
             LEFT JOIN company_profiles cp ON cp.user_id = u.id
             WHERE u.username = ?1 OR cp.tax_registration_number = ?1",
            [&username],
            |row| {
                Ok((
                    row.get(0)?,
                    row.get(1)?,
                    row.get(2)?,
                    row.get(3)?,
                    row.get(4)?,
                ))
            },
        )
        .map_err(|_| "Invalid credentials".to_string())?;

    let valid =
        verify(password, &password_hash).map_err(|e| format!("Error verifying password: {e}"))?;

    if !valid {
        return Err("Invalid credentials".to_string());
    }

    // Since Teebot Flow local DB is generally single-company, grab the first active company
    let (company_id, currency): (i64, String) = conn
        .query_row(
            "SELECT id, currency FROM company_profiles WHERE deleted_at IS NULL LIMIT 1",
            [],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(|e| format!("Failed to fetch company: {e}"))?;

    // Log the session
    conn.execute("INSERT INTO user_sessions (user_id) VALUES (?1)", [id])
        .map_err(|e| format!("Failed to log session: {e}"))?;

    let session_id = conn.last_insert_rowid();

    Ok(LoginResponse {
        user: User {
            id,
            username: actual_username,
            full_name,
            role,
            currency: Some(currency),
        },
        company_id: Some(company_id),
        session_id: Some(session_id),
    })
}

#[tauri::command]
pub fn logout_session(app: AppHandle, session_id: i64) -> Result<(), String> {
    let conn = db::open_connection(&app)?;
    conn.execute(
        "UPDATE user_sessions SET time_out = CURRENT_TIMESTAMP WHERE id = ?1",
        [session_id],
    )
    .map_err(|e| format!("Failed to end session: {e}"))?;
    Ok(())
}

#[tauri::command]
pub fn validate_session(app: AppHandle, user_id: i64) -> Result<LoginResponse, String> {
    let conn = db::open_connection(&app)?;

    let (username, full_name, role): (String, Option<String>, String) = conn
        .query_row(
            "SELECT username, full_name, role FROM users WHERE id = ?1",
            [user_id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
        )
        .map_err(|_| "Session invalid".to_string())?;

    let (company_id, currency): (i64, String) = conn
        .query_row(
            "SELECT id, currency FROM company_profiles WHERE user_id = ?1",
            [user_id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(|_| "Company profile missing".to_string())?;

    Ok(LoginResponse {
        user: User {
            id: user_id,
            username,
            full_name,
            role,
            currency: Some(currency),
        },
        company_id: Some(company_id),
        session_id: None,
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
            "SELECT u.id, u.username, u.full_name, u.role, c.currency 
             FROM users u
             LEFT JOIN company_profiles c ON c.user_id = u.id
             WHERE u.id = ?1",
            [input.id],
            |row| {
                Ok(User {
                    id: row.get(0)?,
                    username: row.get(1)?,
                    full_name: row.get(2)?,
                    role: row.get(3)?,
                    currency: row.get(4)?,
                })
            },
        )
        .map_err(|_| "Updated user not found".to_string())?;

    Ok(user)
}

#[tauri::command]
pub fn reset_database(app: AppHandle) -> Result<(), String> {
    let db_path = db::resolve_db_path(&app)?;
    if db_path.exists() {
        fs::remove_file(&db_path).map_err(|e| format!("Failed to delete database: {e}"))?;
    }
    db::init_db(&app)?;
    Ok(())
}

static RESTORE_MUTEX: std::sync::Mutex<()> = std::sync::Mutex::new(());

#[tauri::command]
pub fn restore_database(
    app: AppHandle,
    path: String,
    encryption_key: Option<String>,
) -> Result<(), String> {
    let _lock = RESTORE_MUTEX
        .lock()
        .map_err(|e| format!("Failed to acquire restore lock: {e}"))?;

    let target_path = db::resolve_db_path(&app)?;
    let file_data = fs::read(&path).map_err(|e| format!("Failed to read backup file: {e}"))?;

    let is_sqlite = file_data.len() >= 16 && &file_data[0..16] == b"SQLite format 3\0";

    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve app data directory: {e}"))?;

    let restored_bytes = if let Some(key) = encryption_key {
        // User provided a key, attempt decryption
        let decrypted_data = crate::modules::security::decrypt_and_decompress(&file_data, &key)?;

        if decrypted_data.len() >= 16 && &decrypted_data[0..16] == b"SQLite format 3\0" {
            decrypted_data
        } else {
            return Err("Invalid Recovery Key or corrupted backup.".to_string());
        }
    } else {
        // No key provided
        if is_sqlite {
            file_data
        } else {
            return Err(
                "This backup appears to be encrypted. Please provide your Recovery Key."
                    .to_string(),
            );
        }
    };

    let mut temp_db_path;
    let mut file;
    let mut attempts = 0;
    loop {
        let rand_val = rand::random::<u64>();
        let temp_filename = format!("teebot-flow-restore-{:016x}.tmp", rand_val);
        temp_db_path = app_data_dir.join(temp_filename);
        match fs::OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&temp_db_path)
        {
            Ok(f) => {
                file = f;
                break;
            }
            Err(e) if e.kind() == std::io::ErrorKind::AlreadyExists => {
                attempts += 1;
                if attempts > 100 {
                    return Err(
                        "Failed to find a unique temporary filename after 100 attempts."
                            .to_string(),
                    );
                }
                continue;
            }
            Err(e) => return Err(format!("Failed to create temporary file: {e}")),
        }
    }

    use std::io::Write;
    file.write_all(&restored_bytes).map_err(|e| {
        let _ = fs::remove_file(&temp_db_path);
        format!("Failed to write temporary database: {e}")
    })?;
    drop(file);

    let validate = || -> Result<(), String> {
        let conn = rusqlite::Connection::open(&temp_db_path)
            .map_err(|e| format!("Failed to open restored database: {e}"))?;

        let integrity: String = conn
            .query_row("PRAGMA integrity_check", [], |row| row.get(0))
            .map_err(|e| format!("Failed to run integrity check: {e}"))?;
        if integrity != "ok" {
            return Err(format!("Database integrity check failed: {integrity}"));
        }

        let schema_check: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name IN ('users', 'company_profiles')",
                [],
                |row| row.get(0),
            )
            .map_err(|e| format!("Database schema query failed: {e}"))?;
        if schema_check < 2 {
            return Err(
                "Database is missing required tables (users/company_profiles).".to_string(),
            );
        }

        Ok(())
    };

    if let Err(err) = validate() {
        let _ = fs::remove_file(&temp_db_path);
        return Err(err);
    }

    fs::rename(&temp_db_path, &target_path).map_err(|e| {
        let _ = fs::remove_file(&temp_db_path);
        format!("Failed to replace live database: {e}")
    })?;

    Ok(())
}
