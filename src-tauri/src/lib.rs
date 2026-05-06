mod db;
mod modules;

#[tauri::command]
fn init_database(app: tauri::AppHandle) -> Result<String, String> {
    db::init_db(&app)?;
    Ok("Database initialized".to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            db::init_db(&app.handle())?;
            
            // On Linux, the window icon often needs to be set explicitly
            #[cfg(target_os = "linux")]
            {
                use tauri::Manager;
                if let Some(window) = app.get_webview_window("main") {
                    let icon_bytes = include_bytes!("../icons/128x128.png");
                    if let Ok(icon) = tauri::image::Image::from_bytes(icon_bytes) {
                        let _ = window.set_icon(icon);
                    }
                }
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            init_database,
            modules::auth::is_registered,
            modules::auth::register,
            modules::auth::login,
            modules::auth::logout_session,
            modules::auth::validate_session,
            modules::auth::update_user_profile,
            modules::auth::reset_database,
            modules::auth::restore_database,
            modules::security::generate_recovery_key,
            modules::app_info::get_app_info,
            modules::company_profile::create_company_profile,
            modules::company_profile::list_company_profiles,
            modules::company_profile::get_company_profile,
            modules::company_profile::update_company_profile,
            modules::app_settings::get_backup_info,
            modules::app_settings::create_backup,
            modules::app_settings::export_backup,
            modules::inventory::create_product,
            modules::inventory::list_products,
            modules::inventory::update_product,
            modules::inventory::delete_product,
            modules::inventory::adjust_stock,
            modules::customers::create_customer,
            modules::customers::list_customers,
            modules::customers::update_customer,
            modules::customers::delete_customer,
            modules::delivery_challan::create_delivery_challan,
            modules::delivery_challan::list_delivery_challans,
            modules::delivery_challan::get_delivery_challan,
            modules::delivery_challan::update_delivery_challan,
            modules::delivery_challan::save_delivery_challan_pdf,
            modules::delivery_challan::delete_delivery_challan,
            modules::invoices::create_invoice_from_challan,
            modules::invoices::create_detailed_invoice,
            modules::invoices::list_invoices,
            modules::invoices::get_invoice,
            modules::invoices::update_invoice,
            modules::invoices::delete_invoice,
            modules::dashboard::get_dashboard_summary,
            modules::quotations::create_quotation,
            modules::quotations::list_quotations,
            modules::quotations::update_quotation_status,
            modules::quotations::delete_quotation,
            modules::quotations::update_quotation,
            modules::users::list_users,
            modules::users::create_user,
            modules::users::delete_user,
            modules::users::list_user_sessions,
            modules::audit::list_audit_logs,
            modules::analytics::get_admin_analytics
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|_app, _event| {
            #[cfg(target_os = "macos")]
            if let tauri::RunEvent::Opened { urls } = _event {
                use tauri::Emitter;
                for url in urls {
                    if let Ok(path) = url.to_file_path() {
                        let _ = _app.emit("file-opened", path.to_string_lossy().to_string());
                    }
                }
            }
        });
}
