import ActivityLog from "../models/ActivityLog.js";

export const getActivityLogs = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
    const { entity_type, action, search } = req.query;

    const filter = {};
    if (entity_type) filter.entityType = String(entity_type);
    if (action) filter.action = String(action);
    if (search) {
      const escaped = String(search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.summary = new RegExp(escaped, "i");
    }

    const [totalCount, logs] = await Promise.all([
      ActivityLog.countDocuments(filter),
      ActivityLog.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
    ]);

    return res.status(200).json({
      success: true,
      totalCount,
      data: logs.map((log) => ({
        id: String(log._id),
        action: log.action,
        entity_type: log.entityType,
        entity_id: log.entityId,
        summary: log.summary,
        details: log.details,
        created_at: log.createdAt,
      })),
    });
  } catch (error) {
    console.error("Get activity logs error:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
