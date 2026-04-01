"use client";

import { useRouter, useSearchParams } from "next/navigation";

type AreaOption = {
  id: string;
  key: string;
  label: string;
};

export function FilterBar({
  programs,
  periods,
  areas,
  source
}: {
  programs: string[];
  periods: string[];
  areas: AreaOption[];
  source: "indexeddb" | "live";
}) {
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
          value={source}
          onChange={(event) => {
            const next = new URLSearchParams(searchParams.toString());
            next.set("source", event.target.value);
            router.push(`/dashboard${next.toString() ? `?${next.toString()}` : ""}`);
          }}
        >
          <option value="indexeddb">IndexedDB</option>
          <option value="live">Live API</option>
        </select>
        <select
          className="select"
          value={searchParams.get("program") ?? ""}
          onChange={(event) => {
            const next = new URLSearchParams(searchParams.toString());
            if (event.target.value) next.set("program", event.target.value);
            else next.delete("program");
            next.delete("period");
            next.delete("areaId");
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
        <select
          className="select"
          value={searchParams.get("areaId") ?? ""}
          onChange={(event) => {
            const next = new URLSearchParams(searchParams.toString());
            if (event.target.value) next.set("areaId", event.target.value);
            else next.delete("areaId");
            router.push(`/dashboard${next.toString() ? `?${next.toString()}` : ""}`);
          }}
        >
          <option value="">All areas</option>
          {areas.map((area) => (
            <option key={area.key} value={area.id}>
              {area.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
