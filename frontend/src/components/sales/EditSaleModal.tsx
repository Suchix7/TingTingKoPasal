"use client";

import { useEffect, useMemo, useState } from "react";
import {
  X,
  Save,
  Receipt,
  Loader2,
  Plus,
  Trash2,
  Percent,
  Info,
  ImagePlus,
  Package,
} from "lucide-react";
import Image from "next/image";
import toast from "react-hot-toast";

import {
  Sale,
  SaleItem,
  useUpdateSale,
  useCreateSale,
  useUploadSalePaymentProof,
} from "@/hooks/useSales";
import { usePaymentMethods } from "@/hooks/usePaymentMethods";
import { useProducts } from "@/hooks/useProducts";
import { useCustomers } from "@/hooks/useCustomers";
import { useSalePaymentsBySaleId } from "@/hooks/useSalePayments";
import { useDebounced } from "@/hooks/useDebounced";
import { DropdownWithSearch } from "../layout/DropdownWithSearch";
import {
  ProductBatchDropdown,
  ProductBatchSelection,
} from "../layout/ProductBatchDropdown";
import CustomerModal from "../customers/modal";
import ProductModal from "../product/modal";
import { useConvertQuickSale } from "@/hooks/useQuickSales";

type EditSaleModalProps = {
  sale: Sale;
  saleItems: SaleItem[];
  onClose: () => void;
  money: (value?: number | null) => string;
  isQuickSaleConversion?: boolean;
  quickSaleId?: string;
};

type EditableSaleItem = {
  id?: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  tax_amount: number;
  tax_inclusive: boolean;
  total_price: number;
  batch_id?: string | null;
  cost_price?: number;
  profit_amount?: number;
};

type EditablePayment = {
  id?: string;
  sale_id?: string;
  payment_method_id: string;
  payment_method?: string;
  amount: number;
};

// Product Tax Modal for Edit Sale
function ProductTaxModal({
  item,
  onClose,
  onSave,
}: {
  item: EditableSaleItem;
  onClose: () => void;
  onSave: (taxAmount: number, isInclusive: boolean) => void;
}) {
  const [taxType, setTaxType] = useState<"percentage" | "fixed">("fixed");
  const [taxValue, setTaxValue] = useState<number>(item.tax_amount || 0);
  const [isInclusive, setIsInclusive] = useState<boolean>(
    item.tax_inclusive || false,
  );
  const [showInfo, setShowInfo] = useState(false);

  const calculatedTax =
    taxType === "percentage" ? (item.unit_price * taxValue) / 100 : taxValue;

  const handleSave = () => {
    onSave(calculatedTax, isInclusive);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]"
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
            <X className="h-5 w-5" />
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
            {item.tax_amount > 0 && (
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
                  if (taxType === "fixed" && item.unit_price > 0) {
                    setTaxValue((taxValue / item.unit_price) * 100);
                  }
                  setTaxType("percentage");
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
                  if (taxType === "percentage") {
                    setTaxValue((item.unit_price * taxValue) / 100);
                  }
                  setTaxType("fixed");
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

export default function EditSaleModal({
  sale,
  saleItems,
  onClose,
  money,
  isQuickSaleConversion = false,
  quickSaleId,
}: EditSaleModalProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingTaxItem, setEditingTaxItem] = useState<{
    item: EditableSaleItem;
    index: number;
  } | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(
    sale.customer_id ?? null,
  );
  const [customerName, setCustomerName] = useState(sale.customer_name || "");
  const [customerPhone, setCustomerPhone] = useState(sale.customer_phone || "");
  const [discountAmount, setDiscountAmount] = useState(
    Number(sale.discount_amount || 0),
  );
  const [notes, setNotes] = useState(sale.notes || "");
  const [saleStatus, setSaleStatus] = useState<Sale["sale_status"]>(
    sale.sale_status,
  );
  const [items, setItems] = useState<EditableSaleItem[]>([]);
  const [payments, setPayments] = useState<EditablePayment[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentProofUrl, setPaymentProofUrl] = useState<string | null>(
    sale.payment_proof_url || null,
  );
  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);

  const updateSaleMutation = useUpdateSale();
  const createSaleMutation = useCreateSale();
  const convertQuickSaleMutation = useConvertQuickSale();
  const uploadPaymentProof = useUploadSalePaymentProof();

  const { data: paymentMethodsData } = usePaymentMethods(1, 1000);
  const { data: productsData } = useProducts({ limit: 1000 });
  const productPhotoById = useMemo(() => {
    const map: Record<string, string | null | undefined> = {};
    for (const product of productsData?.data || []) {
      map[product.id] = product.photo_url;
    }
    return map;
  }, [productsData]);
  const [searchCustomer, setSearchCustomer] = useState("");
  const debouncedSearchCustomer = useDebounced(searchCustomer, 500);
  const { data: customersData, isLoading: isCustomersLoading } = useCustomers(
    1,
    20,
    debouncedSearchCustomer,
    "Active",
  );
  const { data: salePaymentsData } = useSalePaymentsBySaleId(sale.id);

  const paymentMethods = paymentMethodsData?.data || [];
  const customers = customersData?.data || [];
  const fetchedSalePayments = salePaymentsData?.data || [];

  useEffect(() => {
    setCustomerId(sale.customer_id ?? null);
    setCustomerName(sale.customer_name || "");
    setCustomerPhone(sale.customer_phone || "");
    setDiscountAmount(Number(sale.discount_amount || 0));
    setNotes(sale.notes || "");
    setSaleStatus(sale.sale_status);
    setPaymentProofUrl(sale.payment_proof_url || null);
    setPaymentProofFile(null);
  }, [sale]);

  useEffect(() => {
    setItems(
      saleItems.map((item) => ({
        id: item.id,
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: Number(item.quantity || 1),
        unit_price: Number(item.unit_price || 0),
        discount_amount: Number(item.discount_amount || 0),
        tax_amount: Number(item.tax_amount || 0),
        tax_inclusive: item.tax_inclusive || false,
        total_price: Number(item.total_price || 0),
        batch_id: item.batch_id || null,
        cost_price: Number(item.cost_price || 0),
        profit_amount: Number(item.profit_amount || 0),
      })),
    );
  }, [saleItems]);

  useEffect(() => {
    if (fetchedSalePayments.length > 0 && !isQuickSaleConversion) {
      setPayments(
        fetchedSalePayments.map((payment) => ({
          id: payment.id,
          sale_id: payment.sale_id,
          payment_method_id: payment.payment_method_id,
          payment_method: payment.payment_method,
          amount: Number(payment.amount || 0),
        })),
      );
      return;
    }

    if (sale.payments && sale.payments.length > 0) {
      setPayments(
        sale.payments.map((payment) => ({
          payment_method_id: payment.payment_method_id,
          amount: Number(payment.amount || 0),
        })),
      );
      return;
    }

    setPayments([]);
  }, [fetchedSalePayments, sale.payments]);

  // Calculate subtotal (base price before tax)
  const subtotal = useMemo(() => {
    return items.reduce(
      (sum, item) => sum + item.unit_price * item.quantity,
      0,
    );
  }, [items]);

  // Calculate total tax from all items
  const totalTax = useMemo(() => {
    return items.reduce(
      (sum, item) => sum + item.tax_amount * item.quantity,
      0,
    );
  }, [items]);

  // Calculate grand total considering per-item tax settings
  const grandTotal = useMemo(() => {
    const total = items.reduce((sum, item) => {
      const basePrice = item.unit_price * item.quantity;
      const itemTax = item.tax_amount * item.quantity;

      if (item.tax_inclusive) {
        // Tax inclusive: total_price already includes tax
        return sum + basePrice - item.discount_amount;
      } else {
        // Tax exclusive: add tax on top
        return sum + basePrice + itemTax - item.discount_amount;
      }
    }, 0);

    return Math.max(0, total - discountAmount);
  }, [items, discountAmount]);

  const totalPayment = useMemo(() => {
    return payments.reduce((sum, payment) => {
      return sum + Number(payment.amount || 0);
    }, 0);
  }, [payments]);

  const remainingAmount = Math.max(0, grandTotal - totalPayment);
  const changeAmount = Math.max(0, totalPayment - grandTotal);

  const getPaymentStatus = (): "Paid" | "Unpaid" | "Partial" => {
    if (grandTotal <= 0) return "Paid";
    if (totalPayment >= grandTotal) return "Paid";
    if (totalPayment > 0) return "Partial";
    return "Unpaid";
  };

  const calculateItemTotal = (
    quantity: number,
    unitPrice: number,
    discount: number,
    taxAmount: number,
    taxInclusive: boolean,
  ) => {
    const basePrice = quantity * unitPrice;

    if (taxInclusive) {
      // Tax inclusive: price already includes tax
      return Math.max(0, basePrice - discount);
    } else {
      // Tax exclusive: add tax
      return Math.max(0, basePrice + taxAmount * quantity - discount);
    }
  };

  const handleCustomerChange = (value: string) => {
    if (value === "walk-in") {
      setCustomerId(null);
      setCustomerName("");
      setCustomerPhone("");
      return;
    }

    const selectedCustomer = customers.find(
      (customer) => customer.id === value,
    );

    if (!selectedCustomer) return;

    setCustomerId(selectedCustomer.id);
    setCustomerName(selectedCustomer.name || "");
    setCustomerPhone(selectedCustomer.phone || "");
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        product_id: "",
        product_name: "",
        quantity: 1,
        unit_price: 0,
        discount_amount: 0,
        tax_amount: 0,
        tax_inclusive: false,
        total_price: 0,
        batch_id: null,
        cost_price: 0,
        profit_amount: 0,
      },
    ]);
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateItem = (
    index: number,
    field: keyof EditableSaleItem,
    value: string | number | boolean,
  ) => {
    setItems((prev) => {
      const updated = [...prev];
      const currentItem = { ...updated[index], [field]: value };

      if (field === "quantity") {
        currentItem.quantity = Math.max(1, Number(value || 1));
      }

      if (field === "unit_price") {
        currentItem.unit_price = Math.max(0, Number(value || 0));
      }

      if (field === "discount_amount") {
        currentItem.discount_amount = Math.max(0, Number(value || 0));
      }

      currentItem.total_price = calculateItemTotal(
        currentItem.quantity,
        currentItem.unit_price,
        currentItem.discount_amount,
        currentItem.tax_amount,
        currentItem.tax_inclusive,
      );

      updated[index] = currentItem;
      return updated;
    });
  };

  const handleProductBatchSelect = (
    index: number,
    selection: ProductBatchSelection | null,
  ) => {
    if (!selection) {
      // Deselect product
      setItems((prev) => {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          product_id: "",
          product_name: "",
          batch_id: null,
          cost_price: 0,
          profit_amount: 0,
        };
        return updated;
      });
      return;
    }

    setItems((prev) => {
      const updated = [...prev];
      const currentItem = { ...updated[index] };

      currentItem.product_id = selection.productId || "";
      currentItem.product_name = selection.productName || "";
      currentItem.batch_id = selection.batchId || null;

      // Use batch price if available, otherwise product price
      if (selection.salePrice !== undefined && selection.salePrice !== null) {
        currentItem.unit_price = selection.salePrice;
      }

      // Set cost price for profit calculation
      if (selection.costPrice !== undefined && selection.costPrice !== null) {
        currentItem.cost_price = selection.costPrice;
      }

      // Calculate profit
      if (currentItem.cost_price || 0 > 0) {
        currentItem.profit_amount =
          (currentItem.unit_price - (currentItem.cost_price || 0)) *
          currentItem.quantity;
      }

      // Reset tax when product/batch changes
      currentItem.tax_amount = 0;
      currentItem.tax_inclusive = false;

      currentItem.total_price = calculateItemTotal(
        currentItem.quantity,
        currentItem.unit_price,
        currentItem.discount_amount,
        currentItem.tax_amount,
        currentItem.tax_inclusive,
      );

      updated[index] = currentItem;
      return updated;
    });
  };

  const handleProductTaxSave = (
    index: number,
    taxAmount: number,
    isInclusive: boolean,
  ) => {
    setItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[index] };

      item.tax_amount = taxAmount;
      item.tax_inclusive = isInclusive;
      item.total_price = calculateItemTotal(
        item.quantity,
        item.unit_price,
        item.discount_amount,
        item.tax_amount,
        item.tax_inclusive,
      );

      updated[index] = item;
      return updated;
    });
  };

  const addPayment = () => {
    setPayments((prev) => [
      ...prev,
      {
        payment_method_id: paymentMethods[0]?.id || "",
        payment_method: paymentMethods[0]?.payment_method || "",
        amount: 0,
      },
    ]);
  };

  const removePayment = (index: number) => {
    setPayments((prev) => prev.filter((_, i) => i !== index));
  };

  const updatePayment = (
    index: number,
    field: keyof EditablePayment,
    value: string | number,
  ) => {
    setPayments((prev) => {
      const updated = [...prev];

      if (field === "amount") {
        updated[index] = {
          ...updated[index],
          amount: Math.max(0, Number(value || 0)),
        };
      } else if (field === "payment_method_id") {
        const method = paymentMethods.find((m) => m.id === String(value));

        updated[index] = {
          ...updated[index],
          payment_method_id: String(value),
          payment_method: method?.payment_method || "",
        };
      } else {
        updated[index] = {
          ...updated[index],
          [field]: value,
        };
      }

      return updated;
    });
  };

  const validateForm = () => {
    if (items.length === 0) {
      toast.error("At least one item is required.");
      return false;
    }

    if (items.some((item) => !item.product_id)) {
      toast.error("Please select a product for all items.");
      return false;
    }

    if (items.some((item) => item.quantity <= 0)) {
      toast.error("Quantity must be greater than 0.");
      return false;
    }

    if (items.some((item) => item.unit_price < 0)) {
      toast.error("Unit price cannot be negative.");
      return false;
    }

    if (items.some((item) => item.discount_amount < 0)) {
      toast.error("Item discount cannot be negative.");
      return false;
    }

    if (items.some((item) => item.tax_amount < 0)) {
      toast.error("Item tax cannot be negative.");
      return false;
    }

    if (discountAmount > subtotal) {
      toast.error("Sale discount cannot be greater than subtotal.");
      return false;
    }

    if (payments.some((payment) => !payment.payment_method_id)) {
      toast.error("Please select a payment method for all payments.");
      return false;
    }

    if (payments.some((payment) => payment.amount < 0)) {
      toast.error("Payment amount cannot be negative.");
      return false;
    }

    if (!customerId && totalPayment < grandTotal) {
      toast.error("Please select a customer or adjust the payment amount.");
      return false;
    }

    if (changeAmount > 0) {
      toast.error(
        "Change amount cannot be greater than 0. Please adjust the payment or grand total.",
      );
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    const hasTaxInclusive = items.some((item) => item.tax_inclusive);

    const updatedSale = {
      ...sale,
      customer_id: customerId,
      customer_name: customerName.trim() || null,
      customer_phone: customerPhone.trim() || null,
      subtotal,
      discount_amount: discountAmount,
      tax_amount: totalTax,
      is_tax_inclusive: hasTaxInclusive,
      grand_total: grandTotal,
      paid_amount: totalPayment,
      change_amount: changeAmount,
      remaining_amount: remainingAmount,
      sale_status: saleStatus,
      payment_status: getPaymentStatus(),
      notes: notes.trim() || null,

      payments: payments.map((payment) => ({
        id: payment.id,
        sale_id: sale.id,
        payment_method_id: payment.payment_method_id,
        amount: Number(payment.amount || 0),
      })),

      items: items.map((item) => ({
        id: item.id,
        sale_id: sale.id,
        product_id: item.product_id,
        batch_id: item.batch_id || null,
        product_name: item.product_name,
        quantity: Number(item.quantity || 1),
        unit_price: Number(item.unit_price || 0),
        discount_amount: Number(item.discount_amount || 0),
        tax_amount: Number(item.tax_amount || 0),
        total_price: Number(item.total_price || 0),
        cost_price: Number(item.cost_price || 0),
        profit_amount: Number(item.profit_amount || 0),
      })),
    } as any;

    try {
      let targetSaleId = sale.id;

      if (isQuickSaleConversion && quickSaleId) {
        const createSaleResponse =
          await createSaleMutation.mutateAsync(updatedSale);

        targetSaleId = createSaleResponse.data.id;

        await convertQuickSaleMutation.mutateAsync({
          id: quickSaleId,
          converted_sale_id: targetSaleId,
        });

        toast.success("Sale created successfully from quick sale.");
      } else {
        await updateSaleMutation.mutateAsync(updatedSale);
        toast.success("Sale updated successfully.");
      }

      if (paymentProofFile && targetSaleId) {
        await uploadPaymentProof.mutateAsync({
          id: targetSaleId,
          file: paymentProofFile,
        });
      }

      onClose();
    } catch (error) {
      console.error("Failed to update sale:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const paymentStatus = getPaymentStatus();

  return (
    <>
      <div className="fixed inset-0 z-50 flex max-h-screen items-start justify-center overflow-y-auto p-4">
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
          onClick={onClose}
        />

        <div className="relative my-8 max-h-[85vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl">
          <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-3xl border-b border-slate-200 bg-white px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-slate-900 p-2">
                <Receipt className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {isQuickSaleConversion ? "Create Sale" : "Edit Sale"}
                </h2>
                <p className="text-sm text-slate-500">
                  Invoice: {sale.invoice_no}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl p-2 cursor-pointer text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 p-6">
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-slate-700">
                  Customer
                </label>
                <DropdownWithSearch
                  options={
                    customers.map((c) => ({
                      id: c.id,
                      label: c.name,
                      sublabel: c.phone,
                      metadata: c,
                    })) || []
                  }
                  selectedId={customerId}
                  onSelect={(option) =>
                    handleCustomerChange(String(option?.id || "walk-in"))
                  }
                  isLoading={isCustomersLoading}
                  placeholder="Walk-in customer"
                  disabled={isCustomersLoading}
                  searchPlaceholder="Search for a customer..."
                  onSearch={(searchTerm) => setSearchCustomer(searchTerm)}
                  showAddNew={true}
                  onAddNew={() => setIsModalOpen(true)}
                  addNewLabel="Create new customer"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Customer Name
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                  placeholder="Walk-in customer"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Customer Phone
                </label>
                <input
                  type="text"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                  placeholder="Phone number"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-slate-700">
                  Sale Status
                </label>
                <select
                  value={saleStatus}
                  onChange={(e) =>
                    setSaleStatus(e.target.value as Sale["sale_status"])
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                >
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                  <option value="Returned">Returned</option>
                </select>
              </div>
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">Items</h3>
                <button
                  type="button"
                  onClick={addItem}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Item
                </button>
              </div>

              <div className="space-y-3">
                {items.map((item, index) => (
                  <div
                    key={`${item.id || "new"}-${index}`}
                    className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/50 p-4"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
                      <div className="flex shrink-0 h-16 w-16 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white">
                        {item.product_id &&
                        productPhotoById[item.product_id] ? (
                          <Image
                            src={productPhotoById[item.product_id] as string}
                            alt={item.product_name}
                            width={64}
                            height={64}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Package className="h-6 w-6 text-slate-300" />
                        )}
                      </div>

                      <div className="flex-1 space-y-2">
                        <label className="text-xs font-medium text-slate-500">
                          Product
                        </label>
                        <ProductBatchDropdown
                          selectedProductId={item.product_id || null}
                          selectedBatchId={item.batch_id || null}
                          onSelect={(selection) =>
                            handleProductBatchSelect(index, selection)
                          }
                          placeholder="Select product or batch"
                          searchPlaceholder="Search products by name or SKU..."
                          emptyMessage="No products found"
                          showBatchQuantities={true}
                          showBatchPrices={true}
                          maxHeight="max-h-64"
                        />
                      </div>

                      <div className="space-y-2 lg:w-24">
                        <label className="text-xs font-medium text-slate-500">
                          Quantity
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={String(item.quantity)}
                          onChange={(e) =>
                            updateItem(
                              index,
                              "quantity",
                              Number(e.target.value),
                            )
                          }
                          onWheel={(e) => e.currentTarget.blur()}
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                          required
                        />
                      </div>

                      <div className="space-y-2 lg:w-28">
                        <label className="text-xs font-medium text-slate-500">
                          Unit Price
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={String(item.unit_price)}
                          onChange={(e) =>
                            updateItem(
                              index,
                              "unit_price",
                              Number(e.target.value),
                            )
                          }
                          onWheel={(e) => e.currentTarget.blur()}
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                          required
                        />
                      </div>

                      <div className="space-y-2 lg:w-28">
                        <label className="text-xs font-medium text-slate-500">
                          Discount
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={String(item.discount_amount)}
                          onChange={(e) =>
                            updateItem(
                              index,
                              "discount_amount",
                              Number(e.target.value),
                            )
                          }
                          onWheel={(e) => e.currentTarget.blur()}
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                        />
                      </div>

                      <div className="space-y-2 lg:w-28">
                        <label className="text-xs font-medium text-slate-500">
                          Total
                        </label>
                        <input
                          type="text"
                          value={money(item.total_price)}
                          className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-sm font-medium text-slate-900"
                          disabled
                        />
                      </div>

                      <div className="flex items-end gap-1">
                        {/* Tax Button */}
                        <button
                          type="button"
                          onClick={() => setEditingTaxItem({ item, index })}
                          className={`rounded-xl p-2 cursor-pointer transition ${
                            item.tax_amount > 0
                              ? "bg-blue-50 text-blue-600 hover:bg-blue-100"
                              : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                          }`}
                          title="Set product tax"
                        >
                          <Percent className="h-4 w-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="rounded-xl p-2 cursor-pointer text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Tax Info Display */}
                    {item.tax_amount > 0 && (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                          Tax: Rs. {item.tax_amount}/unit
                        </span>
                        {item.tax_inclusive && (
                          <span className="text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
                            Inclusive
                          </span>
                        )}
                        <span className="text-slate-500">
                          Total tax: Rs.{" "}
                          {(item.tax_amount * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                ))}

                {items.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center">
                    <p className="text-sm text-slate-500">No items added yet</p>
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Sale Discount
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={String(discountAmount)}
                  onChange={(e) => setDiscountAmount(Number(e.target.value))}
                  onWheel={(e) => e.currentTarget.blur()}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Notes
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                  placeholder="Optional notes"
                />
              </div>
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">
                  Payments
                </h3>
                <button
                  type="button"
                  onClick={addPayment}
                  disabled={paymentMethods.length === 0}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Payment
                </button>
              </div>

              <div className="space-y-3">
                {payments.map((payment, index) => (
                  <div
                    key={`${payment.id || "new"}-${index}`}
                    className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/50 p-4 md:flex-row md:items-end"
                  >
                    <div className="flex-1 space-y-2">
                      <label className="text-xs font-medium text-slate-500">
                        Payment Method
                      </label>
                      <select
                        value={payment.payment_method_id}
                        onChange={(e) =>
                          updatePayment(
                            index,
                            "payment_method_id",
                            e.target.value,
                          )
                        }
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                        required
                      >
                        <option value="">Select method</option>
                        {paymentMethods.map((method) => (
                          <option key={method.id} value={method.id}>
                            {method.payment_method}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2 md:w-40">
                      <label className="text-xs font-medium text-slate-500">
                        Amount
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={String(payment.amount)}
                        onChange={(e) =>
                          updatePayment(index, "amount", Number(e.target.value))
                        }
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                        required
                        onWheel={(e) => e.currentTarget.blur()}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => removePayment(index)}
                      className="rounded-xl p-2 cursor-pointer text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}

                {payments.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center">
                    <p className="text-sm text-slate-500">
                      No payments added yet
                    </p>
                  </div>
                )}
              </div>
            </div>

            {(paymentProofUrl ||
              payments.some(
                (p) =>
                  paymentMethods.find((m) => m.id === p.payment_method_id)
                    ?.type !== "Cash",
              )) && (
              <div className="rounded-2xl border border-slate-200 p-4">
                <h3 className="mb-3 text-sm font-semibold text-slate-900">
                  Online Payment Proof
                </h3>

                {paymentProofUrl && !paymentProofFile ? (
                  <div className="space-y-2">
                    <a
                      href={paymentProofUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <img
                        src={paymentProofUrl}
                        alt="Payment proof"
                        className="max-h-48 rounded-xl border border-slate-200 object-contain"
                      />
                    </a>
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50">
                      <ImagePlus size={14} />
                      Replace photo
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) setPaymentProofFile(file);
                        }}
                      />
                    </label>
                  </div>
                ) : paymentProofFile ? (
                  <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    <span className="truncate">{paymentProofFile.name}</span>
                    <button
                      type="button"
                      onClick={() => setPaymentProofFile(null)}
                      className="ml-2 shrink-0 text-red-500 hover:text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 px-3 py-3 text-sm text-slate-500 hover:border-slate-400">
                    <ImagePlus size={16} />
                    Attach screenshot/photo of payment (optional)
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setPaymentProofFile(file);
                      }}
                    />
                  </label>
                )}
              </div>
            )}

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="mb-4 text-sm font-semibold text-slate-900">
                Summary
              </h3>

              <div className="grid gap-3 text-sm md:grid-cols-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Subtotal</span>
                  <span className="font-medium text-slate-900">
                    {money(subtotal)}
                  </span>
                </div>

                {totalTax > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">
                      Tax
                      {items.some((item) => item.tax_inclusive) &&
                        " (Some items inclusive)"}
                    </span>
                    <span className="font-medium text-blue-600">
                      + {money(totalTax)}
                    </span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="text-slate-500">Sale Discount</span>
                  <span className="font-medium text-green-600">
                    - {money(discountAmount)}
                  </span>
                </div>

                <div className="flex justify-between border-t border-slate-200 pt-3">
                  <span className="font-semibold text-slate-900">
                    Grand Total
                  </span>
                  <span className="font-semibold text-slate-900">
                    {money(grandTotal)}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-500">Total Paid</span>
                  <span className="font-medium text-emerald-700">
                    {money(totalPayment)}
                  </span>
                </div>

                {remainingAmount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Remaining</span>
                    <span className="font-medium text-rose-700">
                      {money(remainingAmount)}
                    </span>
                  </div>
                )}

                {changeAmount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Change</span>
                    <span className="font-medium text-blue-700">
                      {money(changeAmount)}
                    </span>
                  </div>
                )}

                <div className="flex justify-between border-t border-slate-200 pt-3">
                  <span className="text-slate-500">Payment Status</span>
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      paymentStatus === "Paid"
                        ? "bg-green-100 text-green-700"
                        : paymentStatus === "Partial"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-red-100 text-red-700"
                    }`}
                  >
                    {paymentStatus}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 rounded-xl cursor-pointer border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting || items.length === 0}
                className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {isSubmitting
                  ? "Saving..."
                  : isQuickSaleConversion
                    ? "Create Sale"
                    : "Update Sale"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Product Tax Modal */}
      {editingTaxItem && (
        <ProductTaxModal
          item={editingTaxItem.item}
          onClose={() => setEditingTaxItem(null)}
          onSave={(taxAmount, isInclusive) => {
            handleProductTaxSave(editingTaxItem.index, taxAmount, isInclusive);
            setEditingTaxItem(null);
          }}
        />
      )}

      {isModalOpen && <CustomerModal setIsModalOpen={setIsModalOpen} />}
      {showProductModal && (
        <ProductModal closeModal={() => setShowProductModal(false)} />
      )}
    </>
  );
}
