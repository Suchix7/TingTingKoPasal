import { useMutation } from "@tanstack/react-query";
import axiosInstance from "@/lib/axiosInstance";
import toast from "react-hot-toast";

export const useUpdatePasscode = () => {
  return useMutation({
    mutationFn: async ({
      oldPasscode,
      newPasscode,
    }: {
      oldPasscode: string;
      newPasscode: string;
    }) => {
      try {
        const response = await axiosInstance.put("/security", {
          oldPasscode,
          newPasscode,
        });
        return response.data;
      } catch (error) {
        console.log("Error while updating passcode:", error);
        throw new Error("Failed to update passcode");
      }
    },
    onSuccess: () => {
      toast.success("Passcode updated successfully");
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to update passcode",
      );
    },
  });
};
