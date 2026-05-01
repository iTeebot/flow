use crate::db;
use serde::Serialize;
use tauri::AppHandle;

#[derive(Debug, Serialize)]
pub struct AdminAnalytics {
    pub invoices_today: i64,
    pub quotations_today: i64,
    pub deliveries_today: i64,
    pub active_users_today: i64,
    pub total_actions_today: i64,
}

#[tauri::command]
pub fn get_admin_analytics(app: AppHandle, company_id: i64) -> Result<AdminAnalytics, String> {
    let conn = db::open_connection(&app)?;

    let invoices_today: i64 = conn.query_row(
        "SELECT COUNT(*) FROM invoices WHERE company_id = ?1 AND DATE(created_at) = DATE('now', 'localtime')",
        [company_id],
        |row| row.get(0),
    ).unwrap_or(0);

    let quotations_today: i64 = conn.query_row(
        "SELECT COUNT(*) FROM quotations WHERE company_id = ?1 AND DATE(created_at) = DATE('now', 'localtime')",
        [company_id],
        |row| row.get(0),
    ).unwrap_or(0);

    let deliveries_today: i64 = conn.query_row(
        "SELECT COUNT(*) FROM delivery_challans WHERE company_id = ?1 AND DATE(created_at) = DATE('now', 'localtime')",
        [company_id],
        |row| row.get(0),
    ).unwrap_or(0);

    let active_users_today: i64 = conn.query_row(
        "SELECT COUNT(DISTINCT user_id) FROM user_sessions WHERE DATE(time_in) = DATE('now', 'localtime')",
        [],
        |row| row.get(0),
    ).unwrap_or(0);

    let total_actions_today: i64 = conn.query_row(
        "SELECT COUNT(*) FROM audit_logs WHERE DATE(created_at) = DATE('now', 'localtime')",
        [],
        |row| row.get(0),
    ).unwrap_or(0);

    Ok(AdminAnalytics {
        invoices_today,
        quotations_today,
        deliveries_today,
        active_users_today,
        total_actions_today,
    })
}
