"use client";

import { useState } from "react";

export function UploadForm() {
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(formData: FormData) {
    setStatus("Uploading dataset to the API...");
    setError("");

    const file = formData.get("file");
    if (!(file instanceof File)) {
      setError("File upload is required.");
      return;
    }

    const response = await fetch("/api/import", {
      method: "POST",
      body: formData
    });
    const result = await response.json();
    if (!response.ok || !result?.success) {
      throw new Error(result?.error ?? "Dataset import failed.");
    }
    setStatus(
      `Imported ${result.rowsImported} rows in batch ${result.batchId}; created ${result.snapshotsCreated} snapshots.`
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
          setError(submissionError instanceof Error ? submissionError.message : "API import failed.");
        }
      }}
    >
      <div className="split-callout">
        <div className="surface-copy">
          <h3>Upload Accreditation Export</h3>
          <p className="muted">Accepts `.csv` and `.xlsx` exports and sends them to the readiness API for processing.</p>
        </div>
        <div className="mini-metrics">
          <div>
            <strong>API-backed import</strong>
            <span className="muted">Validated and persisted through the server-side data pipeline.</span>
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
