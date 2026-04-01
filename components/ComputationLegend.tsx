export function ComputationLegend({ action }: { action?: React.ReactNode }) {
  return (
    <section className="panel section">
      <div className="section-title">
        <h3>Computation Legend</h3>
        {action}
      </div>
      <div className="stack muted">
        <div>
          <strong>Readiness score components:</strong> Document completion 30%, compliance status 25%, quality burden
          20%, aging burden 15%, timeline performance 10%.
        </div>
        <div>
          <strong>Status effect:</strong> Approved/completed raises the score, pending gives partial credit, revise or
          rejected lowers it.
        </div>
        <div>
          <strong>Burden effect:</strong> More revisions, comments, aging days, overdue days, and missing files reduce
          the score.
        </div>
        <div>
          <strong>Risk bands:</strong> 0.85-1.00 Low Risk / Highly Ready, 0.70-0.84 Moderate Risk / Nearly Ready,
          0.50-0.69 Medium Risk / Needs Attention, below 0.50 High Risk / Not Ready.
        </div>
        <div>
          <strong>Forecast:</strong> Uses historical readiness by academic period (`acadYear + semester`) and projects
          the next periods from the recent trend.
        </div>
      </div>
    </section>
  );
}
