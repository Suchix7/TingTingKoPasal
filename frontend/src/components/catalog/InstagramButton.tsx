"use client";

import { useEffect, useState } from "react";

// Floating "message us" button on the customer shop: opens a chat with the
// shop on Instagram (ig.me/m/<name> opens the DM in the app, or Instagram on
// the web). On phones a small bubble says what it is for a few seconds on the
// first visit; on computers it opens into a pill on hover.
export default function InstagramButton({ username }: { username: string }) {
  const [hint, setHint] = useState(false);

  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem("ig-hint") === "1";
      sessionStorage.setItem("ig-hint", "1");
    } catch {}
    if (seen) return;
    const show = setTimeout(() => setHint(true), 1500);
    const hide = setTimeout(() => setHint(false), 6500);
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
    };
  }, []);

  if (!username) return null;

  return (
    <div className="pointer-events-none fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-30 flex items-center gap-2 sm:bottom-6 sm:right-6">
      {/* phones: a short hint on the first visit */}
      <span
        aria-hidden
        className={`rounded-2xl rounded-br-md bg-white px-3 py-2 text-xs font-semibold text-gray-800 shadow-lg ring-1 ring-black/5 transition-all duration-300 sm:hidden ${
          hint ? "translate-x-0 opacity-100" : "translate-x-2 opacity-0"
        }`}
      >
        Chat with us on Instagram
      </span>

      <a
        href={`https://ig.me/m/${encodeURIComponent(username)}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Message us on Instagram"
        title={`Message @${username} on Instagram`}
        // the Instagram colours, set here so no other style can wash them out
        style={{
          background:
            "linear-gradient(45deg, #f58529 0%, #dd2a7b 45%, #8134af 75%, #515bd4 100%)",
        }}
        className="group pointer-events-auto relative flex h-14 items-center overflow-hidden rounded-full text-white shadow-lg shadow-black/25 ring-[3px] ring-white transition-all duration-300 hover:shadow-xl active:scale-95"
      >
        <span className="relative flex h-14 w-14 shrink-0 items-center justify-center">
          <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <rect x="3" y="3" width="18" height="18" rx="5.5" />
            <circle cx="12" cy="12" r="4.2" />
            <circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none" />
          </svg>
        </span>
        {/* computers: opens into a pill on hover */}
        <span className="relative hidden max-w-0 whitespace-nowrap pr-0 text-sm font-semibold opacity-0 transition-all duration-300 group-hover:max-w-56 group-hover:pr-5 group-hover:opacity-100 sm:block">
          Message us on Instagram
        </span>
      </a>
    </div>
  );
}
