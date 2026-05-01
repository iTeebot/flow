import React from "react";
import { useTranslation } from "react-i18next";
import { Mail, Key } from "lucide-react";
import { Dialog } from "../ui/Dialog";
import { Input } from "../ui/Input";

interface CloudUploadCredentialsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (email: string, secretKey: string) => void;
  defaultEmail?: string;
  defaultSecretKey?: string;
  expectedSecretKey?: string;
  isLoading?: boolean;
}

export const CloudUploadCredentialsModal: React.FC<CloudUploadCredentialsModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  defaultEmail = "",
  defaultSecretKey = "",
  expectedSecretKey,
  isLoading = false,
}) => {
  const { t } = useTranslation("settings");
  const [email, setEmail] = React.useState(defaultEmail);
  const [secretKey, setSecretKey] = React.useState(defaultSecretKey);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (isOpen) {
      setEmail(defaultEmail);
      setSecretKey(defaultSecretKey);
      setError("");
    }
  }, [isOpen, defaultEmail, defaultSecretKey]);

  const handleConfirm = () => {
    const normalizedEmail = email.trim();
    const normalizedSecretKey = secretKey.trim();

    if (!normalizedEmail) {
      setError(t("email_required", "Email is required."));
      return;
    }

    if (!normalizedSecretKey) {
      setError(t("secret_key_required", "Recovery key is required."));
      return;
    }

    if (expectedSecretKey && normalizedSecretKey !== expectedSecretKey.trim()) {
      setError(t("secret_key_mismatch", "The recovery key does not match the active backup key."));
      return;
    }

    setError("");
    onConfirm(normalizedEmail, normalizedSecretKey);
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={handleConfirm}
      title={t("cloud_upload_credentials_title", "Save Cloud Upload Credentials")}
      description={t("cloud_upload_credentials_desc", "Enter these once so cloud backups can upload automatically on this device.")}
      confirmText={t("common:save", "Save")}
      cancelText={t("common:cancel", "Cancel")}
      isLoading={isLoading}
    >
      <div className="space-y-4">
        <Input
          label={t("email_label", "Email")}
          placeholder={t("email_placeholder", "Enter your business email")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          leftIcon={<Mail className="h-4 w-4" />}
          error={error && !email.trim() ? error : ""}
        />
        <Input
          label={t("secret_key_label", "Recovery Key")}
          placeholder={t("secret_key_placeholder", "Enter the master recovery key")}
          value={secretKey}
          onChange={(e) => setSecretKey(e.target.value)}
          leftIcon={<Key className="h-4 w-4" />}
          error={error && (error.toLowerCase().includes("recovery key") || error.toLowerCase().includes("mismatch")) ? error : ""}
        />
        {error && !error.toLowerCase().includes("email") && !error.toLowerCase().includes("recovery key") && !error.toLowerCase().includes("mismatch") && (
          <p className="text-[10px] font-bold text-error ps-1">{error}</p>
        )}
        <p className="text-[10px] text-text-muted leading-relaxed">
          {t("cloud_upload_credentials_note", "This is stored locally on this desktop device and reused automatically the next time you are logged in.")}
        </p>
      </div>
    </Dialog>
  );
};
