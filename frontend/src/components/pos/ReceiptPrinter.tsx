// components/pos/ReceiptPrinter.tsx
"use client";

import { useEffect, useRef } from "react";

export interface ReceiptItem {
  product_name: string;
  quantity: number;
  unit_price: number;
  discount_amount?: number;
  tax_amount?: number;
  total_price: number;
}

export interface ReceiptPayment {
  method: string;
  amount: number;
}

export interface ReceiptData {
  invoice_no: string;
  date: string;
  time: string;
  cashier_name?: string;
  customer_name?: string;
  customer_phone?: string;
  items: ReceiptItem[];
  subtotal: number;
  discount_amount?: number;
  tax_amount?: number;
  grand_total: number;
  paid_amount: number;
  change_amount?: number;
  remaining_amount?: number;
  payments: ReceiptPayment[];
  payment_status: string;
  notes?: string;
  footer_message?: string;
  store_name?: string;
  store_address?: string;
  store_phone?: string;
  store_vat?: string;
}

interface ReceiptPrinterProps {
  data: ReceiptData;
  onClose?: () => void;
}

export default function ReceiptPrinter({ data, onClose }: ReceiptPrinterProps) {
  const printRef = useRef<HTMLDivElement>(null);

  //   useEffect(() => {
  //     const timer = setTimeout(() => {
  //       handlePrint();
  //     }, 500);

  //     return () => clearTimeout(timer);
  //   }, []);

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open("", "_blank", "width=400,height=600");
    if (!printWindow) {
      alert("Please allow popups to print the receipt");
      return;
    }

    const printHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - ${data.invoice_no}</title>
          <style>
            @page {
              margin: 0;
              size: 80mm auto;
            }
            
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: 'Courier New', Courier, monospace;
              font-size: 12px;
              width: 80mm;
              margin: 0 auto;
              padding: 8px;
              color: #000;
              background: #fff;
              line-height: 1.4;
            }
            
            .receipt {
              width: 100%;
            }
            
            .header {
              text-align: center;
              margin-bottom: 10px;
              padding-bottom: 10px;
              border-bottom: 1px dashed #000;
            }
            
            .store-name {
              font-size: 16px;
              font-weight: bold;
              margin-bottom: 4px;
              text-transform: uppercase;
            }
            
            .store-info {
              font-size: 11px;
              margin-bottom: 2px;
            }
            
            .receipt-info {
              margin: 10px 0;
              font-size: 11px;
            }
            
            .receipt-info div {
              display: flex;
              justify-content: space-between;
              margin-bottom: 2px;
            }
            
            .divider {
              border-top: 1px dashed #000;
              margin: 8px 0;
            }
            
            .items-header {
              display: flex;
              font-weight: bold;
              margin-bottom: 4px;
              font-size: 11px;
            }
            
            .item {
              margin-bottom: 4px;
              font-size: 11px;
            }
            
            .item-name {
              font-weight: bold;
              margin-bottom: 2px;
            }
            
            .item-details {
              display: flex;
              justify-content: space-between;
            }
            
            .item-qty {
              margin-left: 4px;
            }
            
            .totals {
              margin-top: 10px;
              padding-top: 10px;
              border-top: 1px dashed #000;
              font-size: 11px;
            }
            
            .total-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 4px;
            }
            
            .grand-total {
              display: flex;
              justify-content: space-between;
              font-size: 14px;
              font-weight: bold;
              margin-top: 8px;
              padding-top: 8px;
              border-top: 1px solid #000;
            }
            
            .payments {
              margin-top: 10px;
              padding-top: 8px;
              border-top: 1px dashed #000;
              font-size: 11px;
            }
            
            .payment-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 4px;
            }
            
            .footer {
              text-align: center;
              margin-top: 15px;
              font-size: 10px;
              border-top: 1px dashed #000;
              padding-top: 10px;
            }
            
            @media print {
              body {
                width: 80mm;
                padding: 0;
              }
              
              .no-print {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="receipt">
            <!-- Store Header -->
            <div class="header">
              <div class="store-name">${data.store_name || "Ting Ting ko pasal"}</div>
              ${data.store_address ? `<div class="store-info">${data.store_address}</div>` : ""}
              ${data.store_phone ? `<div class="store-info">Tel: ${data.store_phone}</div>` : ""}
              ${data.store_vat ? `<div class="store-info">VAT: ${data.store_vat}</div>` : ""}
            </div>
            
            <!-- Receipt Info -->
            <div class="receipt-info">
              <div>
                <span>Invoice:</span>
                <span>${data.invoice_no}</span>
              </div>
              <div>
                <span>Date:</span>
                <span>${data.date}</span>
              </div>
              <div>
                <span>Time:</span>
                <span>${data.time}</span>
              </div>
              ${
                data.cashier_name
                  ? `
                <div>
                  <span>Cashier:</span>
                  <span>${data.cashier_name}</span>
                </div>
              `
                  : ""
              }
              ${
                data.customer_name
                  ? `
                <div>
                  <span>Customer:</span>
                  <span>${data.customer_name}</span>
                </div>
              `
                  : ""
              }
              ${
                data.customer_phone
                  ? `
                <div>
                  <span>Phone:</span>
                  <span>${data.customer_phone}</span>
                </div>
              `
                  : ""
              }
            </div>
            
            <div class="divider"></div>
            
            <!-- Items -->
            <div class="items-header">
              <span>Items</span>
            </div>
            
            ${data.items
              .map(
                (item) => `
                <div class="item">
                  <div class="item-name">${item.product_name}</div>
                  <div class="item-details">
                    <span>${item.quantity} x ${item.unit_price.toFixed(2)}</span>
                    <span>${(item.quantity * item.unit_price).toFixed(2)}</span>
                  </div>
                  ${
                    item.discount_amount
                      ? `<div class="item-details" style="color: #666;">
                          <span>Discount</span>
                          <span>-${item.discount_amount.toFixed(2)}</span>
                        </div>`
                      : ""
                  }
                  ${
                    item.tax_amount
                      ? `<div class="item-details" style="color: #666;">
                          <span>Tax</span>
                          <span>${item.tax_amount.toFixed(2)}</span>
                        </div>`
                      : ""
                  }
                </div>
              `,
              )
              .join("")}
            
            <!-- Totals -->
            <div class="totals">
              <div class="total-row">
                <span>Subtotal:</span>
                <span>${data.subtotal.toFixed(2)}</span>
              </div>
              ${
                data.discount_amount
                  ? `
                <div class="total-row">
                  <span>Discount:</span>
                  <span>-${data.discount_amount.toFixed(2)}</span>
                </div>
              `
                  : ""
              }
              ${
                data.tax_amount
                  ? `
                <div class="total-row">
                  <span>Tax:</span>
                  <span>${data.tax_amount.toFixed(2)}</span>
                </div>
              `
                  : ""
              }
              <div class="grand-total">
                <span>TOTAL:</span>
                <span>Rs. ${data.grand_total.toFixed(2)}</span>
              </div>
            </div>
            
            <!-- Payments -->
            <div class="payments">
              <div class="payment-row" style="font-weight: bold; margin-bottom: 6px;">
                <span>Payment Details</span>
              </div>
              ${data.payments
                .map(
                  (payment) => `
                  <div class="payment-row">
                    <span>${payment.method}</span>
                    <span>${payment.amount.toFixed(2)}</span>
                  </div>
                `,
                )
                .join("")}
              <div class="payment-row" style="font-weight: bold; margin-top: 4px;">
                <span>Paid:</span>
                <span>${data.paid_amount.toFixed(2)}</span>
              </div>
              ${
                data.change_amount
                  ? `
                <div class="payment-row">
                  <span>Change:</span>
                  <span>${data.change_amount.toFixed(2)}</span>
                </div>
              `
                  : ""
              }
              ${
                data.remaining_amount
                  ? `
                <div class="payment-row" style="color: #ff0000;">
                  <span>Balance Due:</span>
                  <span>${data.remaining_amount.toFixed(2)}</span>
                </div>
              `
                  : ""
              }
              <div class="payment-row">
                <span>Status:</span>
                <span>${data.payment_status}</span>
              </div>
            </div>
            
            <!-- Footer -->
            <div class="footer">
              <div>${data.footer_message || "Thank you for your purchase!"}</div>
              ${data.notes ? `<div style="margin-top: 4px;">${data.notes}</div>` : ""}
              <div style="margin-top: 8px;">***</div>
            </div>
          </div>
          
          <div class="no-print" style="text-align: center; margin-top: 20px;">
            <button onclick="window.print()" style="padding: 10px 20px; background: #000; color: #fff; border: none; border-radius: 4px; cursor: pointer;">
              Print Again
            </button>
            <button onclick="window.close()" style="padding: 10px 20px; background: #666; color: #fff; border: none; border-radius: 4px; cursor: pointer; margin-left: 10px;">
              Close
            </button>
          </div>
          
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 500);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(printHTML);
    printWindow.document.close();
  };

  return (
    <>
      <div ref={printRef} style={{ display: "none" }}></div>

      {onClose && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 text-center">
              <h3 className="text-lg font-semibold text-gray-900">
                Print Receipt
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Receipt is ready to print
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={handlePrint}
                className="w-full rounded-xl cursor-pointer bg-gray-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-gray-800"
              >
                Print Receipt
              </button>
              <button
                onClick={onClose}
                className="w-full rounded-xl cursor-pointer border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
