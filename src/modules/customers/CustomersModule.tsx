import { useEffect, useState } from "react";
import { Plus, Edit, Trash2, Users, Search } from "lucide-react";
import { createCustomer, listCustomers, updateCustomer, deleteCustomer, type Customer } from "./api";
import { useAuthStore } from "../../store/authStore";
import { TablePagination } from "../shared/TablePagination";
import { SortableHeader } from "../../components/SortableHeader";
import { TableActions } from "../../components/TableActions";
import { useToastStore } from "../../store/toastStore";

export function CustomersModule() {
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

  const [formData, setFormData] = useState({
    name: "",
    tax_registration_number: "",
    phone: "",
    address: "",
  });

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
      addToast(err instanceof Error ? err.message : "Failed to load customers", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCustomer) {
        await updateCustomer({
          id: editingCustomer.id,
          ...formData,
        });
      } else {
        await createCustomer({
          company_id: currentCompanyId,
          ...formData,
        });
      }
      await loadCustomers();
      setShowAddForm(false);
      setEditingCustomer(null);
      setFormData({ name: "", tax_registration_number: "", phone: "", address: "" });
      addToast(editingCustomer ? "Customer profile updated." : "New customer registered.", "success");
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Failed to save customer", "error");
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      tax_registration_number: customer.tax_registration_number || "",
      phone: customer.phone || "",
      address: customer.address || "",
    });
    setShowAddForm(true);
  };

  const handleDelete = async (customerId: number) => {
    if (!confirm("Are you sure you want to delete this customer?")) return;
    try {
      await deleteCustomer(customerId);
      await loadCustomers();
      addToast("Customer record deleted successfully.", "success");
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Failed to delete customer", "error");
    }
  };

  const handleSort = (key: "name" | "phone" | "tax") => {
    if (sortBy === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(key);
      setSortOrder("asc");
    }
  };

  const resetForm = () => {
    setShowAddForm(false);
    setEditingCustomer(null);
    setFormData({ name: "", tax_registration_number: "", phone: "", address: "" });
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
        <div className="text-text-muted">Loading customers...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text-primary">Customer Directory</h1>
          <p className="text-sm text-text-muted mt-1">Manage your customer database and contact profiles</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          Create
        </button>
      </div>

      {showAddForm && (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xl animate-in slide-in-from-top-4 duration-300">
          <div className="border-b border-border bg-surface/50 px-6 py-4">
            <h2 className="text-lg font-bold text-text-primary">
              {editingCustomer ? "Edit Contact Profile" : "New Customer Onboarding"}
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-2">
                  Customer Name <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Acme Corp / John Doe"
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-2">
                  Tax Registration Number
                </label>
                <input
                  type="text"
                  value={formData.tax_registration_number}
                  onChange={(e) => setFormData({ ...formData, tax_registration_number: e.target.value })}
                  placeholder="TIN / VAT / GST"
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+1 (555) 000-0000"
                  className="w-full"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-2">
                  Physical Address
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  rows={3}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-text-primary text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-text-muted/40"
                  placeholder="Street address, City, Country"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-border">
              <button
                type="submit"
                className="rounded-lg bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98]"
              >
                {editingCustomer ? "Save Changes" : "Create Customer Account"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border border-border bg-background px-6 py-2.5 text-sm font-semibold text-text-primary hover:bg-surface"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* List Container */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="border-b border-border bg-surface/30 px-6 py-5">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Manage Contacts
              <span className="ml-1 text-xs font-medium px-2 py-0.5 rounded-full bg-surface text-text-muted border border-border">
                {filteredCustomers.length}
              </span>
            </h2>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-4 lg:w-3/4">
              <div className="relative group lg:col-span-2">
                <Search className="input-icon-left h-3.5 w-3.5 text-text-muted group-focus-within:text-primary transition-colors" />
                <input
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search customer database..."
                  className="w-full input-with-icon pr-4 py-2 text-xs font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-text-muted/50"
                />
              </div>

              <select
                value={phoneFilter}
                onChange={(e) => {
                  setPhoneFilter(e.target.value as "all" | "with-phone" | "without-phone");
                  setPage(1);
                }}
                className="text-xs"
              >
                <option value="all">All Phones</option>
                <option value="with-phone">Has Phone</option>
                <option value="without-phone">No Phone</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "name" | "phone" | "tax")}
                className="text-xs"
              >
                <option value="name">Sort by Name</option>
                <option value="phone">Sort by Phone</option>
                <option value="tax">Sort by Tax ID</option>
              </select>
            </div>
          </div>
        </div>

        {filteredCustomers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="rounded-full bg-surface p-4 mb-4 border border-border">
              <Users className="h-10 w-10 text-text-muted/30" />
            </div>
            <p className="text-text-muted font-medium">No customers matched your criteria</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-surface/50 border-b border-border">
                  <SortableHeader
                    label="Customer Name"
                    sortKey="name"
                    currentSortBy={sortBy}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Phone Number"
                    sortKey="phone"
                    currentSortBy={sortBy}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Tax ID / TIN"
                    sortKey="tax"
                    currentSortBy={sortBy}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                  />
                  <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-wider text-text-muted">Physical Address</th>
                  <th className="sticky right-0 z-10 bg-surface/90 w-14 px-2 py-4 text-right text-[11px] font-bold uppercase tracking-wider text-text-muted shadow-[-4px_0_10px_rgba(0,0,0,0.1)] backdrop-blur-sm"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedCustomers.map((customer) => (
                  <tr key={customer.id} className="group hover:bg-surface/30 transition-all duration-200">
                    <td className="px-6 py-4">
                      <div className="font-bold text-text-primary text-sm">{customer.name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-text-primary font-mono tracking-tighter">
                        {customer.phone || <span className="text-text-muted/30">---</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-medium px-2 py-1 rounded bg-surface border border-border text-text-muted">
                        {customer.tax_registration_number || "NOT_ASSIGNED"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs text-text-muted max-w-xs truncate" title={customer.address || ""}>
                        {customer.address || "No address provided"}
                      </div>
                    </td>
                    <td className="sticky right-0 z-10 bg-card/95 group-hover:bg-surface/95 w-14 px-2 py-4 transition-colors shadow-[-4px_0_10px_rgba(0,0,0,0.05)] backdrop-blur-sm">
                      <div className="flex items-center justify-end">
                        <TableActions
                          actions={[
                            {
                              label: "Modify Profile",
                              icon: Edit,
                              onClick: () => handleEdit(customer)
                            },
                            {
                              label: "Remove Contact",
                              icon: Trash2,
                              onClick: () => handleDelete(customer.id),
                              variant: "danger"
                            }
                          ]}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
