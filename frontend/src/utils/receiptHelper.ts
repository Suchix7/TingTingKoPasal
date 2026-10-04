import type { CartItem } from "@/components/tabs/PosTab";
import type { ReceiptData } from "@/components/pos/ReceiptPrinter";
import type { SalePayment } from "@/hooks/useSales";
import type { Store } from "@/hooks/useStoreInfo";

export function prepareReceiptData(
  invoiceNo: string,
  cartItems: CartItem[],
  payments: SalePayment[],
  paymentMethods: any[],
  totals: {
    subtotal: number;
    discountAmount: number;
    taxAmount: number;
    grandTotal: number;
    paidAmount: number;
    changeAmount: number;
    remainingAmount: number;
  },
  options?: {
    customerName?: string;
    customerPhone?: string;
    cashierName?: string;
    notes?: string;
    store?: Store | null;
  },
): ReceiptData {
  const now = new Date();

  // Safe store fallbacks
  const storeName = options?.store?.store_name?.trim() || "Ting Ting ko pasal";
  const storeAddress = options?.store?.address?.trim() || "Nepal";
  const storePhone = options?.store?.phone?.trim() || "";
  const storeVat = options?.store?.pan_vat_number?.trim() || "";

  return {
    invoice_no: invoiceNo,
    date: now.toLocaleDateString(),
    time: now.toLocaleTimeString(),
    cashier_name: options?.cashierName || "Guest",
    customer_name: options?.customerName || "Walk-in Customer",
    customer_phone: options?.customerPhone || "",

    items: cartItems.map((item) => ({
      product_name: item.product_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      discount_amount: item.discount_amount,
      tax_amount: item.tax_amount,
      total_price: item.total_price,
    })),

    subtotal: totals.subtotal,
    discount_amount: totals.discountAmount,
    tax_amount: totals.taxAmount,
    grand_total: totals.grandTotal,
    paid_amount: totals.paidAmount,
    change_amount: totals.changeAmount,
    remaining_amount: totals.remainingAmount,

    payments: payments
      .filter((p) => p.payment_method_id && Number(p.amount) > 0)
      .map((payment) => ({
        method:
          paymentMethods.find((m) => m.id === payment.payment_method_id)
            ?.payment_method || "Cash",
        amount: Number(payment.amount),
      })),

    payment_status: totals.paidAmount >= totals.grandTotal ? "PAID" : "PARTIAL",
    notes: options?.notes || "",
    footer_message: "Thank you for your purchase!",
    store_name: storeName,
    store_address: storeAddress,
    store_phone: storePhone,
    store_vat: storeVat,
  };
}
