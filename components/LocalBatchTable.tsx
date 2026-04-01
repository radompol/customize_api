"use client";

export function LocalBatchTable() {
  return (
    <section className="panel section">
      <div className="section-title">
        <div className="surface-copy">
          <h3>Import Mode</h3>
          <span className="table-title">This workspace now reads and writes accreditation data through the API only.</span>
        </div>
      </div>
      <p className="muted">
        Browser-local IndexedDB fallback has been disabled. Use the server batch table below to confirm imports.
      </p>
    </section>
  );
}
