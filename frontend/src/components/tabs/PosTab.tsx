"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useProducts, useProductModels } from "@/hooks/useProducts";
import { compareModelOrSize } from "@/lib/phoneModels";
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
import Tn from "@/components/layout/Tn";
import { linePhoto } from "@/components/catalog/image";
import { useLang } from "@/lib/i18n";
import { CardGridSkeleton, SlowNotice } from "@/components/layout/Skeleton";
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
  // the line's colour photo, or the product's cover
  photo_url?: string | null;
  cost_price?: number;
  // Optional: price actually charged when lower than the marked unit_price
  sold_price?: number;
  discount_reason?: string;
};

// Single place that works out an item's discount and line total, so quantity,
// tax and "sold at" changes can never disagree with each other.
const repriceItem = (item: CartItem): CartItem => {
  const discount =
    item.sold_price !== undefined && item.sold_price < item.unit_price
      ? Math.round((item.unit_price - item.sold_price) * item.quantity * 100) / 100
      : 0;
  const gross = item.unit_price * item.quantity - discount;
  const tax = (item.tax_amount || 0) * item.quantity;

  return {
    ...item,
    discount_amount: discount,
    total_price: item.tax_inclusive ? gross : gross + tax,
  };
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
  const { t } = useLang();
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
  // is the bill on screen? (mobile bar then offers to go back to products)
  const [billInView, setBillInView] = useState(false);
  useEffect(() => {
    const el = billingRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setBillInView(entry.isIntersecting),
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const { data: categoriesData } = useCategories();

  const categories = categoriesData?.data ?? [];

  // Phone model chosen inside a category, e.g. "iPhone 13 Pro" under Covers
  const [selectedModel, setSelectedModel] = useState("");
  const [sortBy, setSortBy] = useState<
    "" | "price_asc" | "price_desc" | "name_asc"
  >("");
  // "Load more" just grows the page size; it resets whenever a filter changes
  const PAGE_SIZE = 48;
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [lastCategoryId, setLastCategoryId] = useState(selectedCategoryId);
  if (selectedCategoryId !== lastCategoryId) {
    setLastCategoryId(selectedCategoryId);
    setSelectedModel("");
  }
  const filterKey = `${debouncedSearch}|${selectedCategoryId}|${selectedModel}|${sortBy}`;
  const [lastFilterKey, setLastFilterKey] = useState(filterKey);
  if (filterKey !== lastFilterKey) {
    setLastFilterKey(filterKey);
    setLimit(PAGE_SIZE);
  }

  // the model chips show two rows until "Show all models" is tapped
  const [showAllModels, setShowAllModels] = useState(false);
  const { data: categoryModels = [] } = useProductModels(
    selectedCategoryId === "all" ? "" : selectedCategoryId,
  );
  // One straight line: sizes S, M, L..., iPhone X ... 11, 11 Pro, 12..., others A-Z
  const sortedModels = useMemo(
    () =>
      // Sold-out models are hidden (the selected one stays so it can be cleared)
      categoryModels
        .filter((m) => m.quantity > 0 || m.model === selectedModel)
        .sort((a, b) => compareModelOrSize(a.model, b.model)),
    [categoryModels, selectedModel],
  );

  const {
    data: productsData,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useProducts({
    search: debouncedSearch.trim(),
    status: "Active",
    page: 1,
    limit,
    category: selectedCategoryId === "all" ? "" : selectedCategoryId,
    model: selectedModel,
    sort: sortBy,
  });
  const totalProducts = productsData?.totalCount ?? 0;
  // Still fetching a bigger page while the current one is on screen
  const isLoadingMore =
    isFetching && (productsData?.data.length ?? 0) < limit &&
    (productsData?.data.length ?? 0) < totalProducts;
  const hasActiveFilters =
    search !== "" ||
    selectedCategoryId !== "all" ||
    sortBy !== "";
  const clearFilters = () => {
    setSearch("");
    setSelectedCategoryId("all");
    setSelectedModel("");
    setSortBy("");
  };

  const { data: storeData } = useStore();
  const store = storeData?.data || null;

  const { data: paymentMethodsData, isLoading: paymentMethodsLoading } =
    usePaymentMethods(1, 100, "Active");
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
    let total = cartItems.reduce((sum, item) => sum + item.total_price, 0);

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

          return repriceItem({ ...item, quantity: item.quantity + 1 });
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
          photo_url: linePhoto(product, selectedBatch),
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
        // Stock limit comes from the phone model / batch when one was chosen
        const stockLimit = item.batch_id
          ? (product?.batches?.find((b) => b.id === item.batch_id)?.quantity ??
            product?.stock_quantity ??
            0)
          : (product?.stock_quantity ?? 0);
        if (product && newQuantity > stockLimit) {
          return item;
        }

        return repriceItem({ ...item, quantity: newQuantity });
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

        return repriceItem({ ...item, tax_amount: taxAmount });
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

        return repriceItem({ ...item, tax_inclusive: isInclusive });
      }),
    );
  };

  // Optional per-item "sold at" price (lower than marked) and the reason why.
  // Works the same for cash and online payments: the discount is stored on
  // the sale item, and the payment is whatever was actually paid.
  const updateItemDiscount = (
    productId: string,
    batchId: string | undefined,
    patch: { sold_price?: number | undefined; discount_reason?: string },
  ) => {
    setCartItems((prev) =>
      prev.map((item) => {
        const isCorrectItem = batchId
          ? item.product_id === productId && item.batch_id === batchId
          : item.product_id === productId && !item.batch_id;

        if (!isCorrectItem) return item;

        return repriceItem({ ...item, ...patch });
      }),
    );
  };

  const handleCheckout = () => {
    if (cartItems.length === 0) {
      toast.error(t("Please add at least one product to the cart"));
      return;
    }
    const validPayments = payments.filter(
      (payment) => payment.payment_method_id && Number(payment.amount) > 0,
    );

    // A Rs 0 bill can go through without any payment method
    if (validPayments.length === 0 && grandTotal > 0) {
      toast.error(t("Please add at least one valid payment method"));
      return;
    }

    if (customerId === null && paidAmount < grandTotal) {
      toast.error(t("Please select a customer or adjust the payment amount"));
      return;
    }

    if (changeAmount > 0) {
      toast.error(
        t("Change amount is greater than 0. Please adjust the payment amount."),
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
          toast.success(t("Sale completed successfully"));
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
    // At xl the POS fills the shell's <main> (which already sits under the
    // app header), and the product grid and the bill each scroll on their own.
    <div className="h-auto xl:h-full xl:min-h-0 flex flex-col xl:flex-row gap-4 p-4 pb-[calc(5rem+env(safe-area-inset-bottom))] xl:pb-4 bg-gray-50 xl:overflow-hidden">
      {/* Products Section */}
      <div className="flex-1 min-h-0 min-w-0 flex flex-col bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-4 sm:px-6 border-b border-gray-100 space-y-3">
          <div className="flex flex-col lg:flex-row items-left lg:items-center gap-3 justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {t("Point of Sale")}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {t("Select products to add to bill")}
              </p>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("Search name, phone model or barcode...")}
                className="w-full md:w-80 pl-10 pr-9 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 transition-all"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                  aria-label={t("Clear search")}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="cursor-pointer rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
              aria-label={t("Sort products")}
            >
              <option value="">{t("Newest first")}</option>
              <option value="price_asc">{t("Price: low to high")}</option>
              <option value="price_desc">{t("Price: high to low")}</option>
              <option value="name_asc">{t("Name: A to Z")}</option>
            </select>

            <span className="text-sm text-gray-500">
              {totalProducts} {totalProducts === 1 ? t("product") : t("products")}
            </span>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="cursor-pointer text-sm font-medium text-gray-700 underline-offset-2 hover:underline"
              >
                {t("Clear filters")}
              </button>
            )}
          </div>
        </div>

        <div className="px-4 py-3 sm:px-6 border-b border-gray-100">
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setSelectedCategoryId("all")}
              className={`cursor-pointer shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                selectedCategoryId === "all"
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {t("All Products")}
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
                <Tn v={category.category_name} />
              </button>
            ))}
          </div>

          {/* Phone models inside the chosen category (e.g. Covers ->
              iPhone 13, iPhone 13 Pro...). Wraps and scrolls so a long
              list stays usable with a mouse, not just by swiping. */}
          {sortedModels.length > 0 && (
            <>
            <div
              className={`mt-3 flex flex-wrap gap-1.5 ${
                showAllModels ? "" : "max-h-[4.75rem] overflow-hidden"
              }`}
            >
              <button
                type="button"
                onClick={() => setSelectedModel("")}
                className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                  selectedModel === ""
                    ? "border-gray-900 bg-gray-900 text-white"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-400"
                }`}
              >
                {t("All models")}
              </button>
              {sortedModels.map((m) => {
                const active = selectedModel === m.model;
                return (
                  <button
                    key={m.model}
                    type="button"
                    onClick={() => setSelectedModel(active ? "" : m.model)}
                    className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                      active
                        ? "border-gray-900 bg-gray-900 text-white"
                        : m.quantity > 0
                          ? "border-gray-200 bg-white text-gray-700 hover:border-gray-400"
                          : "border-dashed border-gray-200 bg-gray-50 text-gray-400 hover:border-gray-400"
                    }`}
                    title={`${m.product_count} ${t("products")} · ${m.quantity} ${t("in stock")}`}
                  >
                    {m.model}
                    <span
                      className={`ml-1.5 ${active ? "text-gray-300" : "text-gray-400"}`}
                    >
                      {m.quantity}
                    </span>
                  </button>
                );
              })}
            </div>
            {sortedModels.length > 8 && (
              <button
                type="button"
                onClick={() => setShowAllModels((v) => !v)}
                className="mt-1.5 inline-flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-100"
              >
                {showAllModels
                  ? t("Show less")
                  : `${t("Show all models")} (${sortedModels.length})`}
              </button>
            )}
            </>
          )}
        </div>

        {isLoading ? (
          <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-6" aria-busy>
            <CardGridSkeleton
              count={8}
              className="grid grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-2 sm:gap-4"
            />
            <div className="flex justify-center">
              <SlowNotice loading={isLoading} />
            </div>
          </div>
        ) : isError && products.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-gray-500">
            <Package className="h-12 w-12 text-gray-300" />
            <p className="text-sm">{t("Failed to load products")}</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="cursor-pointer rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              {t("Retry")}
            </button>
          </div>
        ) : (
          <div
            className={`flex min-h-0 flex-1 flex-col transition-opacity ${
              isFetching && !isLoadingMore ? "opacity-60" : ""
            }`}
          >
            <ProductGrid
              products={products}
              cartItems={cartItems}
              addToCart={addToCart}
              totalCount={totalProducts}
              onLoadMore={() => setLimit((l) => l + PAGE_SIZE)}
              isLoadingMore={isLoadingMore}
              selectedModel={selectedModel}
            />
          </div>
        )}
      </div>

      {/* Billing Section - normal document flow at every width (stacked
          below the products on mobile, side-by-side at xl+). The sticky
          bar below just scrolls down to this ref instead of overlaying
          it, so there's nothing here that can conflict with billing's own
          internal modals (tax edit, etc.), which are also fixed/z-50. */}
      <div ref={billingRef} className="xl:flex xl:min-h-0">
        <BillingSection
          cartItems={cartItems}
          cartSummary={cartSummary}
          removeFromCart={removeFromCart}
          updateQuantity={updateQuantity}
          updateProductTax={updateProductTax}
          updateProductTaxInclusive={updateProductTaxInclusive}
          updateItemDiscount={updateItemDiscount}
          customerId={customerId}
          setCustomerId={setCustomerId}
          openCustomerModal={(customer) => {
            setSelectedCustomer(customer || null);
            setFormData(customer || emptyCustomerForm);
            setIsModalOpen(true);
          }}
          paymentMethods={paymentMethods}
          paymentMethodsLoading={paymentMethodsLoading}
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

      {/* Mobile sticky summary bar: jumps to the bill, and once the bill is
          on screen, back up to the products to add more. */}
      {cartItems.length > 0 && (
        <button
          type="button"
          onClick={() => {
            if (billInView) {
              billingRef.current
                ?.closest("main")
                ?.scrollTo({ top: 0, behavior: "smooth" });
            } else {
              billingRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "start",
              });
            }
          }}
          className="pos-summary-bar fixed inset-x-0 z-30 flex items-center justify-between gap-2 border-t border-gray-200 bg-gray-900 px-4 pt-3 text-white shadow-2xl xl:hidden"
        >
          <span className="flex min-w-0 items-center gap-2 text-sm font-semibold">
            <ShoppingCart className="h-4 w-4 shrink-0" />
            <span className="truncate">
              {cartSummary.totalItems}{" "}
              {cartSummary.totalItems === 1 ? t("item") : t("items")} · Rs.{" "}
              {cartSummary.grandTotal.toLocaleString()}
            </span>
          </span>
          <span className="shrink-0 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-gray-900">
            {billInView ? t("Add more items") : t("View Bill")}
          </span>
        </button>
      )}

      {/* QR Modal */}
      {showQrModal && selectedPaymentMethod?.qr_code && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                <Tn v={selectedPaymentMethod.payment_method} />
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
              {t("Scan QR code to pay")} Rs. {cartSummary.grandTotal}
            </p>

            <button
              onClick={() => setShowQrModal(false)}
              className="w-full mt-4 bg-gray-900 text-white py-3 rounded-xl hover:bg-gray-800 transition-colors"
            >
              {t("Close")}
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
