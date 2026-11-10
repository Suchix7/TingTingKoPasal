import { ROLE_ADMIN, ROLE_PRICE } from "./accounts.js";

// sessions from before usernames existed have no role: they were admins
export const sessionRole = (req) =>
  req.session?.role || (req.session?.isAuthenticated ? ROLE_ADMIN : null);

export const canSeePrices = (req) => sessionRole(req) === ROLE_PRICE;

export function requireAuth(req, res, next) {
  try {
    if (!req.session || !req.session.isAuthenticated || sessionRole(req) !== ROLE_ADMIN) {
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
