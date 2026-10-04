"use client";

import { useAuthStore } from "@/store/auth.store";
import { Shield } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export default function AuthenticationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { checkAuth, authUser } = useAuthStore();

  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAllowed, setIsAllowed] = useState(false);

  const hasCheckedRef = useRef(false);

  useEffect(() => {
    const checkAuthentication = async () => {
      try {
        const isAuthenticated = await checkAuth();

        if (!isAuthenticated) {
          setIsAllowed(false);
          router.replace("/auth");
          return;
        }

        setIsAllowed(true);
      } catch (error) {
        console.error("Error checking authentication:", error);
        setIsAllowed(false);
        router.replace("/auth");
      } finally {
        setIsCheckingAuth(false);
      }
    };

    if (authUser) {
      setIsAllowed(true);
      setIsCheckingAuth(false);
      return;
    }

    if (hasCheckedRef.current) return;

    hasCheckedRef.current = true;
    checkAuthentication();
  }, [authUser, checkAuth, router]);

  if (isCheckingAuth) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-6">
          <div className="rounded-2xl bg-white p-8 shadow-sm border border-gray-200">
            <div className="flex flex-col items-center gap-4">
              <div className="rounded-xl bg-gray-100 p-4">
                <Shield className="h-8 w-8 text-gray-700 animate-pulse" />
              </div>

              <div className="text-center">
                <h2 className="text-lg font-semibold text-gray-900">
                  Verifying Access
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Please wait while we check your credentials...
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAllowed) {
    return null;
  }

  return <>{children}</>;
}
