import { invoke } from "@tauri-apps/api/core";

export type AppInfo = {
  product_name: string;
  version: string;
  db_file_name: string;
  build_profile: string;
  target_os: string;
};

export async function getAppInfo() {
  return invoke<AppInfo>("get_app_info");
}
