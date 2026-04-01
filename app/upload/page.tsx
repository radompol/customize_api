import { LocalBatchTable } from "@/components/LocalBatchTable";
import { UploadForm } from "@/components/UploadForm";
import { getDbInitError, getDbSafely } from "@/lib/db";

export default async function UploadPage() {
  const db = getDbSafely();
  let batches: Array<{
    id: number;
    fileName: string;
    fileType: string;
    status: string;
    rowCount: number;
    importedAt: Date;
  }> = [];
  let dbMessage: string | null = null;

  try {
    if (!db) {
      throw getDbInitError() ?? new Error('Prisma client is not ready. Run "npx prisma generate" first.');
    }
    batches = await db.importBatch.findMany({
      orderBy: { importedAt: "desc" },
      take: 10
    });
  } catch (error) {
    batches = [];
    dbMessage = error instanceof Error ? error.message : "Database unavailable";
  }

  return (
    <main className="page stack">
      <section className="hero">
        <div className="hero-surface">
          <div className="hero-copy">
            <span className="eyebrow">AXZTech Intake</span>
            <h1>Dataset Import</h1>
            <p>
              Upload accreditation exports, validate the records, and persist server-side batches for repeatable
              dashboard analysis and forecasting.
            </p>
          </div>
          <aside className="hero-card">
            <div>
              <div className="hero-card-label">Recent Batch Records</div>
              <div className="hero-card-value">{batches.length}</div>
              <div className="muted">Latest imported datasets available on the server.</div>
            </div>
            <div className="hero-card-grid">
              <div className="hero-metric">
                <strong>Accepted files</strong>
                <span>.csv and .xlsx exports</span>
              </div>
              <div className="hero-metric">
                <strong>Storage mode</strong>
                <span>Supabase-backed API workflow</span>
              </div>
            </div>
          </aside>
        </div>
      </section>
      <UploadForm />
      <LocalBatchTable />
      {dbMessage ? (
        <section className="panel section">
          <p className="error">Server database unavailable: {dbMessage}</p>
        </section>
      ) : null}
      <section className="panel section">
        <div className="section-title">
          <h3>Latest Import Batches</h3>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>File</th>
                <th>Type</th>
                <th>Status</th>
                <th>Rows</th>
                <th>Imported</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((batch) => (
                <tr key={batch.id}>
                  <td>{batch.id}</td>
                  <td>{batch.fileName}</td>
                  <td>{batch.fileType}</td>
                  <td>{batch.status}</td>
                  <td>{batch.rowCount}</td>
                  <td>{batch.importedAt.toISOString().slice(0, 19).replace("T", " ")}</td>
                </tr>
              ))}
              {!batches.length ? (
                <tr>
                  <td colSpan={6} className="muted">
                    No batches imported yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
