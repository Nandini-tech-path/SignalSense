export type SignalClassification = "excellent" | "good" | "fair" | "weak" | "dead";

export const getSignalColor = (classification: SignalClassification): string => {
  switch (classification) {
    case "excellent":
      return "#10b981"; // Emerald
    case "good":
      return "#14b8a6"; // Teal
    case "fair":
      return "#f59e0b"; // Amber
    case "weak":
      return "#f97316"; // Orange
    case "dead":
      return "#ef4444"; // Crimson Red
    default:
      return "#64748b";
  }
};

export const getRssiColor = (rssi: number): string => {
  if (rssi >= -50) return "#10b981";
  if (rssi >= -60) return "#14b8a6";
  if (rssi >= -70) return "#f59e0b";
  if (rssi >= -80) return "#f97316";
  return "#ef4444";
};

export const classifyRssi = (rssi: number): SignalClassification => {
  if (rssi >= -50) return "excellent";
  if (rssi >= -60) return "good";
  if (rssi >= -70) return "fair";
  if (rssi >= -80) return "weak";
  return "dead";
};

export const formatClassificationName = (classification: string): string => {
  switch (classification.toLowerCase()) {
    case "excellent":
      return "Excellent";
    case "good":
      return "Good";
    case "fair":
      return "Fair";
    case "weak":
      return "Weak";
    case "dead":
      return "Dead Zone";
    default:
      return classification;
  }
};
