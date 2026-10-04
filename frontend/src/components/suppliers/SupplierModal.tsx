"use client";

import { useState, useEffect } from "react";
import {
  useCreateSupplier,
  useUpdateSupplier,
  type Supplier,
  type CreateSupplier,
  type UpdateSupplier,
} from "@/hooks/useSuppliers";
import {
  FileText,
  Mail,
  MapPin,
  Phone,
  UserCircle,
  Users,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

export const SupplierModal = ({
  selectedSupplier,
  closeModal,
  isEditMode = false,
}: {
  selectedSupplier?: Supplier;
  closeModal: () => void;
  isEditMode?: boolean;
}) => {
  const [formData, setFormData] = useState<CreateSupplier>({
    supplier_name: "",
    email: "",
    phone: "",
    address: "",
    contact_person: "",
    tax_number: "",
    notes: "",
  });

  useEffect(() => {
    if (selectedSupplier && isEditMode) {
      setFormData({
        supplier_name: selectedSupplier.supplier_name,
        email: selectedSupplier.email || "",
        phone: selectedSupplier.phone || "",
        address: selectedSupplier.address || "",
        contact_person: selectedSupplier.contact_person || "",
        tax_number: selectedSupplier.tax_number || "",
        notes: selectedSupplier.notes || "",
      });
    } else if (!isEditMode) {
      setFormData({
        supplier_name: "",
        email: "",
        phone: "",
        address: "",
        contact_person: "",
        tax_number: "",
        notes: "",
      });
    }
  }, [selectedSupplier, isEditMode]);

  const createSupplier = useCreateSupplier();
  const updateSupplier = useUpdateSupplier();

  const handleCreateSubmit = async () => {
    if (!formData.supplier_name?.trim()) {
      toast.error("Supplier name is required");
      return;
    }
    try {
      await createSupplier.mutateAsync(formData);
      closeModal();
    } catch (error) {
      toast.error("Failed to create supplier");
      console.error(error);
    }
  };

  const handleEditSubmit = async () => {
    if (!isEditMode || !formData.supplier_name?.trim()) {
      toast.error("Supplier name is required");
      return;
    }

    const updateData: UpdateSupplier = {
      id: selectedSupplier?.id || "",
      ...formData,
    };

    try {
      await updateSupplier.mutateAsync(updateData);
      closeModal();
    } catch (error) {
      toast.error("Failed to update supplier");
      console.error(error);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const isPending = createSupplier.isPending || updateSupplier.isPending;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          closeModal();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
    >
      <div className="max-h-[85vh] overflow-y-auto w-full max-w-2xl rounded-3xl bg-white shadow-2xl">
        <div className="z-100 sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-slate-900 p-2">
              <Users className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900">
              {isEditMode ? "Edit Supplier" : "Add New Supplier"}
            </h2>
          </div>
          <button
            onClick={closeModal}
            className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-6">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Supplier Name *
            </label>
            <input
              type="text"
              name="supplier_name"
              value={formData.supplier_name}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              placeholder="Enter supplier name"
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Contact Person
            </label>
            <div className="relative">
              <UserCircle className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                name="contact_person"
                value={formData.contact_person || ""}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                placeholder="Person to contact"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email || ""}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                  placeholder="supplier@example.com"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Phone
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone || ""}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                  placeholder="+1 234 567 8900"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Address
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <textarea
                name="address"
                value={formData.address || ""}
                onChange={handleChange}
                rows={2}
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                placeholder="Full address"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Tax Number / GST
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                name="tax_number"
                value={formData.tax_number || ""}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                placeholder="GST/VAT number"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes || ""}
              onChange={handleChange}
              rows={3}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              placeholder="Additional notes about the supplier..."
            />
          </div>
        </div>

        <div className="flex gap-3 border-t border-slate-200 p-6">
          <button
            type="button"
            onClick={closeModal}
            className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={isEditMode ? handleEditSubmit : handleCreateSubmit}
            disabled={isPending || !formData.supplier_name?.trim()}
            className="flex-1 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? "Saving..." : isEditMode ? "Update" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
};
