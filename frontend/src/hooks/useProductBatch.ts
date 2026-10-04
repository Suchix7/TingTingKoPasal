import {
  useMutation,
  useQuery,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import axiosInstance from "@/lib/axiosInstance";
import toast from "react-hot-toast";

/* =========================================================
   Types
========================================================= */

export type ProductBatch = {
  id: string;
  product_id: string;
  batch_number: string;
  quantity: number;
  cost_price: number;
  sale_price: number;
  created_at?: string;
  updated_at?: string;
  product_name?: string;
  sku?: string;
  barcode?: string | null;
};

export type CreateProductBatchPayload = {
  product_id: string;
  batch_number: string;
  quantity: number;
  cost_price: number;
  sale_price: number;
};

export type UpdateProductBatchPayload = {
  id: string;
  product_id?: string;
  batch_number?: string;
  quantity?: number;
  cost_price?: number;
  sale_price?: number;
};

export type ProductBatchesResponse = {
  success: boolean;
  data: ProductBatch[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages?: number;
};

export type ProductBatchResponse = {
  success: boolean;
  message?: string;
  data: ProductBatch;
};

export type ProductBatchesByProductResponse = {
  success: boolean;
  product: {
    id: string;
    product_name: string;
    sku: string;
    barcode?: string | null;
  };
  totalCount: number;
  data: ProductBatch[];
};

export type ProductBatchDeleteResponse = {
  success: boolean;
  message: string;
};

/* =========================================================
   Query Keys
========================================================= */

export const productBatchesQueryKey = (
  page: number,
  limit: number,
  search: string,
) => ["productBatches", { page, limit, search }] as const;

export const productBatchesByProductQueryKey = (productId: string) =>
  ["productBatches", "product", productId] as const;

export const productBatchQueryKey = (batchId: string) =>
  ["productBatch", batchId] as const;

/* =========================================================
   Get All Product Batches
   Pagination + Search
========================================================= */

export const useProductBatches = (page = 1, limit = 10, search = "") => {
  return useQuery<ProductBatchesResponse>({
    queryKey: productBatchesQueryKey(page, limit, search),

    queryFn: async () => {
      const res = await axiosInstance.get<ProductBatchesResponse>(
        "/product-batches",
        {
          params: {
            page,
            limit,
            search,
          },
        },
      );

      return res.data;
    },

    staleTime: 5 * 60 * 1000,

    placeholderData: keepPreviousData,

    enabled: page > 0 && limit > 0,
  });
};

/* =========================================================
   Get All Batches Of A Specific Product
========================================================= */

export const useProductBatchesByProduct = (productId: string) => {
  return useQuery<ProductBatchesByProductResponse>({
    queryKey: productBatchesByProductQueryKey(productId),

    queryFn: async () => {
      const res = await axiosInstance.get<ProductBatchesByProductResponse>(
        `/product-batches/product/${productId}`,
      );

      return res.data;
    },

    staleTime: 5 * 60 * 1000,

    enabled: Boolean(productId),
  });
};

/* =========================================================
   Get Single Product Batch
========================================================= */

export const useProductBatch = (batchId: string) => {
  return useQuery<ProductBatchResponse>({
    queryKey: productBatchQueryKey(batchId),

    queryFn: async () => {
      const res = await axiosInstance.get<ProductBatchResponse>(
        `/product-batches/${batchId}`,
      );

      return res.data;
    },

    staleTime: 5 * 60 * 1000,

    enabled: Boolean(batchId),
  });
};

/* =========================================================
   Create Product Batch
========================================================= */

export const useCreateProductBatch = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newBatch: CreateProductBatchPayload) => {
      try {
        const res = await axiosInstance.post<ProductBatchResponse>(
          "/product-batches",
          newBatch,
        );

        return res.data;
      } catch (error: any) {
        throw new Error(
          error?.response?.data?.message ||
            error?.message ||
            "Failed to create product batch",
        );
      }
    },

    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["productBatches"],
      });

      queryClient.invalidateQueries({
        queryKey: productBatchesByProductQueryKey(variables.product_id),
      });

      queryClient.invalidateQueries({
        queryKey: ["products"],
      });

      queryClient.invalidateQueries({
        queryKey: ["inventory"],
      });
      queryClient.invalidateQueries({
        queryKey: ["inventory-transactions"],
      });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
  });
};

/* =========================================================
   Update Product Batch
========================================================= */

export const useUpdateProductBatch = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updatedBatch }: UpdateProductBatchPayload) => {
      try {
        const res = await axiosInstance.put<ProductBatchResponse>(
          `/product-batches/${id}`,
          updatedBatch,
        );

        return res.data;
      } catch (error: any) {
        console.log("Error while updating product batch:", error);

        throw new Error(
          error?.response?.data?.message || "Failed to update product batch",
        );
      }
    },

    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["productBatches"],
      });

      queryClient.invalidateQueries({
        queryKey: productBatchQueryKey(variables.id),
      });

      /*
       * Invalidate the product-specific batch list
       * when the product ID is available.
       */
      if (variables.product_id) {
        queryClient.invalidateQueries({
          queryKey: productBatchesByProductQueryKey(variables.product_id),
        });
      }

      queryClient.invalidateQueries({
        queryKey: ["products"],
      });

      queryClient.invalidateQueries({
        queryKey: ["inventory"],
      });

      queryClient.invalidateQueries({
        queryKey: ["inventory-transactions"],
      });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
  });
};

/* =========================================================
   Delete Product Batch
========================================================= */

export const useDeleteProductBatch = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (productBatchId: string) => {
      try {
        const res = await axiosInstance.delete<ProductBatchDeleteResponse>(
          `/product-batches/${productBatchId}`,
        );

        return res.data;
      } catch (error: any) {
        console.log("Error while deleting product batch:", error);

        throw new Error(
          error?.response?.data?.message || "Failed to delete product batch",
        );
      }
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["productBatches"],
      });

      queryClient.invalidateQueries({
        queryKey: ["products"],
      });

      queryClient.invalidateQueries({
        queryKey: ["inventory"],
      });

      queryClient.invalidateQueries({
        queryKey: ["inventory-transactions"],
      });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
  });
};
