import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Users, UserPlus, Trash2, ShieldCheck, Shield } from "lucide-react";
import { listUsers, deleteUser, type User } from "./api";
import { useToastStore } from "../../store/toastStore";
import { useAuthStore } from "../../store/authStore";
import { DataTable } from "../../components/DataTable";
import { Button } from "../../components/ui/Button";
import { Dialog } from "../../components/ui/Dialog";
import { CreateUserModal } from "./CreateUserModal";
import { useUiStore } from "../../store/uiStore";
import type { DataColumn } from "../../components/DataTable";

export function UsersModule() {
  const { t } = useTranslation("users");
  const [users, setUsers] = useState<User[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { addToast } = useToastStore();
  const { user: currentUser } = useAuthStore();
  const { setLoading } = useUiStore();

  const fetchUsers = async () => {
    try {
      setLoading(true, t("loading_users", "Loading Users..."));
      const data = await listUsers();
      setUsers(data);
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Failed to load users", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const confirmDelete = async () => {
    if (!userToDelete) return;
    try {
      setIsDeleting(true);
      await deleteUser(userToDelete.id);
      addToast(t("user_deleted", "User deleted successfully"), "success");
      setUserToDelete(null);
      fetchUsers();
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Failed to delete user", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const columns: DataColumn<User>[] = [
    {
      header: t("username", "Username"),
      accessor: (row) => (
        <div className="font-bold text-text-primary flex items-center gap-2">
          {row.role === 'admin' ? <ShieldCheck className="h-4 w-4 text-primary" /> : <Shield className="h-4 w-4 text-text-muted" />}
          {row.username}
        </div>
      ),
    },
    {
      header: t("full_name", "Full Name"),
      accessor: "full_name",
    },
    {
      header: t("role", "Role"),
      accessor: (row) => (
        <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${row.role === 'admin' ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-surface border border-border text-text-muted'}`}>
          {row.role}
        </span>
      ),
    },
    {
      header: t("created_at", "Created At"),
      accessor: (row) => new Date(row.created_at).toLocaleDateString(),
    },
    {
      header: t("actions", "Actions"),
      accessor: (row) => (
        <div className="flex items-center gap-2">
          {row.id !== currentUser?.id && row.id !== 1 && (
            <button
              onClick={() => setUserToDelete(row)}
              className="p-1.5 rounded bg-error/10 text-error hover:bg-error/20 transition-colors"
              title={t("delete_user", "Delete User")}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text-primary flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            {t("users_management", "Users Management")}
          </h1>
          <p className="text-sm text-text-muted mt-1">{t("users_desc", "Manage team access and permissions")}</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => setIsCreateModalOpen(true)} className="gap-2 shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform">
            <UserPlus className="h-4 w-4" />
            {t("add_user", "Add User")}
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <DataTable data={users} columns={columns} keyExtractor={(row) => row.id} />
      </div>

      {isCreateModalOpen && (
        <CreateUserModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onCreated={fetchUsers}
        />
      )}

      <Dialog
        isOpen={userToDelete !== null}
        onClose={() => setUserToDelete(null)}
        onConfirm={confirmDelete}
        title={t("delete_user_title", "Delete User")}
        description={t("delete_user_desc", `Are you sure you want to delete the user "${userToDelete?.username}"? This action cannot be undone.`)}
        confirmText={t("common:delete", "Delete")}
        cancelText={t("common:cancel", "Cancel")}
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}
