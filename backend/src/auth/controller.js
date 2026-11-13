import SystemCredentials from "../models/SystemCredentials.js";
import bcrypt from "bcryptjs";
import {
  ADMIN_USERNAMES,
  PRICE_USERNAME,
  ROLE_ADMIN,
  ROLE_PRICE,
  normalizeUsername,
} from "./accounts.js";
import { adminUsername, priceUsername } from "./middleware.js";
import { createAttemptLimiter, tooMany } from "../utils/attemptLimiter.js";

// password guessing: a few wrong tries, then a wait
const loginLimiter = createAttemptLimiter();

const invalid = (res) =>
  res.status(401).json({ success: false, message: "Invalid username or password" });

export async function loginController(req, res) {
  try {
    const { passcode } = req.body;
    const username = normalizeUsername(req.body.username);

    if (!username) {
      return res
        .status(200)
        .json({ success: false, message: "Username is required" });
    }
    if (!passcode || String(passcode).length === 0) {
      return res
        .status(200)
        .json({ success: false, message: "Password is required" });
    }

    const wait = loginLimiter.blockedFor(req.ip, username);
    if (wait) return tooMany(res, wait);

    const isAdmin = ADMIN_USERNAMES.includes(username);
    const isPriceViewer = username === PRICE_USERNAME;
    if (!isAdmin && !isPriceViewer) {
      loginLimiter.fail(req.ip, username);
      return invalid(res);
    }

    const credentials = await SystemCredentials.findOne();

    if (!credentials) {
      return res
        .status(500)
        .json({ success: false, message: "System not set up properly" });
    }

    const hash = isAdmin
      ? credentials.passcodeHash
      : credentials.priceViewerPasscodeHash;
    if (!hash || !(await bcrypt.compare(String(passcode), hash))) {
      loginLimiter.fail(req.ip, username);
      return invalid(res);
    }
    loginLimiter.succeed(req.ip, username);

    const role = isAdmin ? ROLE_ADMIN : ROLE_PRICE;
    // signing in as one account keeps the other one signed in, so the admin
    // panel and /prices can be open side by side in the same browser
    const prevAdmin = adminUsername(req);
    const prevPrice = priceUsername(req);
    delete req.session.role;
    delete req.session.username;
    req.session.isAuthenticated = isAdmin || !!prevAdmin;
    req.session.adminUsername = isAdmin ? username : prevAdmin || undefined;
    req.session.priceUsername = isPriceViewer ? username : prevPrice || undefined;
    return res.status(200).json({
      success: true,
      message: "Login successful",
      user: { username, role },
    });
  } catch (error) {
    console.log("Error in loginController:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
}

// body `{ scope: "admin" | "prices" }` signs out just that account; without
// a scope (or when nothing is left) the whole session ends
export async function logoutController(req, res) {
  try {
    const scope = req.body?.scope;
    const done = () =>
      res.status(200).json({ success: true, message: "Logout successful" });

    if (scope === "admin" || scope === "prices") {
      const keepAdmin = scope === "prices" ? adminUsername(req) : null;
      const keepPrice = scope === "admin" ? priceUsername(req) : null;
      if (keepAdmin || keepPrice) {
        delete req.session.role;
        delete req.session.username;
        req.session.isAuthenticated = !!keepAdmin;
        req.session.adminUsername = keepAdmin || undefined;
        req.session.priceUsername = keepPrice || undefined;
        return req.session.save(done);
      }
    }
    req.session.destroy(done);
  } catch (error) {
    console.log("Error in logoutController:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
}

export async function checkController(req, res) {
  try {
    return res.status(200).json({
      success: true,
      message: "Authenticated",
      user: { username: adminUsername(req), role: ROLE_ADMIN },
    });
  } catch (error) {
    console.log("Error in checkController:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
}

// public: who is signed in on this browser (either, both or neither)
export function sessionController(req, res) {
  const admin = adminUsername(req);
  const prices = priceUsername(req);
  return res.status(200).json({
    success: true,
    admin: admin ? { username: admin, role: ROLE_ADMIN } : null,
    prices: prices ? { username: prices, role: ROLE_PRICE } : null,
  });
}
