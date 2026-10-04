import {
  useMutation,
  useQuery,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import axiosInstance from "@/lib/axiosInstance";

export type Expense = {
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

export type ExpensesResponse = {
  success: boolean;
  data: Expense[];
  totalCount: number;
  totalAmount: number;
  page: number;
  limit: number;
};

export type ExpenseResponse = {
  success: boolean;
  data: Expense;
  message?: string;
};

export type ExpenseQueryParams = {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  payment_method_id?: number | string;
  start_date?: string;
  end_date?: string;
};

export type CreateExpenseInput = {
  expense_date?: string;
  category: string;
  title: string;
  amount: number;
  payment_method_id?: number | null;
  notes?: string | null;
};

export type UpdateExpenseInput = Partial<CreateExpenseInput> & {
  id: number;
};

export const expensesQueryKey = (params: ExpenseQueryParams = {}) =>
  ["expenses", params] as const;

const fetchExpenses = async (
  params: ExpenseQueryParams = {},
): Promise<ExpensesResponse> => {
  try {
    const res = await axiosInstance.get<ExpensesResponse>("/expenses", {
      params,
    });

    return res.data;
  } catch (error) {
    console.log("Error while fetching expenses:", error);
    throw new Error("Failed to fetch expenses");
  }
};

export const useExpenses = (params: ExpenseQueryParams = {}) => {
  const page = params.page ?? 1;
  const limit = params.limit ?? 10;

  return useQuery<
    ExpensesResponse,
    Error,
    ExpensesResponse,
    readonly [string, ExpenseQueryParams]
  >({
    queryKey: expensesQueryKey(params),
    queryFn: () => fetchExpenses(params),
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
    enabled: page > 0 && limit > 0,
  });
};

const fetchExpenseById = async (id: number): Promise<ExpenseResponse> => {
  try {
    const res = await axiosInstance.get<ExpenseResponse>(`/expenses/${id}`);
    return res.data;
  } catch (error) {
    console.log("Error while fetching expense:", error);
    throw new Error("Failed to fetch expense");
  }
};

export const useExpense = (id?: number) => {
  return useQuery<ExpenseResponse>({
    queryKey: ["expense", id],
    queryFn: () => fetchExpenseById(id as number),
    enabled: !!id,
  });
};

export const useCreateExpense = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newExpense: CreateExpenseInput) => {
      try {
        const res = await axiosInstance.post<ExpenseResponse>(
          "/expenses",
          newExpense,
        );

        return res.data;
      } catch (error) {
        console.log("Error while creating expense:", error);
        throw new Error("Failed to create expense");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["overview"] });
      queryClient.invalidateQueries({ queryKey: ["daybook"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["payment-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
      queryClient.invalidateQueries({ queryKey: ["paymentMethods"] });
    },
  });
};

export const useUpdateExpense = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updatedExpense: UpdateExpenseInput) => {
      try {
        const { id, ...payload } = updatedExpense;

        const res = await axiosInstance.put<ExpenseResponse>(
          `/expenses/${id}`,
          payload,
        );

        return res.data;
      } catch (error) {
        console.log("Error while updating expense:", error);
        throw new Error("Failed to update expense");
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["expense", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["overview"] });
      queryClient.invalidateQueries({ queryKey: ["daybook"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["payment-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
      queryClient.invalidateQueries({ queryKey: ["paymentMethods"] });
    },
  });
};

export const useDeleteExpense = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (expenseId: number) => {
      try {
        const res = await axiosInstance.delete<ExpenseResponse>(
          `/expenses/${expenseId}`,
        );

        return res.data;
      } catch (error) {
        console.log("Error while deleting expense:", error);
        throw new Error("Failed to delete expense");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["overview"] });
      queryClient.invalidateQueries({ queryKey: ["daybook"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["payment-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
      queryClient.invalidateQueries({ queryKey: ["paymentMethods"] });
    },
  });
};
