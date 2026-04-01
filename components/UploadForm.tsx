"use client";

import { useState } from "react";
import { saveImportToIndexedDb } from "@/lib/indexedDb";

export function UploadForm() {
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(formData: FormData) {
    setStatus("Saving dataset to IndexedDB...");
    setError("");

    const file = formData.get("file");
    if (!(file instanceof File)) {
      setError("File upload is required.");
      return;
    }

    const result = await saveImportToIndexedDb(file);
    setStatus(
      `Saved ${result.rowsImported} rows locally in batch ${result.batchId}; created ${result.snapshotsCreated} snapshots.`
    );
    if (result.errors.length) {
      setError(`Imported with row warnings: ${result.errors.slice(0, 3).join(" | ")}`);
    }
  }

  return (
    <form
      className="panel section form-grid"
      onSubmit={async (event) => {
        event.preventDefault();
        try {
          const formData = new FormData(event.currentTarget);
          await handleSubmit(formData);
        } catch (submissionError) {
          setStatus("");
          setError(submissionError instanceof Error ? submissionError.message : "Local import failed.");
        }
      }}
    >
      <div className="split-callout">
        <div className="surface-copy">
          <h3>Upload Accreditation Export</h3>
          <p className="muted">Accepts `.csv` and `.xlsx` exports and stores them locally in your browser via IndexedDB.</p>
        </div>
        <div className="mini-metrics">
          <div>
            <strong>Fast local import</strong>
            <span className="muted">No server dependency required for browser-side analysis.</span>
          </div>
          <div>
            <strong>Snapshot-ready</strong>
            <span className="muted">Creates batch and readiness snapshot records after validation.</span>
          </div>
        </div>
      </div>
      <input className="input" type="file" name="file" accept=".csv,.xlsx" required />
      <button className="button" type="submit">
        Import Dataset
      </button>
      {status ? <div className="status-note success">{status}</div> : null}
      {error ? <div className="status-note error">{error}</div> : null}
    </form>
  );
}
