import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../../store/authStore";
import { useUiStore } from "../../store/uiStore";
import { useToastStore } from "../../store/toastStore";
import currencies from "../../assets/currencies.json";
import languagesData from "../../assets/languages.json";
import pakistanCitiesEn from "../../assets/countries/Pakistan.en.json";

import {
  Eye,
  EyeOff,
  Building2,
  User as UserIcon,
  Lock,
  Fingerprint,
  Info,
  Mail,
  Phone,
  MapPin,
  Map as MapIcon,
  Hash,
  IdCard,
  Globe2,
  ArrowLeft
} from "lucide-react";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { Sidebar } from "./Sidebar";
import { getLanguageDirection, getForwardIcon } from "../../utils/layout";
import { SearchableSelect } from "../../components/ui/SearchableSelect";
import { validatePakistaniPhone, validateUSPhone } from "../../utils/validations/phone";
import { validateEmail } from "../../utils/validations/email";
import { validatePakistaniCNIC, validatePakistaniNTN } from "../../utils/validations/identity";
import { formatPakistaniCNIC, stripNonDigits, stripNonAlphaNumeric } from "../../utils/formatters";
import { RecoveryKeyModal } from "../../components/modals/RecoveryKeyModal";
import { sendRecoveryCodeEmail, performInitialBackup } from "../../utils/cloudSync";
import { invoke } from "../../lib/api";
import { isTauri } from "../../lib/platform";
import { FullscreenLoader } from "../../components/ui/FullscreenLoader";

interface Currency {
  symbol: string;
  name: string;
  symbol_native: string;
  decimal_digits: number;
  rounding: number;
  code: string;
  name_plural: string;
}

export function RegisterView({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation("auth");
  const { register, checkRegistration } = useAuthStore();
  const { language } = useUiStore();

  const direction = getLanguageDirection(language);
  const ForwardIcon = getForwardIcon(direction);
  const isUrdu = language === "ur";
  const { addToast } = useToastStore();

  const [currenciesList, setCurrenciesList] = useState<Currency[]>([]);

  // Form state
  // 1. Identity & Business
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [taxId, setTaxId] = useState("");
  const [cnic, setCnic] = useState("");
  const [currency, setCurrency] = useState("PKR");

  // 2. Contact & Location
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [stateRegion, setStateRegion] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("Pakistan");
  const [customCountry, setCustomCountry] = useState("");

  const [isCloudAvailable, setIsCloudAvailable] = useState(false);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [recoveryKey, setRecoveryKey] = useState("");
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [cloudBusinessId, setCloudBusinessId] = useState("");
  const [isSyncingBackup, setIsSyncingBackup] = useState(false);
  const [pakistanCities, setPakistanCities] = useState<any[]>(pakistanCitiesEn);

  useEffect(() => {
    const loadUrduCities = async () => {
      if (language === "ur") {
        try {
          const urData = await import("../../assets/countries/Pakistan.ur.json");
          if (urData && urData.default) {
            setPakistanCities(urData.default);
          }
        } catch (e) {
          setPakistanCities(pakistanCitiesEn);
        }
      } else {
        setPakistanCities(pakistanCitiesEn);
      }
    };
    loadUrduCities();
  }, [language]);

  useEffect(() => {
    const checkCloudHealth = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || "https://api.afmsolution.tech/api/teebot-flow";
        const response = await fetch(`${apiUrl}/health`);
        const data = await response.json();
        if (data.status === "OK") {
          setIsCloudAvailable(true);
        }
      } catch (e) {
        setIsCloudAvailable(false);
      }
    };
    checkCloudHealth();
  }, []);



  const countryOptions = languagesData.countries.map(c => ({
    label: language === "ur" ? c.ur : c.en,
    value: c.code,
    icon: <Globe2 className="h-4 w-4" />
  }));

  const labels = country === "US" ? {
    id: "Identity Number (SSN/ITIN)",
    tax: "Business ID (EIN)",
    idPlaceholder: "e.g. 000-00-0000",
    taxPlaceholder: "e.g. 00-0000000"
  } : country === "Pakistan" ? {
    id: t("register.cnic_label"),
    tax: t("register.tax_label"),
    idPlaceholder: t("register.cnic_placeholder"),
    taxPlaceholder: t("register.tax_placeholder")
  } : {
    id: "Identity Number",
    tax: "Business ID",
    idPlaceholder: "Enter identity number",
    taxPlaceholder: "Enter business ID"
  };

  // 3. Security
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const currencyArray = Object.values(currencies) as Currency[];
    setCurrenciesList(currencyArray);
  }, []);

  const handleCityChange = (val: string) => {
    setCity(val);
    const citiesData = language === "ur" ? pakistanCities : pakistanCitiesEn;
    const selected = citiesData.find(c => c.name === val);
    if (selected) {
      setStateRegion(selected.state);
    }
    // Clear city error if it exists
    if (validationErrors.city) {
      setValidationErrors(prev => {
        const next = { ...prev };
        delete next.city;
        return next;
      });
    }
  };

  const handleCountryChange = (val: string) => {
    setCountry(val);
    setCity("");
    setStateRegion("");
    if (val === "US") setCurrency("USD");
    else if (val === "Pakistan") setCurrency("PKR");

    // Clear country error
    if (validationErrors.country) {
      setValidationErrors(prev => {
        const next = { ...prev };
        delete next.country;
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setValidationErrors({});

    const newErrors: Record<string, string> = {};
    let firstError = "";

    const checkRequired = (value: string, key: string, labelKey: string) => {
      if (!value || value.trim() === "") {
        newErrors[key] = " ";
        if (!firstError) {
          firstError = t("register.error_field_required", {
            field: t(labelKey).replace('*', '').trim()
          });
        }
        return false;
      }
      return true;
    };

    // 1. Identity & Business
    checkRequired(fullName, "fullName", "register.fullname_label");
    checkRequired(companyName, "companyName", "register.org_label");

    if (country === "Pakistan") {
      if (checkRequired(cnic, "cnic", "register.cnic_label")) {
        if (!validatePakistaniCNIC(cnic)) {
          newErrors.cnic = " ";
          if (!firstError) firstError = t("register.error_invalid_cnic");
        }
      }
      if (checkRequired(taxId, "taxId", "register.tax_label")) {
        if (!validatePakistaniNTN(taxId)) {
          newErrors.taxId = " ";
          if (!firstError) firstError = t("register.error_invalid_ntn");
        }
      }
    } else {
      checkRequired(cnic, "cnic", country === "US" ? "register.cnic_label_us" : "register.cnic_label");
      checkRequired(taxId, "taxId", country === "US" ? "register.tax_label_us" : "register.tax_label");
    }

    // 2. Contact & Location
    if (checkRequired(email, "email", "register.email_label")) {
      if (!validateEmail(email)) {
        newErrors.email = " ";
        if (!firstError) firstError = t("register.error_invalid_email");
      }
    }

    // Phone is optional but validated if present
    if (phone) {
      const isPak = country === "Pakistan";
      const isUS = country === "US";
      const isValid = isPak ? validatePakistaniPhone(phone) : isUS ? validateUSPhone(phone) : true; // Allow anything for other countries
      if (!isValid) {
        newErrors.phone = " ";
        if (!firstError) firstError = t("register.error_invalid_phone");
      }
    }

    checkRequired(address, "address", "register.address_label");
    checkRequired(city, "city", "register.city_label");
    checkRequired(stateRegion, "stateRegion", "register.state_label");

    if (!country) {
      newErrors.country = " ";
      if (!firstError) firstError = t("register.error_field_required", { field: t("register.country_label").replace('*', '').trim() });
    } else if (country === "Others") {
      checkRequired(customCountry, "customCountry", "register.custom_country_label");
    }

    // 3. Security
    checkRequired(username, "username", "register.username_label");

    if (checkRequired(password, "password", "register.password_label")) {
      if (password.length < 8) {
        newErrors.password = " ";
        if (!firstError) firstError = t("register.error_length");
      }
    }

    if (checkRequired(confirmPassword, "confirmPassword", "register.confirm_password_label")) {
      if (password !== confirmPassword) {
        newErrors.confirmPassword = " ";
        if (!firstError) firstError = t("register.error_mismatch");
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setValidationErrors(newErrors);
      setError(firstError);
      return;
    }

    setIsSubmitting(true);
    try {
      let businessId = "";
      if (isCloudAvailable) {
        const apiUrl = import.meta.env.VITE_API_URL || "https://api.afmsolution.tech/api/teebot-flow";
        const cloudResponse = await fetch(`${apiUrl}/register-business`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName,
            businessName: companyName,
            email,
            phone,
            cnic,
            ntn: taxId,
            city,
            state: stateRegion,
            country: country === "Others" ? customCountry : country,
            masterUsername: username,
            secretKey: password,
            operatingCurrency: (currencies as any)[currency]
          })
        });

        if (!cloudResponse.ok) {
          const errorData = await cloudResponse.json().catch(() => ({}));
          throw new Error(errorData.message || "Cloud synchronization failed. Please check your internet or try local-only setup.");
        }

        const cloudData = await cloudResponse.json();
        businessId = cloudData.data?._id;
        setCloudBusinessId(businessId);
      }

      await register({
        username,
        email,
        password,
        full_name: fullName,
        company_name: companyName,
        tax_registration_number: taxId,
        sales_tax_number: cnic,
        business_type: "",
        currency: (currencies as any)[currency]?.code || "PKR",
        phone,
        address,
        city,
        state: stateRegion,
        postal_code: postalCode,
        country: country === "Others" ? customCountry : country,
        website: "",
      });

      if (isCloudAvailable && businessId) {
        // Post-registration cloud tasks
        const key = await invoke<string>("generate_recovery_key");
        setRecoveryKey(key);

        try {
          await sendRecoveryCodeEmail(email, companyName, key);
          setIsEmailSent(true);
        } catch (e) {
          console.error("Failed to send recovery email during registration:", e);
        }

        setShowRecoveryModal(true);
      }
    } catch (err: any) {
      setError(err.message || err?.toString() || t("register.error_failed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveKeyToFile = async () => {
    if (!isTauri()) return;
    try {
      const { save } = await import("@tauri-apps/plugin-dialog");
      const { writeTextFile } = await import("@tauri-apps/plugin-fs");
      
      const path = await save({
        defaultPath: "teebot-recovery-key.txt",
        filters: [{ name: "Text File", extensions: ["txt"] }]
      });

      if (path) {
        await writeTextFile(path, `Teebot Flow Recovery Key\nBusiness: ${companyName}\nKey: ${recoveryKey}\n\nKEEP THIS SECURE.`);
        addToast(t("common:saved"), "success");
      }
    } catch (e) {
      console.error("Save failed:", e);
    }
  };

  const handleRecoveryModalClose = async () => {
    setShowRecoveryModal(false);
    
    if (isCloudAvailable && cloudBusinessId) {
      setIsSyncingBackup(true);
      try {
        await performInitialBackup(cloudBusinessId, recoveryKey);
        addToast("Initial cloud backup completed successfully.", "success");
      } catch (e) {
        addToast("Cloud backup failed, but your account is active. You can retry later from settings.", "error");
      } finally {
        setIsSyncingBackup(false);
        // Finally trigger the dashboard navigation via checkRegistration
        await checkRegistration();
      }
    } else {
      await checkRegistration();
    }
  };

  return (
    <div className="h-screen bg-background flex items-center justify-center overflow-hidden">
      <div className="w-full h-full bg-surface overflow-hidden grid grid-cols-1 md:grid-cols-[260px_1fr] lg:grid-cols-[300px_1fr] animate-in fade-in zoom-in-95 duration-500">

        <Sidebar type="register" />

        {/* ── Form Area ── */}
        <div className="w-full p-8 lg:p-12 flex flex-col overflow-hidden bg-surface">

          {/* Header */}
          <header className="mb-8 shrink-0">
            <h2 className={`${isUrdu ? "text-xl" : "text-3xl"} font-black text-text-primary tracking-tight`}>
              {t("register.structure_title")}
            </h2>
            <p className={`${isUrdu ? "text-[11px]" : "text-sm"} text-text-muted mt-1.5`}>
              {t("register.structure_desc")}
            </p>
          </header>

          {error && (
            <div className={`mb-6 p-4 rounded-xl bg-error/10 border border-error/20 text-error ${isUrdu ? "text-[10px]" : "text-xs"} font-bold flex items-center gap-3 shrink-0 animate-in slide-in-from-top-2 duration-200`}>
              <Info className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto pr-1 space-y-6">

              {/* ── All Fields ── */}
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                {/* Identity & Business */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <Input
                    label={t("register.fullname_label")}
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      if (validationErrors.fullName) {
                        setValidationErrors(prev => {
                          const next = { ...prev };
                          delete next.fullName;
                          return next;
                        });
                      }
                    }}
                    placeholder={t("register.fullname_placeholder")}
                    leftIcon={<UserIcon className="h-4 w-4" />}
                    error={validationErrors.fullName}
                  />
                  <Input
                    label={t("register.org_label")}
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => {
                      setCompanyName(e.target.value);
                      if (validationErrors.companyName) {
                        setValidationErrors(prev => {
                          const next = { ...prev };
                          delete next.companyName;
                          return next;
                        });
                      }
                    }}
                    placeholder={t("register.org_placeholder")}
                    leftIcon={<Building2 className="h-4 w-4" />}
                    error={validationErrors.companyName}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <Input
                    label={t("register.email_label")}
                    type="email"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (validationErrors.email) {
                        setValidationErrors(prev => {
                          const next = { ...prev };
                          delete next.email;
                          return next;
                        });
                      }
                    }}
                    placeholder={t("register.email_placeholder")}
                    leftIcon={<Mail className="h-4 w-4" />}
                    error={validationErrors.email}
                  />
                  <Input
                    label={t("register.phone_label")}
                    type="tel"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      if (validationErrors.phone) {
                        setValidationErrors(prev => {
                          const next = { ...prev };
                          delete next.phone;
                          return next;
                        });
                      }
                    }}
                    placeholder={t("register.phone_placeholder")}
                    leftIcon={<Phone className="h-4 w-4" />}
                    error={validationErrors.phone}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <Input
                    label={labels.id}
                    type="text"
                    required
                    value={country === "Pakistan" ? formatPakistaniCNIC(cnic) : cnic}
                    onChange={(e) => {
                      let val = e.target.value;
                      if (country === "Pakistan") {
                        val = stripNonDigits(val).slice(0, 13);
                      }
                      setCnic(val);
                      if (validationErrors.cnic) {
                        setValidationErrors(prev => {
                          const next = { ...prev };
                          delete next.cnic;
                          return next;
                        });
                      }
                    }}
                    placeholder={labels.idPlaceholder}
                    leftIcon={<IdCard className="h-4 w-4" />}
                    error={validationErrors.cnic}
                    maxLength={country === "Pakistan" ? 15 : undefined}
                  />
                  <Input
                    label={labels.tax}
                    type="text"
                    required
                    value={taxId}
                    onChange={(e) => {
                      let val = e.target.value;
                      if (country === "Pakistan") {
                        val = stripNonAlphaNumeric(val).slice(0, 7);
                      }
                      setTaxId(val);
                      if (validationErrors.taxId) {
                        setValidationErrors(prev => {
                          const next = { ...prev };
                          delete next.taxId;
                          return next;
                        });
                      }
                    }}
                    placeholder={labels.taxPlaceholder}
                    leftIcon={<Fingerprint className="h-4 w-4" />}
                    error={validationErrors.taxId}
                    maxLength={country === "Pakistan" ? 7 : undefined}
                  />
                </div>

                <Input
                  label={t("register.address_label")}
                  type="text"
                  required
                  value={address}
                  onChange={(e) => {
                    setAddress(e.target.value);
                    if (validationErrors.address) {
                      setValidationErrors(prev => {
                        const next = { ...prev };
                        delete next.address;
                        return next;
                      });
                    }
                  }}
                  placeholder={t("register.address_placeholder")}
                  leftIcon={<MapPin className="h-4 w-4" />}
                  error={validationErrors.address}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {country === "Pakistan" ? (
                    <SearchableSelect
                      label={t("register.city_label")}
                      value={city}
                      onChange={handleCityChange}
                      placeholder={t("register.city_placeholder")}
                      openDirection="down"
                      options={(language === "ur" ? pakistanCities : pakistanCitiesEn).map((c: any) => ({
                        label: c.name,
                        value: c.name,
                        description: c.state
                      }))}
                      error={validationErrors.city}
                    />
                  ) : (
                    <Input
                      label={t("register.city_label")}
                      type="text"
                      required
                      value={city}
                      onChange={(e) => {
                        setCity(e.target.value);
                        if (validationErrors.city) {
                          setValidationErrors(prev => {
                            const next = { ...prev };
                            delete next.city;
                            return next;
                          });
                        }
                      }}
                      placeholder={t("register.city_placeholder")}
                      leftIcon={<MapIcon className="h-4 w-4" />}
                      error={validationErrors.city}
                    />
                  )}
                  <Input
                    label={t("register.state_label")}
                    type="text"
                    required
                    readOnly={country === "Pakistan"}
                    value={stateRegion}
                    onChange={(e) => {
                      setStateRegion(e.target.value);
                      if (validationErrors.stateRegion) {
                        setValidationErrors(prev => {
                          const next = { ...prev };
                          delete next.stateRegion;
                          return next;
                        });
                      }
                    }}
                    placeholder={country === "Pakistan" ? t("register.state_placeholder_auto") || "Auto-selected" : t("register.state_placeholder_manual") || "Enter state/region"}
                    leftIcon={<MapIcon className="h-4 w-4" />}
                    className={country === "Pakistan" ? "bg-surface cursor-not-allowed opacity-70" : ""}
                    error={validationErrors.stateRegion}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <SearchableSelect
                    label={t("register.country_label")}
                    value={country}
                    onChange={handleCountryChange}
                    options={countryOptions}
                    error={validationErrors.country}
                  />
                  {country === "Others" ? (
                    <Input
                      label={t("register.custom_country_label") || "Country Name"}
                      type="text"
                      required
                      value={customCountry}
                      onChange={(e) => {
                        setCustomCountry(e.target.value);
                        if (validationErrors.customCountry) {
                          setValidationErrors(prev => {
                            const next = { ...prev };
                            delete next.customCountry;
                            return next;
                          });
                        }
                      }}
                      placeholder={t("register.custom_country_placeholder") || "Enter your country name"}
                      leftIcon={<Globe2 className="h-4 w-4" />}
                      error={validationErrors.customCountry}
                    />
                  ) : (
                    <Input
                      label={t("register.postal_label")}
                      type="text"
                      value={postalCode}
                      onChange={(e) => {
                        setPostalCode(e.target.value);
                        if (validationErrors.postalCode) {
                          setValidationErrors(prev => {
                            const next = { ...prev };
                            delete next.postalCode;
                            return next;
                          });
                        }
                      }}
                      placeholder={t("register.postal_placeholder")}
                      leftIcon={<Hash className="h-4 w-4" />}
                      error={validationErrors.postalCode}
                    />
                  )}
                </div>

                {country === "Others" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 animate-in fade-in slide-in-from-top-2 duration-300">
                    <Input
                      label={t("register.postal_label")}
                      type="text"
                      value={postalCode}
                      onChange={(e) => {
                        setPostalCode(e.target.value);
                        if (validationErrors.postalCode) {
                          setValidationErrors(prev => {
                            const next = { ...prev };
                            delete next.postalCode;
                            return next;
                          });
                        }
                      }}
                      placeholder={t("register.postal_placeholder")}
                      leftIcon={<Hash className="h-4 w-4" />}
                      error={validationErrors.postalCode}
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
                  <Input
                    label={t("register.username_label")}
                    type="text"
                    required
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''));
                      if (validationErrors.username) {
                        setValidationErrors(prev => {
                          const next = { ...prev };
                          delete next.username;
                          return next;
                        });
                      }
                    }}
                    placeholder={t("register.username_placeholder")}
                    leftIcon={<UserIcon className="h-4 w-4" />}
                    error={validationErrors.username}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <Input
                    label={t("register.password_label")}
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (validationErrors.password) {
                        setValidationErrors(prev => {
                          const next = { ...prev };
                          delete next.password;
                          return next;
                        });
                      }
                    }}
                    placeholder={t("register.password_placeholder")}
                    leftIcon={<Lock className="h-4 w-4" />}
                    error={validationErrors.password}
                    rightIcon={
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="hover:text-primary transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    }
                  />
                  <Input
                    label={t("register.confirm_password_label")}
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (validationErrors.confirmPassword) {
                        setValidationErrors(prev => {
                          const next = { ...prev };
                          delete next.confirmPassword;
                          return next;
                        });
                      }
                    }}
                    placeholder={t("register.confirm_password_placeholder")}
                    leftIcon={<Lock className="h-4 w-4" />}
                    error={validationErrors.confirmPassword}
                    rightIcon={
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="hover:text-primary transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    }
                  />
                </div>

                <SearchableSelect
                  label={t("register.currency_label")}
                  value={currency}
                  onChange={(val) => {
                    setCurrency(val);
                    if (validationErrors.currency) {
                      setValidationErrors(prev => {
                        const next = { ...prev };
                        delete next.currency;
                        return next;
                      });
                    }
                  }}
                  placeholder={t("register.currency_choose")}
                  openDirection="up"
                  options={currenciesList.map((curr) => ({
                    label: `${curr.symbol} ${curr.name} (${curr.code})`,
                    value: curr.code,
                    description: curr.name_plural
                  }))}
                  error={validationErrors.currency}
                />
              </div>
            </div>


            {/* Actions */}
            <div className="flex items-center justify-between pt-8 shrink-0 border-t border-border/50 mt-6">
              <Button
                type="button"
                variant="secondary"
                onClick={onBack}
                leftIcon={<ArrowLeft className="h-4 w-4" />}
                className="px-6"
              >
                {t("register.back_button")}
              </Button>

              <Button
                type="submit"
                className={`px-8 py-3 ${isUrdu ? "text-[10px]" : "text-xs"} uppercase tracking-widest`}
                rightIcon={<ForwardIcon className="h-4 w-4" />}
                variant={isCloudAvailable ? "primary" : "secondary"}
                isLoading={isSubmitting}
              >
                {isCloudAvailable ? t("register.cloud_register_button") : t("register.finish_button")}
              </Button>
            </div>
          </form>
        </div>
      </div>

      <RecoveryKeyModal
        isOpen={showRecoveryModal}
        onClose={handleRecoveryModalClose}
        recoveryKey={recoveryKey}
        onSaveToFile={handleSaveKeyToFile}
        isEmailSent={isEmailSent}
        email={email}
      />

      <FullscreenLoader
        isVisible={isSyncingBackup}
        message="Securing Your System"
        subMessage="Generating your initial encrypted cloud backup. This may take a moment..."
      />
    </div>
  );
}
