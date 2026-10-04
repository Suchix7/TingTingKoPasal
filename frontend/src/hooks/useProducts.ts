import {
  useQuery,
  keepPreviousData,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import axios from "axios";
import axiosInstance from "@/lib/axiosInstance";
import toast from "react-hot-toast";

export type ProductBatch = {
  id: string;
  product_id: string;
  batch_number: string;
  barcode?: string | null;
  quantity: number;
  cost_price: number;
  sale_price: number;
  created_at?: string;
  updated_at?: string;
};

export type Product = {
  id: string;
  product_name: string;
  sku: string;
  category_id: string | "";
  cost_price: number;
  sale_price: number;
  stock_quantity: number;
  unit: string;
  status: string;
  barcode?: string | null;
  barcode_last_printed_at?: string | null;
  barcode_last_printed_quantity?: number;
  description?: string | null;
  batches?: ProductBatch[];
  matched_batch_id?: string | null;
  photo_url?: string | null;
  photo_public_id?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type ProductStats = {
  totalProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  inventoryValue: number;
};

export type ProductResponse = {
  success: boolean;
  data: Product;
  retired?: boolean;
  message?: string;
};

export type ProductsResponse = {
  success: boolean;
  data: Product[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
  stats: ProductStats;
};

type ProductQueryParams = {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  status?: string;
};

const fetchProducts = async ({
  queryKey,
}: {
  queryKey: readonly [string, ProductQueryParams];
}): Promise<ProductsResponse> => {
  const [, params] = queryKey;

  const filteredParams = Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== "",
    ),
  );

  try {
    const res = await axiosInstance.get<ProductsResponse>("/products", {
      params: filteredParams,
    });

    return res.data;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message || "Failed to fetch products",
      );
    }

    throw new Error("Failed to fetch products");
  }
};

export const useProducts = (params: ProductQueryParams = {}) => {
  return useQuery<
    ProductsResponse,
    Error,
    ProductsResponse,
    readonly [string, ProductQueryParams]
  >({
    queryKey: ["products", params] as const,
    queryFn: fetchProducts,
    placeholderData: keepPreviousData,
  });
};

export const useCreateProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      newProduct: Omit<Product, "id" | "sku" | "created_at" | "updated_at"> & {
        variants?: { model: string; quantity: number }[];
      },
    ) => {
      const res = await axiosInstance.post<Product>("/products", newProduct);
      return res.data;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
      toast.success("Product created successfully.");
    },

    onError: (error: any) => {
      toast.error(
        error.response?.data?.message ||
          error.message ||
          "Failed to create product.",
      );
    },
  });
};

export const useUpdateProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (updatedProduct: Omit<Product, "sku">) => {
      try {
        const res = await axiosInstance.put<Product>(
          `/products/${updatedProduct.id}`,
          updatedProduct,
        );
        return res.data;
      } catch (error: unknown) {
        if (axios.isAxiosError(error)) {
          throw new Error(
            error.response?.data?.message || "Failed to update product",
          );
        }

        throw new Error("Failed to update product");
      }
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
      toast.success("Product updated successfully.");
    },

    onError: (error: any) => {
      toast.error(
        error.response?.data?.message ||
          error.message ||
          "Failed to update product.",
      );
    },
  });
};

export const useDeleteProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (productId: string) => {
      try {
        const res = await axiosInstance.delete(`/products/${productId}`);
        return res.data;
      } catch (error: any) {
        console.error("Failed to delete product:", error);
        toast.error(
          error.response?.data?.message || "Failed to delete product.",
        );
        throw new Error("Failed to delete product");
      } finally {
        queryClient.invalidateQueries({ queryKey: ["products"] });
        queryClient.invalidateQueries({ queryKey: ["inventory"] });
        queryClient.invalidateQueries({ queryKey: ["inventory-transactions"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard"] });
        queryClient.invalidateQueries({ queryKey: ["analytics"] });
      }
    },
  });
};

export const useProductById = (id: string) => {
  return useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      try {
        const res = await axiosInstance.get<ProductResponse>(`/products/${id}`);
        return res.data;
      } catch (error) {
        console.error("Failed to fetch product:", error);
        throw new Error("Failed to fetch product");
      }
    },
  });
};

export const useProductByBarcode = (barcode: string) => {
  return useQuery<ProductResponse, Error>({
    queryKey: ["product-by-barcode", barcode],
    queryFn: async () => {
      try {
        const res = await axiosInstance.get<ProductResponse>(
          `/products/barcode/${encodeURIComponent(barcode)}`,
        );

        return res.data;
      } catch (error: unknown) {
        if (axios.isAxiosError(error)) {
          throw new Error(
            error.response?.data?.message ||
              "Failed to fetch product by barcode",
          );
        }

        throw new Error("Failed to fetch product by barcode");
      }
    },
    enabled: Boolean(barcode?.trim()),
  });
};

export const useUploadProductPhoto = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, file }: { id: number | string; file: File }) => {
      const formData = new FormData();
      formData.append("photo", file);

      const res = await axiosInstance.post<ProductResponse>(
        `/products/${id}/photo`,
        formData,
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product photo updated.");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message ||
          error.message ||
          "Failed to upload product photo.",
      );
    },
  });
};

export const useReprintBarcode = () => {
  return useMutation({
    mutationFn: async (id: number | string) => {
      const res = await axiosInstance.post<ProductResponse>(
        `/products/${id}/barcode/reprint`,
      );
      return res.data;
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to reprint barcode.",
      );
    },
  });
};

export const useRegenerateBarcode = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number | string) => {
      const res = await axiosInstance.post<ProductResponse>(
        `/products/${id}/barcode/regenerate`,
        { confirm: true },
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("New barcode generated. Please reprint the label.");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to regenerate barcode.",
      );
    },
  });
};

export const useMarkBarcodePrinted = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      quantity,
    }: {
      id: string;
      quantity: number;
    }) => {
      const res = await axiosInstance.post<ProductResponse>(
        `/products/${id}/barcode/mark-printed`,
        { quantity },
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
};
