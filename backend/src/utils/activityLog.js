import ActivityLog from "../models/ActivityLog.js";

// Records what happened (for the Activity Log screen). Never throws: a logging
// problem must not fail the sale/product action it describes.
export async function logActivity({
  action,
  entityType,
  entityId = null,
  summary,
  details = null,
}) {
  try {
    await ActivityLog.create({
      action,
      entityType,
      entityId: entityId ? String(entityId) : null,
      summary,
      details,
    });
  } catch (error) {
    console.error("Activity log error:", error.message);
  }
}
