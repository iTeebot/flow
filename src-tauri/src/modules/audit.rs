use crate::db;
use rusqlite::params;
use serde_json::Value;
use tauri::AppHandle;

#[allow(dead_code)]
pub fn log_audit(
    app: &AppHandle,
    user_id: i64,
    action: &str,
    entity_type: &str,
    entity_id: i64,
    changes: Option<Value>,
) -> Result<(), String> {
    let conn = db::open_connection(app)?;
    let changes_json = changes.map(|v| v.to_string());

    conn.execute(
        "INSERT INTO audit_logs (user_id, action, entity_type, entity_id, changes) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![user_id, action, entity_type, entity_id, changes_json],
    )
    .map_err(|e| format!("Failed to log audit: {e}"))?;

    Ok(())
}

#[derive(Debug, serde::Serialize)]
pub struct AuditEntry {
    pub id: i64,
    pub user_id: i64,
    pub username: String,
    pub action: String,
    pub entity_type: String,
    pub entity_id: i64,
    pub changes: Option<String>,
    pub created_at: String,
}

#[tauri::command]
pub fn list_audit_logs(app: AppHandle, entity_type: Option<String>, entity_id: Option<i64>) -> Result<Vec<AuditEntry>, String> {
    let conn = db::open_connection(&app)?;
    let mut query = "SELECT al.id, al.user_id, u.username, al.action, al.entity_type, al.entity_id, al.changes, al.created_at 
                     FROM audit_logs al
                     JOIN users u ON al.user_id = u.id".to_string();
    
    let mut params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();
    let mut conditions = Vec::new();

    if let Some(et) = entity_type {
        conditions.push("al.entity_type = ?");
        params.push(Box::new(et));
    }
    if let Some(ei) = entity_id {
        conditions.push("al.entity_id = ?");
        params.push(Box::new(ei));
    }

    if !conditions.is_empty() {
        query.push_str(" WHERE ");
        query.push_str(&conditions.join(" AND "));
    }

    query.push_str(" ORDER BY al.created_at DESC");

    let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;
    let rows = stmt.query_map(rusqlite::params_from_iter(params.iter()), |row| {
        Ok(AuditEntry {
            id: row.get(0)?,
            user_id: row.get(1)?,
            username: row.get(2)?,
            action: row.get(3)?,
            entity_type: row.get(4)?,
            entity_id: row.get(5)?,
            changes: row.get(6)?,
            created_at: row.get(7)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut logs = Vec::new();
    for row in rows {
        logs.push(row.map_err(|e| e.to_string())?);
    }
    Ok(logs)
}
