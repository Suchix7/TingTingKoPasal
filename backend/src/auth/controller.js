import SystemCredentials from "../models/SystemCredentials.js";
import bcrypt from "bcryptjs";

export async function loginController(req, res) {
  try {
    const { passcode } = req.body;

    if (!passcode || String(passcode).length === 0) {
      return res
        .status(200)
        .json({ success: false, message: "Passcode is required" });
    }

    const credentials = await SystemCredentials.findOne();

    if (!credentials) {
      return res
        .status(500)
        .json({ success: false, message: "System not set up properly" });
    }

    const isMatch = await bcrypt.compare(
      String(passcode),
      credentials.passcodeHash,
    );

    if (isMatch) {
      req.session.isAuthenticated = true;
      return res
        .status(200)
        .json({ success: true, message: "Login successful" });
    } else {
      return res
        .status(401)
        .json({ success: false, message: "Invalid passcode" });
    }
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
    return res.status(200).json({ success: true, message: "Authenticated" });
  } catch (error) {
    console.log("Error in checkController:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
}
