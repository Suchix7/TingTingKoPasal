"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/auth.store";
import { ArrowLeft, ArrowRight, Eye, EyeOff, Loader2, Lock, Tag, User } from "lucide-react";
import { useLang } from "@/lib/i18n";
import LanguageToggle from "@/components/app-shell/LanguageToggle";

export default function Page() {
  const { t } = useLang();
  const [username, setUsername] = useState("");
  const [passcode, setPasscode] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // came from /prices: the price viewer's sign-in
  const [forPrices, setForPrices] = useState(false);
  const { login } = useAuthStore();

  useEffect(() => {
    setForPrices(new URLSearchParams(window.location.search).get("for") === "prices");
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError("");

    if (username.trim() === "") {
      setError(t("Please enter your username"));
      return;
    }
    if (passcode.trim() === "") {
      setError(t("Please enter your passcode"));
      return;
    }
    if (passcode.length < 4) {
      setError(t("Passcode must be at least 4 characters"));
      return;
    }

    try {
      setLoading(true);
      await login({ username: username.trim(), passcode });
    } catch (err: unknown) {
      // the server's own reason when it gave one (e.g. too many wrong tries)
      const reason = (err as { response?: { data?: { message?: string } } })?.response?.data
        ?.message;
      setError(t(reason || "Invalid username or password."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-bg relative flex min-h-dvh flex-col overflow-hidden px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
      {/* soft rings from the badge, behind everything */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full border-[18px] border-[#c8423b]/[0.06]" />
        <div className="absolute -bottom-32 -right-24 h-96 w-96 rounded-full border-[22px] border-[#2c3e5c]/[0.06]" />
        <div className="absolute right-8 top-24 h-24 w-24 rounded-full border-[10px] border-[#e8b04a]/10" />
      </div>

      <div className="relative z-10 flex items-center justify-between">
        <Link
          href="/"
          className="flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-[#2c3e5c]/80 active:bg-black/5"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("Back to the shop")}
        </Link>
        <LanguageToggle />
      </div>

      <main className="relative z-10 mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-6">
        {/* brand */}
        <div className="mb-7 text-center">
          <div className="lost-bob relative mx-auto mb-4 h-28 w-28">
            <span className="absolute inset-0 rounded-full bg-[#c8423b]/15 blur-xl" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="Ting Ting ko pasal"
              width={112}
              height={112}
              className="relative h-28 w-28 rounded-full shadow-xl ring-4 ring-white"
            />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#2c3e5c]">
            Ting Ting ko pasal
          </h1>
          <p className="mt-1.5 flex items-center justify-center gap-1.5 text-sm text-[#2c3e5c]/70">
            {forPrices ? (
              <>
                <Tag className="h-4 w-4 text-emerald-600" />
                {t("Sign in to see prices")}
              </>
            ) : (
              t("Sign in to manage your shop")
            )}
          </p>
        </div>

        {/* card */}
        <div className="rounded-3xl bg-white/90 p-6 shadow-[0_20px_50px_-20px_rgba(44,62,92,0.35)] ring-1 ring-[#2c3e5c]/5 backdrop-blur sm:p-7">
          {error && (
            <div
              role="alert"
              className="mb-4 flex items-start gap-2.5 rounded-2xl bg-red-50 px-3.5 py-3 text-sm text-red-700 ring-1 ring-red-100"
            >
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-100 text-xs font-bold text-red-600">
                !
              </span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" method="post" action="#">
            <div>
              <label htmlFor="username" className="mb-1.5 block text-sm font-semibold text-[#2c3e5c]">
                {t("Username")}
              </label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  enterKeyHint="next"
                  placeholder={t("Enter your username")}
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setError("");
                  }}
                  className="h-12 w-full rounded-xl border border-gray-200 bg-gray-50/60 pl-11 pr-4 text-base text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#c8423b]/50 focus:bg-white focus:ring-4 focus:ring-[#c8423b]/10"
                  maxLength={40}
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-semibold text-[#2c3e5c]">
                {t("Password")}
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  id="password"
                  name="password"
                  type={showPass ? "text" : "password"}
                  autoComplete="current-password"
                  enterKeyHint="go"
                  placeholder={t("Enter your password")}
                  value={passcode}
                  onChange={(e) => {
                    setPasscode(e.target.value);
                    setError("");
                  }}
                  className="h-12 w-full rounded-xl border border-gray-200 bg-gray-50/60 pl-11 pr-12 text-base text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#c8423b]/50 focus:bg-white focus:ring-4 focus:ring-[#c8423b]/10"
                  maxLength={20}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  aria-label={t(showPass ? "Hide password" : "Show password")}
                  className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-gray-400 active:bg-gray-100"
                >
                  {showPass ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !username.trim() || !passcode.trim()}
              className="group mt-2 inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#c8423b] px-4 text-base font-semibold text-white shadow-lg shadow-[#c8423b]/25 transition hover:bg-[#b53a34] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  {t("Verifying...")}
                </>
              ) : (
                <>
                  {t("Sign in")}
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="mt-5 flex items-center justify-center gap-1.5 text-xs text-[#2c3e5c]/50">
          <Lock className="h-3 w-3" />
          {t("Staff only. Ask the shop owner for a login.")}
        </p>
      </main>
    </div>
  );
}
