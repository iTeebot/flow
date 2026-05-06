import { useEffect, useRef, useState } from "react";
import { invoke } from "../../lib/api";
import { useTranslation } from "react-i18next";
import { useAuthStore, User } from "../../store/authStore";
import currencies from "../../assets/currencies.json";
import languagesData from "../../assets/languages.json";
import pakistanCitiesEn from "../../assets/countries/Pakistan.en.json";
import { APP_VERSION } from "../../lib/version";
import { Upload, Trash2, Image as ImageIcon, Building2, MapPin, Globe, ShieldCheck, Mail, Phone, User as UserIcon, Hash, Map as MapIcon } from "lucide-react";
import { useToastStore } from "../../store/toastStore";
import { useUiStore } from "../../store/uiStore";
import { getLanguageDirection } from "../../utils/layout";

// Dynamic Urdu cities fallback logic
let pakistanCitiesUr: any[] = pakistanCitiesEn;
try {
  // @ts-ignore
  const urData = await import("../../assets/countries/Pakistan.ur.json");
  if (urData && urData.default) pakistanCitiesUr = urData.default;
} catch (e) {
  // Fallback already set to en
}

import {
  getCompanyProfile,
  updateCompanyProfile,
  type CompanyProfile,
} from "../companyProfile/api";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { SearchableSelect } from "../../components/ui/SearchableSelect";

type ProfileForm = {
  full_name: string;
  company_name: string;
  owner_name: string;
  tax_registration_number: string;
  sales_tax_number: string;
  business_type: string;
  currency: string;
  website: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
  logo_base64: string | null;
};

export function ProfileModule() {
  const { user, companyId, companyLogo, setUser, setCurrency, setCompanyLogo } = useAuthStore();
  const { language } = useUiStore();
  const { t } = useTranslation(["profile", "auth"]);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);
  const [form, setForm] = useState<ProfileForm>({
    full_name: user?.full_name ?? "",
    company_name: "",
    owner_name: "",
    tax_registration_number: "",
    sales_tax_number: "",
    business_type: "",
    currency: "PKR",
    website: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    state: "",
    country: "",
    postal_code: "",
    logo_base64: null,
  });
  const [customCountry, setCustomCountry] = useState("");
  const [saving, setSaving] = useState(false);
  const { setLoading } = useUiStore();
  const { addToast } = useToastStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const direction = getLanguageDirection(language);
  const currenciesList = Object.values(currencies);

  const countryOptions = languagesData.countries.map(c => ({
    label: language === "ur" ? c.ur : c.en,
    value: c.code,
  }));


  const handleCountryChange = (val: string) => {
    setField("country", val);
    setField("city", "");
    setField("state", "");
    if (val === "US") setField("currency", "USD");
    else if (val === "Pakistan") setField("currency", "PKR");
  };

  const handleCityChange = (val: string) => {
    setField("city", val);
    const citiesData = language === "ur" ? pakistanCitiesUr : pakistanCitiesEn;
    const selected = citiesData.find(c => c.name === val);
    if (selected) {
      setField("state", selected.state);
    }
  };

  useEffect(() => {
    const load = async () => {
      if (!companyId) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true, "Synchronizing Company Records...");
        const profile = await getCompanyProfile(companyId);
        setCompanyProfile(profile);
        setForm({
          full_name: user?.full_name ?? "",
          company_name: profile.company_name,
          owner_name: profile.owner_name ?? "",
          tax_registration_number: profile.tax_registration_number ?? "",
          sales_tax_number: profile.sales_tax_number ?? "",
          business_type: profile.business_type ?? "",
          currency: profile.currency ?? "PKR",
          website: profile.website ?? "",
          phone: profile.phone ?? "",
          email: profile.email ?? "",
          address: profile.address ?? "",
          city: profile.city ?? "",
          state: profile.state ?? "",
          country: profile.country ?? "",
          postal_code: profile.postal_code ?? "",
          logo_base64: profile.logo_base64 ?? companyLogo,
        });
        if (profile.logo_base64) {
          setCompanyLogo(profile.logo_base64);
        }
      } catch (err) {
        addToast(err instanceof Error ? err.message : t("load_error"), "error");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [companyId, user?.full_name]);

  const setField = (key: keyof ProfileForm, value: string | null) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      addToast(t("logo_size_error"), "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setCompanyLogo(base64);
      setField("logo_base64", base64);
      addToast(t("logo_updated"), "success");
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setCompanyLogo(null);
    setField("logo_base64", null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    addToast(t("logo_removed"), "info");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !companyProfile) return;
    try {
      setSaving(true);
      setLoading(true, "Synchronizing Identity...");

      const updatedUser = await invoke<User>(
        "update_user_profile",
        { input: { id: user.id, full_name: form.full_name || null } },
      );
      setUser(updatedUser);

      const updatedCompany = await updateCompanyProfile({
        id: companyProfile.id,
        company_name: form.company_name,
        owner_name: form.owner_name || null,
        tax_registration_number: form.tax_registration_number || null,
        sales_tax_number: form.sales_tax_number || null,
        business_type: form.business_type || null,
        currency: form.currency || null,
        website: form.website || null,
        phone: form.phone || null,
        email: form.email || null,
        address: form.address || null,
        city: form.city || null,
        state: form.state || null,
        country: form.country === "Others" ? customCountry : form.country,
        postal_code: form.postal_code || null,
        logo_base64: form.logo_base64,
      });
      setCompanyProfile(updatedCompany);
      setCurrency(form.currency);
      addToast(t("update_success"), "success");
    } catch (err) {
      addToast(err instanceof Error ? err.message : t("update_error"), "error");
    } finally {
      setSaving(false);
      setLoading(false);
    }
  };

  // Loading is now handled globally via useUiStore.setLoading
  return (
    <div className="space-y-8 animate-in fade-in duration-600">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text-primary">{t("title")}</h1>
          <p className="text-sm text-text-muted mt-1">{t("subtitle")}</p>
        </div>
        <div className="text-[10px] text-text-muted font-black border border-border px-2 py-1 rounded bg-surface">
          V. <span className="text-primary">{APP_VERSION}</span>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Logo & Branding */}
          <div className="lg:col-span-1 space-y-8">
            <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden h-fit">
              <div className="border-b border-border bg-surface/30 px-6 py-5">
                <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                  <ImageIcon className="h-5 w-5 text-primary" />
                  {t("visual_asset")}
                </h2>
                <p className="text-[10px] text-text-muted mt-1 font-bold uppercase tracking-tighter">{t("company_seal")}</p>
              </div>

              <div className="p-8 flex flex-col items-center gap-6">
                <div className="relative group">
                  <div className="h-40 w-40 rounded-2xl border-2 border-dashed border-border bg-surface/30 flex items-center justify-center overflow-hidden transition-all group-hover:border-primary/50 group-hover:bg-primary/5">
                    {companyLogo ? (
                      <img src={companyLogo} alt="Logo" className="h-full w-full object-contain p-4 transition-transform duration-500 group-hover:scale-110" />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-text-muted/30">
                        <Building2 className="h-12 w-12" />
                        <span className="text-[10px] font-black uppercase">{t("no_logo")}</span>
                      </div>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml,image/webp"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-3 -right-3 p-3 rounded-xl bg-primary text-primary-foreground shadow-xl shadow-primary/40 hover:scale-110 active:scale-95 transition-all"
                    title={t("update_logo")}
                  >
                    <Upload className="h-5 w-5" />
                  </button>
                </div>

                <div className="text-center space-y-2">
                  <p className="text-[11px] text-text-muted font-bold uppercase tracking-widest italic">{t("pdf_injection")}</p>
                  <p className="text-xs text-text-muted/60 leading-relaxed max-w-[200px]">{t("pdf_injection_desc")}</p>
                </div>

                {companyLogo && (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={handleRemoveLogo}
                    leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                  >
                    {t("purge_attachment")}
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Detailed Information Sections */}
          <div className="lg:col-span-2 space-y-8">
            {/* Core Profile */}
            <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
              <div className="border-b border-border bg-surface/30 px-6 py-5 flex items-center justify-between">
                <h2 className="text-lg font-bold text-text-primary flex items-center gap-2 text-primary">
                  <UserIcon className="h-5 w-5" />
                  {t("professional_profile")}
                </h2>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label={t("account_exec_name")}
                  placeholder={t("account_exec_name_placeholder")}
                  value={form.full_name}
                  onChange={(e) => setField("full_name", e.target.value)}
                  leftIcon={<UserIcon className="h-4 w-4" />}
                />
                <Input
                  label={t("legal_trading_name")}
                  placeholder={t("legal_trading_name_placeholder")}
                  value={form.company_name}
                  onChange={(e) => setField("company_name", e.target.value)}
                  required
                  leftIcon={<Building2 className="h-4 w-4" />}
                />
              </div>
            </div>

            {/* Business Registration */}
            <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
              <div className="border-b border-border bg-surface/30 px-6 py-5">
                <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  {t("tax_registration")}
                </h2>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-gradient-to-br from-card to-surface/40">
                <Input
                  label={t("ntn_tax_id")}
                  placeholder={t("ntn_tax_id_placeholder")}
                  value={form.tax_registration_number}
                  onChange={(e) => setField("tax_registration_number", e.target.value)}
                />
                <Input
                  label={t("sales_tax_no")}
                  placeholder={t("sales_tax_no_placeholder")}
                  value={form.sales_tax_number}
                  onChange={(e) => setField("sales_tax_number", e.target.value)}
                />
                <div className="md:col-span-2">
                  <SearchableSelect
                    label={t("transactional_currency")}
                    options={currenciesList.map((curr: any) => ({
                      label: `${curr.name} (${curr.code})`,
                      value: curr.code,
                      description: `${t("symbol")}: ${curr.symbol}`,
                      icon: <span className="text-primary font-bold">{curr.symbol}</span>
                    }))}
                    value={form.currency}
                    onChange={(val) => setField("currency", val)}
                  />
                </div>
              </div>
            </div>

            {/* Contact & Geography */}
            <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
              <div className="border-b border-border bg-surface/30 px-6 py-5">
                <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  {t("connectivity_location")}
                </h2>
              </div>
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input
                    label={t("support_phone")}
                    placeholder={t("support_phone_placeholder")}
                    value={form.phone}
                    onChange={(e) => setField("phone", e.target.value)}
                    leftIcon={<Phone className="h-4 w-4" />}
                  />
                  <Input
                    label={t("business_email")}
                    placeholder={t("business_email_placeholder")}
                    value={form.email}
                    onChange={(e) => setField("email", e.target.value)}
                    leftIcon={<Mail className="h-4 w-4" />}
                  />

                  {/* Unified Location Row */}
                  <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                    <SearchableSelect
                      label={t("auth:register.country_label")}
                      options={countryOptions}
                      value={form.country}
                      onChange={handleCountryChange}
                      leftIcon={<Globe className="h-4 w-4" />}
                    />

                    {form.country === "Pakistan" ? (
                      <SearchableSelect
                        label={t("auth:register.city_label")}
                        value={form.city}
                        onChange={handleCityChange}
                        placeholder={t("auth:register.city_placeholder")}
                        options={(language === "ur" ? pakistanCitiesUr : pakistanCitiesEn).map(c => ({
                          label: c.name,
                          value: c.name,
                          description: c.state
                        }))}
                        leftIcon={<MapIcon className="h-4 w-4" />}
                      />
                    ) : (
                      <Input
                        label={t("auth:register.city_label")}
                        placeholder={t("auth:register.city_placeholder")}
                        value={form.city}
                        onChange={(e) => setField("city", e.target.value)}
                        leftIcon={<MapIcon className="h-4 w-4" />}
                      />
                    )}

                    <Input
                      label={t("auth:register.state_label")}
                      placeholder={t("auth:register.state_placeholder")}
                      value={form.state}
                      onChange={(e) => setField("state", e.target.value)}
                    />

                    <Input
                      label={t("postal_code")}
                      placeholder={t("postal_code_placeholder")}
                      value={form.postal_code}
                      onChange={(e) => setField("postal_code", e.target.value)}
                      leftIcon={<Hash className="h-4 w-4" />}
                    />
                  </div>

                  {form.country === "Others" && (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                      <Input
                        label={t("auth:register.custom_country_label")}
                        placeholder={t("auth:register.custom_country_placeholder")}
                        value={customCountry}
                        onChange={(e) => setCustomCountry(e.target.value)}
                        leftIcon={<Globe className="h-4 w-4" />}
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-2 group">
                  <label className="block text-[10px] font-black uppercase text-text-muted ml-1 tracking-wider">{t("physical_address")}</label>
                  <textarea
                    className={`w-full min-h-[100px] bg-background p-4 rounded-xl border border-border focus:border-primary outline-none transition-all ${direction === 'rtl' ? 'text-right' : 'text-left'}`}
                    placeholder={t("physical_address_placeholder")}
                    value={form.address}
                    onChange={(e) => setField("address", e.target.value)}
                    rows={3}
                    dir={direction}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Global Action Bar */}
        <div className="sticky bottom-4 z-50 rounded-2xl border border-border bg-card/80 backdrop-blur-xl p-4 shadow-2xl shadow-primary/10 flex items-center justify-between">
          <div className="hidden md:flex items-center gap-2 ml-4">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse"></div>
            <span className="text-xs font-bold text-text-muted uppercase tracking-widest">{t("master_identity_locked")}</span>
          </div>

          <Button
            type="submit"
            isLoading={saving}
            className="w-full md:w-auto px-12 py-6 text-sm uppercase tracking-widest"
            leftIcon={!saving && <ShieldCheck className="h-5 w-5" />}
          >
            {saving ? t("updating_records") : t("synchronize_identity")}
          </Button>
        </div>
      </form>
    </div>
  );
}
