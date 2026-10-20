import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import axiosInstance from "@/lib/axiosInstance";

export type CoverModel = { model: string; quantity: number };

export type Cover = {
  id: string;
  photo_url: string;
  category_id: string | null;
  // every phone model, in stock first; empty for plain accessories
  models: CoverModel[];
  quantity: number;
  in_stock: boolean;
};

export type CatalogModel = { model: string; count: number };
export type CatalogCategory = {
  id: string;
  name: string;
  count: number;
  photo_url: string;
};

export type CatalogFilters = {
  q: string;
  models: string[];
  category: string;
};

const PAGE_SIZE = 24;

export function useCovers(filters: CatalogFilters, enabled = true) {
  return useInfiniteQuery({
    enabled,
    queryKey: ["catalog-covers", filters],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const res = await axiosInstance.get("/catalog/covers", {
        params: {
          page: pageParam,
          limit: PAGE_SIZE,
          q: filters.q || undefined,
          models: filters.models.length ? filters.models.join(",") : undefined,
          category: filters.category || undefined,
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

export function useCatalogCategories() {
  return useQuery({
    queryKey: ["catalog-categories"],
    queryFn: async () =>
      (await axiosInstance.get("/catalog/categories")).data
        .data as CatalogCategory[],
    staleTime: 5 * 60_000,
  });
}
