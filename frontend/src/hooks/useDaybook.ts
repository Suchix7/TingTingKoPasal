import { useQuery } from "@tanstack/react-query";
import axiosInstance from "@/lib/axiosInstance";

export type DaybookSale = {
  id: number;
  invoice_no: string;
  customer_id?: number | null;
  customer_name?: string | null;
  customer_phone?: string | null;

  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  grand_total: number;
  paid_amount: number;
  change_amount: number;
  remaining_amount: number;

  payment_status: "Paid" | "Unpaid" | "Partial";
  sale_status: "Completed" | "Cancelled" | "Returned";

  notes?: string | null;
  created_at: string;
};

export type DaybookSaleItem = {
  id: number;
  sale_id: number;
  product_id: number;
  product_name?: string | null;
  sku?: string | null;
  batch_number?: string;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  total_price: number;
  cost_price: number;
  profit_amount: number;
};

export type DaybookSalePayment = {
  id: number;
  sale_id: number;
  invoice_no: string;

  payment_method_id?: number | null;
  payment_method?: string | null;
  payment_method_type?: string | null;

  amount: number;
  created_at: string;
};

export type DaybookExpense = {
  id: number;
  expense_date: string;

  category: string;
  title: string;
  amount: number;

  payment_method_id?: number | null;
  payment_method?: string | null;
  payment_method_type?: string | null;

  notes?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type DaybookExpensePaymentSummary = {
  payment_method_id?: number | null;
  payment_method: string;
  payment_method_type: string;
  total_amount: number;
  expense_count: number;
};

export type DaybookExpenseCategorySummary = {
  category: string;
  total_amount: number;
  expense_count: number;
};

export type DaybookPaymentMethodBalances = {
  payment_method_id?: number | null;
  payment_method: string;
  payment_method_type: string;
  opening_balance: number;
  total_in: number;
  total_out: number;
  closing_balance: number;
};

export type DaybookSummary = {
  total_sales_count: number;
  completed_sales_count: number;
  cancelled_sales_count: number;
  returned_sales_count: number;

  paid_sales_count: number;
  partial_sales_count: number;
  unpaid_sales_count: number;
  refunded_sales_count: number;
  cancel_sales_count: number;

  total_sales_amount: number;
  total_subtotal: number;
  total_discount: number;
  total_tax: number;

  total_paid_amount: number;
  total_received: number;
  total_change_amount: number;
  total_remaining_amount: number;

  total_expense_count: number;
  total_expense_amount: number;

  total_cost_of_goods: number;
  gross_profit: number;
  net_profit: number;

  net_cash_flow: number;
};

export type DaybookResponse = {
  success: boolean;
  date: string;

  summary: DaybookSummary;

  sales: DaybookSale[];
  saleItems: DaybookSaleItem[];
  salePayments: DaybookSalePayment[];

  expenses: DaybookExpense[];
  paymentMethodBalances: DaybookPaymentMethodBalances[];

  summaries: {
    expensePaymentSummary: DaybookExpensePaymentSummary[];
    expenseCategorySummary: DaybookExpenseCategorySummary[];
  };
};

export const daybookQueryKey = (date: string) => ["daybook", date] as const;

const fetchDaybook = async (date: string): Promise<DaybookResponse> => {
  try {
    const res = await axiosInstance.get<DaybookResponse>("/daybook", {
      params: { date },
    });

    return res.data;
  } catch (error) {
    console.log("Error while fetching daybook:", error);
    throw new Error("Failed to fetch daybook");
  }
};

export const useDaybook = (date: string) => {
  return useQuery<
    DaybookResponse,
    Error,
    DaybookResponse,
    readonly [string, string]
  >({
    queryKey: daybookQueryKey(date),
    queryFn: () => fetchDaybook(date),
    staleTime: 2 * 60 * 1000,
    enabled: !!date,
  });
};
