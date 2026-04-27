import React, { useState } from 'react';
import { Users } from 'lucide-react';
import { ModalLayout } from './Layout';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useTranslation } from 'react-i18next';
import { createCustomer } from '../../modules/customers/api';
import { useToastStore } from '../../store/toastStore';

interface CreateCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (customer: any) => void;
  companyId: number;
}

export const CreateCustomerModal: React.FC<CreateCustomerModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  companyId,
}) => {
  const { t } = useTranslation();
  const { addToast } = useToastStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    tax_registration_number: "",
    address: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const newCustomer = await createCustomer({
        company_id: companyId,
        ...form
      });
      addToast("Customer registered successfully", "success");
      onSuccess(newCustomer);
      onClose();
      setForm({ name: "", phone: "", tax_registration_number: "", address: "" });
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Failed to register customer", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalLayout
      isOpen={isOpen}
      onClose={onClose}
      title="Register New Customer"
      subtitle="Add to your business directory"
      icon={<Users className="h-5 w-5" />}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Input
              label="Full Name *"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Customer or Company Name"
            />
          </div>
          <div>
            <Input
              label="Phone Number"
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+92..."
            />
          </div>
          <div>
            <Input
              label="Tax / NTN ID"
              value={form.tax_registration_number}
              onChange={(e) => setForm({ ...form, tax_registration_number: e.target.value })}
              placeholder="Optional"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-[10px] font-black text-text-muted uppercase tracking-widest ml-1 mb-1.5">Physical Address</label>
            <textarea
              rows={2}
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="Street, City, State"
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
            {t('common.save')}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
          >
            {t('common.cancel')}
          </Button>
        </div>
      </form>
    </ModalLayout>
  );
};
