import { ProgramDashboardView } from "@/components/dashboard/ProgramDashboardView";

export default async function ProgramDashboardPage({ params }: { params: Promise<{ program: string }> }) {
  const { program } = await params;

  return (
    <main className="page stack">
      <section className="hero">
        <div className="hero-surface">
          <div className="hero-copy">
            <span className="eyebrow">AXZTech Program View</span>
            <h1>Program Readiness</h1>
            <p>Program-specific summary, area metrics, trend series, and forecast output in a focused review layout.</p>
          </div>
          <aside className="hero-card">
            <div>
              <div className="hero-card-label">Selected Program</div>
              <div className="hero-card-value">{decodeURIComponent(program)}</div>
            </div>
          </aside>
        </div>
      </section>
      <ProgramDashboardView program={decodeURIComponent(program)} />
    </main>
  );
}
