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
        .setup(|app| {
            db::init_db(&app.handle())?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            init_database,
            modules::auth::is_registered,
            modules::auth::register,
            modules::auth::login,
            modules::auth::update_user_profile,
            modules::app_info::get_app_info,
            modules::company_profile::create_company_profile,
            modules::company_profile::list_company_profiles,
            modules::company_profile::get_company_profile,
            modules::company_profile::update_company_profile,
            modules::app_settings::get_backup_info,
            modules::app_settings::create_backup,
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
            modules::delivery_challan::save_delivery_challan_pdf,
            modules::invoices::create_invoice_from_challan,
            modules::invoices::list_invoices,
            modules::dashboard::get_dashboard_summary
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
