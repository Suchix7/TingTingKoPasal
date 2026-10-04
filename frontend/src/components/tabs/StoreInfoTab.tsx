"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useStore, useCreateStore, useUpdateStore } from "@/hooks/useStoreInfo";
import {
  Store,
  MapPin,
  Phone,
  FileText,
  Loader2,
  Save,
  Building2,
} from "lucide-react";

type FormState = {
  store_name: string;
  address: string;
  phone: string;
  pan_vat_number: string;
};

const initialForm: FormState = {
  store_name: "",
  address: "",
  phone: "",
  pan_vat_number: "",
};

export default function StorePage() {
  const { data: storeData, isLoading } = useStore();
  const createMutation = useCreateStore();
  const updateMutation = useUpdateStore();

  const [form, setForm] = useState<FormState>(initialForm);
  const [hasChanges, setHasChanges] = useState(false);

  const store = storeData?.data;
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  // Populate form when store data loads
  useEffect(() => {
    if (store) {
      setForm({
        store_name: store.store_name || "",
        address: store.address || "",
        phone: store.phone || "",
        pan_vat_number: store.pan_vat_number || "",
      });
    }
  }, [store]);

  const handleInputChange = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const validateForm = () => {
    if (!form.store_name.trim()) {
      toast.error("Store name is required.");
      return false;
    }

    if (!form.address.trim()) {
      toast.error("Address is required.");
      return false;
    }

    if (!form.phone.trim()) {
      toast.error("Phone number is required.");
      return false;
    }

    if (!form.pan_vat_number.trim()) {
      toast.error("PAN/VAT number is required.");
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    const payload = {
      store_name: form.store_name.trim(),
      address: form.address.trim(),
      phone: form.phone.trim(),
      pan_vat_number: form.pan_vat_number.trim(),
    };

    const promise = store
      ? updateMutation.mutateAsync(payload)
      : createMutation.mutateAsync(payload);

    toast.promise(promise, {
      loading: store ? "Updating store information..." : "Creating store...",
      success: store ? "Store information updated." : "Store created.",
      error: store
        ? "Failed to update store information."
        : "Failed to create store.",
    });

    try {
      await promise;
      setHasChanges(false);
    } catch {
      toast.error(
        store
          ? "Failed to update store information."
          : "Failed to create store.",
      );
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-dvh bg-gradient-to-b from-neutral-50 to-white p-6">
        <div className="mx-auto max-w-3xl">
          <div className="mb-8">
            <div className="h-8 w-64 animate-pulse rounded-lg bg-neutral-200" />
            <div className="mt-2 h-4 w-96 animate-pulse rounded-lg bg-neutral-200" />
          </div>
          <div className="animate-pulse rounded-2xl bg-neutral-100 p-8">
            <div className="space-y-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 w-32 rounded bg-neutral-200" />
                  <div className="h-12 rounded-xl bg-neutral-200" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-gradient-to-b from-neutral-50 to-white">
      <div className="p-6">
        <div>
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-900">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Store Information
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  Manage your store details and business information.
                </p>
              </div>
            </div>
          </div>

          {/* Store Form */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-8 py-6">
              <h2 className="text-lg font-semibold text-neutral-900">
                Business Details
              </h2>
              <p className="mt-1 text-sm text-neutral-500">
                This information will appear on invoices and reports.
              </p>
            </div>

            <div className="space-y-6 px-8 py-6">
              {/* Store Name */}
              <div className="space-y-2">
                <label
                  htmlFor="store_name"
                  className="block text-sm font-medium text-neutral-700"
                >
                  Store Name
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Store className="h-5 w-5 text-neutral-400" />
                  </div>
                  <input
                    id="store_name"
                    type="text"
                    value={form.store_name}
                    onChange={(e) =>
                      handleInputChange("store_name", e.target.value)
                    }
                    placeholder="Enter store name"
                    className="block w-full rounded-xl border border-neutral-200 bg-white py-3 pl-10 pr-4 text-sm text-neutral-900 placeholder-neutral-400 transition focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-100"
                  />
                </div>
              </div>

              {/* Address */}
              <div className="space-y-2">
                <label
                  htmlFor="address"
                  className="block text-sm font-medium text-neutral-700"
                >
                  Address
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <MapPin className="h-5 w-5 text-neutral-400" />
                  </div>
                  <input
                    id="address"
                    type="text"
                    value={form.address}
                    onChange={(e) =>
                      handleInputChange("address", e.target.value)
                    }
                    placeholder="Enter store address"
                    className="block w-full rounded-xl border border-neutral-200 bg-white py-3 pl-10 pr-4 text-sm text-neutral-900 placeholder-neutral-400 transition focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-100"
                  />
                </div>
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <label
                  htmlFor="phone"
                  className="block text-sm font-medium text-neutral-700"
                >
                  Phone Number
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Phone className="h-5 w-5 text-neutral-400" />
                  </div>
                  <input
                    id="phone"
                    type="tel"
                    value={form.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    placeholder="Enter phone number"
                    className="block w-full rounded-xl border border-neutral-200 bg-white py-3 pl-10 pr-4 text-sm text-neutral-900 placeholder-neutral-400 transition focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-100"
                  />
                </div>
              </div>

              {/* PAN/VAT Number */}
              <div className="space-y-2">
                <label
                  htmlFor="pan_vat_number"
                  className="block text-sm font-medium text-neutral-700"
                >
                  PAN/VAT Number
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <FileText className="h-5 w-5 text-neutral-400" />
                  </div>
                  <input
                    id="pan_vat_number"
                    type="text"
                    value={form.pan_vat_number}
                    onChange={(e) =>
                      handleInputChange("pan_vat_number", e.target.value)
                    }
                    placeholder="Enter PAN/VAT number"
                    className="block w-full rounded-xl border border-neutral-200 bg-white py-3 pl-10 pr-4 text-sm text-neutral-900 placeholder-neutral-400 transition focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-100"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-gray-100 bg-neutral-50 px-8 py-4 rounded-b-2xl">
              <div className="text-sm text-neutral-500">
                {store ? (
                  <>
                    Last updated:{" "}
                    {store.updated_at
                      ? new Date(store.updated_at).toLocaleDateString()
                      : "Never"}
                  </>
                ) : (
                  "No store information yet"
                )}
              </div>

              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !hasChanges}
                className="inline-flex h-11 cursor-pointer items-center gap-2 justify-center rounded-xl bg-neutral-900 px-6 text-sm font-medium text-white shadow-lg shadow-neutral-900/10 transition hover:bg-neutral-800 hover:shadow-neutral-900/20 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {store ? "Saving..." : "Creating..."}
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    {store ? "Save Changes" : "Create Store"}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
