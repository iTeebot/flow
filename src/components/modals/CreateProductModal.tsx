import React, { useState } from 'react';
import { Package } from 'lucide-react';
import { ModalLayout } from './Layout';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useTranslation } from 'react-i18next';
import { createProduct, type Product } from '../../modules/inventory/api';
import { useToastStore } from '../../store/toastStore';

interface CreateProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (product: Product) => void;
  companyId: number;
  existingProducts: Product[];
}

export const CreateProductModal: React.FC<CreateProductModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  companyId,
  existingProducts,
}) => {
  const { t } = useTranslation();
  const { addToast } = useToastStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    sku: "",
    price: 0,
    stock_qty: 0
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const newProduct = await createProduct({
        company_id: companyId,
        ...form
      });
      addToast("Product added to catalog", "success");
      onSuccess(newProduct);
      onClose();
      setForm({ name: "", sku: "", price: 0, stock_qty: 0 });
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Failed to add product", "error");
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
      title="Catalog New Product"
      subtitle="Inventory management"
      icon={<Package className="h-5 w-5" />}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Input
              label="Product Name *"
              required
              value={form.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Item nomenclature"
            />
          </div>
          <div>
            <Input
              label="SKU / Code *"
              required
              readOnly
              value={form.sku}
              placeholder="Auto-generated"
              className="bg-surface/50 cursor-not-allowed"
            />
          </div>

          <div className="sm:col-span-2">
            <Input
              label="Initial Stock Level"
              type="number"
              required
              value={form.stock_qty}
              onChange={(e) => setForm({ ...form, stock_qty: parseInt(e.target.value) || 0 })}
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
