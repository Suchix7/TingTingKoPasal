"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp } from "lucide-react";
import { useLang } from "@/lib/i18n";

// Floating "back to top" for the POS product list. It shows once the list is
// scrolled down a way and takes it back to the top. On phones and tablets the
// whole page scrolls; on wide screens the product grid scrolls by itself, so
// it watches whichever of those is moving. `raised`: the bill bar is showing,
// so sit above it.
export default function ScrollTopButton({
  area,
  raised = false,
}: {
  // the products section: anything scrolling inside it counts
  area: React.RefObject<HTMLElement | null>;
  raised?: boolean;
}) {
  const { t } = useLang();
  const [shown, setShown] = useState(false);
  const scroller = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const onScroll = (e: Event) => {
      const el = e.target;
      if (!(el instanceof HTMLElement)) return;
      const main = document.querySelector("main");
      if (el !== main && !area.current?.contains(el)) return;
      if (el.scrollTop > 500) {
        scroller.current = el;
        setShown(true);
      } else if (scroller.current === el || !scroller.current) {
        setShown(false);
      }
    };
    // scroll events don't bubble: listen while they travel down instead
    document.addEventListener("scroll", onScroll, true);
    return () => document.removeEventListener("scroll", onScroll, true);
  }, [area]);

  return (
    <button
      type="button"
      onClick={() => scroller.current?.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label={t("Back to top")}
      title={t("Back to top")}
      tabIndex={shown ? 0 : -1}
      className={`pos-top-btn group fixed right-4 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-white text-gray-900 shadow-lg shadow-black/15 ring-1 ring-gray-200 transition-all duration-200 hover:bg-gray-900 hover:text-white active:scale-95 xl:absolute xl:right-5 ${
        raised ? "raised" : ""
      } ${shown ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"}`}
    >
      <ArrowUp className="h-5 w-5 transition-transform group-hover:-translate-y-0.5" />
      {/* wide screens: a label on hover */}
      <span className="pointer-events-none absolute right-full mr-2 hidden whitespace-nowrap rounded-lg bg-gray-900 px-2.5 py-1.5 text-xs font-semibold text-white opacity-0 shadow transition-opacity group-hover:opacity-100 md:block">
        {t("Back to top")}
      </span>
    </button>
  );
}
