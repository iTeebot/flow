import { useEffect, useState } from "react";
import { Plus, Edit, Trash2, Users, Search } from "lucide-react";
import { listCustomers, deleteCustomer, type Customer } from "./api";
import { useAuthStore } from "../../store/authStore";
import { TablePagination } from "../shared/TablePagination";
import { TableActions } from "../../components/TableActions";
import { useToastStore } from "../../store/toastStore";
import { useTranslation } from "react-i18next";
import { Table } from "../../components/ui/Table";
import { Select } from "../../components/ui/Select";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { CreateCustomerModal } from "../../components/modals/CreateCustomerModal";

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
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text-primary">{t("title")}</h1>
          <p className="text-sm text-text-muted mt-1">{t("subtitle")}</p>
        </div>
        <Button
          onClick={() => setShowAddForm(true)}
          leftIcon={<Plus className="h-4 w-4" />}
        >
          {t("create_btn")}
        </Button>
      </div>

      <CreateCustomerModal
        isOpen={showAddForm}
        onClose={resetForm}
        onSuccess={loadCustomers}
        companyId={currentCompanyId}
        editingCustomer={editingCustomer}
      />

      {/* List Container */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="border-b border-border bg-surface/30 px-6 py-5">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              {t("manage_contacts")}
              <span className="ml-1 text-xs font-medium px-2 py-0.5 rounded-full bg-surface text-text-muted border border-border">
                {filteredCustomers.length}
              </span>
            </h2>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-4 lg:w-3/4">
              <div className="md:col-span-1">
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

              <Select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                options={[
                  { label: t("sort_name"), value: "name" },
                  { label: t("sort_phone"), value: "phone" },
                  { label: t("sort_tax"), value: "tax" },
                ]}
              />

              <Button
                variant="secondary"
                onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                className="h-[46px] w-full"
                leftIcon={<Plus className={`h-4 w-4 transition-transform duration-300 ${sortOrder === 'desc' ? 'rotate-180' : ''} hidden`} />}
              >
                <span className="uppercase tracking-widest text-[10px]">{sortOrder}</span>
              </Button>
            </div>
          </div>
        </div>

        {filteredCustomers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="rounded-full bg-surface p-4 mb-4 border border-border">
              <Users className="h-10 w-10 text-text-muted/30" />
            </div>
            <p className="text-text-muted font-medium">{t("no_customers")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table
              data={paginatedCustomers}
              keyExtractor={(customer) => customer.id}
              columns={[
                {
                  header: t("col_name"),
                  accessor: (customer) => <div className="font-bold text-text-primary text-sm">{customer.name}</div>
                },
                {
                  header: t("col_phone"),
                  accessor: (customer) => (
                    <div className="text-sm text-text-primary font-mono tracking-tighter">
                      {customer.phone || <span className="text-text-muted/30">---</span>}
                    </div>
                  )
                },
                {
                  header: t("col_tax"),
                  accessor: (customer) => (
                    <span className="text-xs font-medium px-2 py-1 rounded bg-surface border border-border text-text-muted">
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
                },
                {
                  header: "",
                  className: "sticky right-0 z-10 bg-card/95 group-hover:bg-surface/95 w-14 px-2 py-4 transition-colors shadow-[-4px_0_10px_rgba(0,0,0,0.05)] backdrop-blur-sm",
                  accessor: (customer) => (
                    <div className="flex items-center justify-end">
                      <TableActions
                        actions={[
                          {
                            label: t("modify_profile"),
                            icon: Edit,
                            onClick: () => handleEdit(customer)
                          },
                          {
                            label: t("remove_contact"),
                            icon: Trash2,
                            onClick: () => handleDelete(customer.id),
                            variant: "danger"
                          }
                        ]}
                      />
                    </div>
                  )
                }
              ]}
            />
          </div>
        )}

        {filteredCustomers.length > 0 && (
          <div className="border-t border-border bg-surface/20">
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
          </div>
        )}
      </div>
    </div>
  );
}
