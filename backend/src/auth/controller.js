import SystemCredentials from "../models/SystemCredentials.js";
import bcrypt from "bcryptjs";
import {
  ADMIN_USERNAMES,
  PRICE_USERNAME,
  ROLE_ADMIN,
  ROLE_PRICE,
  normalizeUsername,
} from "./accounts.js";
import { sessionRole } from "./middleware.js";

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

    const isAdmin = ADMIN_USERNAMES.includes(username);
    const isPriceViewer = username === PRICE_USERNAME;
    if (!isAdmin && !isPriceViewer) return invalid(res);

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
      return invalid(res);
    }

    const role = isAdmin ? ROLE_ADMIN : ROLE_PRICE;
    // only admins get into the admin panel and its API
    req.session.isAuthenticated = isAdmin;
    req.session.role = role;
    req.session.username = username;
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

export async function logoutController(req, res) {
  try {
    req.session.destroy(() => {
      res.status(200).json({ success: true, message: "Logout successful" });
    });
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
      user: { username: req.session.username || "admin", role: ROLE_ADMIN },
    });
  } catch (error) {
    console.log("Error in checkController:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
}

export function sessionController(req, res) {
  const role = sessionRole(req);
  return res.status(200).json({
    success: true,
    user: role ? { username: req.session.username || "admin", role } : null,
  });
}
