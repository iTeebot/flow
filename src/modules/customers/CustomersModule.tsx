import { useEffect, useState } from "react";
import { Edit, Trash2, Users, Search, ArrowUpDown } from "lucide-react";
import { listCustomers, deleteCustomer, type Customer } from "./api";
import { useAuthStore } from "../../store/authStore";
import { TablePagination } from "../shared/TablePagination";
import { useToastStore } from "../../store/toastStore";
import { useTranslation } from "react-i18next";
import { Select } from "../../components/ui/Select";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { CreateCustomerModal } from "../../components/modals/CreateCustomerModal";
import { ModulePage } from "../../components/ModulePage";
import { DataTable } from "../../components/DataTable";

export function CustomersModule() {
  const { t } = useTranslation("customers");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [phoneFilter, setPhoneFilter] = useState<"all" | "with-phone" | "without-phone">("all");
  const [sortBy, setSortBy] = useState<"name" | "phone" | "tax">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { addToast } = useToastStore();

  const { companyId } = useAuthStore();

  // For demo purposes, using a hardcoded company_id if not available
  // In a real app, this would come from user/company context
  const currentCompanyId = companyId || 1;

  useEffect(() => {
    if (currentCompanyId) {
      loadCustomers();
    }
  }, [currentCompanyId]);

  const loadCustomers = async () => {
    if (!currentCompanyId) return;

    try {
      setLoading(true);
      const data = await listCustomers(currentCompanyId);
      setCustomers(data);
    } catch (err) {
      addToast(err instanceof Error ? err.message : t("toast_load_failed"), "error");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setShowAddForm(true);
  };

  const handleDelete = async (customerId: number) => {
    if (!confirm(t("delete_confirm"))) return;
    try {
      await deleteCustomer(customerId);
      await loadCustomers();
      addToast(t("toast_removed"), "success");
    } catch (err) {
      addToast(err instanceof Error ? err.message : t("toast_save_failed"), "error");
    }
  };



  const resetForm = () => {
    setShowAddForm(false);
    setEditingCustomer(null);
  };

  const handleSort = (key: any) => {
    if (sortBy === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(key);
      setSortOrder("asc");
    }
  };

  const filteredCustomers = customers
    .filter((customer) => {
      const search = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !search ||
        customer.name.toLowerCase().includes(search) ||
        (customer.phone || "").toLowerCase().includes(search) ||
        (customer.tax_registration_number || "").toLowerCase().includes(search) ||
        (customer.address || "").toLowerCase().includes(search);
      const hasPhone = Boolean(customer.phone?.trim());
      const matchesPhone =
        phoneFilter === "all" ||
        (phoneFilter === "with-phone" ? hasPhone : !hasPhone);
      return matchesSearch && matchesPhone;
    })
    .sort((a, b) => {
      let left = "";
      let right = "";
      if (sortBy === "name") {
        left = a.name;
        right = b.name;
      } else if (sortBy === "phone") {
        left = a.phone || "";
        right = b.phone || "";
      } else {
        left = a.tax_registration_number || "";
        right = b.tax_registration_number || "";
      }
      const base = left.localeCompare(right);
      return sortOrder === "asc" ? base : -base;
    });

  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedCustomers = filteredCustomers.slice((safePage - 1) * pageSize, safePage * pageSize);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
      </div>
    );
  }

  return (
    <ModulePage
      title={t("title")}
      subtitle={t("subtitle")}
      loading={loading}
      action={{
        label: t("create_btn"),
        onClick: () => setShowAddForm(true)
      }}
      listIcon={<Users className="h-5 w-5" />}
      listTitle={t("manage_contacts")}
      count={filteredCustomers.length}
      filterBar={
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 w-full">
          <div className="md:col-span-2">
            <Input
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              placeholder={t("search_placeholder")}
              leftIcon={<Search className="h-4 w-4" />}
              className="h-[46px]"
            />
          </div>

          <Select
            value={phoneFilter}
            onChange={(e) => {
              setPhoneFilter(e.target.value as any);
              setPage(1);
            }}
            options={[
              { label: t("filter_all"), value: "all" },
              { label: t("filter_with_phone"), value: "with-phone" },
              { label: t("filter_without_phone"), value: "without-phone" },
            ]}
          />
        </div>
      }
      pagination={
        filteredCustomers.length > 0 && (
          <TablePagination
            page={safePage}
            totalPages={totalPages}
            totalItems={filteredCustomers.length}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        )
      }
    >
      <CreateCustomerModal
        isOpen={showAddForm}
        onClose={resetForm}
        onSuccess={loadCustomers}
        companyId={currentCompanyId}
        editingCustomer={editingCustomer}
      />

      <DataTable
        data={paginatedCustomers}
        keyExtractor={(item) => item.id}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={handleSort}
        emptyIcon={<Users className="h-10 w-10 text-text-muted/30" />}
        emptyMessage={t("no_customers")}
        columns={[
          {
            header: t("col_name"),
            sortKey: "name",
            accessor: (customer) => (
              <div className="font-bold text-text-primary text-sm">{customer.name}</div>
            )
          },
          {
            header: t("col_phone"),
            sortKey: "phone",
            accessor: (customer) => (
              <div className="text-sm text-text-primary font-mono tracking-tighter">
                {customer.phone || <span className="text-text-muted/30">---</span>}
              </div>
            )
          },
          {
            header: t("col_tax"),
            sortKey: "tax",
            accessor: (customer) => (
              <span className="text-[11px] font-bold px-2 py-1 rounded bg-primary/5 border border-primary/10 text-primary uppercase tracking-tight">
                {customer.tax_registration_number || t("not_assigned")}
              </span>
            )
          },
          {
            header: t("col_address"),
            accessor: (customer) => (
              <div className="flex flex-col gap-0.5">
                <div className="text-xs text-text-primary/80 font-medium max-w-xs truncate" title={customer.address || ""}>
                  {customer.address || t("no_address")}
                </div>
                {(customer.city || customer.state) && (
                  <div className="text-[10px] text-text-muted font-bold uppercase tracking-tight">
                    {[customer.city, customer.state].filter(Boolean).join(", ")}
                  </div>
                )}
              </div>
            )
          }
        ]}
        actions={(customer) => [
          {
            label: t("common:edit", "Edit"),
            icon: Edit,
            onClick: () => handleEdit(customer)
          },
          {
            label: t("common:delete", "Delete"),
            icon: Trash2,
            onClick: () => handleDelete(customer.id)
          }
        ]}
      />
    </ModulePage>
  );
}
