import { useEffect, useRef, useState } from "react";
import { invoke } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import currencies from "../../assets/currencies.json";
import { APP_VERSION } from "../../lib/version";
import { Upload, Trash2, Image as ImageIcon } from "lucide-react";
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
    return <div className="text-text-muted">Loading profile...</div>;
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Profile</h1>
        <p className="text-sm text-text-muted">Update registration, company information, and branding.</p>
      </div>

      {/* Company Logo Section */}
      <div className="rounded-md border border-border bg-card p-5">
        <h2 className="mb-4 text-sm font-semibold text-text-primary flex items-center gap-2">
          <ImageIcon className="h-4 w-4 text-primary" />
          Company Logo
          <span className="text-[10px] font-normal text-text-muted ml-1">(Shown on PDFs)</span>
        </h2>
        <div className="flex items-center gap-5">
          {/* Preview */}
          <div className="relative h-20 w-20 shrink-0 rounded-lg border-2 border-dashed border-border bg-surface/50 flex items-center justify-center overflow-hidden">
            {companyLogo ? (
              <img src={companyLogo} alt="Company logo" className="h-full w-full object-contain p-1" />
            ) : (
              <ImageIcon className="h-8 w-8 text-text-muted/30" />
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              onChange={handleLogoUpload}
              className="hidden"
              id="logo-upload"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-primary transition hover:border-primary hover:bg-primary/10"
            >
              <Upload className="h-3.5 w-3.5" />
              {companyLogo ? "Change Logo" : "Upload Logo"}
            </button>
            {companyLogo && (
              <button
                type="button"
                onClick={handleRemoveLogo}
                className="inline-flex items-center gap-2 rounded-md border border-red-500/30 bg-red-500/5 px-3 py-1.5 text-xs font-medium text-red-400 transition hover:bg-red-500/10"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove
              </button>
            )}
            <p className="text-[10px] text-text-muted">PNG, JPG, SVG or WebP. Max 2 MB.</p>
          </div>
        </div>
      </div>

      {/* Profile Form */}
      <form onSubmit={handleSave} className="rounded-md border border-border bg-card p-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-text-muted uppercase">Full name</label>
            <input className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary" placeholder="Full name" value={form.full_name} onChange={(e) => setField("full_name", e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-text-muted uppercase">Company name</label>
            <input className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary" placeholder="Company name" value={form.company_name} onChange={(e) => setField("company_name", e.target.value)} required />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-text-muted uppercase">Owner name</label>
            <input className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary" placeholder="Owner name" value={form.owner_name} onChange={(e) => setField("owner_name", e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-text-muted uppercase">Tax ID / TIN</label>
            <input className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary" placeholder="Tax registration number" value={form.tax_registration_number} onChange={(e) => setField("tax_registration_number", e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-text-muted uppercase">Sales Tax Number</label>
            <input className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary" placeholder="Sales tax number" value={form.sales_tax_number} onChange={(e) => setField("sales_tax_number", e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-text-muted uppercase">Business type</label>
            <input className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary" placeholder="Business type" value={form.business_type} onChange={(e) => setField("business_type", e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-text-muted uppercase">Business Currency</label>
            <select
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary"
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
          <div className="space-y-1">
            <label className="text-xs font-semibold text-text-muted uppercase">Website</label>
            <input className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary" placeholder="Website" value={form.website} onChange={(e) => setField("website", e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-text-muted uppercase">Phone</label>
            <input className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary" placeholder="Phone" value={form.phone} onChange={(e) => setField("phone", e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-text-muted uppercase">Email Address</label>
            <input className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary" placeholder="Email" value={form.email} onChange={(e) => setField("email", e.target.value)} />
          </div>
          <div className="md:col-span-2 space-y-1">
            <label className="text-xs font-semibold text-text-muted uppercase">Full Address</label>
            <textarea className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary" placeholder="Address" value={form.address} onChange={(e) => setField("address", e.target.value)} rows={3} />
          </div>
        </div>
        <div className="mt-5 flex items-center justify-between">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-text-primary hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Profile"}
          </button>
          <div className="text-xs text-text-muted">
            Internal Version: <span className="font-mono text-cyan">{APP_VERSION}</span>
          </div>
        </div>
      </form>
    </div>
  );
}