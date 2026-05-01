import React from "react";
import { useTranslation } from "react-i18next";
import { ShieldAlert, Copy, Download, Mail } from "lucide-react";
import { Dialog } from "../ui/Dialog";
import { Button } from "../ui/Button";
import { useToastStore } from "../../store/toastStore";

interface RecoveryKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  recoveryKey: string;
  onSaveToFile: () => void;
  isEmailSent?: boolean;
  email?: string;
}

export const RecoveryKeyModal: React.FC<RecoveryKeyModalProps> = ({ 
  isOpen, 
  onClose, 
  recoveryKey,
  onSaveToFile,
  isEmailSent,
  email
}) => {
  const { t } = useTranslation("auth");
  const { addToast } = useToastStore();

  const handleCopy = () => {
    navigator.clipboard.writeText(recoveryKey);
    addToast(t("common:copied"), "success");
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={() => {}} // Force user to acknowledge
      onConfirm={onClose}
      title={t("recovery.recovery_saved_title")}
      description={t("recovery.recovery_saved_desc")}
      confirmText={t("common:close")}
    >
      <div className="space-y-6">
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-bold text-amber-600">{t("recovery.recovery_warning_title")}</p>
            <p className="text-[11px] text-amber-700 leading-relaxed">
              {t("recovery.recovery_warning_desc")}
            </p>
          </div>
        </div>

        <div className="relative group">
          <div className="p-4 rounded-xl bg-surface border border-border font-mono text-center tracking-wider text-lg font-black break-all select-all">
            {recoveryKey}
          </div>
          <button 
            onClick={handleCopy}
            className="absolute top-2 right-2 p-1.5 rounded-lg bg-card border border-border opacity-0 group-hover:opacity-100 transition-opacity hover:bg-surface"
          >
            <Copy className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="secondary"
            onClick={onSaveToFile}
            leftIcon={<Download className="h-4 w-4" />}
            className="w-full text-xs"
          >
            {t("recovery.save_to_file")}
          </Button>
          <Button
            variant="secondary"
            onClick={handleCopy}
            leftIcon={<Copy className="h-4 w-4" />}
            className="w-full text-xs"
          >
            {t("recovery.copy_key")}
          </Button>
        </div>

        {isEmailSent && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-success/5 border border-success/20 text-[11px] text-success font-medium">
            <Mail className="h-4 w-4" />
            {t("recovery.email_sent", { email })}
          </div>
        )}
      </div>
    </Dialog>
  );
};
