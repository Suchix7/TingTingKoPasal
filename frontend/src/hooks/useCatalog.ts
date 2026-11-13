import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import axiosInstance from "@/lib/axiosInstance";
import type { MediaItem } from "@/components/catalog/image";

// `price` and `cost` fields are only sent to the signed-in price viewer
// `fits`: the single phones a line fits ("iPhone 13/14/15" -> 13, 14, 15)
export type CoverModel = { model: string; fits?: string[]; quantity: number; price?: number; cost?: number };

// A colour/style of a product: its photo and the sizes left in it
export type CoverVariant = {
  name: string;
  // index into `media`, -1 when no photo is tagged with this colour
  media_index: number;
  sizes: { size: string; fits?: string[]; quantity: number; price?: number; cost?: number }[];
  quantity: number;
  price_min?: number;
  price_max?: number;
  cost_min?: number;
  cost_max?: number;
};

export type Cover = {
  id: string;
  photo_url: string;
  // every photo and video, cover first
  media: MediaItem[];
  category_id: string | null;
  // every phone model, in stock first; empty for plain accessories
  models: CoverModel[];
  // colours/styles; empty for products that only come in one
  variants?: CoverVariant[];
  // index into `media` of the size chart, -1 when there is none
  size_guide_index?: number;
  // this product's stock lines are sizes rather than phone models
  has_sizes?: boolean;
  // colours split by phone model (variant `sizes` are then phone models)
  has_models?: boolean;
  quantity: number;
  in_stock: boolean;
  // product name (and its Chinese name), for the price viewer only
  name?: string;
  name_zh?: string;
  // selling and cost price ranges, for the price viewer only
  price_min?: number;
  price_max?: number;
  cost_min?: number;
  cost_max?: number;
};

// a colour that has one of these phone models (or sizes) in stock
export const fitsModels = (v: CoverVariant, models: string[]) =>
  models.length > 0 &&
  v.sizes.some(
    (s) =>
      s.quantity > 0 &&
      (s.fits ?? [s.size]).some((f) => models.some((m) => m.toLowerCase() === f.toLowerCase())),
  );

export type CatalogModel = { model: string; count: number };
export type CatalogCategory = {
  id: string;
  name: string;
  // Chinese name, when one is set
  name_zh?: string;
  count: number;
  photo_url: string;
  // products here are stocked per size (S, M, L) rather than per phone model
  has_sizes?: boolean;
};

export type CatalogFilters = {
  q: string;
  models: string[];
  category: string;
};

const PAGE_SIZE = 24;

// The free host sleeps when idle and takes up to a minute to wake: keep
// retrying quietly instead of showing an error straight away.
const wakeRetry = {
  retry: 8,
  retryDelay: (attempt: number) => Math.min(1500 * (attempt + 1), 8000),
};

// `prices`: the /prices page asks for selling prices (sent only to the
// signed-in price viewer)
export function useCovers(filters: CatalogFilters, enabled = true, prices = false) {
  return useInfiniteQuery({
    enabled,
    queryKey: ["catalog-covers", filters, prices],
    ...wakeRetry,
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const res = await axiosInstance.get("/catalog/covers", {
        params: {
          page: pageParam,
          limit: PAGE_SIZE,
          q: filters.q || undefined,
          models: filters.models.length ? filters.models.join(",") : undefined,
          category: filters.category || undefined,
          prices: prices ? 1 : undefined,
        },
      });
      return res.data as {
        data: Cover[];
        pagination: { total: number; hasMore: boolean };
        fuzzy?: boolean;
        suggestions?: string[];
      };
    },
    getNextPageParam: (last, pages) =>
      last.pagination.hasMore ? pages.length + 1 : undefined,
    staleTime: 60_000,
  });
}

export function useCatalogModels(category = "") {
  return useQuery({
    ...wakeRetry,
    queryKey: ["catalog-models", category],
    queryFn: async () =>
      (
        await axiosInstance.get("/catalog/models", {
          params: { category: category || undefined },
        })
      ).data.data as CatalogModel[],
    staleTime: 5 * 60_000,
  });
}

type SignedIn = { username: string; role: "admin" | "price" } | null;
// an admin and the price viewer can both be signed in on one browser
export type CatalogSession = { admin: SignedIn; prices: SignedIn };

// who is signed in on this browser, if anyone
export function useCatalogSession() {
  return useQuery({
    queryKey: ["catalog-session"],
    ...wakeRetry,
    queryFn: async () => {
      const d = (await axiosInstance.get("/session")).data;
      return { admin: d.admin ?? null, prices: d.prices ?? null } as CatalogSession;
    },
    staleTime: 10 * 60_000,
  });
}

export type CatalogStore = {
  name: string;
  address: string;
  phone: string;
  map_url?: string;
  // Instagram username for the message button ("" = no button)
  instagram?: string;
};

export function useCatalogStore() {
  return useQuery({
    queryKey: ["catalog-store"],
    ...wakeRetry,
    queryFn: async () =>
      (await axiosInstance.get("/catalog/store")).data.data as CatalogStore,
    staleTime: 10 * 60_000,
  });
}

export function useCatalogCategories() {
  return useQuery({
    ...wakeRetry,
    queryKey: ["catalog-categories"],
    queryFn: async () =>
      (await axiosInstance.get("/catalog/categories")).data
        .data as CatalogCategory[],
    staleTime: 5 * 60_000,
  });
}
