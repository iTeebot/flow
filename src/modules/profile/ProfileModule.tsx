import { useEffect, useRef, useState } from "react";
import { invoke } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import currencies from "../../assets/currencies.json";
import { APP_VERSION } from "../../lib/version";
import { Upload, Trash2, Image as ImageIcon, Building2, Briefcase, MapPin, Globe, ShieldCheck, Mail, Phone, User as UserIcon } from "lucide-react";
import { useToastStore } from "../../store/toastStore";
import {
  getCompanyProfile,
  updateCompanyProfile,
  type CompanyProfile,
} from "../companyProfile/api";

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
};

export function ProfileModule() {
  const { user, companyId, companyLogo, setUser, setCurrency, setCompanyLogo } = useAuthStore();
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
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToastStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currenciesList = Object.values(currencies);

  useEffect(() => {
    const load = async () => {
      if (!companyId) {
        setLoading(false);
        return;
      }
      try {
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
        });
      } catch (err) {
        addToast(err instanceof Error ? err.message : "Failed to load profile", "error");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [companyId, user?.full_name]);

  const setField = (key: keyof ProfileForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      addToast("Logo must be under 2 MB.", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setCompanyLogo(reader.result as string);
      addToast("Company logo updated.", "success");
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setCompanyLogo(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    addToast("Company logo removed.", "info");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !companyProfile) return;
    try {
      setSaving(true);

      const updatedUser = await invoke<{ id: number; username: string; full_name: string | null; role: string }>(
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
      });
      setCompanyProfile(updatedCompany);
      setCurrency(form.currency);
      addToast("Profile updated successfully.", "success");
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Failed to update profile", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
        <p className="text-sm text-text-muted animate-pulse">Retreiving identity records...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-600">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text-primary">Identity & Branding</h1>
          <p className="text-sm text-text-muted mt-1">Manage registration details and company profile</p>
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
                  Visual Asset
                </h2>
                <p className="text-[10px] text-text-muted mt-1 font-bold uppercase tracking-tighter">Company Seal / Branding</p>
              </div>

              <div className="p-8 flex flex-col items-center gap-6">
                <div className="relative group">
                  <div className="h-40 w-40 rounded-2xl border-2 border-dashed border-border bg-surface/30 flex items-center justify-center overflow-hidden transition-all group-hover:border-primary/50 group-hover:bg-primary/5">
                    {companyLogo ? (
                      <img src={companyLogo} alt="Logo" className="h-full w-full object-contain p-4 transition-transform duration-500 group-hover:scale-110" />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-text-muted/30">
                        <Building2 className="h-12 w-12" />
                        <span className="text-[10px] font-black uppercase">No Logo</span>
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
                    title="Update Logo"
                  >
                    <Upload className="h-5 w-5" />
                  </button>
                </div>

                <div className="text-center space-y-2">
                  <p className="text-[11px] text-text-muted font-bold uppercase tracking-widest italic">Dynamic PDF Injection</p>
                  <p className="text-xs text-text-muted/60 leading-relaxed max-w-[200px]">This asset will be automatically injected into your challans and invoices.</p>
                </div>

                {companyLogo && (
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-error/60 border border-error/20 bg-error/5 hover:bg-error/10 hover:text-error transition-all"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Purge Attachment
                  </button>
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
                  Professional Profile
                </h2>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 group">
                  <label className="block text-[10px] font-black uppercase text-text-muted ml-1 tracking-wider">Account Executive Name</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted group-focus-within:text-primary" />
                    <input className="w-full pl-10" placeholder="e.g. John Doe" value={form.full_name} onChange={(e) => setField("full_name", e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2 group">
                  <label className="block text-[10px] font-black uppercase text-text-muted ml-1 tracking-wider group-focus-within:text-primary transition-colors">Legal Trading Name <span className="text-error">*</span></label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted group-focus-within:text-primary" />
                    <input className="w-full pl-10" placeholder="e.g. Teebotics Ltd" value={form.company_name} onChange={(e) => setField("company_name", e.target.value)} required />
                  </div>
                </div>
              </div>
            </div>

            {/* Business Registration */}
            <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
              <div className="border-b border-border bg-surface/30 px-6 py-5">
                <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  Tax & Registration
                </h2>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 bg-gradient-to-br from-card to-surface/40">
                <div className="space-y-2 group">
                  <label className="block text-[10px] font-black uppercase text-text-muted ml-1 tracking-wider">NTN / Tax ID</label>
                  <input className="w-full" placeholder="PKR-00-0000" value={form.tax_registration_number} onChange={(e) => setField("tax_registration_number", e.target.value)} />
                </div>
                <div className="space-y-2 group">
                  <label className="block text-[10px] font-black uppercase text-text-muted ml-1 tracking-wider">Sales Tax #</label>
                  <input className="w-full" placeholder="STRN-12345" value={form.sales_tax_number} onChange={(e) => setField("sales_tax_number", e.target.value)} />
                </div>
                <div className="space-y-2 group">
                  <label className="block text-[10px] font-black uppercase text-text-muted ml-1 tracking-wider">Business Vertical</label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                    <input className="w-full pl-10" placeholder="e.g. Manufacturing" value={form.business_type} onChange={(e) => setField("business_type", e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2 group md:col-span-2 lg:col-span-3">
                  <label className="block text-[10px] font-black uppercase text-text-muted ml-1 tracking-wider">Transactional Currency</label>
                  <select
                    className="w-full"
                    value={form.currency}
                    onChange={(e) => setField("currency", e.target.value)}
                  >
                    {currenciesList.map((curr: any) => (
                      <option key={curr.code} value={curr.code}>
                        {curr.symbol} {curr.name} ({curr.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Contact & Geography */}
            <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
              <div className="border-b border-border bg-surface/30 px-6 py-5">
                <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  Connectivity & Location
                </h2>
              </div>
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2 group">
                    <label className="block text-[10px] font-black uppercase text-text-muted ml-1 tracking-wider">Web Domain</label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                      <input className="w-full pl-10 overflow-hidden text-ellipsis" placeholder="www.yourlink.com" value={form.website} onChange={(e) => setField("website", e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2 group">
                    <label className="block text-[10px] font-black uppercase text-text-muted ml-1 tracking-wider">Support Phone</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                      <input className="w-full pl-10" placeholder="+12 345 6789" value={form.phone} onChange={(e) => setField("phone", e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2 group md:col-span-2">
                    <label className="block text-[10px] font-black uppercase text-text-muted ml-1 tracking-wider">Business Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                      <input className="w-full pl-10" placeholder="admin@domain.com" value={form.email} onChange={(e) => setField("email", e.target.value)} />
                    </div>
                  </div>
                </div>

                <div className="space-y-2 group">
                  <label className="block text-[10px] font-black uppercase text-text-muted ml-1 tracking-wider">Headquarters / Physical Address</label>
                  <textarea className="w-full min-h-[100px] bg-background" placeholder="Building, Street, City, Country..." value={form.address} onChange={(e) => setField("address", e.target.value)} rows={3} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Global Action Bar */}
        <div className="sticky bottom-4 z-50 rounded-2xl border border-border bg-card/80 backdrop-blur-xl p-4 shadow-2xl shadow-primary/10 flex items-center justify-between">
          <div className="hidden md:flex items-center gap-2 ml-4">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse"></div>
            <span className="text-xs font-bold text-text-muted uppercase tracking-widest">Master Identity Locked</span>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full md:w-auto inline-flex items-center justify-center gap-3 rounded-xl bg-primary px-12 py-4 text-sm font-black uppercase tracking-widest text-primary-foreground shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          >
            {saving ? (
              <div className="w-5 h-5 border-3 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></div>
            ) : <ShieldCheck className="h-5 w-5" />}
            {saving ? "Updating Records..." : "Synchronize Identity"}
          </button>
        </div>
      </form>
    </div>
  );
}
