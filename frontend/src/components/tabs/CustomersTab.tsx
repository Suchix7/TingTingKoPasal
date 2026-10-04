"use client";

import { useState, useMemo } from "react";
import {
  useCustomers,
  useCreateCustomer,
  useUpdateCustomer,
  useDeleteCustomer,
  Customer,
} from "@/hooks/useCustomers";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  UserPlus,
  Users,
  AlertCircle,
  Loader2,
  Filter,
  CheckCircle,
  DollarSign,
} from "lucide-react";
import CustomerModal from "@/components/customers/modal";
import { useDebounced } from "@/hooks/useDebounced";
import Pagination from "@/components/layout/Pagination";

const emptyCustomer: Omit<Customer, "id" | "created_at" | "updated_at"> = {
  name: "",
  phone: "",
  email: "",
  address: "",
  credit_amount: 0,
  credit_limit: 0,
  status: "Active",
  notes: "",
};

export default function CustomersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounced(search, 500);
  const [status, setStatus] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
  const [formData, setFormData] = useState(emptyCustomer);
  const [deleteConfirm, setDeleteConfirm] = useState<Customer | null>(null);

  const limit = 10;

  const { data, isLoading } = useCustomers(
    page,
    limit,
    debouncedSearch,
    status,
  );
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const deleteCustomer = useDeleteCustomer();

  const customers = data?.data || [];
  const totalCount = data?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / limit);

  const openCreateModal = () => {
    setSelectedCustomer(null);
    setFormData(emptyCustomer);
    setIsModalOpen(true);
  };

  const goToPage = (nextPage: number) => {
    setPage(Math.min(Math.max(nextPage, 1), totalPages));
  };

  const pageNumbers = useMemo(() => {
    const maxVisible = 5;
    let start = Math.max(1, page - Math.floor(maxVisible / 2));
    const end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }, [page, totalPages]);

  const openEditModal = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone || "",
      email: customer.email || "",
      address: customer.address || "",
      credit_amount: customer.credit_amount,
      credit_limit: customer.credit_limit,
      status: customer.status,
      notes: customer.notes || "",
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedCustomer) {
      await updateCustomer.mutateAsync({
        ...selectedCustomer,
        ...formData,
      });
    } else {
      await createCustomer.mutateAsync(formData);
    }

    setIsModalOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    await deleteCustomer.mutateAsync(deleteConfirm.id);
    setDeleteConfirm(null);
  };

  const getCreditStatus = (customer: Customer) => {
    if (customer.credit_limit === 0)
      return { color: "gray", label: "No Limit" };
    const percentage = (customer.credit_amount / customer.credit_limit) * 100;

    if (percentage >= 90) return { color: "red", label: "Critical" };
    if (percentage >= 70) return { color: "yellow", label: "Warning" };
    if (percentage >= 50) return { color: "blue", label: "Moderate" };
    return { color: "green", label: "Low" };
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Customers</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage your customers, track credit limits, and monitor
              outstanding balances
            </p>
          </div>

          <button
            onClick={openCreateModal}
            autoFocus
            className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white shadow-lg hover:bg-gray-800 transition-all active:scale-95"
          >
            <UserPlus className="h-4 w-4" />
            Add Customer
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Users className="h-5 w-5 text-gray-900" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Customers</p>
                <p className="text-2xl font-bold text-gray-900">{totalCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Active</p>
                <p className="text-2xl font-bold text-gray-900">
                  {data?.stats?.activeCustomers}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <DollarSign className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Credit</p>
                <p className="text-2xl font-bold text-gray-900">
                  Rs. {data?.stats?.totalCreditAmount}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-50 rounded-lg">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Over Limit</p>
                <p className="text-2xl font-bold text-gray-900">
                  {data?.stats?.overLimitCustomers}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by name, phone or email..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 transition-all text-sm"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <div className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm">
                <select
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value);
                    setPage(1);
                  }}
                  className="w-full outline-none"
                >
                  <option value="">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Credit Usage
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-50">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-8 w-8 text-gray-400 animate-spin" />
                        <p className="text-sm text-gray-500">
                          Loading customers...
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : customers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <Users className="h-12 w-12 text-gray-300" />
                        <div>
                          <p className="text-lg font-medium text-gray-500">
                            No customers found
                          </p>
                          <p className="text-sm text-gray-400 mt-1">
                            {search || status
                              ? "Try adjusting your filters"
                              : "Start by adding your first customer"}
                          </p>
                        </div>
                        {!search && !status && (
                          <button
                            onClick={openCreateModal}
                            className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-gray-900 hover:text-gray-700"
                          >
                            <Plus className="h-4 w-4" />
                            Add your first customer
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  customers.map((customer) => {
                    const creditPercentage =
                      customer.credit_limit > 0
                        ? Math.min(
                            (customer.credit_amount / customer.credit_limit) *
                              100,
                            100,
                          )
                        : 0;

                    const creditStatus = getCreditStatus(customer);

                    return (
                      <tr
                        key={customer.id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-semibold text-gray-900">
                              {customer.name}
                            </p>
                            {customer.address && (
                              <div className="flex items-center gap-1 mt-1">
                                <MapPin className="h-3 w-3 text-gray-400" />
                                <p className="text-xs text-gray-500 truncate max-w-xs">
                                  {customer.address}
                                </p>
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            {customer.phone && (
                              <div className="flex items-center gap-1.5">
                                <Phone className="h-3.5 w-3.5 text-gray-400" />
                                <p className="text-sm text-gray-600">
                                  {customer.phone}
                                </p>
                              </div>
                            )}
                            {customer.email && (
                              <div className="flex items-center gap-1.5">
                                <Mail className="h-3.5 w-3.5 text-gray-400" />
                                <p className="text-sm text-gray-600">
                                  {customer.email}
                                </p>
                              </div>
                            )}
                            {!customer.phone && !customer.email && (
                              <p className="text-sm text-gray-400">
                                No contact info
                              </p>
                            )}
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-1.5">
                                <CreditCard className="h-3.5 w-3.5 text-gray-400" />
                                <span className="font-medium text-gray-900">
                                  Rs. {customer.credit_amount.toLocaleString()}
                                </span>
                              </div>
                              <span className="text-xs text-gray-500">
                                / Rs. {customer.credit_limit.toLocaleString()}
                              </span>
                            </div>

                            {customer.credit_limit > 0 && (
                              <div className="space-y-1">
                                <div className="flex justify-between text-xs text-gray-500">
                                  <span>
                                    {Math.round(creditPercentage)}% used
                                  </span>
                                  <span
                                    className={`font-medium text-${creditStatus.color}-600`}
                                  >
                                    {creditStatus.label}
                                  </span>
                                </div>
                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-500 ${
                                      creditPercentage >= 90
                                        ? "bg-red-500"
                                        : creditPercentage >= 70
                                          ? "bg-yellow-500"
                                          : creditPercentage >= 50
                                            ? "bg-blue-500"
                                            : "bg-green-500"
                                    }`}
                                    style={{ width: `${creditPercentage}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
                              customer.status === "Active"
                                ? "bg-green-50 text-green-700 ring-1 ring-green-600/20"
                                : "bg-gray-50 text-gray-600 ring-1 ring-gray-500/20"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                customer.status === "Active"
                                  ? "bg-green-500"
                                  : "bg-gray-400"
                              }`}
                            />
                            {customer.status}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => openEditModal(customer)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-100 border border-gray-200 transition-colors"
                            >
                              <Edit className="h-3.5 w-3.5" />
                              Edit
                            </button>

                            <button
                              onClick={() => setDeleteConfirm(customer)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 border border-red-200 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            page={page}
            totalPages={totalPages}
            goToPage={goToPage}
            pageNumbers={pageNumbers}
          />
        </div>
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <CustomerModal
          selectedCustomer={selectedCustomer}
          setIsModalOpen={setIsModalOpen}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-50 rounded-lg">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">
                Delete Customer
              </h3>
            </div>

            <p className="text-gray-600 mb-2">
              Are you sure you want to delete{" "}
              <span className="font-semibold">{deleteConfirm.name}</span>?
            </p>
            <p className="text-sm text-gray-500 mb-6">
              This action cannot be undone. All associated data will be
              permanently removed.
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteCustomer.isPending}
                className="px-4 py-2 rounded-xl bg-red-600 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors inline-flex items-center gap-2"
              >
                {deleteCustomer.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Delete Customer
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
