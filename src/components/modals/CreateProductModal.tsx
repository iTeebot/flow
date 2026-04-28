import React, { useState } from 'react';
import { Package } from 'lucide-react';
import { ModalLayout } from './Layout';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useTranslation } from 'react-i18next';
import { createProduct, updateProduct, type Product } from '../../modules/inventory/api';
import { useToastStore } from '../../store/toastStore';
import { useEffect } from 'react';

interface CreateProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (product?: Product) => void;
  companyId: number;
  existingProducts: Product[];
  editingProduct?: Product | null;
}

export const CreateProductModal: React.FC<CreateProductModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  companyId,
  existingProducts,
  editingProduct,
}) => {
  const { t } = useTranslation(["inventory", "common"]);
  const { addToast } = useToastStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    sku: "",
    price: 0,
    stock_qty: 0
  });

  useEffect(() => {
    if (editingProduct && isOpen) {
      setForm({
        name: editingProduct.name,
        description: editingProduct.description || "",
        sku: editingProduct.sku,
        price: editingProduct.price,
        stock_qty: editingProduct.stock_qty,
      });
    } else if (!editingProduct && isOpen) {
      setForm({ name: "", description: "", sku: "", price: 0, stock_qty: 0 });
    }
  }, [editingProduct, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      if (editingProduct) {
        await updateProduct({
          id: editingProduct.id,
          ...form
        });
        addToast(t("toast_updated"), "success");
      } else {
        const created = await createProduct({
          company_id: companyId,
          ...form
        });
        addToast(t("toast_created"), "success");
        onSuccess(created);
      }
      onClose();
    } catch (err) {
      addToast(err instanceof Error ? err.message : t("toast_save_failed"), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNameChange = (name: string) => {
    let baseSku = name.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
    if (!baseSku && name) baseSku = "ITEM";
    
    const exists = existingProducts.some(p => p.sku === baseSku);
    const finalSku = exists ? `${baseSku}-${Date.now().toString().slice(-4)}` : baseSku;
    
    setForm({ ...form, name, sku: finalSku });
  };

  return (
    <ModalLayout
      isOpen={isOpen}
      onClose={onClose}
      title={editingProduct ? t("modal_edit_title") : t("modal_title")}
      subtitle={t("modal_subtitle")}
      icon={<Package className="h-5 w-5" />}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Input
              label={`${t("form_name")} *`}
              required
              value={form.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder={t("form_nomenclature")}
            />
          </div>
          <div>
            <Input
              label={`${t("form_sku")} *`}
              required
              readOnly
              value={form.sku}
              placeholder={t("form_auto_generated")}
              className="bg-surface/50 cursor-not-allowed"
            />
          </div>

          <div>
            <Input
              label={t("form_stock")}
              type="number"
              required
              min="0"
              value={form.stock_qty}
              onChange={(e) => setForm({ ...form, stock_qty: parseInt(e.target.value) || 0 })}
            />
          </div>

          <div>
            <Input
              label={t("form_price")}
              type="number"
              step="0.01"
              required
              min="0"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
              placeholder={t("form_price_placeholder")}
            />
          </div>

          <div className="sm:col-span-2">
            <Input
              label={t("form_description")}
              type="text"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder={t("form_description_placeholder")}
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
