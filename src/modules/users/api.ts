import { invoke } from "@tauri-apps/api/core";

export interface User {
  id: number;
  username: string;
  full_name: string | null;
  role: string;
  permissions?: string; // JSON string
  created_at: string;
}

export interface UserSession {
  id: number;
  user_id: number;
  username?: string;
  time_in: string;
  time_out: string | null;
}

export async function listUsers() {
  return await invoke<User[]>("list_users");
}

export async function createUser(input: any) {
  return await invoke<User>("create_user", { input });
}

export async function deleteUser(user_id: number) {
  return await invoke<void>("delete_user", { userId: user_id });
}



export async function listUserSessions() {
  return await invoke<UserSession[]>("list_user_sessions");
}
