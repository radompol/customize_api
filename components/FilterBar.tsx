"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function FilterBar({ programs, periods }: { programs: string[]; periods: string[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  return (
    <div className="panel section">
      <div className="section-title">
        <div className="surface-copy">
          <h3>Filters</h3>
          <span className="table-title">Refine the dashboard by program and academic period.</span>
        </div>
      </div>
      <div className="grid equal">
        <select
          className="select"
          defaultValue={searchParams.get("program") ?? ""}
          onChange={(event) => {
            const next = new URLSearchParams(searchParams.toString());
            if (event.target.value) next.set("program", event.target.value);
            else next.delete("program");
            next.delete("period");
            router.push(`/dashboard${next.toString() ? `?${next.toString()}` : ""}`);
          }}
        >
          <option value="">Institution-wide</option>
          {programs.map((program) => (
            <option key={program} value={program}>
              {program}
            </option>
          ))}
        </select>
        <select
          className="select"
          value={searchParams.get("period") ?? ""}
          onChange={(event) => {
            const next = new URLSearchParams(searchParams.toString());
            if (event.target.value) next.set("period", event.target.value);
            else next.delete("period");
            router.push(`/dashboard${next.toString() ? `?${next.toString()}` : ""}`);
          }}
        >
          <option value="">All academic periods</option>
          {periods.map((period) => (
            <option key={period} value={period}>
              {period}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
