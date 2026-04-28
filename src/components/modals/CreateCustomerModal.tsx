import React, { useState } from 'react';
import { Users } from 'lucide-react';
import { ModalLayout } from './Layout';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useTranslation } from 'react-i18next';
import { createCustomer, updateCustomer, type Customer } from '../../modules/customers/api';
import { useToastStore } from '../../store/toastStore';
import { useEffect } from 'react';
import { validatePakistaniPhone } from '../../utils/validations/phone';
import { validatePakistaniNTN } from '../../utils/validations/identity';
import { SearchableSelect } from '../ui/SearchableSelect';
import { getCompanyProfile } from '../../modules/companyProfile/api';
import pakistanCitiesEn from "../../assets/countries/Pakistan.en.json";
import { useUiStore } from '../../store/uiStore';

// Dynamic Urdu cities fallback logic
let pakistanCitiesUr: any[] = pakistanCitiesEn;
try {
  // @ts-ignore
  const urData = await import("../../assets/countries/Pakistan.ur.json");
  if (urData && urData.default) pakistanCitiesUr = urData.default;
} catch (e) {
  // Fallback already set to en
}

interface CreateCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  companyId: number;
  editingCustomer?: Customer | null;
}

export const CreateCustomerModal: React.FC<CreateCustomerModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  companyId,
  editingCustomer,
}) => {
  const { t } = useTranslation(["customers", "common"]);
  const { language } = useUiStore();
  const { addToast } = useToastStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [companyCountry, setCompanyCountry] = useState("Pakistan");
  const [form, setForm] = useState({
    name: "",
    phone: "",
    tax_registration_number: "",
    address: "",
    city: "",
    state: ""
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen) {
      setErrors({});
    } else {
      // Fetch company profile to get country
      getCompanyProfile(companyId).then(profile => {
        if (profile.country) setCompanyCountry(profile.country);
      }).catch(() => {
        // Fallback to Pakistan if fetch fails
        setCompanyCountry("Pakistan");
      });
    }
  }, [isOpen, companyId]);

  useEffect(() => {
    if (editingCustomer && isOpen) {
      setForm({
        name: editingCustomer.name,
        phone: editingCustomer.phone || "",
        tax_registration_number: editingCustomer.tax_registration_number || "",
        address: editingCustomer.address || "",
        city: editingCustomer.city || "",
        state: editingCustomer.state || ""
      });
    } else if (!editingCustomer && isOpen) {
      setForm({ name: "", phone: "", tax_registration_number: "", address: "", city: "", state: "" });
    }
  }, [editingCustomer, isOpen]);

  const handleCityChange = (val: string) => {
    const nextForm = { ...form, city: val };
    if (companyCountry === "Pakistan") {
      const citiesData = language === "ur" ? pakistanCitiesUr : pakistanCitiesEn;
      const selected = citiesData.find(c => c.name === val);
      if (selected) {
        nextForm.state = selected.state;
      }
    }
    setForm(nextForm);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (form.phone && !validatePakistaniPhone(form.phone)) {
      newErrors.phone = t("error_invalid_phone");
    }
    
    if (form.tax_registration_number && !validatePakistaniNTN(form.tax_registration_number)) {
      newErrors.tax_registration_number = t("error_invalid_ntn");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    try {
      setIsSubmitting(true);
      if (editingCustomer) {
        await updateCustomer({
          id: editingCustomer.id,
          ...form
        });
        addToast(t("toast_updated"), "success");
      } else {
        await createCustomer({
          company_id: companyId,
          ...form
        });
        addToast(t("toast_created"), "success");
      }
      onSuccess();
      onClose();
    } catch (err) {
      addToast(err instanceof Error ? err.message : t("toast_save_failed"), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalLayout
      isOpen={isOpen}
      onClose={onClose}
      title={editingCustomer ? t("modal_edit_title") : t("modal_title")}
      subtitle={t("modal_subtitle")}
      icon={<Users className="h-5 w-5" />}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Input
              label={`${t("form_name")} *`}
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={t("form_name_placeholder")}
            />
          </div>
          <div>
            <Input
              label={t("form_phone")}
              type="tel"
              value={form.phone}
              onChange={(e) => {
                const clean = e.target.value.replace(/[^\d+]/g, "").slice(0, 15);
                setForm({ ...form, phone: clean });
              }}
              placeholder={t("form_phone_placeholder")}
              error={errors.phone}
              maxLength={15}
            />
          </div>
          <div>
            <Input
              label={t("form_tax")}
              value={form.tax_registration_number}
              onChange={(e) => {
                const clean = e.target.value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 7);
                setForm({ ...form, tax_registration_number: clean });
              }}
              placeholder={t("form_tax_placeholder")}
              error={errors.tax_registration_number}
              maxLength={7}
            />
          </div>
          <div>
            {companyCountry === "Pakistan" ? (
              <SearchableSelect
                label={t("form_city")}
                value={form.city}
                onChange={handleCityChange}
                placeholder={t("form_city_placeholder")}
                options={(language === "ur" ? pakistanCitiesUr : pakistanCitiesEn).map(c => ({
                  label: c.name,
                  value: c.name,
                  description: c.state
                }))}
              />
            ) : (
              <Input
                label={t("form_city")}
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                placeholder={t("form_city_placeholder")}
              />
            )}
          </div>
          <div>
            <Input
              label={t("form_state")}
              value={form.state}
              onChange={(e) => setForm({ ...form, state: e.target.value })}
              placeholder={t("form_state_placeholder")}
              readOnly={companyCountry === "Pakistan"}
              className={companyCountry === "Pakistan" ? "bg-surface cursor-not-allowed opacity-70" : ""}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-[10px] font-black text-text-muted uppercase tracking-widest ml-1 mb-1.5">{t("form_address")}</label>
            <textarea
              rows={2}
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder={t("form_address_placeholder")}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-text-muted/40"
            />
          </div>
        </div>
        <div className="flex items-center gap-3 pt-4 border-t border-border mt-6">
          <Button
            type="submit"
            isLoading={isSubmitting}
            className="flex-1"
          >
            {t('common:save')}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
          >
            {t('common:cancel')}
          </Button>
        </div>
      </form>
    </ModalLayout>
  );
};
