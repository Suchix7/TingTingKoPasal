"use client";

import { useEffect, useState } from "react";
import { Toaster } from "react-hot-toast";

// The one toast container for the whole app (don't add another: each toast
// would show twice, one on top of the other).
// - Phones: top centre, below the status bar / notch (the app draws under it,
//   see viewportFit "cover" in the root layout), and as wide as the screen
//   allows so long messages wrap instead of piling up.
// - Wider screens: top right, as before.
export default function AppToaster() {
  const [phone, setPhone] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 639px)");
    const update = () => setPhone(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return (
    <Toaster
      position={phone ? "top-center" : "top-right"}
      gutter={8}
      containerStyle={{
        top: "calc(env(safe-area-inset-top) + 12px)",
        left: 12,
        right: 12,
      }}
      toastOptions={{
        style: phone ? { maxWidth: "100%" } : undefined,
      }}
    />
  );
}
