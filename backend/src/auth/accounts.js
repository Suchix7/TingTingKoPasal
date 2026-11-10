// Who can sign in. Every admin username shares the system passcode (the one
// changed on the Security tab). The price viewer has its own password and only
// sees the customer site, with selling prices; it can't open the admin panel.
// Override the names with ADMIN_USERNAMES (comma separated) / PRICE_USERNAME.

const list = (value, fallback) =>
  (value || fallback)
    .split(",")
    .map((u) => u.trim().toLowerCase())
    .filter(Boolean);

export const ADMIN_USERNAMES = list(
  process.env.ADMIN_USERNAMES,
  "admin,staff1,staff2,staff3",
);

export const PRICE_USERNAME = list(process.env.PRICE_USERNAME, "prices")[0];

// first password for the price viewer, from the environment (never kept in
// code); used only until one is saved. Later changes: scripts/set-price-password.mjs
export const INITIAL_PRICE_PASSWORD = process.env.PRICE_PASSWORD || "";

export const ROLE_ADMIN = "admin";
export const ROLE_PRICE = "price";

export const normalizeUsername = (u) => String(u || "").trim().toLowerCase();
