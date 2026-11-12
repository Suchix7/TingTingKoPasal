import { ROLE_PRICE } from "./accounts.js";

// One browser keeps one session, but an admin and the price viewer can both be
// signed in on it at once (admin panel in one tab, /prices in another):
//   session.isAuthenticated + session.adminUsername  -> admin panel
//   session.priceUsername                             -> /prices
// Older sessions kept a single `role` / `username`; read those too.

export const adminUsername = (req) => {
  const s = req.session;
  if (!s?.isAuthenticated) return null;
  return s.adminUsername || (s.role !== ROLE_PRICE && s.username) || "admin";
};

export const priceUsername = (req) => {
  const s = req.session;
  if (!s) return null;
  return s.priceUsername || (s.role === ROLE_PRICE ? s.username : null) || null;
};

// selling prices go out only to the price viewer, and only when the /prices
// page asks for them, so the public site never shows them
export const canSeePrices = (req) =>
  !!priceUsername(req) && String(req.query?.prices || "") === "1";

export function requireAuth(req, res, next) {
  try {
    if (!adminUsername(req)) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized - Please login",
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Auth middleware error",
    });
  }
}
