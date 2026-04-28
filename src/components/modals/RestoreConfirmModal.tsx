import React from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, FileType, Calendar, HardDrive } from "lucide-react";
import { Dialog } from "../ui/Dialog";

interface RestoreConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (encryptionKey?: string) => void;
  fileInfo: {
    name: string;
    size: string;
    date: string;
    path: string;
  };
  isLoading?: boolean;
}

export const RestoreConfirmModal: React.FC<RestoreConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  fileInfo,
  isLoading
}) => {
  const { t } = useTranslation("auth");
  const [encryptionKey, setEncryptionKey] = React.useState("");

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={() => onConfirm(encryptionKey.trim() || undefined)}
      title={t("restore_modal.title", "Restore Workspace")}
      description={t("restore_modal.subtitle", "Confirm the restoration of your business data")}
      confirmText={t("restore_modal.confirm_btn", "Confirm Restore")}
      cancelText={t("common:cancel", "Cancel")}
      variant="danger"
      isLoading={isLoading}
    >
      <div className="space-y-6">
        <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-4">
          <div className="flex items-start gap-3">
            <FileType className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <span className="block text-[10px] font-black uppercase tracking-widest text-text-muted mb-1">
                {t("restore_modal.file_name", "File Name")}
              </span>
              <span className="text-sm font-semibold text-text-primary break-all">
                {fileInfo.name}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <span className="block text-[10px] font-black uppercase tracking-widest text-text-muted mb-1">
                  {t("restore_modal.backup_date", "Backup Date")}
                </span>
                <span className="text-sm font-semibold text-text-primary">
                  {fileInfo.date}
                </span>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <HardDrive className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <span className="block text-[10px] font-black uppercase tracking-widest text-text-muted mb-1">
                  {t("restore_modal.file_size", "File Size")}
                </span>
                <span className="text-sm font-semibold text-text-primary">
                  {fileInfo.size}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-start gap-4 p-4 rounded-xl border border-error/20 bg-error/5">
          <AlertTriangle className="h-6 w-6 text-error shrink-0" />
          <p className="text-sm text-text-primary leading-relaxed">
            <strong className="text-error">{t("restore_modal.warning_label", "Warning: ")}</strong>
            {t("restore_modal.warning_text", "Restoring this backup will permanently replace your current local database. This action cannot be undone.")}
          </p>
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-bold text-text-primary">
            {t("restore_modal.key_label", "Recovery Key (If Encrypted)")}
          </label>
          <input
            type="text"
            placeholder="e.g. TEEB-XXXX-XXXX-XXXX"
            value={encryptionKey}
            onChange={(e) => setEncryptionKey(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm text-text-primary focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-mono"
          />
          <p className="text-[10px] text-text-muted">
            {t("restore_modal.key_desc", "Leave blank if this is an older, unencrypted backup (.db or early .tbf files).")}
          </p>
        </div>
      </div>
    </Dialog>
  );
};
