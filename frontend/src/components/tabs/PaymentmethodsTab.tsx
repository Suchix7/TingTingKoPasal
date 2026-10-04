"use client";

import { ChangeEvent, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  usePaymentMethods,
  useCreatePaymentMethod,
  useUpdatePaymentMethod,
  useDeletePaymentMethod,
  useAddPaymentMethodFunds,
  useWithdrawPaymentMethodFunds,
  useTransferPaymentMethodFunds,
  PaymentMethod,
} from "@/hooks/usePaymentMethods";
import {
  Upload,
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  ArrowLeftRight,
  DollarSign,
  MinusCircle,
} from "lucide-react";
import PaymentMethodModal from "@/components/payment-methods/modal";
import AddFundsModal from "@/components/payment-methods/add-funds-modal";
import WithdrawFundsModal from "@/components/payment-methods/withdraw-funds-modal";
import TransferFundsModal from "@/components/payment-methods/transfer-funds-modal";
import DeleteConfirmModal from "../layout/DeleteConfirmModal";

type FormState = {
  payment_method: string;
  type: string;
  qr_code: string;
  status: string;
  notes: string;
};

const initialForm: FormState = {
  payment_method: "",
  type: "",
  qr_code: "",
  status: "Active",
  notes: "",
};

export default function PaymentMethodsPage() {
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<FormState>(initialForm);
  const [dragActive, setDragActive] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Action modals state
  const [addFundsModal, setAddFundsModal] = useState<{
    open: boolean;
    method: any | null;
  }>({ open: false, method: null });
  const [withdrawFundsModal, setWithdrawFundsModal] = useState<{
    open: boolean;
    method: any | null;
  }>({ open: false, method: null });
  const [transferFundsModal, setTransferFundsModal] = useState<{
    open: boolean;
    fromMethod: any | null;
  }>({ open: false, fromMethod: null });

  const limit = 6;

  const { data, isLoading } = usePaymentMethods(page, limit);
  const createMutation = useCreatePaymentMethod();
  const updateMutation = useUpdatePaymentMethod();
  const deleteMutation = useDeletePaymentMethod();
  const addFundsMutation = useAddPaymentMethodFunds();
  const withdrawFundsMutation = useWithdrawPaymentMethodFunds();
  const transferFundsMutation = useTransferPaymentMethodFunds();

  const totalPages = data ? Math.ceil(data.totalCount / data.limit) : 1;
  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const methods = useMemo(() => data?.data ?? [], [data]);
  const [deleteConfirm, setDeleteConfirm] = useState<PaymentMethod | null>(
    null,
  );

  const resetForm = () => {
    setEditing(null);
    setForm(initialForm);
    setDragActive(false);
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (item: any) => {
    setEditing(item);
    setForm({
      payment_method: item.payment_method || "",
      type: item.type || "",
      qr_code: item.qr_code || "",
      status: item.status || "Active",
      notes: item.notes || "",
    });
    setOpen(true);
  };

  const closeModal = () => {
    if (isSubmitting) return;
    setOpen(false);
    resetForm();
  };

  const readFileAsBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleQrFile = async (file?: File) => {
    if (!file) return;

    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    const maxSizeInMb = 2;

    if (!allowedTypes.includes(file.type)) {
      toast.error("Please upload a PNG, JPG, or WEBP image.");
      return;
    }

    if (file.size > maxSizeInMb * 1024 * 1024) {
      toast.error("Image must be smaller than 2MB.");
      return;
    }

    try {
      const base64 = await readFileAsBase64(file);
      setForm((prev) => ({ ...prev, qr_code: base64 }));
      toast.success("QR image uploaded.");
    } catch {
      toast.error("Failed to read image.");
    }
  };

  const handleFileInputChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    await handleQrFile(file);
    e.target.value = "";
  };

  const validateForm = () => {
    if (!form.payment_method.trim()) {
      toast.error("Payment method name is required.");
      return false;
    }

    if (!form.type.trim()) {
      toast.error("Payment type is required.");
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    const payload = {
      ...form,
      payment_method: form.payment_method.trim(),
      type: form.type.trim(),
      notes: form.notes.trim(),
    };

    const promise = editing
      ? updateMutation.mutateAsync({
          ...editing,
          ...payload,
        })
      : createMutation.mutateAsync(payload);

    toast.promise(promise, {
      loading: editing
        ? "Updating payment method..."
        : "Creating payment method...",
      success: editing ? "Payment method updated." : "Payment method created.",
      error: editing
        ? "Failed to update payment method."
        : "Failed to create payment method.",
    });

    try {
      await promise;
      closeModal();
    } catch {
      toast.error(
        editing
          ? "Failed to update payment method."
          : "Failed to create payment method.",
      );
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm("Delete this payment method?");
    if (!confirmed) return;

    setDeletingId(id);

    const promise = deleteMutation.mutateAsync(id);

    toast.promise(promise, {
      loading: "Deleting payment method...",
      success: "Payment method deleted.",
      error: "Failed to delete payment method.",
    });

    try {
      await promise;
    } finally {
      setDeletingId(null);
    }
  };

  const handleAddFunds = async (
    paymentMethodId: string,
    amount: number,
    title?: string,
    notes?: string,
  ) => {
    const promise = addFundsMutation.mutateAsync({
      paymentMethodId,
      amount,
      title,
      notes,
    });

    toast.promise(promise, {
      loading: "Adding funds...",
      success: "Funds added successfully.",
      error: "Failed to add funds.",
    });

    try {
      await promise;
      setAddFundsModal({ open: false, method: null });
    } catch {
      toast.error("Failed to add funds.");
    }
  };

  const handleWithdrawFunds = async (
    paymentMethodId: string,
    amount: number,
    title?: string,
    notes?: string,
  ) => {
    const promise = withdrawFundsMutation.mutateAsync({
      paymentMethodId,
      amount,
      title,
      notes,
    });

    toast.promise(promise, {
      loading: "Withdrawing funds...",
      success: "Funds withdrawn successfully.",
      error: "Failed to withdraw funds.",
    });

    try {
      await promise;
      setWithdrawFundsModal({ open: false, method: null });
    } catch {
      toast.error("Failed to withdraw funds.");
    }
  };

  const handleTransferFunds = async (
    fromPaymentMethodId: string,
    toPaymentMethodId: string,
    amount: number,
    notes?: string,
  ) => {
    const promise = transferFundsMutation.mutateAsync({
      from_payment_method_id: fromPaymentMethodId,
      to_payment_method_id: toPaymentMethodId,
      amount,
      notes,
    });

    toast.promise(promise, {
      loading: "Transferring funds...",
      success: "Funds transferred successfully.",
      error: "Failed to transfer funds.",
    });

    try {
      await promise;
      setTransferFundsModal({ open: false, fromMethod: null });
    } catch {
      toast.error("Failed to transfer funds.");
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("np-NP", {
      style: "currency",
      currency: "NPR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const totalBalance = useMemo(
    () => methods.reduce((sum, m) => sum + (m.current_balance || 0), 0),
    [methods],
  );

  const totalInflow = useMemo(
    () => methods.reduce((sum, m) => sum + (m.total_in || 0), 0),
    [methods],
  );

  const totalOutflow = useMemo(
    () => methods.reduce((sum, m) => sum + (m.total_out || 0), 0),
    [methods],
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white">
      <div className="p-6">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Payment Methods
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage payment options and track balances across all methods.
            </p>
          </div>

          <div className="flex flex-col items-start md:flex-row md:items-center gap-3">
            <button
              onClick={() =>
                setTransferFundsModal({ open: true, fromMethod: null })
              }
              className="inline-flex cursor-pointer h-11 items-center gap-2 justify-center rounded-xl border border-neutral-200 bg-white px-5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 hover:border-neutral-300 active:scale-[0.98]"
            >
              <ArrowLeftRight className="h-4 w-4" />
              Transfer
            </button>
            <button
              onClick={openCreate}
              className="inline-flex cursor-pointer h-11 items-center gap-2 justify-center rounded-xl bg-neutral-900 px-5 text-sm font-medium text-white shadow-lg shadow-neutral-900/10 transition hover:bg-neutral-800 hover:shadow-neutral-900/20 active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" />
              Add payment method
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="mb-8 grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
                <Wallet className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-neutral-500">Total Balance</p>
                <p className="text-2xl font-semibold text-neutral-900">
                  {formatCurrency(totalBalance)}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-neutral-500">Total Inflow</p>
                <p className="text-2xl font-semibold text-blue-600">
                  {formatCurrency(totalInflow)}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50">
                <TrendingDown className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-neutral-500">Total Outflow</p>
                <p className="text-2xl font-semibold text-red-600">
                  {formatCurrency(totalOutflow)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <div className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm text-neutral-600">
            <span className="font-medium text-neutral-900">
              {data?.totalCount ?? 0}
            </span>{" "}
            methods
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
            <span className="font-medium">
              {methods.filter((item) => item.status === "Active").length}
            </span>{" "}
            active
          </div>
          <div className="rounded-xl border border-neutral-200 bg-neutral-100 px-4 py-2 text-sm text-neutral-600">
            <span className="font-medium">
              {methods.filter((item) => item.status === "Inactive").length}
            </span>{" "}
            inactive
          </div>
        </div>

        {/* Payment Method Cards */}
        {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="h-72 animate-pulse rounded-2xl bg-neutral-100"
              />
            ))}
          </div>
        ) : methods.length === 0 ? (
          <div className="rounded-3xl border border-neutral-200 bg-white px-6 py-16 text-center shadow-sm">
            <div className="mx-auto max-w-sm">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-100">
                <Wallet className="h-8 w-8 text-neutral-400" />
              </div>
              <h3 className="mt-6 text-base font-semibold text-neutral-900">
                No payment methods yet
              </h3>
              <p className="mt-2 text-sm text-neutral-500">
                Add your first payment method to start tracking balances and
                transactions.
              </p>
              <button
                onClick={openCreate}
                className="mt-6 inline-flex h-10 items-center gap-2 justify-center rounded-xl bg-neutral-900 px-4 text-sm font-medium text-white transition hover:bg-neutral-800"
              >
                <Plus className="h-4 w-4" />
                Add payment method
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {methods.map((item) => {
                const isDeleting = deletingId === item.id;

                return (
                  <div
                    key={item.id}
                    className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 transition-all hover:border-gray-300"
                  >
                    {/* Status Badge & Actions */}
                    <div className="mb-4 flex items-start justify-between">
                      <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
                        {item.qr_code ? (
                          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl border border-neutral-200 bg-white">
                            <img
                              src={item.qr_code}
                              alt={`${item.payment_method} QR`}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-100">
                            <Wallet className="h-6 w-6 text-neutral-400" />
                          </div>
                        )}
                        <div>
                          <h3 className="font-semibold text-neutral-900">
                            {item.payment_method}
                          </h3>
                          <span
                            className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                              item.type === "Cash"
                                ? "bg-green-100 text-green-700"
                                : "bg-blue-100 text-blue-700"
                            }`}
                          >
                            {item.type}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 lg:opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          onClick={() =>
                            setAddFundsModal({ open: true, method: item })
                          }
                          disabled={isDeleting || isSubmitting}
                          className="rounded-lg p-2 cursor-pointer text-neutral-400 transition hover:bg-emerald-50 hover:text-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
                          title="Add funds"
                        >
                          <DollarSign className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() =>
                            setWithdrawFundsModal({ open: true, method: item })
                          }
                          disabled={isDeleting || isSubmitting}
                          className="rounded-lg p-2 cursor-pointer text-neutral-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                          title="Withdraw funds"
                        >
                          <MinusCircle className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openEdit(item)}
                          disabled={isDeleting || isSubmitting}
                          className="rounded-lg p-2 cursor-pointer text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(item)}
                          disabled={isDeleting || isSubmitting}
                          className="rounded-lg p-2 cursor-pointer text-neutral-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isDeleting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Balance */}
                    <div className="mb-4">
                      <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
                        Current Balance
                      </p>
                      <p
                        className={`text-2xl font-bold ${
                          item.current_balance >= 0
                            ? "text-neutral-900"
                            : "text-red-600"
                        }`}
                      >
                        {formatCurrency(item.current_balance || 0)}
                      </p>
                    </div>

                    {/* In/Out Flow */}
                    <div className="mb-4 grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-emerald-50/50 p-3">
                        <div className="flex items-center gap-1 mb-1">
                          <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600" />
                          <p className="text-xs font-medium text-emerald-700">
                            Inflow
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-emerald-700">
                          {formatCurrency(item.total_in || 0)}
                        </p>
                      </div>
                      <div className="rounded-xl bg-red-50/50 p-3">
                        <div className="flex items-center gap-1 mb-1">
                          <ArrowDownRight className="h-3.5 w-3.5 text-red-600" />
                          <p className="text-xs font-medium text-red-700">
                            Outflow
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-red-700">
                          {formatCurrency(item.total_out || 0)}
                        </p>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between border-t border-neutral-100 pt-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={`flex items-center justify-center rounded-full px-3.5 py-1.5 text-xs font-medium ${
                            item.status === "Active"
                              ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200"
                              : "bg-neutral-100 text-neutral-600 ring-1 ring-inset ring-neutral-200"
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-400">
                        {item.transaction_count || 0} transactions
                      </p>
                    </div>

                    {/* Notes */}
                    {item.notes && (
                      <div className="mt-3 border-t border-neutral-100 pt-3">
                        <p className="text-xs text-neutral-500 line-clamp-2">
                          {item.notes}
                        </p>
                      </div>
                    )}

                    {/* Quick Action Buttons - Visible on Mobile */}
                    <div className="mt-4 flex gap-2 lg:hidden">
                      <button
                        onClick={() =>
                          setAddFundsModal({ open: true, method: item })
                        }
                        disabled={isDeleting || isSubmitting}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <DollarSign className="h-3.5 w-3.5" />
                        Add
                      </button>
                      <button
                        onClick={() =>
                          setWithdrawFundsModal({ open: true, method: item })
                        }
                        disabled={isDeleting || isSubmitting}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <MinusCircle className="h-3.5 w-3.5" />
                        Withdraw
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            <div className="mt-8 flex flex-col items-center justify-between gap-4 rounded-2xl border border-neutral-200 bg-white px-6 py-4 sm:flex-row">
              <p className="text-sm text-neutral-500">
                Showing page {page} of {totalPages}
              </p>

              <div className="flex items-center gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-neutral-200 px-4 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>

                <button
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-neutral-200 px-4 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Create/Edit Payment Method Modal */}
      {open && (
        <PaymentMethodModal
          setOpen={setOpen}
          closeModal={closeModal}
          editing={editing}
        />
      )}

      {/* Add Funds Modal */}
      {addFundsModal.open && addFundsModal.method && (
        <AddFundsModal
          isOpen={addFundsModal.open}
          onClose={() => setAddFundsModal({ open: false, method: null })}
          paymentMethod={addFundsModal.method}
          onSubmit={handleAddFunds}
          isSubmitting={addFundsMutation.isPending}
        />
      )}

      {/* Withdraw Funds Modal */}
      {withdrawFundsModal.open && withdrawFundsModal.method && (
        <WithdrawFundsModal
          isOpen={withdrawFundsModal.open}
          onClose={() => setWithdrawFundsModal({ open: false, method: null })}
          paymentMethod={withdrawFundsModal.method}
          onSubmit={handleWithdrawFunds}
          isSubmitting={withdrawFundsMutation.isPending}
        />
      )}

      {/* Transfer Funds Modal */}
      {transferFundsModal.open && (
        <TransferFundsModal
          isOpen={transferFundsModal.open}
          onClose={() =>
            setTransferFundsModal({ open: false, fromMethod: null })
          }
          paymentMethods={methods}
          preselectedFromMethod={transferFundsModal.fromMethod}
          onSubmit={handleTransferFunds}
          isSubmitting={transferFundsMutation.isPending}
        />
      )}

      {deleteConfirm && (
        <DeleteConfirmModal
          invoiceNo={deleteConfirm.payment_method}
          label="payment method"
          isPending={deleteMutation.isPending}
          onConfirm={async () => {
            try {
              await deleteMutation.mutateAsync(deleteConfirm.id);
              toast.success("Payment method deleted successfully");
              setDeleteConfirm(null);
            } catch {
              toast.error("Failed to delete payment method.");
            }
          }}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}
    </div>
  );
}
