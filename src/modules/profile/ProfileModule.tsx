import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useAuthStore } from "../../store/authStore";
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
  const { user, companyId, setUser } = useAuthStore();
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
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

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
        setError(err instanceof Error ? err.message : "Failed to load profile");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [companyId, user?.full_name]);

  const setField = (key: keyof ProfileForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !companyProfile) return;
    try {
      setSaving(true);
      setError(null);
      setNotice(null);

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
      setNotice("Profile updated successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-text-muted">Loading profile...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Profile</h1>
        <p className="text-text-muted">Update registration and company information.</p>
      </div>
      <form onSubmit={handleSave} className="rounded-md border border-border bg-card p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <input className="rounded-md border border-border bg-background px-3 py-2 text-text-primary" placeholder="Full name" value={form.full_name} onChange={(e) => setField("full_name", e.target.value)} />
          <input className="rounded-md border border-border bg-background px-3 py-2 text-text-primary" placeholder="Company name" value={form.company_name} onChange={(e) => setField("company_name", e.target.value)} required />
          <input className="rounded-md border border-border bg-background px-3 py-2 text-text-primary" placeholder="Owner name" value={form.owner_name} onChange={(e) => setField("owner_name", e.target.value)} />
          <input className="rounded-md border border-border bg-background px-3 py-2 text-text-primary" placeholder="Tax registration number" value={form.tax_registration_number} onChange={(e) => setField("tax_registration_number", e.target.value)} />
          <input className="rounded-md border border-border bg-background px-3 py-2 text-text-primary" placeholder="Sales tax number" value={form.sales_tax_number} onChange={(e) => setField("sales_tax_number", e.target.value)} />
          <input className="rounded-md border border-border bg-background px-3 py-2 text-text-primary" placeholder="Business type" value={form.business_type} onChange={(e) => setField("business_type", e.target.value)} />
          <input className="rounded-md border border-border bg-background px-3 py-2 text-text-primary" placeholder="Currency" value={form.currency} onChange={(e) => setField("currency", e.target.value)} />
          <input className="rounded-md border border-border bg-background px-3 py-2 text-text-primary" placeholder="Website" value={form.website} onChange={(e) => setField("website", e.target.value)} />
          <input className="rounded-md border border-border bg-background px-3 py-2 text-text-primary" placeholder="Phone" value={form.phone} onChange={(e) => setField("phone", e.target.value)} />
          <input className="rounded-md border border-border bg-background px-3 py-2 text-text-primary" placeholder="Email" value={form.email} onChange={(e) => setField("email", e.target.value)} />
          <textarea className="md:col-span-2 rounded-md border border-border bg-background px-3 py-2 text-text-primary" placeholder="Address" value={form.address} onChange={(e) => setField("address", e.target.value)} rows={3} />
        </div>
        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
        {notice ? <p className="mt-4 text-sm text-green-600">{notice}</p> : null}
        <button
          type="submit"
          disabled={saving}
          className="mt-5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save Profile"}
        </button>
      </form>
    </div>
  );
}
