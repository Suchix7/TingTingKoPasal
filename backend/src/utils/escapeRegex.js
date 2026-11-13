// typed search text, matched as plain text (a "(" or "*" can't break the
// search or make it run for ages)
export const escapeRegex = (text) => String(text ?? "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
