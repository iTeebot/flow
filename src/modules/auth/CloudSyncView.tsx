import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  ShieldCheck,
  Mail,
  ArrowLeft,
  Lock,
  Building2,
  MapPin,
  Hash,
  IdCard,
  Phone,
  User as UserIcon
} from "lucide-react";
import { Sidebar } from "./Sidebar";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { useToastStore } from "../../store/toastStore";
import { useAuthStore } from "../../store/authStore";
import { useUiStore } from "../../store/uiStore";
import { validatePakistaniPhone } from "../../utils/validations/phone";
import { validateEmail } from "../../utils/validations/email";
import { validatePakistaniCNIC, validatePakistaniNTN } from "../../utils/validations/identity";
import { getLanguageDirection, getForwardIcon } from "../../utils/layout";
import { stripNonAlphaNumeric, stripNonDigits } from "../../utils/formatters";
import { downloadLatestBackup } from "../../utils/cloudSync";
import { saveRecoveryKey } from "../../utils/recoveryKeyStore";
import { FullscreenLoader } from "../../components/ui/FullscreenLoader";
import { invoke } from "../../lib/api";
import { isTauri } from "../../lib/platform";

interface CloudSyncViewProps {
  onBack: () => void;
}

type SyncStep = "init" | "verify" | "otp" | "restore";

export const CloudSyncView: React.FC<CloudSyncViewProps> = ({ onBack }) => {
  const { t } = useTranslation("auth");
  const { addToast } = useToastStore();
  const { checkRegistration, register } = useAuthStore();
  const { language } = useUiStore();
  const isUrdu = language === "ur";
  const direction = getLanguageDirection(language);
  const ForwardIcon = getForwardIcon(direction);

  const [step, setStep] = useState<SyncStep>("init");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [verificationField, setVerificationField] = useState("");
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [cloudId, setCloudId] = useState("");
  const [recoveryKey, setRecoveryKey] = useState("");
  const [isRestoringBackup, setIsRestoringBackup] = useState(false);

  // Step 1: Initial Identifiers
  const [ntn, setNtn] = useState("");
  const [cnic, setCnic] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  // Step 2: Verification Answer
  const [answer, setAnswer] = useState("");

  // Step 3: OTP
  const [otp, setOtp] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendCount, setResendCount] = useState(0);

  useEffect(() => {
    let timer: any;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleInitiateSync = async () => {
    setValidationErrors({});
    const newErrors: Record<string, string> = {};

    if (!ntn) newErrors.ntn = " ";
    if (!cnic) newErrors.cnic = " ";
    if (!email) newErrors.email = " ";
    if (!phone) newErrors.phone = " ";
    if (!password) newErrors.password = " ";

    if (Object.keys(newErrors).length > 0) {
      setValidationErrors(newErrors);
      addToast(t("register.error_fill_required"), "error");
      return;
    }

    // Advanced Validations
    if (!validatePakistaniNTN(ntn)) {
      setValidationErrors({ ntn: " " });
      addToast(t("register.error_invalid_ntn"), "error");
      return;
    }
    if (!validatePakistaniCNIC(cnic)) {
      setValidationErrors({ cnic: " " });
      addToast(t("register.error_invalid_cnic"), "error");
      return;
    }
    if (!validateEmail(email)) {
      setValidationErrors({ email: " " });
      addToast(t("register.error_invalid_email"), "error");
      return;
    }
    if (!validatePakistaniPhone(phone)) {
      setValidationErrors({ phone: " " });
      addToast(t("register.error_invalid_phone"), "error");
      return;
    }
    if (password.length < 8) {
      setValidationErrors({ password: " " });
      addToast(t("register.error_length"), "error");
      return;
    }

    setIsLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || "https://api.afmsolution.tech/api/teebot-flow";
      const response = await fetch(`${apiUrl}/sync-business`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ntn, cnic, email, phone }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        let errorMessage = t("register_errors.sync_failed");
        
        // Priority: custom error from server > message > generic fallback
        if (errorData.error) {
          errorMessage = errorData.error;
          // Handle specific 409 conflicts
          if (response.status === 409) {
            if (errorData.error.includes('email')) {
              errorMessage = t("register_errors.email_already_exists");
            } else if (errorData.error.includes('phone')) {
              errorMessage = t("register_errors.phone_already_exists");
            } else if (errorData.error.includes('cnic')) {
              errorMessage = t("register_errors.cnic_already_exists");
            } else if (errorData.error.includes('ntn')) {
              errorMessage = t("register_errors.ntn_already_exists");
            }
          }
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      setSessionId(data.sessionId);
      setVerificationField(data.verificationField);
      setStep("verify");
    } catch (err: any) {
      const errorMsg = err.message || t("cloud_sync.error_sync_failed");
      addToast(errorMsg, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyData = async () => {
    if (!answer) {
      addToast(t("register.error_fill_required"), "error");
      return;
    }

    setIsLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || "https://api.afmsolution.tech/api/teebot-flow";
      const response = await fetch(`${apiUrl}/verify-sync-data`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, answer }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.message || "Verification failed";
        throw new Error(errorMessage);
      }

      setStep("otp");
      setResendCooldown(60); // Start 1-minute timer from initial send
    } catch (err: any) {
      addToast(err.message || "Verification failed", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      addToast(t("cloud_sync.error_otp_invalid"), "error");
      return;
    }

    setIsLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || "https://api.afmsolution.tech/api/teebot-flow";
      const response = await fetch(`${apiUrl}/verify-sync-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, otp }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.message || t("cloud_sync.error_otp_invalid");
        throw new Error(errorMessage);
      }

      const responseData = await response.json();
      const businessData = responseData.data || responseData;
      console.log("Cloud Sync Data Received:", businessData);

      // Map server response to registration format
      const registrationData = {
        username: businessData.username || businessData.masterUsername || "admin",
        email: businessData.email,
        password: password, // Use the password provided by user in step 1
        full_name: businessData.fullName,
        company_name: businessData.businessName || businessData.companyName || businessData.company_name,
        tax_registration_number: businessData.ntn,
        sales_tax_number: businessData.cnic,
        business_type: businessData.businessType || "",
        currency: businessData.operatingCurrency?.code || businessData.currency || "PKR",
        phone: businessData.phone,
        address: businessData.streetAddress || businessData.address,
        city: businessData.city,
        state: businessData.state,
        postal_code: businessData.postalCode || "",
        country: businessData.country,
        website: businessData.website || "",
      };

      console.log("Registration Data to Send:", registrationData);

      // Validate required fields
      if (!registrationData.company_name) {
        console.error("❌ Company name missing from cloud data!");
        console.error("Raw server response:", JSON.stringify(businessData, null, 2));
        console.error("All available fields:", Object.keys(businessData));
        throw new Error(`Company name missing from cloud data. Raw response: ${JSON.stringify(businessData)}`);
      }

      // Register locally with cloud data
      await register(registrationData);
      
      // Explicitly store email and cloud_business_id in auth store
      const { setUser, user } = useAuthStore.getState();
      if (user) {
        setUser({
          ...user,
          email: registrationData.email,
          company_name: registrationData.company_name,
          cloud_business_id: businessData._id,
        });
      }
      
      addToast(t("cloud_sync.sync_success"), "success");
      
      // Store cloud ID for potential backup restoration
      setCloudId(businessData._id);
      
      // Check if a backup exists on the server
      try {
        const backupBlob = await downloadLatestBackup(businessData._id);
        if (backupBlob && backupBlob.size > 0) {
          setStep("restore");
        } else {
          // No backup found, proceed directly to dashboard
          console.log("No backup file found on server. Proceeding with synced business data.");
          addToast("No backup found. Your synced business data is ready to use.", "info");
          await checkRegistration();
        }
      } catch (err: any) {
        console.log("Backup check failed, proceeding with synced data:", err);
        if (err instanceof Error && err.message === 'Session Expired') {
          addToast('Session Expired. Please perform a Cloud Sync to refresh your access.', 'error');
          return;
        }
        addToast("Your synced business data is ready to use.", "success");
        await checkRegistration();
      }
    } catch (err: any) {
      console.error("Cloud Sync Verification Error:", err);
      let errorMessage = typeof err === 'string' ? err : (err?.message || t("cloud_sync.error_otp_invalid"));
      addToast(errorMessage, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isLoading) return;

    setIsLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || "https://api.afmsolution.tech/api/teebot-flow";
      const response = await fetch(`${apiUrl}/resend-sync-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Handle 429 rate limit with cooldown
        if (response.status === 429 && errorData.cooldownSeconds) {
          setResendCooldown(errorData.cooldownSeconds);
          const errorMsg = errorData.error || errorData.message || "Please wait before resending";
          throw new Error(errorMsg);
        }
        
        // Handle other errors
        const errorMsg = errorData.error || errorData.message || "Failed to resend OTP";
        throw new Error(errorMsg);
      }

      const nextCount = resendCount + 1;
      setResendCount(nextCount);
      setResendCooldown(nextCount * 60);
      addToast(t("cloud_sync_messages.resend_success"), "success");
    } catch (err: any) {
      addToast(err.message || "Failed to resend OTP", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestoreCloudBackup = async () => {
    if (!recoveryKey) {
      addToast(t("cloud_sync_messages.enter_recovery_key"), "error");
      return;
    }

    setIsRestoringBackup(true);
    try {
      // 1. Download blob from cloud
      const backupBlob = await downloadLatestBackup(cloudId);
      
      if (!backupBlob || backupBlob.size === 0) {
        console.log("No backup file found on server. Proceeding with local registration.");
        addToast("No backup file found. Proceeding with your synced business data.", "info");
        await checkRegistration();
        return;
      }

      if (isTauri()) {
        const { tempDir, join } = await import("@tauri-apps/api/path");
        const { writeFile, remove } = await import("@tauri-apps/plugin-fs");
        
        const tempPath = await join(await tempDir(), `restore-${Date.now()}.tbf`);
        const arrayBuffer = await backupBlob.arrayBuffer();
        await writeFile(tempPath, new Uint8Array(arrayBuffer));

        // 2. Call Tauri restore command
        await invoke("restore_database", { path: tempPath, encryptionKey: recoveryKey });
        
        // 3. Cleanup temp file
        try { await remove(tempPath); } catch (e) {}
      }

      // 4. Save recovery key to desktop app config after successful restore
      await saveRecoveryKey(recoveryKey);
      console.log("✅ Recovery key saved to desktop storage");

      addToast(t("cloud_sync_messages.restore_success"), "success");
      await checkRegistration();
    } catch (err: any) {
      console.error("Cloud restoration failed:", err);
      // If backup restore fails, still allow user to proceed with local registration
      console.log("Backup restoration failed, but local registration is complete. Proceeding...");
      addToast("Backup restoration skipped. Your business data is ready to use.", "info");
      await checkRegistration();
    } finally {
      setIsRestoringBackup(false);
    }
  };

  const formatCooldown = (seconds: number) => {
    if (seconds <= 0) return "";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}:${s.toString().padStart(2, "0")}` : `${s}s`;
  };

  const getStepTitle = () => {
    switch (step) {
      case "init": return t("cloud_sync.step_init_title");
      case "verify": return t("cloud_sync.step_verify_title");
      case "otp": return t("cloud_sync.step_otp_title");
      case "restore": return t("cloud_sync_messages.restore_title");
    }
  };

  const getStepDesc = () => {
    switch (step) {
      case "init": return t("cloud_sync.step_init_desc");
      case "verify": return t("cloud_sync.step_verify_desc");
      case "otp": return t("cloud_sync.step_otp_desc");
      case "restore": return t("cloud_sync_messages.restore_desc");
    }
  };

  const getBtnText = () => {
    switch (step) {
      case "init": return t("cloud_sync.btn_sync");
      case "verify": return t("cloud_sync.btn_verify");
      case "otp": return t("cloud_sync.btn_finalize");
      case "restore": return t("cloud_sync_messages.restore_btn");
    }
  };

  const getVerificationIcon = (field: string) => {
    switch (field) {
      case "state":
      case "city": return <MapPin className="h-4 w-4" />;
      case "streetAddress": return <Building2 className="h-4 w-4" />;
      case "masterUsername": return <UserIcon className="h-4 w-4" />;
      default: return <ShieldCheck className="h-4 w-4" />;
    }
  };

  return (
    <div className="h-screen bg-background flex items-center justify-center overflow-hidden">
      <div className="w-full h-full bg-surface overflow-hidden grid grid-cols-1 md:grid-cols-[260px_1fr] lg:grid-cols-[300px_1fr] animate-in fade-in zoom-in-95 duration-500">

        <Sidebar type="register" />

        <div className="w-full p-6 lg:p-10 flex flex-col bg-surface overflow-y-auto">
          <header className="mb-8 text-center md:text-left">
            <h2 className="text-3xl font-black text-text-primary tracking-tight mb-2">
              {getStepTitle()}
            </h2>
            <p className="text-sm text-text-muted max-w-md">
              {getStepDesc()}
            </p>
          </header>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (step === "init") handleInitiateSync();
              else if (step === "verify") handleVerifyData();
              else if (step === "otp") handleVerifyOtp();
              else handleRestoreCloudBackup();
            }}
            className="flex-1 flex flex-col"
          >
            <div className="flex-1 space-y-6">
              {step === "init" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <Input
                    label={t("cloud_sync.field_ntn")}
                    placeholder={t("cloud_sync_placeholders.ntn")}
                    value={ntn}
                    onChange={(e) => setNtn(stripNonAlphaNumeric(e.target.value).slice(0, 7))}
                    leftIcon={<Hash className="h-4 w-4" />}
                    error={validationErrors.ntn}
                    maxLength={7}
                  />
                  <Input
                    label={t("cloud_sync.field_cnic")}
                    placeholder={t("cloud_sync_placeholders.cnic")}
                    value={cnic}
                    onChange={(e) => setCnic(stripNonDigits(e.target.value).slice(0, 13))}
                    leftIcon={<IdCard className="h-4 w-4" />}
                    error={validationErrors.cnic}
                    maxLength={13}
                  />
                  <Input
                    label={t("cloud_sync.field_email")}
                    type="email"
                    placeholder={t("cloud_sync_placeholders.email")}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    leftIcon={<Mail className="h-4 w-4" />}
                    error={validationErrors.email}
                  />
                  <Input
                    label={t("cloud_sync.field_phone")}
                    placeholder={t("cloud_sync_placeholders.phone")}
                    value={phone}
                    onChange={(e) => setPhone(stripNonDigits(e.target.value))}
                    leftIcon={<Phone className="h-4 w-4" />}
                    error={validationErrors.phone}
                  />
                  <Input
                    label={t("register.password_label")}
                    type="password"
                    placeholder={t("cloud_sync_placeholders.password")}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    leftIcon={<Lock className="h-4 w-4" />}
                    error={validationErrors.password}
                  />
                </div>
              )}

              {step === "verify" && (
                <div className="space-y-6 max-w-md">
                  <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 flex items-start gap-3">
                    <Lock className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <p className="text-sm text-text-primary leading-relaxed">
                      {t(`cloud_sync.field_${verificationField}`)}
                    </p>
                  </div>
                  <Input
                    label={t("cloud_sync_messages.verification_answer_label")}
                    placeholder={t("cloud_sync_placeholders.verification_answer")}
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    leftIcon={getVerificationIcon(verificationField)}
                    autoFocus
                  />
                </div>
              )}

              {step === "otp" && (
                <div className="space-y-6 max-w-md mx-auto">
                  <div className="p-4 rounded-xl border border-success/20 bg-success/5 flex items-start gap-3">
                    <Mail className="h-5 w-5 text-success shrink-0 mt-0.5" />
                    <p className="text-sm text-text-primary leading-relaxed">
                      {t("cloud_sync_messages.check_inbox")} <strong>{email}</strong>.
                    </p>
                  </div>
                  <Input
                    label={t("cloud_sync.field_otp")}
                    placeholder={t("cloud_sync_placeholders.otp")}
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    leftIcon={<ShieldCheck className="h-4 w-4" />}
                    className="text-center tracking-[1em] font-mono text-lg"
                    autoFocus
                  />

                  <div className="flex flex-col items-center gap-2 pt-2">
                    <p className="text-[10px] text-text-muted uppercase font-bold tracking-widest">
                      {t("cloud_sync_messages.didnt_receive")}
                    </p>
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={resendCooldown > 0 || isLoading}
                      className="text-xs font-black text-primary hover:text-primary/80 disabled:text-text-muted transition-all flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-primary/5 disabled:hover:bg-transparent"
                    >
                      {resendCooldown > 0 ? (
                        <span className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                          {t("cloud_sync.resend_wait", { seconds: formatCooldown(resendCooldown) })}
                        </span>
                      ) : (
                        <span>{t("cloud_sync.btn_resend")}</span>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {step === "restore" && (
                <div className="space-y-6 max-w-md mx-auto">
                  <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 flex items-start gap-3">
                    <ShieldCheck className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-text-primary leading-relaxed">
                      {t("cloud_sync_messages.backup_found")} <strong>{t("cloud_sync_messages.backup_found_key_label")}</strong>.
                    </p>
                  </div>
                  <Input
                    label={t("cloud_sync_messages.recovery_key_label")}
                    placeholder={t("cloud_sync_placeholders.recovery_key")}
                    value={recoveryKey}
                    onChange={(e) => setRecoveryKey(stripNonAlphaNumeric(e.target.value).toUpperCase())}
                    leftIcon={<Lock className="h-4 w-4" />}
                    autoFocus
                  />
                  <div className="pt-2 text-center">
                    <button 
                      type="button" 
                      onClick={() => checkRegistration()}
                      className="text-xs text-text-muted hover:text-primary transition-colors font-medium underline underline-offset-4"
                    >
                      Skip backup restoration and use synced data
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-8 shrink-0 border-t border-border/50 mt-6">
              <Button
                type="button"
                variant="secondary"
                onClick={onBack}
                disabled={isLoading}
                leftIcon={<ArrowLeft className="h-4 w-4" />}
                className="px-6"
              >
                {t("register.back_button")}
              </Button>

              <Button
                type="submit"
                className={`px-8 py-3 ${isUrdu ? "text-[10px]" : "text-xs"} uppercase tracking-widest`}
                rightIcon={<ForwardIcon className="h-4 w-4" />}
                isLoading={isLoading}
              >
                {getBtnText()}
              </Button>
            </div>
          </form>
        </div>
      </div>

      <FullscreenLoader
        isVisible={isRestoringBackup}
        message="Restoring Your Data"
        subMessage="Downloading and decrypting your cloud backup. Please do not close the application..."
      />
    </div>
  );
};
