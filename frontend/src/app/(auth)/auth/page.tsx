"use client";

import { useState } from "react";
import { useAuthStore } from "@/store/auth.store";
import { useRouter } from "next/navigation";
import { Shield, Lock, ArrowRight, Loader2, Building2 } from "lucide-react";
import toast from "react-hot-toast";

export default function Page() {
  const router = useRouter();
  const [passcode, setPasscode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (passcode.trim() === "") {
      setError("Please enter your passcode");
      return;
    }

    if (passcode.length < 4) {
      setError("Passcode must be at least 4 characters");
      return;
    }

    try {
      setLoading(true);
      await login({ passcode });
    } catch (error: any) {
      console.log("Error while submitting passcode:", error);
      toast.error("Invalid passcode");
      setError(
        error?.response?.data?.message || "Invalid passcode. Please try again.",
      );
      throw new Error("Failed to submit passcode");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gray-50 px-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-80 w-80 rounded-full border border-gray-100"></div>
        <div className="absolute -bottom-40 -right-40 h-80 w-80 rounded-full border border-gray-100"></div>
        <div className="absolute left-1/2 top-1/2 h-60 w-60 -translate-x-1/2 -translate-y-1/2 rounded-full border border-gray-50"></div>
      </div>

      {/* Main Content */}
      <div className="relative w-full max-w-md">
        {/* Logo/Brand Section */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-900">
            <Building2 className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome to Ting Ting ko pasal
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Secure access to your management dashboard
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          {/* Error Message */}
          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-red-100">
                <span className="text-xs font-bold text-red-600">!</span>
              </div>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Passcode
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="password"
                  placeholder="Enter your passcode"
                  value={passcode}
                  onChange={(e) => {
                    setPasscode(e.target.value);
                    setError("");
                  }}
                  className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-4 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
                  maxLength={20}
                  autoFocus
                />
              </div>
              <p className="mt-2 text-xs text-gray-400">
                Enter the passcode provided by your administrator
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || !passcode.trim()}
              className="group cursor-pointer inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4" />
                  Access Dashboard
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>

          {/* Help Text */}
          <div className="mt-6 border-t border-gray-100 pt-4">
            <div className="flex items-center justify-center gap-2">
              <Lock className="h-3 w-3 text-gray-400" />
              <p className="text-xs text-gray-400">
                Protected by system passcode authentication
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
