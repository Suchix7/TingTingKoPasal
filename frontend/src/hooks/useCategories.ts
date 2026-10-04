import {
  useMutation,
  useQuery,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import axiosInstance from "@/lib/axiosInstance";

type Category = {
  id: string;
  category_name: string;
  description?: string;
  created_at: string;
  updated_at: string;
};

type CategoryResponse = {
  success: boolean;
  data: Category[];
  totalCount: number;
  stats: {
    totalCategories: number;
    categoriesWithDesc: number;
    recentCategories: number;
  };
  page: number;
  limit: number;
  totalPages: number;
};

export const categoriesQueryKey = (page: number, limit: number, search = "") =>
  ["categories", { page, limit, search }] as const;

export const useCategories = (page = 1, limit = 10, search = "") => {
  return useQuery<CategoryResponse>({
    queryKey: categoriesQueryKey(page, limit, search),
    queryFn: async () => {
      const response = await axiosInstance.get<CategoryResponse>(
        "/categories",
        {
          params: {
            page,
            limit,
            search,
          },
        },
      );

      return response.data;
    },
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
    enabled: page > 0 && limit > 0,
  });
};

export const useCreateCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newCategory: {
      category_name: string;
      description?: string;
    }) => {
      try {
        const response = await axiosInstance.post("/categories", newCategory);
        return response.data;
      } catch (error) {
        console.error("Error creating category:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });
};

export const useUpdateCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (updatedCategory: Category) => {
      try {
        const response = await axiosInstance.put(
          `/categories/${updatedCategory.id}`,
          updatedCategory,
        );
        return response.data;
      } catch (error) {
        console.error("Error updating category:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });
};

export const useDeleteCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (categoryId: string) => {
      try {
        const response = await axiosInstance.delete(
          `/categories/${categoryId}`,
        );
        return response.data;
      } catch (error) {
        console.error("Error deleting category:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });
};
