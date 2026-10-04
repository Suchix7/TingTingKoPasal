import {
  useMutation,
  useQuery,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import axiosInstance from "@/lib/axiosInstance";
import toast from "react-hot-toast";
export type Supplier = {
  id: string;
  supplier_name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  contact_person?: string | null;
  contact_person_phone?: string | null;
  tax_number?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type CreateSupplier = Omit<Supplier, "id" | "created_at" | "updated_at">;

export type UpdateSupplier = Partial<CreateSupplier> & { id: string };

type SuppliersResponse = {
  success: boolean;
  data: Supplier[];
  totalCount?: number;
  page: number;
  limit: number;
  stats: {
    total: number;
    active: number;
    inactive: number;
  };
  totalPages: number;
};

type SupplierResponse = {
  success: boolean;
  data: Supplier;
  message?: string;
};

export const suppliersQueryKey = (
  page?: number,
  limit?: number,
  search?: string,
) => ["suppliers", { page, limit, search }] as const;

export const useSuppliers = (page = 1, limit = 10, search?: string) => {
  return useQuery<SuppliersResponse>({
    queryKey: suppliersQueryKey(page, limit, search),
    queryFn: async () => {
      const res = await axiosInstance.get<SuppliersResponse>("/suppliers", {
        params: { page, limit, search },
      });
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
    enabled: page > 0 && limit > 0,
  });
};

export const useSupplierById = (supplierId?: number) => {
  return useQuery<SupplierResponse>({
    queryKey: ["suppliers", supplierId],
    queryFn: async () => {
      const res = await axiosInstance.get<SupplierResponse>(
        `/suppliers/${supplierId}`,
      );
      return res.data;
    },
    enabled: !!supplierId,
  });
};

export const useCreateSupplier = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newSupplier: CreateSupplier) => {
      const res = await axiosInstance.post<SupplierResponse>(
        "/suppliers",
        newSupplier,
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success("Supplier created successfully.");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to create supplier.",
      );
    },
  });
};

export const useUpdateSupplier = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updateData }: UpdateSupplier) => {
      const res = await axiosInstance.put<SupplierResponse>(
        `/suppliers/${id}`,
        updateData,
      );
      return res.data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["suppliers", id] });
      toast.success("Supplier updated successfully.");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to update supplier.",
      );
    },
  });
};

export const useDeleteSupplier = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (supplierId: string) => {
      const res = await axiosInstance.delete(`/suppliers/${supplierId}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success("Supplier deleted successfully.");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to delete supplier.",
      );
    },
  });
};
