"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  X,
  Plus,
  Trash2,
  Package,
  Search,
  Check,
  QrCode,
  Banknote,
  CreditCard,
} from "lucide-react";
import {
  useCreatePurchaseOrder,
  type CreatePurchaseOrderPayload,
} from "@/hooks/usePurchaseOrders";
import { useSuppliers, type Supplier } from "@/hooks/useSuppliers";
import { useDebounced } from "@/hooks/useDebounced";
import toast from "react-hot-toast";
import { DropdownWithSearch } from "../layout/DropdownWithSearch";
import {
  ProductBatchDropdown,
  ProductBatchSelection,
} from "../layout/ProductBatchDropdown";
import { SupplierModal } from "../suppliers/SupplierModal";
import ProductModal from "../product/modal";
import { usePaymentMethods } from "@/hooks/usePaymentMethods";
import type { SalePayment } from "@/hooks/useSales";
import PaymentMethodModal from "../payment-methods/modal";

type OrderItem = {
  product_id: string;
  batch_id?: string | null;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  product_name?: string;
  sku?: string;
  unit?: string;
};

type Props = {
  closeModal: () => void;
};

export default function CreatePurchaseOrderModal({ closeModal }: Props) {
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | "">("");
  const [isSupplierDropdownOpen, setIsSupplierDropdownOpen] = useState(false);
  const [supplierSearchTerm, setSupplierSearchTerm] = useState("");
  const [notes, setNotes] = useState("");
  const [orderingCost, setOrderingCost] = useState(0);
  const [items, setItems] = useState<OrderItem[]>([
    { product_id: "", batch_id: null, quantity: 0, unit_cost: 0, total_cost: 0 },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Debounced search terms
  const debouncedSupplierSearch = useDebounced(supplierSearchTerm, 500);

  const supplierDropdownRef = useRef<HTMLDivElement>(null);
  const supplierSearchRef = useRef<HTMLInputElement>(null);

  const { data: suppliersData, isLoading: isLoadingSuppliers } = useSuppliers(
    1,
    50,
    debouncedSupplierSearch,
  );
  const { data, isLoading } = usePaymentMethods(1, 100);

  const paymentMethods = isLoading ? [] : data?.data || [];

  const availableBalances = Object.fromEntries(
    paymentMethods?.map((item) => [item.id, item.current_balance]) || [],
  );

  const [payments, setPayments] = useState<SalePayment[]>([]);
  const getPaymentMethodIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case "qr":
      case "digital":
        return <QrCode className="h-4 w-4" />;

      case "cash":
        return <Banknote className="h-4 w-4" />;

      default:
        return <CreditCard className="h-4 w-4" />;
    }
  };

  const getPaymentAmount = (methodId: string) => {
    const selectedPayment = payments.find(
      (payment) => String(payment.payment_method_id) === String(methodId),
    );

    return Number(selectedPayment?.amount || 0);
  };

  const updatePaymentAmount = (methodId: string, amount: number) => {
    const safeAmount = Math.max(0, Number(amount || 0));

    if (safeAmount > availableBalances[methodId]) {
      toast.error(
        `Insufficient balance. Available: ${availableBalances[methodId]}`,
      );
      return;
    }

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
  const createPurchaseOrder = useCreatePurchaseOrder();

  const suppliers = suppliersData?.data || [];
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        supplierDropdownRef.current &&
        !supplierDropdownRef.current.contains(event.target as Node)
      ) {
        setIsSupplierDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isSupplierDropdownOpen && supplierSearchRef.current) {
      supplierSearchRef.current.focus();
    }
  }, [isSupplierDropdownOpen]);

  const addItem = () => {
    setItems([
      ...items,
      {
        product_id: "",
        batch_id: null,
        quantity: 0,
        unit_cost: 0,
        total_cost: 0,
      },
    ]);
  };

  const removeItem = (index: number) => {
    if (items.length === 1) {
      toast.error("At least one item is required");
      return;
    }
    setItems(items.filter((_, i) => i !== index));
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
          batch_id: null,
          product_name: undefined,
          sku: undefined,
          unit: undefined,
          unit_cost: 0,
          total_cost: 0,
        };
        return updated;
      });
      return;
    }

    setItems((prev) => {
      const updated = [...prev];
      const currentItem = { ...updated[index] };

      currentItem.product_id = selection.productId || "";
      currentItem.batch_id = selection.batchId || null;
      currentItem.product_name = selection.productName;

      // Use cost price if available, otherwise sale price
      if (selection.costPrice !== undefined && selection.costPrice !== null) {
        currentItem.unit_cost = selection.costPrice;
      } else if (
        selection.salePrice !== undefined &&
        selection.salePrice !== null
      ) {
        // Fallback to sale price if cost price not available
        currentItem.unit_cost = selection.salePrice;
      }

      currentItem.total_cost = currentItem.quantity * currentItem.unit_cost;

      updated[index] = currentItem;
      return updated;
    });
  };

  const updateItem = (index: number, field: keyof OrderItem, value: any) => {
    const updatedItems = [...items];
    const item = updatedItems[index];

    if (field === "quantity") {
      item.quantity = Number(value);
    } else if (field === "unit_cost") {
      item.unit_cost = Number(value);
    }

    item.total_cost = item.quantity * item.unit_cost;
    updatedItems[index] = item;
    setItems(updatedItems);
  };

  const calculateTotalCost = () => {
    const itemsTotal = items.reduce(
      (sum, item) => sum + (item.total_cost || 0),
      0,
    );
    return itemsTotal + orderingCost;
  };

  const validateForm = (): boolean => {
    if (!selectedSupplierId) {
      toast.error("Please select a supplier");
      return false;
    }

    for (const item of items) {
      if (!item.product_id) {
        toast.error("Please select a product for all items");
        return false;
      }
      if (item.quantity <= 0) {
        toast.error("Quantity must be greater than 0");
        return false;
      }
      if (item.unit_cost <= 0) {
        toast.error("Unit cost must be greater than 0");
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    const hasValidPayment = payments.some((payment) => payment.amount > 0);

    if (!hasValidPayment) {
      toast.error("Please add at least one payment method with amount");
      return;
    }

    const totalCost = calculateTotalCost();
    const totalPayment = payments.reduce((sum, p) => sum + p.amount, 0);

    if (totalPayment < totalCost) {
      toast.error(
        `Total payment (NPR ${totalPayment}) cannot be less than total cost (NPR ${totalCost})`,
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: CreatePurchaseOrderPayload = {
        supplier_id: String(selectedSupplierId),
        ordering_cost: orderingCost,
        notes: notes || undefined,
        items: items.map((item) => ({
          product_id: item.product_id,
          batch_id: item.batch_id || null,
          quantity: item.quantity,
          unit_cost: item.unit_cost,
        })),
        payments,
      };

      await createPurchaseOrder.mutateAsync(payload);
      toast.success("Purchase order created successfully");
      closeModal();
    } catch (error) {
      console.error("Failed to create purchase order:", error);
      toast.error("Failed to create purchase order");
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillRemainingPayment = (id: string) => {
    const totalCost = calculateTotalCost();
    const totalPayment = payments.reduce((sum, p) => sum + p.amount, 0);
    const remainingAmount = totalCost - totalPayment;
    if (remainingAmount > availableBalances[id]) {
      toast.error("Insufficient balance. Available: " + availableBalances[id]);
      return;
    }
    if (remainingAmount > 0) {
      setPayments((prev) =>
        prev
          .filter((p) => String(p.payment_method_id) !== String(id))
          .concat({
            payment_method_id: id,
            amount: remainingAmount,
          }),
      );
    }
  };

  const clearPaymentAmount = (id: string) => {
    setPayments((prev) =>
      prev.filter((p) => String(p.payment_method_id) !== String(id)),
    );
  };

  return (
    <>
      <div
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            closeModal();
          }
        }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      >
        <div className="relative w-full max-w-4xl max-h-[85vh] overflow-y-auto rounded-3xl bg-white shadow-2xl">
          <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 z-10">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-slate-900 p-2">
                <Package className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Create Purchase Order
                </h2>
                <p className="text-sm text-slate-500">
                  Add items and specify quantities
                </p>
              </div>
            </div>
            <button
              onClick={closeModal}
              className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="space-y-4">
              {/* Supplier Selection with Search */}
              <div ref={supplierDropdownRef} className="relative">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Supplier <span className="text-rose-500">*</span>
                </label>

                <DropdownWithSearch
                  options={suppliers.map((supplier) => ({
                    id: supplier.id,
                    label: supplier.supplier_name,
                    sublabel: [supplier.email, supplier.phone]
                      .filter(Boolean)
                      .join(" • "),
                    metadata: supplier,
                  }))}
                  selectedId={selectedSupplierId}
                  onSelect={(option) => setSelectedSupplierId(option?.id || "")}
                  isLoading={isLoadingSuppliers}
                  placeholder="Select a supplier"
                  searchPlaceholder="Search suppliers by name or email..."
                  emptyMessage="No suppliers found"
                  onSearch={(searchTerm) => setSupplierSearchTerm(searchTerm)}
                  showAddNew={true}
                  onAddNew={() => setShowCreateModal(true)}
                  addNewLabel="Add New Supplier"
                />

                {/* Supplier Dropdown Menu */}
                {isSupplierDropdownOpen && (
                  <div className="absolute left-0 right-0 z-20 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                    {/* Search Input */}
                    <div className="border-b border-slate-100 p-3">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          ref={supplierSearchRef}
                          type="text"
                          value={supplierSearchTerm}
                          onChange={(e) =>
                            setSupplierSearchTerm(e.target.value)
                          }
                          placeholder="Search suppliers by name or email..."
                          className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                        />
                      </div>
                    </div>

                    {/* Suppliers List */}
                    <div className="max-h-64 overflow-y-auto">
                      {isLoadingSuppliers ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />
                        </div>
                      ) : suppliers.length === 0 ? (
                        <div className="py-8 text-center text-sm text-slate-500">
                          No suppliers found
                        </div>
                      ) : (
                        suppliers.map((supplier: Supplier) => (
                          <button
                            key={supplier.id}
                            type="button"
                            onClick={() => {
                              setSelectedSupplierId(supplier.id);
                              setIsSupplierDropdownOpen(false);
                              setSupplierSearchTerm("");
                            }}
                            className={`w-full px-4 py-3 text-left transition hover:bg-slate-50 ${
                              selectedSupplierId === supplier.id
                                ? "bg-slate-50"
                                : ""
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-slate-900">
                                    {supplier.supplier_name}
                                  </span>
                                  {selectedSupplierId === supplier.id && (
                                    <Check className="h-4 w-4 text-green-600" />
                                  )}
                                </div>
                                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                                  {supplier.email && (
                                    <span>{supplier.email}</span>
                                  )}
                                  {supplier.phone && (
                                    <span>{supplier.phone}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                  placeholder="Add any additional notes..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Ordering Cost (Optional)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                    NPR
                  </span>
                  <input
                    type="number"
                    value={String(orderingCost)}
                    onChange={(e) => setOrderingCost(Number(e.target.value))}
                    min="0"
                    step="0.01"
                    onWheel={(e) => e.currentTarget.blur()}
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-14 pr-4 text-sm text-slate-700 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            {/* Order Items */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="text-sm font-medium text-slate-700">
                  Order Items <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={addItem}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-slate-800"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Item
                </button>
              </div>

              <div className="space-y-3">
                {items.map((item, index) => (
                  <div
                    key={index}
                    className="rounded-2xl border border-slate-200 bg-slate-50/30 p-4"
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <h4 className="text-sm font-semibold text-slate-900">
                        Item {index + 1}
                      </h4>
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="rounded-lg p-1 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      {/* Product Selection with Batch Support */}
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          Product <span className="text-rose-500">*</span>
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

                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          Quantity <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="number"
                          value={item.quantity || ""}
                          onChange={(e) =>
                            updateItem(index, "quantity", e.target.value)
                          }
                          min="1"
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          Unit Cost <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                            NPR
                          </span>
                          <input
                            type="number"
                            value={item.unit_cost || ""}
                            onChange={(e) =>
                              updateItem(index, "unit_cost", e.target.value)
                            }
                            min="0.01"
                            step="0.01"
                            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-12 pr-3 text-sm text-slate-700 outline-none focus:border-slate-400"
                            required
                          />
                        </div>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          Total Cost
                        </label>
                        <div className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-900">
                          NPR {item.total_cost.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between mb-4">
              <label className="text-sm font-medium text-slate-700">
                Payment Methods
              </label>
              <button
                type="button"
                onClick={() => setShowModal(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-slate-800"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Payment Method
              </button>
            </div>

            {paymentMethods.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-300 bg-white p-4 text-center text-sm text-gray-500">
                No payment methods available. Please add payment methods first.
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
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={() => fillRemainingPayment(method.id)}
                            className="rounded-full cursor-pointer bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200"
                          >
                            Fill
                          </button>

                          {isSelected && (
                            <button
                              type="button"
                              onClick={() => clearPaymentAmount(method.id)}
                              className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-100"
                            >
                              Clear
                            </button>
                          )}
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
                    </div>
                  );
                })}
              </div>
            )}

            {/* Summary */}
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Subtotal:</span>
                <span className="font-medium text-slate-900">
                  NPR{" "}
                  {items
                    .reduce((sum, item) => sum + item.total_cost, 0)
                    .toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-slate-600">Ordering Cost:</span>
                <span className="font-medium text-slate-900">
                  NPR {orderingCost.toFixed(2)}
                </span>
              </div>
              <div className="border-t border-slate-200 mt-3 pt-3">
                <div className="flex items-center justify-between font-semibold">
                  <span className="text-slate-900">Total:</span>
                  <span className="text-lg text-slate-900">
                    NPR {calculateTotalCost().toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={closeModal}
                className="flex-1 cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 cursor-pointer rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Creating..." : "Create Order"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {showCreateModal && (
        <SupplierModal
          closeModal={() => setShowCreateModal(false)}
          isEditMode={false}
        />
      )}
      {showProductModal && (
        <ProductModal closeModal={() => setShowProductModal(false)} />
      )}
      {showModal && (
        <PaymentMethodModal
          setOpen={() => setShowModal(true)}
          closeModal={() => setShowModal(false)}
        />
      )}
    </>
  );
}
