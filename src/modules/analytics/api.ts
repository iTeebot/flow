import { invoke } from "@tauri-apps/api/core";

export interface AdminAnalytics {
  invoices_today: number;
  quotations_today: number;
  deliveries_today: number;
  active_users_today: number;
  total_actions_today: number;
}

export interface AuditEntry {
  id: number;
  user_id: number;
  username: string;
  action: string;
  entity_type: string;
  entity_id: number;
  changes: string | null;
  created_at: string;
}

export interface UserSession {
  id: number;
  user_id: number;
  username: string | null;
  time_in: string;
  time_out: string | null;
}

export async function getAdminAnalytics(companyId: number): Promise<AdminAnalytics> {
  return await invoke("get_admin_analytics", { companyId });
}

export async function listAuditLogs(entityType?: string, entityId?: number): Promise<AuditEntry[]> {
  return await invoke("list_audit_logs", { entityType, entityId });
}

export async function listUserSessions(): Promise<UserSession[]> {
  return await invoke("list_user_sessions");
}
