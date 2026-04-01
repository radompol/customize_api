"use client";

import { useEffect, useState } from "react";
import { getIndexedDbBatches } from "@/lib/indexedDb";

type Batch = {
  id: number;
  fileName: string;
  fileType: string;
  status: string;
  rowCount: number;
  importedAt: string;
  notes: string | null;
};

export function LocalBatchTable() {
  const [batches, setBatches] = useState<Batch[]>([]);

  useEffect(() => {
    async function load() {
      setBatches(await getIndexedDbBatches());
    }

    void load();
    const listener = () => void load();
    window.addEventListener("indexeddb-import-complete", listener);
    return () => window.removeEventListener("indexeddb-import-complete", listener);
  }, []);

  return (
    <section className="panel section">
      <div className="section-title">
        <div className="surface-copy">
          <h3>Local Import Batches</h3>
          <span className="table-title">IndexedDB batches saved in the current browser.</span>
        </div>
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
                <td>{new Date(batch.importedAt).toISOString().slice(0, 19).replace("T", " ")}</td>
              </tr>
            ))}
            {!batches.length ? (
              <tr>
                <td colSpan={6} className="muted">
                  No local batches saved yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
