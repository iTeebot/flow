import { useState } from "react";
import { useTranslation } from "react-i18next";
import { createUser } from "./api";
import { useToastStore } from "../../store/toastStore";
import { X } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Portal } from "../../components/ui/Portal";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const MODULES = [
  { id: "dashboard", label: "Dashboard" },
  { id: "delivery_challan", label: "Delivery Challan" },
  { id: "quotations", label: "Quotations" },
  { id: "inventory", label: "Inventory" },
  { id: "customers", label: "Customers" },
  { id: "invoices", label: "Invoices" },
  { id: "profile", label: "Profile" },
  { id: "settings", label: "Settings" },
];

export function CreateUserModal({ isOpen, onClose, onCreated }: Props) {
  const { t } = useTranslation("users");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { addToast } = useToastStore();

  const [formData, setFormData] = useState({
    username: "",
    password: "",
    full_name: "",
    role: "user",
  });

  const [permissions, setPermissions] = useState<Record<string, boolean>>(
    MODULES.reduce((acc, mod) => ({ ...acc, [mod.id]: true }), {})
  );

  if (!isOpen) return null;

  const handleTogglePermission = (id: string) => {
    setPermissions(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.username || !formData.password) {
      addToast(t("required_fields", "Username and password are required"), "error");
      return;
    }

    try {
      setIsSubmitting(true);
      
      const payload = {
        ...formData,
        permissions: formData.role === 'admin' ? null : JSON.stringify(permissions),
      };

      await createUser(payload);
      addToast(t("user_created", "User created successfully"), "success");
      onCreated();
      onClose();
    } catch (err) {
      addToast(err instanceof Error ? err.message : t("create_error", "Failed to create user"), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card w-full max-w-xl rounded-2xl shadow-2xl border border-border overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-border bg-surface/50">
          <div>
            <h2 className="text-xl font-bold text-text-primary">{t("create_new_user", "Create New User")}</h2>
            <p className="text-sm text-text-muted mt-1">{t("create_user_desc", "Add a new team member and configure their access")}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface text-text-muted transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          <form id="create-user-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-text-muted">{t("username", "Username")}</label>
                <input
                  type="text"
                  required
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
                  placeholder="e.g. john.doe"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-text-muted">{t("password", "Password")}</label>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-text-muted">{t("full_name", "Full Name")}</label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
                placeholder="John Doe"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-text-muted">{t("role", "Role")}</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors appearance-none"
              >
                <option value="user">{t("role_user", "Standard User")}</option>
                <option value="admin">{t("role_admin", "Administrator")}</option>
              </select>
            </div>

            {formData.role === 'user' && (
              <div className="space-y-3 pt-4 border-t border-border">
                <label className="text-xs font-bold uppercase tracking-wider text-text-muted">{t("module_permissions", "Module Permissions")}</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {MODULES.map(mod => (
                    <label key={mod.id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-surface/50 cursor-pointer hover:bg-surface transition-colors">
                      <input
                        type="checkbox"
                        checked={permissions[mod.id]}
                        onChange={() => handleTogglePermission(mod.id)}
                        className="w-4 h-4 rounded text-primary focus:ring-primary border-border bg-card"
                      />
                      <span className="text-sm font-medium text-text-primary">{mod.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </form>
        </div>

        <div className="p-6 border-t border-border bg-surface/30 flex items-center justify-end gap-3 shrink-0">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            {t("cancel", "Cancel")}
          </Button>
          <Button type="submit" form="create-user-form" isLoading={isSubmitting}>
            {t("create_user_btn", "Create User")}
          </Button>
        </div>
        </div>
      </div>
    </Portal>
  );
}
