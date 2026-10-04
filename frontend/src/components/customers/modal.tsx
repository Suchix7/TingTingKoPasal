"use client";

import { useState, useEffect } from "react";
import {
  useCustomers,
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

export default function CustomerModal({
  selectedCustomer,
  setIsModalOpen,
}: any) {
  const [formData, setFormData] = useState(emptyCustomer);
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();

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
  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setIsModalOpen(false);
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
    >
      <div className="w-full max-h-[90dvh] overflow-y-auto max-w-2xl bg-white rounded-2xl shadow-2xl transform transition-all">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              {selectedCustomer ? (
                <Edit className="h-5 w-5 text-gray-900" />
              ) : (
                <UserPlus className="h-5 w-5 text-gray-900" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {selectedCustomer ? "Edit Customer" : "Add New Customer"}
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {selectedCustomer
                  ? "Update customer information"
                  : "Fill in the details to add a new customer"}
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsModalOpen(false)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Customer Name <span className="text-red-500">*</span>
              </label>
              <input
                required
                placeholder="Enter customer name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full rounded-xl border border-gray-200 bg-gray-50 focus:bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  placeholder="Phone number"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white text-sm outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="email"
                  placeholder="Email address"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white text-sm outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    status: e.target.value as "Active" | "Inactive",
                  })
                }
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <textarea
                  placeholder="Customer address"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  rows={2}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white text-sm outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 transition-all resize-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Credit
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
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
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white text-sm outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Credit Limit
              </label>
              <div className="relative">
                <BarChart3 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
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
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white text-sm outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 transition-all"
                  required
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                placeholder="Additional notes about this customer"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white text-sm outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 transition-all resize-none"
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={createCustomer.isPending || updateCustomer.isPending}
              className="px-6 py-2.5 rounded-xl bg-gray-900 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 transition-all inline-flex items-center gap-2"
            >
              {createCustomer.isPending || updateCustomer.isPending ? (
                <>
                  <Loader className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : selectedCustomer ? (
                "Update Customer"
              ) : (
                "Create Customer"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
