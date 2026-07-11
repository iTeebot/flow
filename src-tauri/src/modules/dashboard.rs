use crate::db;
use serde::Serialize;

#[derive(Debug, Serialize)]
#[allow(clippy::upper_case_acronyms)]
pub struct KPI {
    pub total_products: i64,
    pub total_customers: i64,
    pub total_sales: f64,
    pub pending_deliveries: i64,
}

#[derive(Debug, Serialize)]
pub struct SalesTrendPoint {
    pub date: String,
    pub amount: f64,
}

#[derive(Debug, Serialize)]
pub struct InventoryItem {
    pub product_name: String,
    pub stock_qty: f64,
    pub stock_value: f64,
}

#[derive(Debug, Serialize)]
pub struct ActivityItem {
    pub id: i64,
    pub activity_type: String,
    pub description: String,
    pub created_at: String,
}

#[derive(Debug, Serialize)]
pub struct DashboardSummary {
    pub kpi: KPI,
    pub sales_trend: Vec<SalesTrendPoint>,
    pub inventory_status: Vec<InventoryItem>,
    pub recent_activity: Vec<ActivityItem>,
}

#[tauri::command]
pub fn get_dashboard_summary(
    app: tauri::AppHandle,
    company_id: i64,
) -> Result<DashboardSummary, String> {
    if company_id <= 0 {
        return Err("Company profile is required".to_string());
    }

    let conn = db::open_connection(&app)?;

    // Get KPIs
    let total_products: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM products WHERE company_id = ?1 AND deleted_at IS NULL",
            [company_id],
            |row| row.get(0),
        )
        .unwrap_or(0);

    let total_customers: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM customers WHERE company_id = ?1 AND deleted_at IS NULL",
            [company_id],
            |row| row.get(0),
        )
        .unwrap_or(0);

    let total_sales: f64 = conn
        .query_row(
            "SELECT COALESCE(SUM(dci.quantity * dci.rate), 0.0) FROM dc_items dci 
             JOIN delivery_challans dc ON dci.dc_id = dc.id 
             WHERE dc.company_id = ?1 AND dc.deleted_at IS NULL",
            [company_id],
            |row| row.get(0),
        )
        .unwrap_or(0.0);

    let pending_deliveries: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM delivery_challans WHERE company_id = ?1 AND deleted_at IS NULL",
            [company_id],
            |row| row.get(0),
        )
        .unwrap_or(0);

    let kpi = KPI {
        total_products,
        total_customers,
        total_sales,
        pending_deliveries,
    };

    // Get sales trend (last 7 days)
    let mut stmt = conn
        .prepare(
            "SELECT DATE(dc.created_at) as date, COALESCE(SUM(dci.quantity * dci.rate), 0.0) as amount
             FROM delivery_challans dc
             LEFT JOIN dc_items dci ON dc.id = dci.dc_id
             WHERE dc.company_id = ?1 AND dc.deleted_at IS NULL
             AND dc.created_at >= datetime('now', '-7 days')
             GROUP BY DATE(dc.created_at)
             ORDER BY DATE(dc.created_at) ASC",
        )
        .map_err(|e| format!("Failed to prepare sales trend query: {e}"))?;

    let sales_trend: Vec<SalesTrendPoint> = stmt
        .query_map([company_id], |row| {
            Ok(SalesTrendPoint {
                date: row
                    .get::<_, Option<String>>(0)?
                    .unwrap_or_else(|| "Unknown".to_string()),
                amount: row.get(1)?,
            })
        })
        .map_err(|e| format!("Failed to fetch sales trend: {e}"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect sales trend: {e}"))?;

    // Get inventory status (top 10 products by value)
    let mut stmt = conn
        .prepare(
            "SELECT name, stock_qty, (COALESCE(stock_qty, 0.0) * COALESCE(price, 0.0)) as stock_value
             FROM products
             WHERE company_id = ?1 AND deleted_at IS NULL
             ORDER BY stock_value DESC
             LIMIT 10",
        )
        .map_err(|e| format!("Failed to prepare inventory query: {e}"))?;

    let inventory_status: Vec<InventoryItem> = stmt
        .query_map([company_id], |row| {
            Ok(InventoryItem {
                product_name: row.get(0)?,
                stock_qty: row.get(1)?,
                stock_value: row.get(2)?,
            })
        })
        .map_err(|e| format!("Failed to fetch inventory: {e}"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect inventory: {e}"))?;

    // Get recent activity (last 5 actions)
    let mut activity = Vec::new();

    // Recent delivery challans
    let mut stmt = conn
        .prepare(
            "SELECT id, 'Delivery Challan' as activity_type, 
             'Delivery challan ' || COALESCE(dc_number, 'N/A') || ' created' as description, created_at
             FROM delivery_challans
             WHERE company_id = ?1 AND deleted_at IS NULL
             ORDER BY created_at DESC
             LIMIT 5",
        )
        .map_err(|e| format!("Failed to prepare activity query: {e}"))?;

    let rows = stmt
        .query_map([company_id], |row| {
            Ok(ActivityItem {
                id: row.get(0)?,
                activity_type: row.get(1)?,
                description: row.get(2)?,
                created_at: row.get(3)?,
            })
        })
        .map_err(|e| format!("Failed to fetch activity: {e}"))?;

    for item in rows.flatten() {
        activity.push(item);
    }

    // Sort activity by date (newest first) and take top 5
    activity.sort_by(|a, b| b.created_at.cmp(&a.created_at));
    activity.truncate(5);

    Ok(DashboardSummary {
        kpi,
        sales_trend,
        inventory_status,
        recent_activity: activity,
    })
}
