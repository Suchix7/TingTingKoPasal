"use client";

import { useIsFetching, useIsMutating } from "@tanstack/react-query";

// Thin bar along the top of the screen while anything is loading or saving,
// so the app never looks frozen.
export default function ActivityBar() {
  const fetching = useIsFetching();
  const mutating = useIsMutating();
  const busy = fetching + mutating > 0;

  return (
    <div
      aria-hidden
      className={`pointer-events-none fixed inset-x-0 top-0 z-[80] h-0.5 overflow-hidden bg-transparent transition-opacity duration-200 ${
        busy ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="activity-bar h-full w-1/3 rounded-full bg-gray-900" />
    </div>
  );
}
