export function RiskBadge({ riskLevel }: { riskLevel: string }) {
  const className =
    riskLevel === "Low" ? "badge-low" : riskLevel === "Medium" ? "badge-medium" : "badge-high";

  return <span className={`pill ${className}`}>{riskLevel} Risk</span>;
}
