"use client";

import { useMemo, useRef, useState } from "react";
import { useProducts } from "@/hooks/useProducts";
import { usePaymentMethods } from "@/hooks/usePaymentMethods";
import { useCreateSale, useUploadSalePaymentProof } from "@/hooks/useSales";
import {
  Search,
  CreditCard,
  Banknote,
  QrCode,
  Package,
  X,
  ShoppingCart,
} from "lucide-react";
import {
  useCustomers,
  useCreateCustomer,
  useUpdateCustomer,
  Customer,
} from "@/hooks/useCustomers";
import CustomerModal from "@/components/customers/modal";
import BillingSection from "@/components/pos/billing";
import type { PaymentMethod } from "@/hooks/usePaymentMethods";
import type { Product } from "@/hooks/useProducts";
import ProductGrid from "@/components/pos/productGrid";
import { useCategories } from "@/hooks/useCategories";
import type { SalePayment } from "@/hooks/useSales";
import toast from "react-hot-toast";
import { useDebounced } from "@/hooks/useDebounced";
import ReceiptPrinter, { ReceiptData } from "@/components/pos/ReceiptPrinter";
import { prepareReceiptData } from "@/utils/receiptHelper";
import { useStore } from "@/hooks/useStoreInfo";
export type CartItem = {
  product_id: string;
  product_name: string;
  sku: string;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  tax_amount?: number;
  tax_inclusive?: boolean;
  total_price: number;
  batch_id?: string;
  batch_number?: string;
  cost_price?: number;
};

const emptyCustomerForm: Omit<Customer, "id" | "created_at" | "updated_at"> = {
  name: "",
  phone: "",
  email: "",
  address: "",
  credit_amount: 0,
  credit_limit: 0,
  status: "Active",
  notes: "",
};

export default function PointOfSalesPage() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounced(search, 300);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  const [showQrModal, setShowQrModal] = useState(false);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
  const [formData, setFormData] = useState(emptyCustomerForm);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | "all">(
    "all",
  );
  const [isDiscountEnabled, setIsDiscountEnabled] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  // Below xl the layout stacks (products above, bill below). The bill
  // stays in normal document flow - a sticky summary bar just scrolls to
  // it, rather than trying to overlay it as a fixed sheet.
  const billingRef = useRef<HTMLDivElement>(null);

  const { data: categoriesData } = useCategories();

  const categories = categoriesData?.data ?? [];

  const { data: productsData, isLoading } = useProducts({
    search: debouncedSearch,
    status: "Active",
    page: 1,
    limit: 50,
    category: selectedCategoryId === "all" ? "" : selectedCategoryId,
  });

  const { data: storeData } = useStore();
  const store = storeData?.data || null;

  const { data: paymentMethodsData } = usePaymentMethods(1, 100, "Active");
  const [payments, setPayments] = useState<SalePayment[]>([]);
  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);
  const uploadPaymentProof = useUploadSalePaymentProof();

  const createSale = useCreateSale();
  const { data: customersData } = useCustomers(1, 100, "", "Active");
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();

  const customers = customersData?.data ?? [];

  const selectedBillCustomer = customers.find(
    (customer) => customer.id === customerId,
  );

  const products = productsData?.data ?? [];
  const paymentMethods = paymentMethodsData?.data ?? [];

  // Calculate subtotal (before tax)
  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.unit_price * item.quantity,
    0,
  );

  // Calculate total tax from all products
  const totalTax = cartItems.reduce(
    (sum, item) => sum + (item.tax_amount || 0) * item.quantity,
    0,
  );

  // Calculate total price including tax (considering tax inclusive)
  const totalWithTax = cartItems.reduce((sum, item) => {
    const basePrice = item.unit_price * item.quantity;
    const taxAmount = (item.tax_amount || 0) * item.quantity;

    if (item.tax_inclusive) {
      // If tax inclusive, total_price already includes tax
      return sum + item.total_price - item.discount_amount;
    } else {
      // If tax exclusive, add tax on top
      return sum + item.total_price + taxAmount - item.discount_amount;
    }
  }, 0);

  const paidAmount = payments.reduce(
    (sum, payment) => sum + Number(payment.amount || 0),
    0,
  );

  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">(
    "percentage",
  );
  const [discountValue, setDiscountValue] = useState(0);

  const grandTotal = useMemo(() => {
    let total = cartItems.reduce((sum, item) => {
      if (item.tax_inclusive) {
        return sum + item.total_price;
      } else {
        return (
          sum +
          item.unit_price * item.quantity +
          (item.tax_amount || 0) * item.quantity
        );
      }
    }, 0);

    // Apply global discount
    total -= discountAmount;

    return Math.max(0, total);
  }, [cartItems, discountAmount]);

  const changeAmount = Math.max(paidAmount - grandTotal, 0);
  const remainingAmount = Math.max(grandTotal - paidAmount, 0);

  const cartSummary = {
    subtotal,
    totalItems: cartItems.reduce(
      (sum, item) => sum + Number(item.quantity || 0),
      0,
    ),
    grandTotal,
    changeAmount,
    remainingAmount,
  };

  const selectedPaymentMethod = paymentMethods.find(
    (method: PaymentMethod) =>
      method.id ===
      payments.find((payment) => payment.payment_method_id)?.payment_method_id,
  );

  const addToCart = (
    product: Product,
    unitPrice?: number,
    batchId?: string,
  ) => {
    const price = unitPrice || product.sale_price;

    const selectedBatch = batchId
      ? product.batches?.find((b) => b.id === batchId)
      : null;

    const costPrice = selectedBatch?.cost_price ?? product.cost_price;

    const availableStock = selectedBatch
      ? selectedBatch.quantity
      : product.stock_quantity;

    if (availableStock <= 0) return;

    setCartItems((prev) => {
      const existingItem = prev.find(
        (item) =>
          item.product_id === product.id &&
          (batchId ? item.batch_id === batchId : !item.batch_id),
      );

      if (existingItem) {
        if (existingItem.quantity >= availableStock) return prev;

        return prev.map((item) => {
          if (
            item.product_id !== product.id ||
            (batchId ? item.batch_id !== batchId : item.batch_id)
          )
            return item;

          const newQuantity = item.quantity + 1;
          const basePrice = newQuantity * item.unit_price;
          const taxAmount = (item.tax_amount || 0) * newQuantity;

          return {
            ...item,
            quantity: newQuantity,
            total_price: item.tax_inclusive
              ? basePrice
              : basePrice + taxAmount - item.discount_amount,
          };
        });
      }

      return [
        ...prev,
        {
          product_id: product.id,
          product_name: product.product_name,
          sku: product.sku,
          quantity: 1,
          unit_price: price,
          discount_amount: 0,
          tax_amount: 0,
          tax_inclusive: false,
          total_price: price,
          cost_price: costPrice,
          batch_id: batchId,
          batch_number: selectedBatch?.batch_number,
        },
      ];
    });
  };

  // Updated removeFromCart function
  const removeFromCart = (productId: string, batchId?: string) => {
    setCartItems((prev) =>
      prev.filter((item) => {
        if (batchId) {
          // Remove specific batch item
          return !(item.product_id === productId && item.batch_id === batchId);
        } else {
          // Remove standard (non-batch) item
          return !(item.product_id === productId && !item.batch_id);
        }
      }),
    );
  };

  // Updated updateQuantity function
  const updateQuantity = (
    productId: string,
    delta: number,
    batchId?: string,
  ) => {
    setCartItems((prev) =>
      prev.map((item) => {
        // Check if this is the correct item to update
        const isCorrectItem = batchId
          ? item.product_id === productId && item.batch_id === batchId
          : item.product_id === productId && !item.batch_id;

        if (!isCorrectItem) return item;

        const product = products.find((p) => p.id === productId);
        const newQuantity = item.quantity + delta;

        if (newQuantity <= 0) return item;
        if (product && newQuantity > product.stock_quantity) {
          return item;
        }

        const basePrice = newQuantity * item.unit_price;
        const taxAmount = (item.tax_amount || 0) * newQuantity;

        return {
          ...item,
          quantity: newQuantity,
          total_price: item.tax_inclusive
            ? basePrice
            : basePrice + taxAmount - item.discount_amount,
        };
      }),
    );
  };

  // Updated updateProductTax function
  const updateProductTax = (
    productId: string,
    taxAmount: number,
    batchId?: string,
  ) => {
    setCartItems((prev) =>
      prev.map((item) => {
        const isCorrectItem = batchId
          ? item.product_id === productId && item.batch_id === batchId
          : item.product_id === productId && !item.batch_id;

        if (!isCorrectItem) return item;

        const basePrice = item.unit_price * item.quantity;
        const newTaxAmount = taxAmount * item.quantity;

        return {
          ...item,
          tax_amount: taxAmount,
          total_price: item.tax_inclusive
            ? basePrice
            : basePrice + newTaxAmount - item.discount_amount,
        };
      }),
    );
  };

  // Updated updateProductTaxInclusive function
  const updateProductTaxInclusive = (
    productId: string,
    isInclusive: boolean,
    batchId?: string,
  ) => {
    setCartItems((prev) =>
      prev.map((item) => {
        const isCorrectItem = batchId
          ? item.product_id === productId && item.batch_id === batchId
          : item.product_id === productId && !item.batch_id;

        if (!isCorrectItem) return item;

        const basePrice = item.unit_price * item.quantity;
        const taxAmount = (item.tax_amount || 0) * item.quantity;

        return {
          ...item,
          tax_inclusive: isInclusive,
          total_price: isInclusive
            ? basePrice
            : basePrice + taxAmount - item.discount_amount,
        };
      }),
    );
  };

  const handleCheckout = () => {
    if (cartItems.length === 0) {
      toast.error("Please add at least one product to the cart");
      return;
    }
    const validPayments = payments.filter(
      (payment) => payment.payment_method_id && Number(payment.amount) > 0,
    );

    if (validPayments.length === 0) {
      toast.error("Please add at least one valid payment method");
      return;
    }

    if (customerId === null && paidAmount < grandTotal) {
      toast.error("Please select a customer or adjust the payment amount");
      return;
    }

    if (changeAmount > 0) {
      toast.error(
        "Change amount is greater than 0. Please adjust the payment amount.",
      );
      return;
    }

    // Calculate total tax from all products
    const totalTaxAmount = cartItems.reduce(
      (sum, item) => sum + (item.tax_amount || 0) * item.quantity,
      0,
    );

    const hasTaxInclusive = cartItems.some((item) => item.tax_inclusive);

    createSale.mutate(
      {
        invoice_no: `INV-${Date.now()}`,
        customer_id: customerId,
        customer_name: selectedBillCustomer?.name ?? null,
        customer_phone: selectedBillCustomer?.phone ?? null,
        subtotal: subtotal,
        tax_amount: totalTaxAmount,
        discount_amount: discountAmount,
        grand_total: grandTotal,
        paid_amount: paidAmount,
        change_amount: changeAmount,
        remaining_amount: remainingAmount,
        payments: validPayments,
        payment_status: paidAmount >= grandTotal ? "Paid" : "Partial",
        sale_status: "Completed",
        notes: null,
        items: cartItems.map((item) => ({
          ...item,
          tax_amount: item.tax_amount || 0,
          tax_inclusive: item.tax_inclusive || false,
        })),
        is_tax_inclusive: hasTaxInclusive,
      },
      {
        onSuccess: (data) => {
          const receipt = prepareReceiptData(
            data.data.invoice_no || `INV-${Date.now()}`,
            cartItems,
            validPayments,
            paymentMethods,
            {
              subtotal,
              discountAmount,
              taxAmount: totalTaxAmount,
              grandTotal,
              paidAmount,
              changeAmount,
              remainingAmount,
            },
            {
              customerName: selectedBillCustomer?.name,
              customerPhone: selectedBillCustomer?.phone,
              cashierName: "Admin",
              store,
            },
          );

          if (paymentProofFile && data.data.id) {
            uploadPaymentProof.mutate({
              id: data.data.id,
              file: paymentProofFile,
            });
          }

          setReceiptData(receipt);
          setShowReceipt(true);
          setCartItems([]);
          setPayments([]);
          setPaymentProofFile(null);
          setShowQrModal(false);
          setCustomerId(null);
          setDiscountAmount(0);
          setDiscountValue(0);
          setIsDiscountEnabled(false);
          toast.success("Sale completed successfully");
        },
      },
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedCustomer) {
      await updateCustomer.mutateAsync({
        ...selectedCustomer,
        ...formData,
      });
    } else {
      const res = await createCustomer.mutateAsync(formData);

      if (res?.data?.id) {
        setCustomerId(res.data.id);
      }
    }

    setIsModalOpen(false);
    setSelectedCustomer(null);
    setFormData(emptyCustomerForm);
    resetSale();
  };

  const resetSale = () => {
    setPayments([]);
    setCustomerId(null);
    setDiscountAmount(0);
    setDiscountValue(0);
    setIsDiscountEnabled(false);
    setSelectedCategoryId("all");
  };

  return (
    <div className="h-auto xl:h-screen flex flex-col xl:flex-row gap-4 p-4 pb-20 xl:pb-4 bg-gray-50 overflow-y-auto">
      {/* Products Section */}
      <div className="flex-1 flex flex-col bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <div className="flex flex-col lg:flex-row items-left lg:items-center gap-4 justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Point of Sale
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Select products to add to bill
              </p>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products..."
                className="w-full md:w-80 pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 transition-all"
              />
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setSelectedCategoryId("all")}
              className={`cursor-pointer shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                selectedCategoryId === "all"
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              All Products
            </button>

            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategoryId(String(category.id))}
                className={`cursor-pointer shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  selectedCategoryId === String(category.id)
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {category.category_name}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="min-h-[300px] flex-1 flex items-center justify-center">
            <Package className="h-12 w-12 text-gray-300 animate-pulse" />
          </div>
        ) : (
          <ProductGrid
            products={products}
            cartItems={cartItems}
            addToCart={addToCart}
          />
        )}
      </div>

      {/* Billing Section - normal document flow at every width (stacked
          below the products on mobile, side-by-side at xl+). The sticky
          bar below just scrolls down to this ref instead of overlaying
          it, so there's nothing here that can conflict with billing's own
          internal modals (tax edit, etc.), which are also fixed/z-50. */}
      <div ref={billingRef}>
        <BillingSection
          cartItems={cartItems}
          cartSummary={cartSummary}
          removeFromCart={removeFromCart}
          updateQuantity={updateQuantity}
          updateProductTax={updateProductTax}
          updateProductTaxInclusive={updateProductTaxInclusive}
          customerId={customerId}
          setCustomerId={setCustomerId}
          openCustomerModal={(customer) => {
            setSelectedCustomer(customer || null);
            setFormData(customer || emptyCustomerForm);
            setIsModalOpen(true);
          }}
          paymentMethods={paymentMethods}
          payments={payments}
          setPayments={setPayments}
          paymentProofFile={paymentProofFile}
          setPaymentProofFile={setPaymentProofFile}
          paidAmount={paidAmount}
          handleCheckout={handleCheckout}
          isCheckingOut={createSale.isPending}
          isDiscountEnabled={isDiscountEnabled}
          setIsDiscountEnabled={setIsDiscountEnabled}
          discountAmount={discountAmount}
          setDiscountAmount={setDiscountAmount}
          discountType={discountType}
          setDiscountType={setDiscountType}
          discountValue={discountValue}
          setDiscountValue={setDiscountValue}
        />
      </div>

      {/* Mobile sticky summary bar - scrolls down to the bill above.
          Just one fixed element, nothing it can overlap with. */}
      {cartItems.length > 0 && (
        <button
          type="button"
          onClick={() =>
            billingRef.current?.scrollIntoView({
              behavior: "smooth",
              block: "start",
            })
          }
          className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-2 border-t border-gray-200 bg-gray-900 px-4 py-3 text-white shadow-2xl xl:hidden"
        >
          <span className="flex min-w-0 items-center gap-2 text-sm font-semibold">
            <ShoppingCart className="h-4 w-4 shrink-0" />
            <span className="truncate">
              {cartSummary.totalItems} item
              {cartSummary.totalItems === 1 ? "" : "s"} · Rs.{" "}
              {cartSummary.grandTotal.toLocaleString()}
            </span>
          </span>
          <span className="shrink-0 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-gray-900">
            View Bill
          </span>
        </button>
      )}

      {/* QR Modal */}
      {showQrModal && selectedPaymentMethod?.qr_code && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {selectedPaymentMethod.payment_method}
              </h3>
              <button
                onClick={() => setShowQrModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="bg-gray-50 rounded-xl p-6 mb-4">
              <img
                src={selectedPaymentMethod.qr_code}
                alt={selectedPaymentMethod.payment_method}
                className="w-full h-64 object-contain"
              />
            </div>

            <p className="text-center text-gray-600 text-sm">
              Scan QR code to pay Rs. {cartSummary.grandTotal}
            </p>

            <button
              onClick={() => setShowQrModal(false)}
              className="w-full mt-4 bg-gray-900 text-white py-3 rounded-xl hover:bg-gray-800 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
      {isModalOpen && (
        <CustomerModal
          selectedCustomer={selectedCustomer}
          setIsModalOpen={setIsModalOpen}
          formData={formData}
          setFormData={setFormData}
          handleSubmit={handleSubmit}
          createCustomer={createCustomer}
          updateCustomer={updateCustomer}
        />
      )}

      {showReceipt && receiptData && (
        <ReceiptPrinter
          data={receiptData}
          onClose={() => setShowReceipt(false)}
        />
      )}
    </div>
  );
}
