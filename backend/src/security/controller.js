import SystemCredentials from "../models/SystemCredentials.js";
import bcrypt from "bcryptjs";

export const updatePasscode = async (req, res) => {
  try {
    const { oldPasscode, newPasscode } = req.body;

    if (oldPasscode.length === 0) {
      return res
        .status(200)
        .json({ success: false, message: "Old passcode is required" });
    }

    const credentials = await SystemCredentials.findOne();

    if (!credentials || !credentials.passcodeHash) {
      return res
        .status(200)
        .json({ success: false, message: "No existing passcode set" });
    }

    const isMatch = await bcrypt.compare(
      String(oldPasscode),
      credentials.passcodeHash,
    );

    if (!isMatch) {
      return res
        .status(400)
        .json({ success: false, message: "Old passcode is incorrect" });
    }

    if (newPasscode.length === 0) {
      return res
        .status(200)
        .json({ success: false, message: "New passcode is required" });
    }

    credentials.passcodeHash = await bcrypt.hash(String(newPasscode), 10);
    await credentials.save();

    return res
      .status(200)
      .json({ success: true, message: "Passcode updated successfully" });
  } catch (error) {
    console.log("Error in updatePasscode:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
