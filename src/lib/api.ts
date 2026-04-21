import { isTauri } from "./platform";
import { APP_VERSION, PRODUCT_NAME } from "./version";

/**
 * Universal bridge that routes commands to Tauri's Rust backend or a Web-based local storage mock.
 */
export async function invoke<T>(command: string, args: any = {}): Promise<T> {
  if (isTauri()) {
    const { invoke: tauriInvoke } = await import("@tauri-apps/api/core");
    return tauriInvoke<T>(command, args);
  }

  // Web Fallback Logic
  console.log(`[Web Mode] Executing command: ${command}`, args);
  
  // Specific handler for PDF save in web mode
  if (command === "save_delivery_challan_pdf") {
    return handleWebPdfSave(args.filename, args.base64Data) as unknown as T;
  }

  return handleWebCommand<T>(command, args);
}

/**
 * Universal bridge for revealing paths in the system file explorer.
 */
export async function openPath(path: string): Promise<void> {
  if (isTauri()) {
    const { revealItemInDir } = await import("@tauri-apps/plugin-opener");
    return revealItemInDir(path);
  }
  
  console.log(`[Web Mode] Opening path: ${path}`);
  if (path.startsWith("http") || path.startsWith("blob:")) {
    window.open(path, "_blank");
  }
}

async function handleWebPdfSave(filename: string, base64Data: string): Promise<string> {
  const link = document.createElement("a");
  link.href = `data:application/pdf;base64,${base64Data}`;
  link.download = filename;
  link.click();
  return "browser-download";
}

// Simple Web Command Handler (LocalStorage Mock)
async function handleWebCommand<T>(command: string, args: any): Promise<T> {
  await new Promise((resolve) => setTimeout(resolve, 200));

  switch (command) {
    case "is_registered":
      return (localStorage.getItem("teebot_profile") !== null) as unknown as T;

    case "login": {
      const profile = JSON.parse(localStorage.getItem("teebot_profile") || "{}");
      if (profile.username === args.username) {
        return { user: profile, company_id: 1 } as unknown as T;
      }
      throw new Error("Invalid username or password (Web Mode)");
    }

    case "register": {
      localStorage.setItem("teebot_profile", JSON.stringify(args.input));
      return { user: args.input, company_id: 1 } as unknown as T;
    }

    case "list_customers":
      return JSON.parse(localStorage.getItem("teebot_customers") || "[]") as unknown as T;

    case "create_customer": {
      const customers = JSON.parse(localStorage.getItem("teebot_customers") || "[]");
      const newCustomer = { ...args.input, id: Date.now() };
      customers.push(newCustomer);
      localStorage.setItem("teebot_customers", JSON.stringify(customers));
      return newCustomer as unknown as T;
    }

    case "list_products":
      return JSON.parse(localStorage.getItem("teebot_products") || "[]") as unknown as T;

    case "list_invoices":
      return JSON.parse(localStorage.getItem("teebot_invoices") || "[]") as unknown as T;

    case "create_product": {
      const products = JSON.parse(localStorage.getItem("teebot_products") || "[]");
      const newProduct = { ...args.input, id: Date.now(), created_at: new Date().toISOString() };
      products.push(newProduct);
      localStorage.setItem("teebot_products", JSON.stringify(products));
      return newProduct as unknown as T;
    }

    case "list_delivery_challans":
      return JSON.parse(localStorage.getItem("teebot_dc") || "[]") as unknown as T;

    case "create_delivery_challan": {
      const dcs = JSON.parse(localStorage.getItem("teebot_dc") || "[]");
      const products = JSON.parse(localStorage.getItem("teebot_products") || "[]");
      const customers = JSON.parse(localStorage.getItem("teebot_customers") || "[]");
      const customer = customers.find((c: any) => c.id === args.input.customer_id);
      
      const nextId = dcs.length > 0 ? Math.max(...dcs.map((d: any) => d.id)) + 1 : 1;
      const dcNumber = `DC-${String(nextId).padStart(3, '0')}`;
      
      let totalAmount = 0;
      const items = args.input.items.map((item: any) => {
        const product = products.find((p: any) => p.id === item.product_id);
        if (product) {
          if (product.stock_qty < item.quantity) {
            throw new Error(`Insufficient stock for ${product.name}`);
          }
          product.stock_qty -= item.quantity;
          const amount = product.price * item.quantity;
          totalAmount += amount;
          return {
            ...item,
            product_name: product.name,
            rate: product.price,
            amount
          };
        }
        return item;
      });

      const newDc = {
        id: nextId,
        dc_number: dcNumber,
        customer_id: args.input.customer_id,
        customer_name: customer?.name || "Unknown",
        company_id: args.input.company_id,
        total_amount: totalAmount,
        created_at: new Date().toISOString(),
        items
      };

      dcs.push(newDc);
      localStorage.setItem("teebot_dc", JSON.stringify(dcs));
      localStorage.setItem("teebot_products", JSON.stringify(products));
      return newDc as unknown as T;
    }

    case "get_company_profile":
      return JSON.parse(localStorage.getItem("teebot_profile") || "{}") as unknown as T;

    case "get_dashboard_summary": {
      const products = JSON.parse(localStorage.getItem("teebot_products") || "[]");
      const customers = JSON.parse(localStorage.getItem("teebot_customers") || "[]");
      const dcs = JSON.parse(localStorage.getItem("teebot_dc") || "[]");
      const invoices = JSON.parse(localStorage.getItem("teebot_invoices") || "[]");
      
      const totalSales = invoices.reduce((sum: number, inv: any) => sum + (inv.total_amount || 0), 0);
      
      // Map products to inventory status
      const inventoryStatus = products.map((p: any) => ({
        product_name: p.name,
        stock_qty: p.stock_qty,
        stock_value: p.stock_qty * p.price
      }));

      return {
        kpi: {
          total_products: products.length,
          total_customers: customers.length,
          total_sales: totalSales,
          pending_deliveries: dcs.length
        },
        sales_trend: invoices.length > 0 ? invoices.slice(-7).map((inv: any) => ({
          date: new Date(inv.created_at).toLocaleDateString(),
          amount: inv.total_amount
        })) : [],
        inventory_status: inventoryStatus,
        recent_activity: [...dcs, ...invoices].slice(-5).map((item: any) => ({
          id: item.id,
          activity_type: item.dc_number ? "Delivery Challan" : "Invoice",
          description: `Created ${item.dc_number || item.invoice_number}`,
          created_at: item.created_at
        })).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      } as unknown as T;
    }

    case "update_user_profile":
    case "update_company_profile": {
      const profile = JSON.parse(localStorage.getItem("teebot_profile") || "{}");
      const updated = { ...profile, ...args.input };
      localStorage.setItem("teebot_profile", JSON.stringify(updated));
      return updated as unknown as T;
    }

    case "get_app_info":
      return {
        product_name: PRODUCT_NAME,
        version: APP_VERSION,
        db_file_name: "LocalStorage",
        build_profile: "Web Mode",
        target_os: "Browser"
      } as unknown as T;

    default:
      console.warn(`[Web Mode] No implementation for: ${command}`);
      // Fallback for list commands to prevent .filter() / .map() crashes
      if (command.startsWith("list_")) return [] as unknown as T;
      return {} as T;
  }
}



