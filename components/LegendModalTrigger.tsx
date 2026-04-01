"use client";

import { useState } from "react";
import { ComputationLegend } from "@/components/ComputationLegend";

export function LegendModalTrigger() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="toolbar">
        <div className="toolbar-copy">Open the scoring legend to review how readiness and risk are computed.</div>
        <button
          type="button"
          className="button secondary icon-button"
          aria-label="Show computation legend"
          onClick={() => setOpen(true)}
        >
          <span aria-hidden="true">i</span>
        </button>
      </div>
      {open ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Computation legend">
          <div className="modal-card">
            <ComputationLegend
              action={
                <button type="button" className="button secondary icon-button" onClick={() => setOpen(false)}>
                  Close
                </button>
              }
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
