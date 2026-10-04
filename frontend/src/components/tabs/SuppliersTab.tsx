"use client";

import { useMemo, useState } from "react";
import { Toaster, toast } from "react-hot-toast";
import {
  Users,
  Search,
  Phone,
  Mail,
  MapPin,
  Building2,
  UserCircle,
  FileText,
  Edit,
  Trash2,
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import {
  useSuppliers,
  useCreateSupplier,
  useUpdateSupplier,
  useDeleteSupplier,
  type Supplier,
  type CreateSupplier,
  type UpdateSupplier,
} from "@/hooks/useSuppliers";
import { useDebounced } from "@/hooks/useDebounced";
import { SupplierModal } from "@/components/suppliers/SupplierModal";

const DeleteConfirmModal = ({
  closeModal,
  onConfirm,
  isSubmitting,
  supplierName,
}: {
  closeModal: () => void;
  onConfirm: () => void;
  isSubmitting: boolean;
  supplierName: string;
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl">
        <div className="p-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50">
            <Trash2 className="h-8 w-8 text-rose-500" />
          </div>
          <h3 className="mt-4 text-xl font-semibold text-slate-900">
            Delete Supplier
          </h3>
          <p className="mt-2 text-sm text-slate-500">
            Are you sure you want to delete{" "}
            <span className="font-semibold text-slate-700">{supplierName}</span>
            ? This action cannot be undone.
          </p>
        </div>
        <div className="flex gap-3 border-t border-slate-200 p-6">
          <button
            onClick={closeModal}
            className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isSubmitting}
            className="flex-1 rounded-xl bg-rose-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default function SuppliersPage() {
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounced(search, 300);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(
    null,
  );

  const [formData, setFormData] = useState<CreateSupplier>({
    supplier_name: "",
    email: "",
    phone: "",
    address: "",
    contact_person: "",
    contact_person_phone: "",
    tax_number: "",
    notes: "",
  });

  const {
    data: suppliersData,
    isLoading,
    error,
  } = useSuppliers(page, limit, debouncedSearch);
  const createSupplier = useCreateSupplier();
  const updateSupplier = useUpdateSupplier();
  const deleteSupplier = useDeleteSupplier();

  const suppliers = suppliersData?.data || [];
  const totalCount = suppliersData?.totalCount || 0;
  const totalPages =
    suppliersData?.totalPages || Math.ceil(totalCount / limit) || 1;

  const handleCreate = () => {
    setFormData({
      supplier_name: "",
      email: "",
      phone: "",
      address: "",
      contact_person: "",
      contact_person_phone: "",
      tax_number: "",
      notes: "",
    });
    setShowCreateModal(true);
  };

  const handleEdit = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setFormData({
      supplier_name: supplier.supplier_name,
      email: supplier.email || "",
      phone: supplier.phone || "",
      address: supplier.address || "",
      contact_person: supplier.contact_person || "",
      contact_person_phone: supplier.contact_person_phone || "",
      tax_number: supplier.tax_number || "",
      notes: supplier.notes || "",
    });
    setShowEditModal(true);
  };

  const handleDelete = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setShowDeleteModal(true);
  };

  const handleCreateSubmit = async () => {
    if (!formData.supplier_name?.trim()) {
      toast.error("Supplier name is required");
      return;
    }
    await createSupplier.mutateAsync(formData);
    setShowCreateModal(false);
  };

  const handleEditSubmit = async () => {
    if (!selectedSupplier || !formData.supplier_name?.trim()) return;
    const updateData: UpdateSupplier = {
      id: selectedSupplier.id,
      ...formData,
    };
    await updateSupplier.mutateAsync(updateData);
    setShowEditModal(false);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedSupplier) return;
    await deleteSupplier.mutateAsync(selectedSupplier.id);
    setShowDeleteModal(false);
  };

  if (error) {
    return (
      <div className="min-h-dvh bg-gradient-to-br from-slate-50 via-white to-slate-100/50 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-3xl border border-rose-200 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-rose-50">
              <AlertTriangle className="h-10 w-10 text-rose-400" />
            </div>
            <h3 className="mt-6 text-xl font-semibold text-slate-900">
              Failed to Load Suppliers
            </h3>
            <p className="mt-3 text-sm text-slate-500">
              Please check your connection and try again.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-dvh bg-gradient-to-br from-slate-50 via-white to-slate-100/50 p-6">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-6 rounded-3xl border border-gray-200 bg-white p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="rounded-2xl bg-slate-900 p-3">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  Suppliers
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  Manage your supplier information and contacts
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by name, email, phone..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100 sm:w-72"
                />
              </div>

              <button
                onClick={handleCreate}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                <Plus className="h-4 w-4" />
                Add Supplier
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-slate-900 p-2.5">
                  <Building2 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                    Total Suppliers
                  </p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    {totalCount}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-emerald-500 p-2.5">
                  <CheckCircle2 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                    Active Suppliers
                  </p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    {suppliersData?.stats?.active || 0}
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-red-500 p-2.5">
                  <X className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                    Inactive Suppliers
                  </p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    {suppliersData?.stats?.inactive || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Suppliers Table */}
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
            {isLoading ? (
              <div className="space-y-4 p-6">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="h-20 animate-pulse rounded-2xl bg-slate-100"
                  />
                ))}
              </div>
            ) : suppliers.length === 0 ? (
              <div className="p-12 text-center">
                <Building2 className="mx-auto h-12 w-12 text-slate-300" />
                <h3 className="mt-4 text-lg font-semibold text-slate-900">
                  {search ? "No matching suppliers found" : "No suppliers yet"}
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  {search
                    ? "Try adjusting your search term."
                    : "Click the 'Add Supplier' button to create your first supplier."}
                </p>
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden overflow-x-auto lg:block">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/50">
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Supplier
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Contact Info
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Contact Person
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Tax Number
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {suppliers.map((supplier) => (
                        <tr
                          key={supplier.id}
                          className="transition hover:bg-slate-50/50"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
                                <Building2 className="h-5 w-5 text-slate-600" />
                              </div>
                              <div>
                                <p className="font-medium text-slate-900">
                                  {supplier.supplier_name}
                                </p>
                                {supplier.address && (
                                  <p className="text-xs text-slate-500">
                                    {supplier.address.length > 50
                                      ? `${supplier.address.slice(0, 50)}...`
                                      : supplier.address}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="space-y-1">
                              {supplier.email && (
                                <div className="flex items-center gap-1.5 text-sm">
                                  <Mail className="h-3.5 w-3.5 text-slate-400" />
                                  <span className="text-slate-600">
                                    {supplier.email}
                                  </span>
                                </div>
                              )}
                              {supplier.phone && (
                                <div className="flex items-center gap-1.5 text-sm">
                                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                                  <span className="text-slate-600">
                                    {supplier.phone}
                                  </span>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {supplier.contact_person ? (
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5 text-sm">
                                  <UserCircle className="h-3.5 w-3.5 text-slate-400" />
                                  <span className="font-medium text-slate-700">
                                    {supplier.contact_person}
                                  </span>
                                </div>
                                {supplier.contact_person_phone && (
                                  <div className="flex items-center gap-1.5 text-sm pl-5">
                                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                                    <span className="text-slate-500 text-xs">
                                      {supplier.contact_person_phone}
                                    </span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-sm text-slate-400">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm font-mono text-slate-600">
                              {supplier.tax_number || "—"}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleEdit(supplier)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
                              >
                                <Edit className="h-3.5 w-3.5" />
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(supplier)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-600 transition hover:bg-rose-50"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="grid gap-4 p-4 lg:hidden">
                  {suppliers.map((supplier) => (
                    <div
                      key={supplier.id}
                      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
                            <Building2 className="h-6 w-6 text-slate-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-900">
                              {supplier.supplier_name}
                            </h3>
                            {supplier.address && (
                              <p className="text-sm text-slate-500 mt-0.5">
                                {supplier.address.length > 40
                                  ? `${supplier.address.slice(0, 40)}...`
                                  : supplier.address}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleEdit(supplier)}
                            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(supplier)}
                            className="rounded-lg p-2 text-rose-400 transition hover:bg-rose-50 hover:text-rose-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
                        {supplier.email && (
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="h-4 w-4 text-slate-400" />
                            <span className="text-slate-600">
                              {supplier.email}
                            </span>
                          </div>
                        )}
                        {supplier.phone && (
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="h-4 w-4 text-slate-400" />
                            <span className="text-slate-600">
                              {supplier.phone}
                            </span>
                          </div>
                        )}
                        {supplier.contact_person && (
                          <div className="flex items-center gap-2 text-sm">
                            <UserCircle className="h-4 w-4 text-slate-400" />
                            <span className="text-slate-600">
                              {supplier.contact_person}
                              {supplier.contact_person_phone &&
                                ` (${supplier.contact_person_phone})`}
                            </span>
                          </div>
                        )}
                        {supplier.tax_number && (
                          <div className="flex items-center gap-2 text-sm">
                            <FileText className="h-4 w-4 text-slate-400" />
                            <span className="text-slate-600 font-mono text-xs">
                              {supplier.tax_number}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4">
                    <div className="text-sm text-slate-500">
                      Showing {(page - 1) * limit + 1} to{" "}
                      {Math.min(page * limit, totalCount)} of {totalCount}{" "}
                      suppliers
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <div className="flex gap-1">
                        {Array.from(
                          { length: Math.min(5, totalPages) },
                          (_, i) => {
                            let pageNum;
                            if (totalPages <= 5) {
                              pageNum = i + 1;
                            } else if (page <= 3) {
                              pageNum = i + 1;
                            } else if (page >= totalPages - 2) {
                              pageNum = totalPages - 4 + i;
                            } else {
                              pageNum = page - 2 + i;
                            }
                            return (
                              <button
                                key={pageNum}
                                onClick={() => setPage(pageNum)}
                                className={`rounded-lg px-3 py-1.5 text-sm transition ${
                                  page === pageNum
                                    ? "bg-slate-900 text-white"
                                    : "text-slate-600 hover:bg-slate-100"
                                }`}
                              >
                                {pageNum}
                              </button>
                            );
                          },
                        )}
                      </div>
                      <button
                        onClick={() =>
                          setPage((p) => Math.min(totalPages, p + 1))
                        }
                        disabled={page === totalPages}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showCreateModal && (
        <SupplierModal
          closeModal={() => setShowCreateModal(false)}
          isEditMode={false}
        />
      )}

      {showEditModal && selectedSupplier && (
        <SupplierModal
          closeModal={() => setShowEditModal(false)}
          selectedSupplier={selectedSupplier}
          isEditMode={true}
        />
      )}

      {showDeleteModal && selectedSupplier && (
        <DeleteConfirmModal
          closeModal={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteConfirm}
          isSubmitting={deleteSupplier.isPending}
          supplierName={selectedSupplier.supplier_name}
        />
      )}
    </>
  );
}
