use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct AppInfo {
    pub product_name: String,
    pub version: String,
    pub db_file_name: String,
    pub build_profile: String,
    pub target_os: String,
}

#[tauri::command]
pub fn get_app_info() -> Result<AppInfo, String> {
    Ok(AppInfo {
        product_name: "Teebot Flow".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        db_file_name: crate::db::DB_FILE_NAME.to_string(),
        build_profile: if cfg!(debug_assertions) { "Development" } else { "Release" }.to_string(),
        target_os: std::env::consts::OS.to_string(),
    })
}
