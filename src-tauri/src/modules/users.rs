use crate::db;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::AppHandle;
use bcrypt::{hash, DEFAULT_COST};

#[derive(Debug, Serialize, Deserialize)]
pub struct User {
    pub id: i64,
    pub username: String,
    pub full_name: Option<String>,
    pub role: String,
    pub permissions: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UserSession {
    pub id: i64,
    pub user_id: i64,
    pub username: Option<String>,
    pub time_in: String,
    pub time_out: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateUserInput {
    pub username: String,
    pub password: String,
    pub full_name: Option<String>,
    pub role: String,
    pub permissions: Option<String>,
}

#[tauri::command]
pub fn list_users(app: AppHandle) -> Result<Vec<User>, String> {
    let conn = db::open_connection(&app)?;
    let mut stmt = conn
        .prepare("SELECT id, username, full_name, role, permissions, created_at FROM users ORDER BY id DESC")
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(User {
                id: row.get(0)?,
                username: row.get(1)?,
                full_name: row.get(2)?,
                role: row.get(3)?,
                permissions: row.get(4)?,
                created_at: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut users = Vec::new();
    for row in rows {
        users.push(row.map_err(|e| e.to_string())?);
    }
    Ok(users)
}

#[tauri::command]
pub fn create_user(app: AppHandle, input: CreateUserInput) -> Result<User, String> {
    let conn = db::open_connection(&app)?;
    let hashed = hash(input.password, DEFAULT_COST).map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT INTO users (username, password_hash, full_name, role, permissions) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![input.username, hashed, input.full_name, input.role, input.permissions],
    )
    .map_err(|e| e.to_string())?;

    let user_id = conn.last_insert_rowid();
    
    Ok(User {
        id: user_id,
        username: input.username,
        full_name: input.full_name,
        role: input.role,
        permissions: input.permissions,
        created_at: "".to_string(), // Will be populated by DB default
    })
}

#[tauri::command]
pub fn delete_user(app: AppHandle, user_id: i64) -> Result<(), String> {
    let conn = db::open_connection(&app)?;
    
    // Prevent deleting the root admin (owner of the company profile)
    let count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM company_profiles WHERE user_id = ?1",
        [user_id],
        |row| row.get(0),
    ).unwrap_or(0);

    if count > 0 {
        return Err("Cannot delete the root administrator.".to_string());
    }

    conn.execute("DELETE FROM users WHERE id = ?1", [user_id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn list_user_sessions(app: AppHandle) -> Result<Vec<UserSession>, String> {
    let conn = db::open_connection(&app)?;
    let mut stmt = conn
        .prepare(
            "SELECT us.id, us.user_id, u.username, us.time_in, us.time_out 
             FROM user_sessions us
             JOIN users u ON us.user_id = u.id
             ORDER BY us.time_in DESC"
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(UserSession {
                id: row.get(0)?,
                user_id: row.get(1)?,
                username: row.get(2)?,
                time_in: row.get(3)?,
                time_out: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut sessions = Vec::new();
    for row in rows {
        sessions.push(row.map_err(|e| e.to_string())?);
    }
    Ok(sessions)
}
