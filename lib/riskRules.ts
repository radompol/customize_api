export function resolveRiskLevel(score: number): "Low" | "Medium" | "High" {
  if (score >= 0.85) return "Low";
  if (score >= 0.5) return "Medium";
  return "High";
}

export function resolveReadinessLabel(score: number): string {
  if (score >= 0.85) return "Low Risk / Highly Ready";
  if (score >= 0.7) return "Moderate Risk / Nearly Ready";
  if (score >= 0.5) return "Medium Risk / Needs Attention";
  return "High Risk / Not Ready";
}

export function resolvePriorityLevel(score: number): "Routine" | "Watch" | "Urgent" {
  if (score >= 0.85) return "Routine";
  if (score >= 0.7) return "Watch";
  return "Urgent";
}
