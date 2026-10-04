import {
  useMutation,
  useQuery,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import axiosInstance from "@/lib/axiosInstance";

export type Customer = {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  credit_amount: number;
  credit_limit: number;
  status: "Active" | "Inactive";
  notes?: string;
  created_at?: string;
  updated_at?: string;
};

type CustomersResponse = {
  success: boolean;
  data: Customer[];
  totalCount: number;
  stats: {
    activeCustomers: number;
    totalCreditAmount: number;
    overLimitCustomers: number;
  };
  page: number;
  limit: number;
};

export const customersQueryKey = (
  page: number,
  limit: number,
  search = "",
  status = "",
) => ["customers", { page, limit, search, status }] as const;

export const useCustomers = (
  page = 1,
  limit = 10,
  search = "",
  status = "",
) => {
  return useQuery<CustomersResponse>({
    queryKey: customersQueryKey(page, limit, search, status),
    queryFn: async () => {
      const res = await axiosInstance.get<CustomersResponse>("/customers", {
        params: { page, limit, search, status },
      });
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
    enabled: page > 0 && limit > 0,
  });
};

export const useCreateCustomer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      newCustomer: Omit<Customer, "id" | "created_at" | "updated_at">,
    ) => {
      const res = await axiosInstance.post("/customers", newCustomer);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
  });
};

export const useUpdateCustomer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updatedCustomer: Customer) => {
      const res = await axiosInstance.put(
        `/customers/${updatedCustomer.id}`,
        updatedCustomer,
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
  });
};

export const useDeleteCustomer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (customerId: string) => {
      const res = await axiosInstance.delete(`/customers/${customerId}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
  });
};
