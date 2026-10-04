import PaymentMethod from "../models/PaymentMethod.js";

// Cash and Online always exist so every sale lands in one of them.
const DEFAULT_METHODS = [
  { paymentMethod: "Cash", type: "Cash" },
  { paymentMethod: "Online", type: "Online" },
];

export async function seedDefaultPaymentMethods() {
  for (const method of DEFAULT_METHODS) {
    try {
      // upsert is atomic, so concurrent starts can't create duplicates
      const result = await PaymentMethod.updateOne(
        { paymentMethod: method.paymentMethod },
        { $setOnInsert: { ...method, status: "Active" } },
        { upsert: true },
      );
      if (result.upsertedCount) {
        console.log(`Created default payment method: ${method.paymentMethod}`);
      }
    } catch (error) {
      // Seeding must never stop the server from starting
      console.error(
        `Could not seed payment method ${method.paymentMethod}:`,
        error.message,
      );
    }
  }
}
