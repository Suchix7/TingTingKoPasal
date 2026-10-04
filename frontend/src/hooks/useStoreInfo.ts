import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/lib/axiosInstance";

// ==========================================================
// TYPES
// ==========================================================

export type Store = {
  id: 1;
  store_name: string;
  address: string;
  phone: string;
  pan_vat_number: string;
  created_at?: string;
  updated_at?: string;
};

export type StorePayload = {
  store_name: string;
  address: string;
  phone: string;
  pan_vat_number: string;
};

export type StoreResponse = {
  success: boolean;
  data: Store;
};

export type StoreActionResponse = {
  success: boolean;
  message: string;
  data: Store;
};

export type DeleteStoreResponse = {
  success: boolean;
  message: string;
};

// ==========================================================
// QUERY KEY
// ==========================================================

export const storeQueryKey = ["store"] as const;

// ==========================================================
// GET STORE
// ==========================================================

export const useStore = () => {
  return useQuery<StoreResponse>({
    queryKey: storeQueryKey,

    queryFn: async () => {
      const res = await axiosInstance.get<StoreResponse>("/store-info");

      return res.data;
    },

    staleTime: 5 * 60 * 1000,
  });
};

// ==========================================================
// CREATE STORE
// ==========================================================

export const useCreateStore = () => {
  const queryClient = useQueryClient();

  return useMutation<StoreActionResponse, Error, StorePayload>({
    mutationFn: async (newStore: StorePayload) => {
      try {
        const res = await axiosInstance.post<StoreActionResponse>(
          "/store-info",
          newStore,
        );

        return res.data;
      } catch (error: any) {
        console.error("Error while creating store:", error);

        throw new Error(
          error?.response?.data?.message || "Failed to create store",
        );
      }
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: storeQueryKey,
      });
    },
  });
};

// ==========================================================
// UPDATE STORE
// ==========================================================

export const useUpdateStore = () => {
  const queryClient = useQueryClient();

  return useMutation<StoreActionResponse, Error, StorePayload>({
    mutationFn: async (updatedStore: StorePayload) => {
      try {
        const res = await axiosInstance.put<StoreActionResponse>(
          "/store-info",
          updatedStore,
        );

        return res.data;
      } catch (error: any) {
        console.error("Error while updating store:", error);

        throw new Error(
          error?.response?.data?.message || "Failed to update store",
        );
      }
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: storeQueryKey,
      });
    },
  });
};

// ==========================================================
// DELETE STORE
// ==========================================================

export const useDeleteStore = () => {
  const queryClient = useQueryClient();

  return useMutation<DeleteStoreResponse, Error, void>({
    mutationFn: async () => {
      try {
        const res =
          await axiosInstance.delete<DeleteStoreResponse>("/store-info");

        return res.data;
      } catch (error: any) {
        console.error("Error while deleting store:", error);

        throw new Error(
          error?.response?.data?.message || "Failed to delete store",
        );
      }
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: storeQueryKey,
      });
    },
  });
};
