import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import axiosInstance from "@/lib/axiosInstance";

export type Cover = {
  id: string;
  photo_url: string;
  category_id: string | null;
  models: string[];
};

export type CatalogModel = { model: string; count: number };
export type CatalogCategory = { id: string; name: string };

export type CatalogFilters = {
  q: string;
  models: string[];
  category: string;
};

const PAGE_SIZE = 24;

export function useCovers(filters: CatalogFilters) {
  return useInfiniteQuery({
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
      };
    },
    getNextPageParam: (last, pages) =>
      last.pagination.hasMore ? pages.length + 1 : undefined,
    staleTime: 60_000,
  });
}

export function useCatalogModels() {
  return useQuery({
    queryKey: ["catalog-models"],
    queryFn: async () =>
      (await axiosInstance.get("/catalog/models")).data.data as CatalogModel[],
    staleTime: 5 * 60_000,
  });
}

export function useCatalogCategories() {
  return useQuery({
    queryKey: ["catalog-categories"],
    queryFn: async () =>
      (await axiosInstance.get("/catalog/categories"))
        .data.data as CatalogCategory[],
    staleTime: 5 * 60_000,
  });
}
