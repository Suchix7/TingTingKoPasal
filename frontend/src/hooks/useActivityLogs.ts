import { useQuery, keepPreviousData } from "@tanstack/react-query";
import axiosInstance from "@/lib/axiosInstance";

export type ActivityLog = {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  summary: string;
  details: Record<string, any> | null;
  created_at: string;
};

export type ActivityLogsResponse = {
  success: boolean;
  totalCount: number;
  data: ActivityLog[];
};

export const useActivityLogs = (
  page: number,
  limit: number,
  entityType: string,
  search: string,
) =>
  useQuery<ActivityLogsResponse>({
    queryKey: ["activity-logs", page, limit, entityType, search],
    queryFn: async () => {
      const res = await axiosInstance.get<ActivityLogsResponse>(
        "/activity-logs",
        {
          params: {
            page,
            limit,
            ...(entityType ? { entity_type: entityType } : {}),
            ...(search ? { search } : {}),
          },
        },
      );
      return res.data;
    },
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: true,
  });
