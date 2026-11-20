"use client";

import { useEffect, useState } from "react";
import toast, { Toaster, ToastBar, useToasterStore } from "react-hot-toast";

// at most this many notifications on screen; older ones close first
const MAX_VISIBLE = 3;

// height of the admin top bar (MainShell header) and the phone bottom nav
const HEADER_H = 57;
const BOTTOM_NAV_H = 56;

// The one toast container for the whole app (don't add another: each toast
// would show twice, one on top of the other).
// Toasts must never sit on top of the controls people need:
// - Phones: bottom centre, just above the bottom nav and the home indicator,
//   so the header (menu, page name, COD bell, language) stays visible, and a
//   modal's Save / Cancel buttons at the very bottom stay clear.
// - Wider screens: top right, below the header bar instead of over it.
// Tapping a toast closes it.
export default function AppToaster() {
  const [phone, setPhone] = useState(false);
  const { toasts } = useToasterStore();

  useEffect(() => {
    const query = window.matchMedia("(max-width: 767px)");
    const update = () => setPhone(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  // keep the stack short: close the oldest when too many are showing
  useEffect(() => {
    toasts
      .filter((t) => t.visible)
      .slice(MAX_VISIBLE)
      .forEach((t) => toast.dismiss(t.id));
  }, [toasts]);

  return (
    <Toaster
      position={phone ? "bottom-center" : "top-right"}
      gutter={8}
      containerStyle={
        phone
          ? {
              bottom: `calc(env(safe-area-inset-bottom) + ${BOTTOM_NAV_H + 12}px)`,
              left: 12,
              right: 12,
            }
          : { top: HEADER_H + 12, right: 16 }
      }
      toastOptions={{
        style: phone ? { maxWidth: "100%" } : { maxWidth: 380 },
      }}
    >
      {(t) => (
        <div
          onClick={() => t.type !== "loading" && toast.dismiss(t.id)}
          style={{ cursor: t.type !== "loading" ? "pointer" : undefined }}
        >
          <ToastBar toast={t} />
        </div>
      )}
    </Toaster>
  );
}
