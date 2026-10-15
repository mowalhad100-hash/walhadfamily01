export const chatId = (a, b) => [a, b].sort().join("_");
export const initials = (name) =>
  (name || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0])
    .join("")
    .toUpperCase();
export const isOnline = (user, now = Date.now()) =>
  !!user?.online && now - (user?.lastSeen?.toMillis?.() || 0) < 100000;
export const validMessage = (s) =>
  typeof s === "string" && s.trim().length > 0 && s.trim().length <= 4000;
