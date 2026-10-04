import {
  Minus,
  Plus,
  ShoppingCart,
  Trash2,
  ArrowRight,
  CreditCard,
  Banknote,
  QrCode,
  Percent,
  Info,
  Zap,
  Layers,
  FileText,
} from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import { useEffect, useRef, useState } from "react";
import { useCustomers, type Customer } from "@/hooks/useCustomers";
import type { PaymentMethod } from "@/hooks/usePaymentMethods";
import type { CartItem } from "@/components/tabs/PosTab";
import type { SalePayment } from "@/hooks/useSales";
import { useCreateQuickSale } from "@/hooks/useQuickSales";
import { DropdownWithSearch } from "../layout/DropdownWithSearch";
import { useDebounced } from "@/hooks/useDebounced";
import toast from "react-hot-toast";

type CartSummary = {
  subtotal: number;
  totalItems: number;
  grandTotal: number;
  changeAmount: number;
  remainingAmount: number;
};

type SaleTab = "regular" | "quick";

interface BillingSectionProps {
  cartItems: CartItem[];
  cartSummary: CartSummary;
  removeFromCart: (productId: string, batchId?: string) => void;
  updateQuantity: (productId: string, delta: number, batchId?: string) => void;
  updateProductTax?: (
    productId: string,
    taxAmount: number,
    batchId?: string,
  ) => void;
  updateProductTaxInclusive?: (
    productId: string,
    isInclusive: boolean,
    batchId?: string,
  ) => void;
  updateItemDiscount?: (
    productId: string,
    batchId: string | undefined,
    patch: { sold_price?: number | undefined; discount_reason?: string },
  ) => void;
  customerId: string | null;
  setCustomerId: (id: string | null) => void;
  openCustomerModal: (customer?: Customer | null) => void;

  paymentMethods: PaymentMethod[];
  payments: SalePayment[];
  setPayments: Dispatch<SetStateAction<SalePayment[]>>;
  paidAmount: number;

  handleCheckout: () => void;
  isCheckingOut: boolean;

  isDiscountEnabled: boolean;
  setIsDiscountEnabled: Dispatch<SetStateAction<boolean>>;
  discountAmount: number;
  setDiscountAmount?: Dispatch<SetStateAction<number>>;
  discountType?: "percentage" | "fixed";
  setDiscountType?: Dispatch<SetStateAction<"percentage" | "fixed">>;
  discountValue?: number;
  setDiscountValue?: Dispatch<SetStateAction<number>>;

  // Global tax settings (can be deprecated or kept as fallback)
  isTaxEnabled?: boolean;
  setIsTaxEnabled?: Dispatch<SetStateAction<boolean>>;
  taxAmount?: number;
  setTaxAmount?: Dispatch<SetStateAction<number>>;
  taxType?: "percentage" | "fixed";
  setTaxType?: Dispatch<SetStateAction<"percentage" | "fixed">>;
  taxValue?: number;
  setTaxValue?: Dispatch<SetStateAction<number>>;
  isTaxInclusive?: boolean;
  setIsTaxInclusive?: Dispatch<SetStateAction<boolean>>;

  paymentProofFile?: File | null;
  setPaymentProofFile?: Dispatch<SetStateAction<File | null>>;
}

const getPaymentMethodIcon = (type: string) => {
  switch (type?.toLowerCase()) {
    case "qr":
    case "online":
    case "digital":
      return <QrCode className="h-4 w-4" />;

    case "cash":
      return <Banknote className="h-4 w-4" />;

    default:
      return <CreditCard className="h-4 w-4" />;
  }
};

function ProductTaxModal({
  item,
  onClose,
  onSave,
}: {
  item: CartItem;
  onClose: () => void;
  onSave: (taxAmount: number, isInclusive: boolean, batchId?: string) => void;
}) {
  const [taxType, setTaxType] = useState<"percentage" | "fixed">(
    item.tax_amount && item.unit_price > 0
      ? item.tax_amount % 1 === 0 && item.tax_amount <= item.unit_price
        ? "fixed"
        : "percentage"
      : "percentage",
  );
  const [taxValue, setTaxValue] = useState<number>(() => {
    if (!item.tax_amount || item.unit_price <= 0) return 0;

    const percentageEquivalent = (item.tax_amount / item.unit_price) * 100;
    return percentageEquivalent % 1 === 0
      ? percentageEquivalent
      : item.tax_amount;
  });

  // Initialize with the item's existing tax_inclusive value
  const [isInclusive, setIsInclusive] = useState<boolean>(
    item.tax_inclusive || false,
  );

  const [showInfo, setShowInfo] = useState(false);

  const calculatedTax =
    taxType === "percentage" ? (item.unit_price * taxValue) / 100 : taxValue;

  const handleSave = () => {
    onSave(calculatedTax, isInclusive, item.batch_id);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">
            Tax Settings - {item.product_name}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Product Info */}
          <div className="bg-gray-50 rounded-lg p-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Unit Price</span>
              <span className="font-semibold">Rs. {item.unit_price}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Quantity</span>
              <span className="font-semibold">{item.quantity}</span>
            </div>
            {item.tax_amount && item.tax_amount > 0 && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Current Tax</span>
                  <span className="font-semibold text-blue-600">
                    Rs. {item.tax_amount} per unit
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tax Type</span>
                  <span className="font-semibold">
                    {item.tax_inclusive ? "Inclusive" : "Exclusive"}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Tax Type Toggle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tax Type
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setTaxType("percentage");
                  // Convert fixed value to percentage equivalent
                  if (taxType === "fixed" && item.unit_price > 0) {
                    setTaxValue((taxValue / item.unit_price) * 100);
                  }
                }}
                className={`flex-1 rounded-lg cursor-pointer px-3 py-2 text-sm font-medium transition-colors ${
                  taxType === "percentage"
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Percentage (%)
              </button>
              <button
                type="button"
                onClick={() => {
                  setTaxType("fixed");
                  // Convert percentage to fixed value
                  if (taxType === "percentage") {
                    setTaxValue((item.unit_price * taxValue) / 100);
                  }
                }}
                className={`flex-1 rounded-lg cursor-pointer px-3 py-2 text-sm font-medium transition-colors ${
                  taxType === "fixed"
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Fixed (Rs.)
              </button>
            </div>
          </div>

          {/* Tax Value Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tax Value
            </label>
            <div className="relative">
              <input
                type="number"
                min={0}
                max={taxType === "percentage" ? 100 : undefined}
                step={0.5}
                value={taxValue || ""}
                onChange={(e) =>
                  setTaxValue(
                    e.target.value === "" ? 0 : Number(e.target.value),
                  )
                }
                onWheel={(e) => e.currentTarget.blur()}
                placeholder={taxType === "percentage" ? "Tax %" : "Tax amount"}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 pr-12 text-sm outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                {taxType === "percentage" ? "%" : "Rs."}
              </span>
            </div>
          </div>

          {/* Calculated Tax Preview */}
          {taxValue > 0 && (
            <div className="bg-blue-50 rounded-lg p-3">
              <div className="flex justify-between text-sm">
                <span className="text-blue-700">Tax per unit</span>
                <span className="font-semibold text-blue-700">
                  Rs. {calculatedTax.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-blue-700">
                  Total tax ({item.quantity} units)
                </span>
                <span className="font-semibold text-blue-700">
                  Rs. {(calculatedTax * item.quantity).toFixed(2)}
                </span>
              </div>
              {isInclusive && (
                <div className="mt-2 text-xs text-blue-600 bg-blue-100 rounded p-2">
                  ⚠️ Tax inclusive: Unit price of Rs. {item.unit_price} includes
                  Rs. {calculatedTax.toFixed(2)} tax
                </div>
              )}
            </div>
          )}

          {/* Tax Inclusive Toggle */}
          <div>
            <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-900">
                    Tax Inclusive
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowInfo(!showInfo)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <Info className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  {isInclusive
                    ? "Tax is included in the unit price"
                    : "Tax is added on top of unit price"}
                </p>
                {showInfo && (
                  <div className="mt-2 p-2 bg-white rounded border border-gray-200 text-xs text-gray-600">
                    <p className="font-medium mb-1">Tax Inclusive:</p>
                    <p>• Unit price includes the tax amount</p>
                    <p>• Final price = Unit price</p>
                    <p className="mt-1 font-medium">Tax Exclusive:</p>
                    <p>• Tax is added to unit price</p>
                    <p>• Final price = Unit price + Tax</p>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsInclusive(!isInclusive)}
                className={`relative h-6 w-11 cursor-pointer rounded-full transition-colors ${
                  isInclusive ? "bg-blue-600" : "bg-gray-300"
                }`}
              >
                <span
                  className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform ${
                    isInclusive ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={() => {
              onSave(0, false);
              onClose();
            }}
            className="flex-1 cursor-pointer rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Remove Tax
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 cursor-pointer rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
          >
            Apply Tax
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BillingSection({
  cartItems,
  cartSummary,
  removeFromCart,
  updateQuantity,
  updateProductTax,
  updateProductTaxInclusive,
  updateItemDiscount,
  customerId,
  setCustomerId,
  openCustomerModal,
  paymentMethods,
  payments,
  setPayments,
  paidAmount,
  handleCheckout,
  isCheckingOut,
  isDiscountEnabled,
  setIsDiscountEnabled,
  discountAmount,
  setDiscountAmount,
  discountType = "percentage",
  setDiscountType,
  discountValue = 0,
  setDiscountValue,
  isTaxEnabled,
  setIsTaxEnabled,
  taxAmount,
  setTaxAmount,
  taxType,
  setTaxType,
  taxValue,
  setTaxValue,
  isTaxInclusive,
  setIsTaxInclusive,
  paymentProofFile,
  setPaymentProofFile,
}: BillingSectionProps) {
  const sectionRef = useRef<HTMLDivElement | null>(null);

  const [height, setHeight] = useState(300);
  const [localDiscountType, setLocalDiscountType] = useState<
    "percentage" | "fixed"
  >(discountType);
  const [localDiscountValue, setLocalDiscountValue] = useState(discountValue);
  const [showQr, setShowQr] = useState("");
  const [showPaymentName, setShowPaymentName] = useState("");
  const [searchCustomer, setSearchCustomer] = useState("");
  const [editingTaxProduct, setEditingTaxProduct] = useState<CartItem | null>(
    null,
  );
  const [activeTab, setActiveTab] = useState<SaleTab>("regular");

  // Quick sale states
  const [quickSalePrice, setQuickSalePrice] = useState<number>(0);
  const [quickSaleCustomerName, setQuickSaleCustomerName] = useState("");
  const [quickSaleCustomerPhone, setQuickSaleCustomerPhone] = useState("");
  const [quickSalePaymentMethodId, setQuickSalePaymentMethodId] = useState<
    string | null
  >(null);
  const [quickSalePaidAmount, setQuickSalePaidAmount] = useState<number>(0);
  const [quickSaleNotes, setQuickSaleNotes] = useState("");

  const debouncedSearchCustomer = useDebounced(searchCustomer, 500);
  const { data: customersData, isLoading: customersLoading } = useCustomers(
    1,
    20,
    debouncedSearchCustomer,
    "Active",
  );

  const customers = customersData?.data ?? [];
  const createQuickSale = useCreateQuickSale();

  const changeAmount = Math.max(paidAmount - cartSummary.grandTotal, 0);

  const startResize = (e: React.MouseEvent) => {
    const startY = e.clientY;
    const startHeight = height;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = startY - moveEvent.clientY;
      const newHeight = Math.max(260, Math.min(700, startHeight + delta));
      setHeight(newHeight);
    };

    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  // Keep the selected payment method's amount in sync with the live cart
  // total, since the amount is no longer manually typed in — editing the
  // cart after picking a method should just work without a stale amount.
  useEffect(() => {
    setPayments((prev) => {
      if (prev.length !== 1) return prev;
      if (cartSummary.grandTotal <= 0) return [];
      if (prev[0].amount === cartSummary.grandTotal) return prev;
      return [{ ...prev[0], amount: cartSummary.grandTotal }];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartSummary.grandTotal]);

  const getPaymentAmount = (methodId: string) => {
    const selectedPayment = payments.find(
      (payment) => String(payment.payment_method_id) === String(methodId),
    );

    return Number(selectedPayment?.amount || 0);
  };

  const updatePaymentAmount = (methodId: string, amount: number) => {
    const safeAmount = Math.max(0, Number(amount || 0));

    setPayments((prev) => {
      const otherPayments = prev.filter(
        (payment) => String(payment.payment_method_id) !== String(methodId),
      );

      if (safeAmount <= 0) {
        return otherPayments;
      }

      return [
        ...otherPayments,
        {
          payment_method_id: methodId,
          amount: safeAmount,
        },
      ];
    });
  };

  const clearPaymentAmount = (methodId: string) => {
    updatePaymentAmount(methodId, 0);
  };

  const handleDiscountTypeChange = (type: "percentage" | "fixed") => {
    setLocalDiscountType(type);
    setDiscountType?.(type);

    setLocalDiscountValue(0);
    setDiscountValue?.(0);
    setDiscountAmount?.(0);
  };

  const handleDiscountValueChange = (value: number) => {
    const safeValue = Math.max(0, Number(value || 0));

    setLocalDiscountValue(safeValue);
    setDiscountValue?.(safeValue);

    if (!setDiscountAmount) return;

    if (localDiscountType === "percentage") {
      const safePercentage = Math.min(safeValue, 100);
      const calculatedDiscount = (cartSummary.subtotal * safePercentage) / 100;
      setDiscountAmount(Math.min(calculatedDiscount, cartSummary.subtotal));
    } else {
      setDiscountAmount(Math.min(safeValue, cartSummary.subtotal));
    }
  };

  const handleEnableDiscount = () => {
    const newEnabled = !isDiscountEnabled;
    setIsDiscountEnabled(newEnabled);

    if (!newEnabled) {
      setDiscountAmount?.(0);
      setLocalDiscountValue(0);
      setDiscountValue?.(0);
    }
  };

  const handleProductTaxSave = (
    productId: string,
    taxAmount: number,
    isInclusive: boolean,
    batchId?: string,
  ) => {
    updateProductTax?.(productId, taxAmount, batchId);
    updateProductTaxInclusive?.(productId, isInclusive, batchId);
  };

  const getCartItemKey = (item: CartItem): string => {
    return `${item.product_id}-${item.batch_id || "standard"}`;
  };

  // Calculate total tax from all products for display
  const totalProductTax = cartItems.reduce((sum, item) => {
    return sum + (item.tax_amount || 0) * item.quantity;
  }, 0);

  // Quick sale handlers
  const handleQuickSalePaymentMethodSelect = (methodId: string) => {
    setQuickSalePaymentMethodId(methodId);
    // Auto-fill paid amount if a method is selected
    if (quickSalePrice > 0) {
      setQuickSalePaidAmount(quickSalePrice);
    }
  };

  const handleQuickSaleSubmit = async () => {
    const validPayments = payments.filter((p) => p.amount > 0);
    if (validPayments.length === 0) {
      toast.error("Please add at least one valid payment method");
      return;
    }

    try {
      await createQuickSale.mutateAsync({
        payments: payments,
        notes: quickSaleNotes || null,
      });

      toast.success("Quick sale created successfully!");

      // Reset form
      setQuickSalePrice(0);
      setQuickSaleCustomerName("");
      setQuickSaleCustomerPhone("");
      setQuickSalePaymentMethodId(null);
      setQuickSalePaidAmount(0);
      setQuickSaleNotes("");
      setPayments([]);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Failed to create quick sale",
      );
    }
  };

  const quickSaleRemaining = Math.max(0, quickSalePrice - quickSalePaidAmount);

  return (
    <>
      {/* No fixed/max height below xl: PosTab only switches to the
          side-by-side layout at xl (flex-col -> xl:flex-row), so below
          that this panel is either stacked in-flow or a bottom sheet with
          its own height cap - forcing max-h-screen here too would clip
          content inside a box sized for the desktop layout. */}
      <div className="w-full lg:w-[470px] xl:h-full xl:max-h-screen flex flex-col bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab("regular")}
            className={`flex-1 py-3 px-4 cursor-pointer text-sm font-semibold transition-colors relative ${
              activeTab === "regular"
                ? "text-gray-900"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Regular Sale
            </div>
            {activeTab === "regular" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900" />
            )}
          </button>

          <button
            onClick={() => setActiveTab("quick")}
            className={`flex-1 py-3 cursor-pointer px-4 text-sm font-semibold transition-colors relative ${
              activeTab === "quick"
                ? "text-gray-900"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Zap className="h-4 w-4" />
              Quick Sale
            </div>
            {activeTab === "quick" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900" />
            )}
          </button>
        </div>

        {/* Regular Sale Content */}
        {activeTab === "regular" && (
          <>
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-gray-900" />
                  <h2 className="text-xl font-bold text-gray-900">Bill</h2>
                </div>

                {cartSummary.totalItems > 0 && (
                  <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                    {cartSummary.totalItems} items
                  </span>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {cartItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <ShoppingCart className="h-12 w-12 mb-4" />
                  <p className="text-lg font-medium">Cart is empty</p>
                  <p className="text-sm mt-1">Add products from the catalog</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cartItems.map((item) => (
                    <div
                      key={getCartItemKey(item)}
                      className="bg-gray-50 rounded-xl p-4 border border-gray-100 hover:border-gray-200 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 text-sm">
                            {item.product_name}
                          </h3>

                          {(item.tax_amount ?? 0) > 0 && (
                            <div className="mt-1 flex items-center gap-2">
                              <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                                Tax: Rs. {item.tax_amount}/unit
                              </span>
                              <button
                                type="button"
                                onClick={() => setEditingTaxProduct(item)}
                                className="text-xs text-gray-500 hover:text-gray-700 underline cursor-pointer"
                              >
                                Edit Tax
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setEditingTaxProduct(item)}
                            className="text-gray-400 cursor-pointer hover:text-blue-500 transition-colors p-1"
                            title="Set product tax"
                          >
                            <Percent className="h-4 w-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              removeFromCart(item.product_id, item.batch_id)
                            }
                            className="text-gray-400 cursor-pointer hover:text-red-500 transition-colors p-1"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              updateQuantity(item.product_id, -1, item.batch_id)
                            }
                            disabled={item.quantity <= 1}
                            className="p-1 rounded-md cursor-pointer hover:bg-gray-200 transition-colors disabled:opacity-40"
                          >
                            <Minus className="h-4 w-4" />
                          </button>

                          <span className="w-8 text-center font-mono text-sm">
                            {item.quantity}
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              updateQuantity(item.product_id, 1, item.batch_id)
                            }
                            className="p-1 cursor-pointer rounded-md hover:bg-gray-200 transition-colors"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="text-right">
                          <p className="text-xs text-gray-500">
                            Rs. {item.unit_price} × {item.quantity}
                          </p>

                          {(item.tax_amount ?? 0) > 0 && (
                            <p className="text-xs text-blue-600">
                              Tax: Rs.{" "}
                              {((item.tax_amount ?? 0) * item.quantity).toFixed(
                                2,
                              )}
                            </p>
                          )}

                          <p className="font-semibold text-gray-900">
                            Rs. {item.total_price}
                          </p>
                        </div>
                      </div>

                      {updateItemDiscount && (
                        <div className="mt-3 border-t border-gray-200 pt-3">
                          <div className="flex items-center gap-2">
                            <label className="shrink-0 text-xs font-medium text-gray-600">
                              Sold at (optional)
                            </label>
                            <input
                              type="number"
                              min="0"
                              inputMode="decimal"
                              placeholder={String(item.unit_price)}
                              value={item.sold_price ?? ""}
                              onChange={(e) =>
                                updateItemDiscount(item.product_id, item.batch_id, {
                                  sold_price:
                                    e.target.value === ""
                                      ? undefined
                                      : Math.max(Number(e.target.value), 0),
                                })
                              }
                              className="w-full min-w-0 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-gray-400"
                            />
                          </div>

                          {item.sold_price !== undefined &&
                            item.sold_price >= item.unit_price && (
                              <p className="mt-1 text-xs text-gray-400">
                                Enter a price lower than Rs. {item.unit_price}{" "}
                                to record a discount.
                              </p>
                            )}

                          {item.discount_amount > 0 && (
                            <div className="mt-2 space-y-1.5">
                              <p className="text-xs font-medium text-amber-700">
                                Below marked price: Rs. {item.discount_amount}{" "}
                                less (marked Rs. {item.unit_price} each)
                              </p>
                              <input
                                type="text"
                                placeholder="Reason (optional)"
                                value={item.discount_reason ?? ""}
                                onChange={(e) =>
                                  updateItemDiscount(item.product_id, item.batch_id, {
                                    discount_reason: e.target.value,
                                  })
                                }
                                className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-gray-400"
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cartItems.length > 0 && (
              <div
                ref={sectionRef}
                style={{ height }}
                className="relative border-t border-gray-100 p-4 pt-0 space-y-4 bg-gray-50 overflow-y-auto min-h-[50vh] max-h-[70vh]"
              >
                <div
                  className="sticky top-0 left-0 right-0 h-2 cursor-ns-resize bg-transparent hover:bg-gray-200"
                  onMouseDown={startResize}
                />

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium">
                      Rs. {cartSummary.subtotal}
                    </span>
                  </div>

                  {totalProductTax > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total Tax</span>
                      <span className="font-medium text-blue-600">
                        Rs. {totalProductTax.toFixed(2)}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2">
                    <span>Grand Total</span>
                    <span>Rs. {cartSummary.grandTotal}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Customer
                  </label>

                  <DropdownWithSearch
                    options={customers.map((customer) => ({
                      id: customer.id,
                      label: customer.name,
                      sublabel: customer.phone || customer.email,
                      metadata: customer,
                    }))}
                    selectedId={customerId}
                    onSelect={(option) => setCustomerId(option?.id || null)}
                    placeholder="Select a customer"
                    searchPlaceholder="Search customers by name or phone..."
                    onSearch={(searchTerm) => setSearchCustomer(searchTerm)}
                    isLoading={customersLoading}
                    emptyMessage="No customers found"
                    showAddNew={true}
                    addNewLabel="Add new customer"
                    onAddNew={() => openCustomerModal(null)}
                  />
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-700">
                      Payment Method
                    </label>

                    <span className="text-xs text-gray-500">
                      Paid: Rs. {paidAmount}
                    </span>
                  </div>

                  {paymentMethods.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-gray-300 bg-white p-4 text-center text-sm text-gray-500">
                      No payment methods available. Please add payment methods
                      first.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                      {paymentMethods.map((method) => {
                        const amount = getPaymentAmount(method.id);
                        const isSelected = amount > 0;

                        const selectMethod = () => {
                          if (isSelected) {
                            clearPaymentAmount(method.id);
                            return;
                          }
                          const amountToPay =
                            cartSummary.grandTotal > 0
                              ? cartSummary.grandTotal
                              : 0;
                          setPayments(
                            amountToPay > 0
                              ? [
                                  {
                                    payment_method_id: method.id,
                                    amount: amountToPay,
                                  },
                                ]
                              : [],
                          );
                        };

                        return (
                          <div
                            key={method.id}
                            className={`rounded-xl border bg-white p-3 transition-all ${
                              isSelected
                                ? "border-gray-900 shadow-sm"
                                : "border-gray-200 hover:border-gray-300"
                            }`}
                          >
                            <button
                              type="button"
                              onClick={selectMethod}
                              className="flex w-full cursor-pointer items-center gap-2 text-left"
                            >
                              <div
                                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                                  isSelected
                                    ? "bg-gray-900 text-white"
                                    : "bg-gray-100 text-gray-600"
                                }`}
                              >
                                {getPaymentMethodIcon(method.type)}
                              </div>

                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-gray-900">
                                  {method.payment_method}
                                </p>

                                <span
                                  className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                    method.type === "Cash"
                                      ? "bg-green-100 text-green-700"
                                      : "bg-blue-100 text-blue-700"
                                  }`}
                                >
                                  {method.type}
                                </span>
                              </div>

                              {isSelected && (
                                <span className="shrink-0 rounded-full bg-gray-900 px-2 py-0.5 text-[10px] font-semibold text-white">
                                  Selected
                                </span>
                              )}
                            </button>

                            {method.qr_code && isSelected && (
                              <button
                                className="mt-3 w-full text-center cursor-pointer hover:shadow-lg transition rounded-lg bg-gray-50 p-2"
                                onClick={() => {
                                  setShowQr(method.qr_code);
                                  setShowPaymentName(method.payment_method);
                                }}
                              >
                                <img
                                  src={method.qr_code}
                                  alt={method.payment_method}
                                  className="mx-auto h-24 w-full object-contain"
                                />
                              </button>
                            )}

                            {method.type !== "Cash" &&
                              isSelected &&
                              setPaymentProofFile && (
                                <div className="mt-3">
                                  <label className="mb-1 block text-xs font-medium text-gray-600">
                                    Payment proof photo (optional)
                                  </label>
                                  {paymentProofFile ? (
                                    <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-700">
                                      <span className="truncate">
                                        {paymentProofFile.name}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setPaymentProofFile(null)
                                        }
                                        className="ml-2 shrink-0 text-red-500 hover:text-red-600"
                                      >
                                        Remove
                                      </button>
                                    </div>
                                  ) : (
                                    <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 px-3 py-2 text-xs text-gray-500 hover:border-gray-400">
                                      <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) setPaymentProofFile(file);
                                        }}
                                      />
                                      Attach screenshot/photo of payment
                                    </label>
                                  )}
                                </div>
                              )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Discount Section */}
                <div className="rounded-xl bg-white border border-gray-200 p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        Enable Discount
                      </p>

                      <p className="text-xs text-gray-500">
                        Add discount to the bill
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleEnableDiscount}
                      className={`relative h-6 w-11 cursor-pointer rounded-full transition-colors ${
                        isDiscountEnabled ? "bg-gray-900" : "bg-gray-300"
                      }`}
                    >
                      <span
                        className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform ${
                          isDiscountEnabled ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  {isDiscountEnabled && (
                    <>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleDiscountTypeChange("percentage")}
                          className={`flex-1 rounded-lg cursor-pointer px-3 py-2 text-sm font-medium transition-colors ${
                            localDiscountType === "percentage"
                              ? "bg-gray-900 text-white"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                        >
                          Percentage (%)
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDiscountTypeChange("fixed")}
                          className={`flex-1 rounded-lg cursor-pointer px-3 py-2 text-sm font-medium transition-colors ${
                            localDiscountType === "fixed"
                              ? "bg-gray-900 text-white"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                        >
                          Amount (Rs.)
                        </button>
                      </div>

                      <div className="relative">
                        {localDiscountType === "percentage" ? (
                          <>
                            <input
                              type="number"
                              min={0}
                              max={100}
                              step={0.5}
                              value={localDiscountValue || ""}
                              onChange={(e) =>
                                handleDiscountValueChange(
                                  e.target.value === ""
                                    ? 0
                                    : Number(e.target.value),
                                )
                              }
                              onWheel={(e) => e.currentTarget.blur()}
                              placeholder="Discount percentage"
                              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 pr-12 text-sm outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                            />

                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                              %
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                              Rs.
                            </span>

                            <input
                              type="number"
                              min={0}
                              max={cartSummary.subtotal}
                              step={10}
                              value={localDiscountValue || ""}
                              onChange={(e) =>
                                handleDiscountValueChange(
                                  e.target.value === ""
                                    ? 0
                                    : Number(e.target.value),
                                )
                              }
                              onWheel={(e) => e.currentTarget.blur()}
                              placeholder="Discount amount"
                              className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                            />
                          </>
                        )}
                      </div>

                      {discountAmount > 0 && (
                        <div className="text-center text-sm text-green-600 bg-green-50 rounded-lg px-3 py-2">
                          Discount applied: Rs. {discountAmount}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Bill Summary */}
                <div className="rounded-xl bg-white border border-gray-200 p-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-semibold">
                      Rs. {cartSummary.subtotal}
                    </span>
                  </div>

                  {totalProductTax > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Tax</span>
                      <span className="font-semibold text-blue-600">
                        + Rs. {totalProductTax.toFixed(2)}
                      </span>
                    </div>
                  )}

                  {isDiscountEnabled && discountAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Discount</span>
                      <span className="font-semibold text-green-600">
                        - Rs. {discountAmount}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between text-sm border-t border-gray-100 pt-2">
                    <span className="text-gray-900 font-medium">
                      Final Amount
                    </span>
                    <span className="font-bold">
                      Rs. {cartSummary.grandTotal}
                    </span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total Paid</span>
                    <span className="font-semibold">Rs. {paidAmount}</span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Remaining</span>
                    <span className="font-semibold text-red-600">
                      Rs. {cartSummary.remainingAmount}
                    </span>
                  </div>

                  {changeAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Change</span>
                      <span className="font-semibold text-green-600">
                        Rs. {changeAmount}
                      </span>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleCheckout}
                  disabled={isCheckingOut}
                  className="w-full cursor-pointer bg-gray-900 hover:bg-gray-800 text-white py-4 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isCheckingOut ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      Complete Sale
                      <ArrowRight className="h-5 w-5" />
                    </>
                  )}
                </button>
              </div>
            )}
          </>
        )}

        {/* Quick Sale Content */}
        {activeTab === "quick" && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Payment Method */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <CreditCard className="h-3.5 w-3.5 inline mr-1" />
                Payment Methods
              </label>
              {paymentMethods.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-300 bg-white p-4 text-center text-sm text-gray-500">
                  No payment methods available. Please add payment methods
                  first.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                  {paymentMethods.map((method) => {
                    const amount = getPaymentAmount(method.id);
                    const isSelected = amount > 0;

                    return (
                      <div
                        key={method.id}
                        className={`rounded-xl border bg-white p-3 transition-all ${
                          isSelected
                            ? "border-gray-900 shadow-sm"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <div
                              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                                isSelected
                                  ? "bg-gray-900 text-white"
                                  : "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {getPaymentMethodIcon(method.type)}
                            </div>

                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-gray-900">
                                {method.payment_method}
                              </p>

                              <p className="text-xs capitalize text-gray-500">
                                {method.type}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                            Rs.
                          </span>

                          <input
                            type="number"
                            min={0}
                            value={amount || ""}
                            onChange={(e) =>
                              updatePaymentAmount(
                                method.id,
                                e.target.value === ""
                                  ? 0
                                  : Number(e.target.value),
                              )
                            }
                            onWheel={(e) => e.currentTarget.blur()}
                            placeholder="0"
                            className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-10 pr-3 text-sm outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                          />
                        </div>

                        {method.qr_code && amount > 0 && (
                          <button
                            className="mt-3 w-full text-center cursor-pointer hover:shadow-lg transition rounded-lg bg-gray-50 p-2"
                            onClick={() => setShowQr(method.qr_code)}
                          >
                            <img
                              src={method.qr_code}
                              alt={method.payment_method}
                              className="mx-auto h-24 w-full object-contain"
                            />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FileText className="h-3.5 w-3.5 inline mr-1" />
                Notes
              </label>
              <textarea
                value={quickSaleNotes}
                onChange={(e) => setQuickSaleNotes(e.target.value)}
                placeholder="Add any notes (optional)"
                rows={2}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 resize-none"
              />
            </div>

            {/* Quick Sale Summary */}
            {quickSalePrice > 0 && (
              <div className="rounded-xl bg-white border border-gray-200 p-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Selling Price</span>
                  <span className="font-semibold">Rs. {quickSalePrice}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Paid Amount</span>
                  <span className="font-semibold">
                    Rs. {payments.reduce((sum, p) => sum + p.amount, 0)}
                  </span>
                </div>
                <div className="flex justify-between text-sm border-t border-gray-100 pt-2">
                  <span className="text-gray-600">Remaining</span>
                  <span
                    className={`font-semibold ${quickSaleRemaining > 0 ? "text-red-600" : "text-green-600"}`}
                  >
                    Rs. {quickSaleRemaining}
                  </span>
                </div>
                {quickSalePaymentMethodId && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Payment Method</span>
                    <span className="font-semibold text-gray-900">
                      {paymentMethods.find(
                        (m) => m.id === quickSalePaymentMethodId,
                      )?.payment_method || "N/A"}
                    </span>
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={handleQuickSaleSubmit}
              disabled={createQuickSale.isPending}
              className="w-full cursor-pointer bg-gray-900 hover:bg-gray-800 text-white py-4 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {createQuickSale.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Zap className="h-5 w-5" />
                  Create Quick Sale
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* QR Code Modal */}
      {showQr !== "" && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => {
            setShowQr("");
            setShowPaymentName("");
          }}
        >
          <div
            className="bg-white rounded-lg p-6 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {showPaymentName} QR Code
            </h3>
            <img src={showQr} alt="QR" />
          </div>
        </div>
      )}

      {/* Product Tax Modal */}
      {editingTaxProduct && (
        <ProductTaxModal
          item={editingTaxProduct}
          onClose={() => setEditingTaxProduct(null)}
          onSave={(taxAmount, isInclusive, batchId) => {
            handleProductTaxSave(
              editingTaxProduct.product_id,
              taxAmount,
              isInclusive,
              batchId,
            );
            setEditingTaxProduct(null);
          }}
        />
      )}
    </>
  );
}
