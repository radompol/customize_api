import { DashboardView } from "@/components/dashboard/DashboardView";
import { getDbInitError, getDbSafely } from "@/lib/db";

export default async function DashboardPage() {
  let programs: Array<{ program: string }> = [];
  let dbMessage: string | null = null;
  const db = getDbSafely();

  try {
    if (!db) {
      throw getDbInitError() ?? new Error('Prisma client is not ready. Run "npx prisma generate" first.');
    }
    programs = await db.requirementRecord.findMany({
      distinct: ["program"],
      select: { program: true },
      orderBy: { program: "asc" }
    });
  } catch (error) {
    programs = [];
    dbMessage = error instanceof Error ? error.message : "Database unavailable";
  }

  return (
    <main className="page stack">
      <section className="hero">
        <div className="hero-surface">
          <div className="hero-copy">
           
            <h1>Accreditation Readiness Dashboard</h1>
            <p>
              Track institutional readiness, review program-level risk, and turn imported accreditation data into a
              cleaner executive monitoring workflow.
            </p>
            <div className="hero-actions">
              <a className="button" href="/upload">
                Import Dataset
              </a>
              <a className="button secondary" href="/api/health">
                Check API Health
              </a>
            </div>
          </div>
          <aside className="hero-card">
            <div>
              <div className="hero-card-label">Operational Snapshot</div>
              <div className="hero-card-value">{programs.length}</div>
              <div className="muted">Programs currently available for dashboard filtering.</div>
            </div>
            <div className="hero-card-grid">
              <div className="hero-metric">
                <strong>Live metrics</strong>
                <span>Summary, trend, forecast, and area risk.</span>
              </div>
              <div className="hero-metric">
                <strong>Import-ready</strong>
                <span>CSV and XLSX workflows supported.</span>
              </div>
            </div>
          </aside>
        </div>
      </section>
      <DashboardView programs={programs.map((entry) => entry.program)} dbMessage={dbMessage} />
    </main>
  );
}
