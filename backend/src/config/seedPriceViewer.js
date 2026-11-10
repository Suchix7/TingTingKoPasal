import bcrypt from "bcryptjs";
import SystemCredentials from "../models/SystemCredentials.js";
import { INITIAL_PRICE_PASSWORD } from "../auth/accounts.js";

// Give the price-viewer account its first password (PRICE_PASSWORD) if it
// has none yet.
export async function seedPriceViewer() {
  try {
    const credentials = await SystemCredentials.findOne();
    if (!credentials || credentials.priceViewerPasscodeHash) return;
    if (INITIAL_PRICE_PASSWORD.length < 4) {
      console.log("Price viewer has no password yet: set PRICE_PASSWORD (4+ characters).");
      return;
    }
    credentials.priceViewerPasscodeHash = await bcrypt.hash(INITIAL_PRICE_PASSWORD, 10);
    await credentials.save();
    console.log("Price viewer password set from PRICE_PASSWORD.");
  } catch (error) {
    console.error("Failed to seed price viewer:", error);
  }
}
