/**
 * Format Moroccan phone number for display as "06 12 34 56 78".
 * Strips raw +212 / 00212 and formats into 2-digit groups.
 * If empty or missing, returns fallback or "Not provided".
 */
export function formatPhone(phone?: string | null): string {
  if (!phone || !phone.trim()) {
    return "Not provided";
  }

  let cleaned = phone.replace(/[\s\-\.\(\)]+/g, "").trim();

  if (cleaned.startsWith("+212")) {
    cleaned = "0" + cleaned.slice(4);
  } else if (cleaned.startsWith("00212")) {
    cleaned = "0" + cleaned.slice(5);
  } else if (cleaned.startsWith("212")) {
    cleaned = "0" + cleaned.slice(3);
  } else if (!cleaned.startsWith("0")) {
    cleaned = "0" + cleaned;
  }

  // Format 10 digits as pairs: 06 12 34 56 78
  if (cleaned.length === 10) {
    return cleaned.replace(/(\d{2})(?=\d)/g, "$1 ");
  }

  // Fallback for unexpected lengths: group in pairs where possible
  return cleaned.replace(/(\d{2})(?=\d)/g, "$1 ");
}
