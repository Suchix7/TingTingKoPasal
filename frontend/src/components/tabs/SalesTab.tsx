"use client";

import { useMemo, useState, useEffect } from "react";
import {
  Camera,
  CreditCard,
  Eye,
  FileText,
  Loader2,
  Package,
  Printer,
  Receipt,
  Search,
  Trash2,
  TrendingUp,
  Edit,
  Undo2,
} from "lucide-react";
import toast from "react-hot-toast";

import {
  Sale,
  useDeleteSale,
  useRevokeSale,
  useSales,
  useSaleItems,
  SaleItem,
} from "@/hooks/useSales";
import {
  SalePayment as FullSalePayment,
  useSalePayments,
} from "@/hooks/useSalePayments";
import { useStore } from "@/hooks/useStoreInfo";
import DeleteConfirmModal from "@/components/layout/DeleteConfirmModal";
import SaleDetailsModal from "@/components/sales/SaleDetailsModal";
import EditSaleModal from "@/components/sales/EditSaleModal";
import ReceiptPrinter, { ReceiptData } from "@/components/pos/ReceiptPrinter";
import { prepareReceiptData } from "@/utils/receiptHelper";
import { useDebounced } from "@/hooks/useDebounced";
import Pagination from "@/components/layout/Pagination";
import { StatCardsSkeleton, TableRowsSkeleton, Skeleton } from "@/components/layout/Skeleton";
import { dateTime } from "@/utils/nepaliTime";
import axiosInstance from "@/lib/axiosInstance";
import { useLang, tr } from "@/lib/i18n";

const LIMIT = 20;

type PaymentStatus = Sale["payment_status"];
type SaleStatus = Sale["sale_status"];

const money = (value?: number | null) =>
  new Intl.NumberFormat("en-NP", {
    style: "currency",
    currency: "NPR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const paymentStatusClass: Record<PaymentStatus, string> = {
  Paid: "bg-green-100 text-green-700 border-green-200",
  Partial: "bg-yellow-100 text-yellow-700 border-yellow-200",
  Unpaid: "bg-red-100 text-red-700 border-red-200",
  Refunded: "bg-blue-100 text-blue-700 border-blue-200",
  Cancelled: "bg-red-100 text-red-700 border-red-200",
};

const saleStatusClass: Record<SaleStatus, string> = {
  Completed: "bg-blue-100 text-blue-700 border-blue-200",
  Cancelled: "bg-red-100 text-red-700 border-red-200",
  Returned: "bg-purple-100 text-purple-700 border-purple-200",
};

type SalePaymentLite = Sale["payments"][number];
type AnySalePayment = SalePaymentLite | FullSalePayment;

const getPaymentLabel = (payment: AnySalePayment) => {
  if ("payment_method" in payment && payment.payment_method) {
    return payment.payment_method;
  }

  if ("type" in payment && payment.type) {
    return payment.type;
  }

  return `${tr("Method")} #${payment.payment_method_id}`;
};

function StatusBadge({
  children,
  className,
}: {
  children: string;
  className: string;
}) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}
    >
      {children}
    </span>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  subtitle,
}: {
  title: string;
  value: string | number;
  icon: typeof Receipt;
  subtitle?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
          {subtitle ? (
            <p className="mt-1 text-xs text-gray-500">{subtitle}</p>
          ) : null}
        </div>
        <div className="rounded-xl bg-gray-100 p-3 text-gray-700">
          <Icon size={22} />
        </div>
      </div>
    </div>
  );
}

function PaymentsPreview({ payments }: { payments?: AnySalePayment[] }) {
  const { t } = useLang();
  if (!payments?.length) {
    return <span className="text-sm text-gray-400">{t("No payments")}</span>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {payments.slice(0, 2).map((payment, index) => (
        <span
          key={`${payment.payment_method_id}-${index}`}
          className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700"
        >
          <CreditCard size={13} />
          {getPaymentLabel(payment)} · {money(payment.amount)}
        </span>
      ))}

      {payments.length > 2 ? (
        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500">
          +{payments.length - 2} {t("more")}
        </span>
      ) : null}
    </div>
  );
}

export default function SalesPage() {
  const { t } = useLang();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounced(search, 500);
  const [paymentStatus, setPaymentStatus] = useState<"All" | PaymentStatus>(
    "All",
  );
  const [saleStatus, setSaleStatus] = useState<"All" | SaleStatus>("All");
  const [selectedSaleId, setSelectedSaleId] = useState<string | undefined>();
  const [deleteConfirm, setDeleteConfirm] = useState<Sale | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<Sale | null>(null);
  const [revokeReason, setRevokeReason] = useState("");
  const [printSale, setPrintSale] = useState<Sale | null>(null);
  const [printSaleItems, setPrintSaleItems] = useState<any[]>([]);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [printingId, setPrintingId] = useState<string | null>(null);

  const { data, isLoading, isFetching } = useSales(
    page,
    LIMIT,
    debouncedSearch,
    paymentStatus === "All" ? "" : paymentStatus,
    saleStatus === "All" ? "" : saleStatus,
  );
  const { data: allPaymentsData } = useSalePayments(page, LIMIT);
  const { data: storeData } = useStore();
  const store = storeData?.data || null;
  const deleteSale = useDeleteSale();
  const revokeSale = useRevokeSale();

  const sales = data?.data || [];
  const salePayments = allPaymentsData?.data || [];
  const totalCount = data?.totalCount || 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / LIMIT));
  const [editSale, setEditSale] = useState<Sale | null>(null);
  const [editSaleId, setEditSaleId] = useState<string | undefined>();
  const { data: editSaleItemsData } = useSaleItems(editSaleId);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, paymentStatus, saleStatus]);

  const handleEditSale = (sale: Sale) => {
    setEditSale(sale);
    setEditSaleId(sale.id);
  };

  const handleRevoke = async () => {
    if (!revokeTarget) return;

    try {
      await revokeSale.mutateAsync({
        saleId: revokeTarget.id,
        reason: revokeReason.trim(),
      });
      toast.success(t("Sale revoked. Stock restored and payments reversed."));
      setRevokeTarget(null);
      setRevokeReason("");
    } catch {
      // error toast is shown by the mutation
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;

    try {
      await deleteSale.mutateAsync(deleteConfirm.id);
      toast.success(t("Sale deleted successfully."));
      setDeleteConfirm(null);
    } catch {
      toast.error(t("Failed to delete sale."));
    }
  };

  const handlePrintReceipt = async (sale: Sale) => {
    if (printingId) return;
    setPrintingId(sale.id);
    try {
      toast.loading(t("Preparing receipt..."));

      const res = await axiosInstance.get<{
        success: boolean;
        data: SaleItem[];
      }>("/sales/items/all", {
        params: { sale_id: sale.id },
      });

      const saleItemsData = res.data;

      if (!saleItemsData?.data) {
        toast.error(t("Failed to load sale items."));
        return;
      }

      // Get payments for this sale
      const salePaymentsList = sale.payments?.length
        ? sale.payments
        : salePayments.filter((p) => p.sale_id === sale.id);

      // Use prepareReceiptData helper with store info
      const receiptData = prepareReceiptData(
        sale.invoice_no,
        saleItemsData.data.map((item: any) => ({
          product_id: item.id,
          product_name: item.product_name,
          sku: item.sku,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_amount: item.discount_amount || 0,
          tax_amount: item.tax_amount || 0,
          total_price: item.total_price,
        })),
        salePaymentsList.map((payment: AnySalePayment) => ({
          payment_method_id: payment.payment_method_id,
          amount: Number(payment.amount || 0),
        })),
        [],
        {
          subtotal: sale.subtotal || 0,
          discountAmount: sale.discount_amount || 0,
          taxAmount: sale.tax_amount || 0,
          grandTotal: sale.grand_total || 0,
          paidAmount: sale.paid_amount || 0,
          changeAmount: sale.change_amount || 0,
          remainingAmount: sale.remaining_amount || 0,
        },
        {
          customerName: sale.customer_name || undefined,
          customerPhone: sale.customer_phone || undefined,
          notes: sale.notes || undefined,
          store,
        },
      );

      setReceiptData(receiptData);
      setShowReceipt(true);
      toast.dismiss();
    } catch (error) {
      console.error("Error preparing receipt:", error);
      toast.error(t("Failed to prepare receipt."));
    } finally {
      setPrintingId(null);
    }
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

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t("Sales")}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {t("View all sales, invoices, and sale payments.")}
          </p>
        </div>
      </div>

      {isLoading ? (
        <StatCardsSkeleton className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4" />
      ) : (
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t("Total Profit")}
          value={money(data?.stats?.totalProfit)}
          icon={TrendingUp}
          subtitle={t("Completed filtered sales")}
        />
        <StatCard
          title={t("Paid")}
          value={money(data?.stats?.totalPaid)}
          icon={CreditCard}
          subtitle={t("Collected amount")}
        />
        <StatCard
          title={t("Remaining")}
          value={money(data?.stats?.totalRemaining)}
          icon={FileText}
          subtitle={t("Receivable amount")}
        />
        <StatCard
          title={t("Due Sales")}
          value={data?.stats?.partialOrUnpaid || 0}
          icon={Package}
          subtitle={t("Partial or unpaid")}
        />
      </div>
      )}

      <div className="rounded-2xl border border-gray-200 bg-white p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_180px_180px]">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("Search invoice, customer, or phone...")}
              className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-gray-400"
            />
          </div>

          <div className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none">
            <select
              value={paymentStatus}
              onChange={(event) =>
                setPaymentStatus(event.target.value as "All" | PaymentStatus)
              }
              className="w-full outline-none"
            >
              <option value="All">{t("All Payments")}</option>
              <option value="Paid">{t("Paid")}</option>
              <option value="Partial">{t("Partial")}</option>
              <option value="Unpaid">{t("Unpaid")}</option>
            </select>
          </div>

          <div className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-gray-400">
            <select
              value={saleStatus}
              onChange={(event) =>
                setSaleStatus(event.target.value as "All" | SaleStatus)
              }
              className="w-full outline-none"
            >
              <option value="All">{t("All Sales")}</option>
              <option value="Completed">{t("Completed")}</option>
              <option value="Cancelled">{t("Cancelled")}</option>
              <option value="Returned">{t("Returned")}</option>
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div>
            <h2 className="font-bold text-gray-900">{t("All Sales")}</h2>
            <div className="text-sm text-gray-500">
              {isLoading ? (
                <Skeleton className="mt-1 h-4 w-24" />
              ) : (
                <>
                  {data?.totalCount} {t("total records")}
                </>
              )}
            </div>
          </div>
          {isFetching ? (
            <Loader2 className="animate-spin text-gray-400" size={20} />
          ) : null}
        </div>

        <div
          className={`overflow-x-auto transition-opacity ${
            isFetching && !isLoading ? "pointer-events-none opacity-60" : ""
          }`}
        >
          <table className="w-full min-w-[1200px] text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-5 py-3">{t("Invoice")}</th>
                <th className="px-5 py-3">{t("Customer")}</th>
                <th className="px-5 py-3">{t("Total")}</th>
                <th className="px-5 py-3">{t("Paid / Remaining")}</th>
                <th className="px-5 py-3">{t("Profit")}</th>
                <th className="px-5 py-3">{t("Payments")}</th>
                <th className="px-5 py-3">{t("Status")}</th>
                <th className="px-5 py-3">{t("Created")}</th>
                <th className="px-5 py-3 text-right">{t("Actions")}</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <TableRowsSkeleton rows={8} cols={9} />
              ) : !sales.length ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-5 py-16 text-center text-gray-500"
                  >
                    {t("No sales found.")}
                  </td>
                </tr>
              ) : (
                sales.map((sale) => (
                  <tr key={sale.id} className="transition hover:bg-gray-50">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-gray-100 p-2 text-gray-600">
                          <Receipt size={18} />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">
                            {sale.invoice_no}
                          </p>
                          <p className="text-xs text-gray-500">{t("ID")} #{sale.id}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <p className="font-medium text-gray-900">
                        {sale.customer_name || t("Walk-in customer")}
                      </p>
                      <p className="text-xs text-gray-500">
                        {sale.customer_phone || t("No phone")}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <p className="font-bold text-gray-900">
                        {money(sale.grand_total)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {t("Discount")} {money(sale.discount_amount)} · {t("Tax")}{" "}
                        {money(sale.tax_amount)}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <p className="font-medium text-gray-900">
                        {t("Paid")} {money(sale.paid_amount)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {t("Remaining")} {money(sale.remaining_amount)}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <p className="font-bold text-green-700">
                        {money(sale.profit_amount)}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <PaymentsPreview
                        payments={
                          sale.payments?.length
                            ? sale.payments
                            : salePayments.filter((p) => p.sale_id === sale.id)
                        }
                      />
                      {sale.payment_proof_url ? (
                        <a
                          href={sale.payment_proof_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={t("View online payment proof photo")}
                          className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
                        >
                          <Camera size={12} /> {t("Proof photo")}
                        </a>
                      ) : null}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-2">
                        <StatusBadge
                          className={paymentStatusClass[sale.payment_status]}
                        >
                          {t(sale.payment_status)}
                        </StatusBadge>
                        <StatusBadge
                          className={saleStatusClass[sale.sale_status]}
                        >
                          {t(sale.sale_status)}
                        </StatusBadge>
                      </div>
                    </td>

                    <td className="px-5 py-4 text-gray-600">
                      {dateTime(sale.created_at)}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handlePrintReceipt(sale)}
                          disabled={!!printingId}
                          className="rounded-xl p-2 text-gray-500 transition hover:bg-green-50 hover:text-green-600 disabled:opacity-50"
                          aria-label={t("Print receipt")}
                          title={t("Print Receipt")}
                        >
                          {printingId === sale.id ? (
                            <Loader2 size={18} className="animate-spin" />
                          ) : (
                            <Printer size={18} />
                          )}
                        </button>
                        {sale.sale_status === "Completed" && (
                          <button
                            onClick={() => {
                              setRevokeReason("");
                              setRevokeTarget(sale);
                            }}
                            className="rounded-xl p-2 text-gray-500 transition hover:bg-amber-50 hover:text-amber-600"
                            aria-label={t("Revoke sale")}
                            title={t("Revoke (sold by mistake)")}
                          >
                            <Undo2 size={18} />
                          </button>
                        )}
                        <button
                          onClick={() => handleEditSale(sale)}
                          disabled={!!editSaleId}
                          className="rounded-xl p-2 text-gray-500 transition hover:bg-slate-50 hover:text-slate-600 disabled:opacity-50"
                          aria-label={t("Edit sale")}
                        >
                          {editSaleId === sale.id && !editSaleItemsData ? (
                            <Loader2 size={18} className="animate-spin" />
                          ) : (
                            <Edit size={18} />
                          )}
                        </button>
                        <button
                          onClick={() => setSelectedSaleId(sale.id)}
                          className="rounded-xl p-2 text-gray-500 transition hover:bg-blue-50 hover:text-blue-600"
                          aria-label={t("View sale")}
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(sale)}
                          className="rounded-xl p-2 text-gray-500 transition hover:bg-red-50 hover:text-red-600"
                          aria-label={t("Delete sale")}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
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

      {selectedSaleId ? (
        <SaleDetailsModal
          saleId={selectedSaleId}
          onClose={() => setSelectedSaleId(undefined)}
          money={money}
          dateTime={dateTime}
          getPaymentLabel={getPaymentLabel}
        />
      ) : null}

      {revokeTarget ? (
        <div
          onClick={() => !revokeSale.isPending && setRevokeTarget(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
          >
            <h2 className="text-lg font-semibold text-slate-900">
              {t("Revoke sale")} {revokeTarget.invoice_no}?
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              {t("Use this when a sale was made by mistake. The items go back into stock and the payment is reversed. The sale stays on record as Cancelled and is written to the Activity Log.")}{" "}
              ({money(revokeTarget.grand_total)})
            </p>
            <label className="mt-4 block text-sm font-medium text-slate-700">
              {t("Reason (optional)")}
            </label>
            <input
              type="text"
              value={revokeReason}
              onChange={(e) => setRevokeReason(e.target.value)}
              placeholder={t("e.g. Wrong item sold")}
              disabled={revokeSale.isPending}
              className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-slate-400"
            />
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setRevokeTarget(null)}
                disabled={revokeSale.isPending}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
              >
                {t("Keep sale")}
              </button>
              <button
                onClick={handleRevoke}
                disabled={revokeSale.isPending}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
              >
                {revokeSale.isPending && <Loader2 size={14} className="animate-spin" />}
                {revokeSale.isPending ? t("Revoking...") : t("Revoke sale")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteConfirm ? (
        <DeleteConfirmModal
          invoiceNo={deleteConfirm.invoice_no}
          label={t("sale")}
          isPending={deleteSale.isPending}
          onConfirm={handleDelete}
          onCancel={() => setDeleteConfirm(null)}
        />
      ) : null}

      {editSale && editSaleItemsData ? (
        <EditSaleModal
          sale={editSale}
          saleItems={editSaleItemsData.data || []}
          onClose={() => {
            setEditSale(null);
            setEditSaleId(undefined);
          }}
          money={money}
        />
      ) : null}

      {/* Receipt Printer Modal */}
      {showReceipt && receiptData && (
        <ReceiptPrinter
          data={receiptData}
          onClose={() => {
            setShowReceipt(false);
            setReceiptData(null);
          }}
        />
      )}
    </div>
  );
}
