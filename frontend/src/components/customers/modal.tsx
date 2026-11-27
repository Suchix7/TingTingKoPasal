"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { useLang } from "@/lib/i18n";
import {
  useCreateCustomer,
  useUpdateCustomer,
  useDeleteCustomer,
  Customer,
} from "@/hooks/useCustomers";

import {
  Edit,
  Phone,
  Mail,
  MapPin,
  UserPlus,
  X,
  Loader,
  DollarSign,
  BarChart3,
  Trash2,
  AlertTriangle,
} from "lucide-react";

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

type CustomerModalProps = {
  selectedCustomer: Customer | null;
  setIsModalOpen: (open: boolean) => void;
  // Called with the saved customer after a successful create / update
  onSaved?: (customer: Customer, isNew: boolean) => void;
  // Called when the customer is deleted
  onDeleted?: (customerId: string) => void;
};

export default function CustomerModal({
  selectedCustomer,
  setIsModalOpen,
  onSaved,
  onDeleted,
}: CustomerModalProps) {
  const { t } = useLang();
  const [formData, setFormData] = useState(emptyCustomer);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const deleteCustomer = useDeleteCustomer();

  useEffect(() => {
    if (selectedCustomer) {
      setFormData({
        name: selectedCustomer.name,
        phone: selectedCustomer.phone || "",
        email: selectedCustomer.email || "",
        address: selectedCustomer.address || "",
        credit_amount: selectedCustomer.credit_amount,
        credit_limit: selectedCustomer.credit_limit,
        status: selectedCustomer.status,
        notes: selectedCustomer.notes || "",
      });
    }
  }, [selectedCustomer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (createCustomer.isPending || updateCustomer.isPending) return;

    try {
      const res = selectedCustomer
        ? await updateCustomer.mutateAsync({ ...selectedCustomer, ...formData })
        : await createCustomer.mutateAsync(formData);

      toast.success(
        selectedCustomer ? t("Customer updated") : t("Customer created"),
      );
      if (res?.data) onSaved?.(res.data as Customer, !selectedCustomer);
      setIsModalOpen(false);
    } catch (err: any) {
      // Keep the form open so nothing typed is lost, and say why it failed
      toast.error(
        err?.response?.data?.message || t("Could not save the customer"),
      );
    }
  };
  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setIsModalOpen(false);
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-2 sm:p-4"
    >
      <div className="w-full max-h-[94dvh] sm:max-h-[90dvh] overflow-y-auto max-w-2xl bg-white rounded-xl sm:rounded-2xl shadow-2xl transform transition-all">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-100">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-slate-100 rounded-lg">
              {selectedCustomer ? (
                <Edit className="h-4 w-4 sm:h-5 sm:w-5 text-slate-900" />
              ) : (
                <UserPlus className="h-4 w-4 sm:h-5 sm:w-5 text-slate-900" />
              )}
            </div>
            <div>
              <h2 className="text-base sm:text-xl font-bold text-slate-900">
                {selectedCustomer ? t("Edit Customer") : t("Add New Customer")}
              </h2>
              <p className="text-2xs sm:text-sm text-slate-500 mt-0.5">
                {selectedCustomer
                  ? t("Update customer information")
                  : t("Fill in the details to add a new customer")}
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsModalOpen(false)}
            className="p-1.5 sm:p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="h-4 w-4 sm:h-5 sm:w-5 text-slate-500" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6">
          <div className="grid gap-4 sm:gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1.5">
                {t("Customer Name")} <span className="text-red-500">*</span>
              </label>
              <input
                required
                placeholder={t("Enter customer name")}
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full rounded-xl border border-slate-200 bg-slate-50 focus:bg-white px-3 py-2.5 sm:px-4 sm:py-3 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1.5">
                {t("Phone")}
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-400" />
                <input
                  placeholder={t("Phone number")}
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2.5 sm:py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs sm:text-sm outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1.5">
                {t("Email")}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-400" />
                <input
                  type="email"
                  placeholder={t("Email address")}
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2.5 sm:py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs sm:text-sm outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1.5">
                {t("Status")}
              </label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    status: e.target.value as "Active" | "Inactive",
                  })
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 sm:px-4 sm:py-3 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
              >
                <option value="Active">{t("Active")}</option>
                <option value="Inactive">{t("Inactive")}</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1.5">
                {t("Address")}
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-400" />
                <textarea
                  placeholder={t("Customer address")}
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  rows={2}
                  className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2.5 sm:py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs sm:text-sm outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all resize-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1.5">
                {t("Current Credit")}
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-400" />
                <input
                  type="number"
                  min="0"
                  placeholder="0.00"
                  value={formData.credit_amount}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      credit_amount: Number(e.target.value),
                    })
                  }
                  className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2.5 sm:py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs sm:text-sm outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1.5">
                {t("Credit Limit")}
              </label>
              <div className="relative">
                <BarChart3 className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-400" />
                <input
                  type="number"
                  min="0"
                  placeholder="0.00"
                  value={formData.credit_limit}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      credit_limit: Number(e.target.value),
                    })
                  }
                  className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2.5 sm:py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs sm:text-sm outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
                  required
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1.5">
                {t("Notes")}
              </label>
              <textarea
                placeholder={t("Additional notes about this customer")}
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                rows={3}
                className="w-full px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs sm:text-sm outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all resize-none"
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div className="mt-6 sm:mt-8 flex flex-wrap items-center justify-between gap-3 pt-4 sm:pt-6 border-t border-slate-100">
            {selectedCustomer ? (
              confirmDelete ? (
                <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-red-600 shrink-0" />
                  <span className="text-xs text-red-700 font-medium">
                    {t("Delete this customer?")}
                  </span>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await deleteCustomer.mutateAsync(selectedCustomer.id);
                        toast.success(t("Customer deleted successfully"));
                        onDeleted?.(selectedCustomer.id);
                        setIsModalOpen(false);
                      } catch (err: any) {
                        toast.error(
                          err?.response?.data?.message ||
                            t("Failed to delete customer"),
                        );
                      }
                    }}
                    disabled={deleteCustomer.isPending}
                    className="px-2.5 py-1 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition"
                  >
                    {deleteCustomer.isPending ? t("Deleting...") : t("Yes, Delete")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="px-2 py-1 rounded-lg border border-slate-300 text-slate-600 text-xs hover:bg-slate-50"
                  >
                    {t("Cancel")}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="px-3 py-2 rounded-xl text-xs font-medium text-red-600 hover:bg-red-50 border border-red-200 transition-colors inline-flex items-center gap-1.5"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {t("Delete Customer")}
                </button>
              )
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                disabled={
                  createCustomer.isPending ||
                  updateCustomer.isPending ||
                  deleteCustomer.isPending
                }
                className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                {t("Cancel")}
              </button>

              <button
                type="submit"
                disabled={
                  createCustomer.isPending ||
                  updateCustomer.isPending ||
                  deleteCustomer.isPending
                }
                className="px-4 py-2 sm:px-6 sm:py-2.5 rounded-xl bg-slate-900 text-xs sm:text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50 transition-all inline-flex items-center gap-2"
              >
                {createCustomer.isPending || updateCustomer.isPending ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin" />
                    {t("Saving...")}
                  </>
                ) : selectedCustomer ? (
                  t("Update Customer")
                ) : (
                  t("Create Customer")
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
