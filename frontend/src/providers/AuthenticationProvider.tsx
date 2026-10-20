"use client";

import { useAuthStore } from "@/store/auth.store";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "@/lib/i18n";
import { SlowNotice } from "@/components/layout/Skeleton";

export default function AuthenticationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { t } = useLang();
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
          router.replace("/admin/auth");
          return;
        }

        setIsAllowed(true);
      } catch (error) {
        console.error("Error checking authentication:", error);
        setIsAllowed(false);
        router.replace("/admin/auth");
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
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gray-50 px-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.png"
          alt=""
          width={96}
          height={96}
          className="h-24 w-24 animate-pulse rounded-full"
        />
        <h2 className="mt-5 text-lg font-semibold text-gray-900">
          {t("Verifying Access")}
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          {t("Please wait while we check your credentials...")}
        </p>
        <SlowNotice loading />
      </div>
    );
  }

  if (!isAllowed) {
    return null;
  }

  return <>{children}</>;
}
