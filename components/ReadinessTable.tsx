import { RiskBadge } from "@/components/RiskBadge";
import type { ReadinessAreaRow } from "@/models/readiness.types";

export function ReadinessTable({ rows }: { rows: ReadinessAreaRow[] }) {
  return (
    <div className="panel section">
      <div className="section-title">
        <div className="surface-copy">
          <h3>Area Readiness Table</h3>
          <span className="table-title">Detailed readiness coverage by program and area.</span>
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Program</th>
              <th>Area</th>
              <th>Score</th>
              <th>Risk</th>
              <th>Completed</th>
              <th>Pending</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.program}-${row.areaId}-${row.areaCode}`}>
                <td>{row.program}</td>
                <td>{row.areaCode ? `${row.areaCode} - ${row.areaDescription}` : row.areaDescription}</td>
                <td>{(row.readinessScore * 100).toFixed(1)}%</td>
                <td>
                  <RiskBadge riskLevel={row.riskLevel} />
                </td>
                <td>{row.completedRequirements}</td>
                <td>{row.pendingRequirements}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
