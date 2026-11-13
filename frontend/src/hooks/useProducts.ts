import { tr } from "@/lib/i18n";
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
  // colour/style and size of a colour/size stock line ("" otherwise)
  variant?: string;
  size?: string;
  // phone model of a colour × model cover line ("" otherwise)
  model?: string;
  // place in the order set in the stock editor (null: ordered by name)
  position?: number | null;
  barcode?: string | null;
  quantity: number;
  cost_price: number;
  sale_price: number;
  is_deleted?: boolean;
  created_at?: string;
  updated_at?: string;
};

export type Product = {
  id: string;
  product_name: string;
  product_name_zh?: string | null;
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
  // all photos in display order, the first one is the cover
  photos?: ProductPhoto[];
  created_at?: string;
  updated_at?: string;
};

export type ProductPhoto = {
  id: string;
  type: "image" | "video";
  url: string;
  // still picture: the photo itself, or a frame from the video
  poster: string;
  // colour/style this photo shows, and whether it is the size chart
  variant?: string;
  size_guide?: boolean;
};

type MediaLabels = { variant?: string; size_guide?: boolean };

// What the product form sends: an existing photo/video id, or a new file,
// each with the colour it shows / whether it is the size guide
export type ProductMediaEntry =
  | string
  | ({ id: string } & MediaLabels)
  | ({ file: File; type: "image" | "video" } & MediaLabels);

type SignedUpload = {
  cloud_name: string;
  api_key: string;
  resource_type: "image" | "video";
  params: Record<string, string | number>;
  signature: string;
};

// Uploads one file straight to Cloudinary (videos are too big to go through
// our server) using params the backend signed.
async function uploadToCloudinary(
  file: File,
  type: "image" | "video",
  onProgress: (fraction: number) => void,
) {
  const sign = (
    await axiosInstance.post<{ data: SignedUpload }>("/products/media/sign", {
      type,
    })
  ).data.data;

  const form = new FormData();
  form.append("file", file);
  form.append("api_key", sign.api_key);
  form.append("signature", sign.signature);
  Object.entries(sign.params).forEach(([k, v]) => form.append(k, String(v)));

  const res = await axios.post(
    `https://api.cloudinary.com/v1_1/${sign.cloud_name}/${sign.resource_type}/upload`,
    form,
    {
      onUploadProgress: (e) => {
        if (e.total) onProgress(e.loaded / e.total);
      },
    },
  );
  return {
    type,
    url: res.data.secure_url as string,
    publicId: res.data.public_id as string,
  };
}

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
  stock?: "" | "in_stock" | "out_of_stock";
  sort?: "" | "price_asc" | "price_desc" | "name_asc";
  model?: string;
};

export type ProductModel = {
  model: string;
  product_count: number;
  quantity: number;
};

// Phone models used by the products in a category (for the POS model chips)
export const useProductModels = (category: string, status = "Active") =>
  useQuery<ProductModel[]>({
    // Under "products" so a sale's products refresh updates the counts too
    queryKey: ["products", "models", category, status],
    enabled: !!category,
    queryFn: async () => {
      const res = await axiosInstance.get<{ data: ProductModel[] }>(
        "/products/models",
        { params: { category, status } },
      );
      return res.data.data;
    },
  });

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
        error.response?.data?.message || tr("Failed to fetch products"),
      );
    }

    throw new Error(tr("Failed to fetch products"));
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
      toast.success(tr("Product created successfully."));
    },

    onError: (error: any) => {
      toast.error(
        error.response?.data?.message ||
          error.message ||
          tr("Failed to create product."),
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
            error.response?.data?.message || tr("Failed to update product"),
          );
        }

        throw new Error(tr("Failed to update product"));
      }
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["productBatches"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
      toast.success(tr("Product updated successfully."));
    },

    onError: (error: any) => {
      toast.error(
        error.response?.data?.message ||
          error.message ||
          tr("Failed to update product."),
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
          error.response?.data?.message || tr("Failed to delete product."),
        );
        throw new Error(tr("Failed to delete product"));
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
        throw new Error(tr("Failed to fetch product"));
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
              tr("Failed to fetch product by barcode"),
          );
        }

        throw new Error(tr("Failed to fetch product by barcode"));
      }
    },
    enabled: Boolean(barcode?.trim()),
  });
};

// Saves the whole photo/video list at once, in display order (first one is
// the cover). New files are uploaded first, one at a time, with progress.
export const useSaveProductPhotos = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      entries,
      onProgress,
    }: {
      id: number | string;
      entries: ProductMediaEntry[];
      // (files done, files total, progress of the current file 0..1)
      onProgress?: (done: number, total: number, current: number) => void;
    }) => {
      const isUpload = (e: ProductMediaEntry) =>
        typeof e !== "string" && "file" in e;
      const total = entries.filter(isUpload).length;
      let done = 0;
      const media = [];
      for (const entry of entries) {
        if (typeof entry === "string" || !("file" in entry)) {
          media.push(entry);
          continue;
        }
        const uploaded = await uploadToCloudinary(entry.file, entry.type, (f) =>
          onProgress?.(done, total, f),
        );
        media.push({
          ...uploaded,
          variant: entry.variant ?? "",
          size_guide: !!entry.size_guide,
        });
        done += 1;
        onProgress?.(done, total, 0);
      }

      const res = await axiosInstance.put<ProductResponse>(
        `/products/${id}/photos`,
        { media },
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
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
        error.response?.data?.message || tr("Failed to reprint barcode."),
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
      toast.success(tr("New barcode generated. Please reprint the label."));
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || tr("Failed to regenerate barcode."),
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
