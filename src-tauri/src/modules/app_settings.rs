use crate::db;
use chrono::Utc;
use rusqlite::params;
use serde::Serialize;
use std::fs;
use std::path::PathBuf;
use tauri::Manager;

#[derive(Debug, Serialize)]
pub struct BackupInfo {
    pub backup_path: Option<String>,
    pub last_backup_at: Option<String>,
}

#[tauri::command]
pub fn get_backup_info(app: tauri::AppHandle) -> Result<BackupInfo, String> {
    let conn = db::open_connection(&app)?;
    let backup_path: Option<String> = conn
        .query_row(
            "SELECT value FROM app_meta WHERE key = 'last_backup_path'",
            [],
            |row| row.get(0),
        )
        .ok();
    let last_backup_at: Option<String> = conn
        .query_row(
            "SELECT value FROM app_meta WHERE key = 'last_backup_at'",
            [],
            |row| row.get(0),
        )
        .ok();

    Ok(BackupInfo {
        backup_path,
        last_backup_at,
    })
}

#[tauri::command]
pub fn create_backup(app: tauri::AppHandle) -> Result<BackupInfo, String> {
    let db_path = db::resolve_db_path(&app)?;
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve app data directory: {e}"))?;
    let backup_dir = app_data_dir.join("backups");
    fs::create_dir_all(&backup_dir).map_err(|e| format!("Failed to create backup directory: {e}"))?;

    let timestamp = Utc::now().format("%Y%m%d-%H%M%S").to_string();
    let file_name = format!("teebot-flow-backup-{timestamp}.db");
    let backup_path: PathBuf = backup_dir.join(file_name);
    fs::copy(&db_path, &backup_path).map_err(|e| format!("Failed to create database backup: {e}"))?;

    let last_backup_at = Utc::now().to_rfc3339();
    let conn = db::open_connection(&app)?;
    conn.execute(
        "INSERT INTO app_meta(key, value, updated_at) VALUES('last_backup_path', ?1, CURRENT_TIMESTAMP)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP",
        params![backup_path.to_string_lossy().to_string()],
    )
    .map_err(|e| format!("Failed to save backup path metadata: {e}"))?;
    conn.execute(
        "INSERT INTO app_meta(key, value, updated_at) VALUES('last_backup_at', ?1, CURRENT_TIMESTAMP)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP",
        params![last_backup_at.clone()],
    )
    .map_err(|e| format!("Failed to save backup time metadata: {e}"))?;

    Ok(BackupInfo {
        backup_path: Some(backup_path.to_string_lossy().to_string()),
        last_backup_at: Some(last_backup_at),
    })
}
