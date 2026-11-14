import { tr } from "@/lib/i18n";
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
  // colour/style, size and phone model of the line ("" when not split)
  variant?: string;
  size?: string;
  model?: string;
  // place in the order set in the stock editor (null: ordered by name)
  position?: number | null;
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
  // totals across every matching batch (not just this page)
  stats?: {
    totalBatches: number;
    totalQuantity: number;
    totalValue: number;
    uniqueProducts: number;
    lowQuantityBatches: number;
    zeroQuantityBatches: number;
  };
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
  productId = "",
) => ["productBatches", { page, limit, search, productId }] as const;

export const productBatchesByProductQueryKey = (productId: string) =>
  ["productBatches", "product", productId] as const;

export const productBatchQueryKey = (batchId: string) =>
  ["productBatch", batchId] as const;

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
          error?.response?.data?.message || tr("Failed to update product batch"),
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
