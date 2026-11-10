import { create } from "zustand";
import axiosInstance from "@/lib/axiosInstance";
import toast from "react-hot-toast";

type AuthState = {
  authUser: any | null;

  isSigningUp: boolean;
  isLoggingIn: boolean;
  isCheckingAuth: boolean;
};
type AuthActions = {
  checkAuth: () => Promise<boolean>;
  login: (data: any) => Promise<void>;
  logout: () => Promise<void>;
};

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>((set, get) => ({
  authUser: null,
  isSigningUp: false,
  isLoggingIn: false,
  isCheckingAuth: true,

  checkAuth: async () => {
    try {
      set({ isCheckingAuth: true });
      const res = await axiosInstance.get("/check");
      set({ authUser: res.data.user });
      return true;
    } catch (error) {
      return false;
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  login: async (data: any) => {
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post("/login", data, {
        withCredentials: true,
      });
      if (!res.data.success) throw new Error(res.data.message);
      set({ authUser: res.data.user });
      toast.success("Welcome back!");
      // the price viewer only sees the customer site, with prices
      window.location.href = res.data.user?.role === "price" ? "/" : "/admin";
    } catch (error) {
      toast.error("Invalid username or password.");
      throw error;
    } finally {
      set({ isLoggingIn: false });
    }
  },

  logout: async () => {
    try {
      await axiosInstance.post("/logout");
      set({ authUser: null });
      toast.success("Goodbye!");
      window.location.href = "/admin/auth";
    } catch (error) {
      toast.error("Failed to logout.");
    }
  },
}));
