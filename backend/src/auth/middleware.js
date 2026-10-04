export function requireAuth(req, res, next) {
  try {
    if (!req.session || !req.session.isAuthenticated) {
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
