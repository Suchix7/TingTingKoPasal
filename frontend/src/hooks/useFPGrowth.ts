import { keepPreviousData, useQuery } from "@tanstack/react-query";
import axiosInstance from "@/lib/axiosInstance";

/* ---------------- TYPES ---------------- */

export type FPGrowthQueryParams = {
  minSupport?: number;
};

export type FPGrowthFrequentItemset = {
  items: string[];
  itemCount: number;
  supportCount: number;
  supportPercentage: number;
};

export type FPGrowthBundleSuggestion = {
  products: string[];
  supportCount: number;
  supportPercentage: number;
  suggestion: string;
};

export type FPGrowthResponse = {
  success: boolean;
  message: string;
  data: {
    totalTransactions: number;
    minSupport: number;
    minSupportCount: number;
    frequentItemsets: FPGrowthFrequentItemset[];
    bundleSuggestions: FPGrowthBundleSuggestion[];
  };
};

/* ---------------- QUERY KEY ---------------- */

export const fpGrowthQueryKey = (params: FPGrowthQueryParams = {}) =>
  ["analytics", "fp-growth", params] as const;

/* ---------------- API FUNCTION ---------------- */

const fetchFPGrowthAnalysis = async (
  params: FPGrowthQueryParams = {},
): Promise<FPGrowthResponse> => {
  try {
    const res = await axiosInstance.get<FPGrowthResponse>("/fp-growth", {
      params: {
        minSupport: params.minSupport ?? 0.2,
      },
    });

    return res.data;
  } catch (error: any) {
    const message =
      error?.response?.data?.message ||
      error?.message ||
      "Failed to fetch FP-Growth analysis";

    throw new Error(message);
  }
};

/* ---------------- HOOK ---------------- */

export const useFPGrowthAnalysis = (
  params: FPGrowthQueryParams = {
    minSupport: 0.2,
  },
) => {
  return useQuery<
    FPGrowthResponse,
    Error,
    FPGrowthResponse,
    ReturnType<typeof fpGrowthQueryKey>
  >({
    queryKey: fpGrowthQueryKey(params),
    queryFn: () => fetchFPGrowthAnalysis(params),
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
  });
};
