import { useEffect, useState } from "react";
import { Plus, Edit, Trash2, Users } from "lucide-react";
import { createCustomer, listCustomers, updateCustomer, deleteCustomer, type Customer } from "./api";
import { useAuthStore } from "../../store/authStore";
import { TablePagination } from "../shared/TablePagination";

export function CustomersModule() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [phoneFilter, setPhoneFilter] = useState<"all" | "with-phone" | "without-phone">("all");
  const [sortBy, setSortBy] = useState<"name" | "phone" | "tax">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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
      setError(err instanceof Error ? err.message : "Failed to load customers");
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save customer");
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete customer");
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Customer Management</h1>
          <p className="text-text-muted">Manage your customer database and contact information</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Add Customer
        </button>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-red-800">
          {error}
          <button
            onClick={() => setError(null)}
            className="float-right ml-4 text-red-600 hover:text-red-800"
          >
            ×
          </button>
        </div>
      )}

      {showAddForm && (
        <div className="rounded-md border border-border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold">
            {editingCustomer ? "Edit Customer" : "Add New Customer"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-text-primary">
                  Customer Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-text-primary placeholder-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary">
                  Tax Registration Number
                </label>
                <input
                  type="text"
                  value={formData.tax_registration_number}
                  onChange={(e) => setFormData({ ...formData, tax_registration_number: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-text-primary placeholder-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-text-primary placeholder-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-text-primary">
                  Address
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  rows={3}
                  className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-text-primary placeholder-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                {editingCustomer ? "Update Customer" : "Add Customer"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-text-primary hover:bg-card"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="rounded-md border border-border bg-card">
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-text-primary">Customers ({filteredCustomers.length})</h2>
          <div className="mt-3 grid grid-cols-1 gap-2 lg:grid-cols-4">
            <input
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              placeholder="Search name, phone, tax, address..."
              className="rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary"
            />
            <select
              value={phoneFilter}
              onChange={(e) => {
                setPhoneFilter(e.target.value as "all" | "with-phone" | "without-phone");
                setPage(1);
              }}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary"
            >
              <option value="all">All Phone States</option>
              <option value="with-phone">With Phone</option>
              <option value="without-phone">Without Phone</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "name" | "phone" | "tax")}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary"
            >
              <option value="name">Sort By Name</option>
              <option value="phone">Sort By Phone</option>
              <option value="tax">Sort By Tax Registration</option>
            </select>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary"
            >
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          </div>
        </div>
        {filteredCustomers.length === 0 ? (
          <div className="p-8 text-center text-text-muted">
            <Users className="mx-auto h-12 w-12 text-text-muted/50" />
            <p className="mt-2">No customers found. Add your first customer to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border bg-surface/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">
                    Customer Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">
                    Phone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">
                    Tax Registration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">
                    Address
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-surface/30">
                    <td className="px-6 py-4">
                      <div className="font-medium text-text-primary">{customer.name}</div>
                    </td>
                    <td className="px-6 py-4 text-text-muted">
                      {customer.phone || "-"}
                    </td>
                    <td className="px-6 py-4 text-text-muted">
                      {customer.tax_registration_number || "-"}
                    </td>
                    <td className="px-6 py-4 text-text-muted max-w-xs truncate">
                      {customer.address || "-"}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(customer)}
                          className="text-text-muted hover:text-primary"
                          title="Edit customer"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(customer.id)}
                          className="text-red-600 hover:text-red-800"
                          title="Delete customer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {filteredCustomers.length > 0 ? (
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
        ) : null}
      </div>
    </div>
  );
}
