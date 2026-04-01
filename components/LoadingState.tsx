export function LoadingState({ label = "Loading data..." }: { label?: string }) {
  return (
    <div className="panel section">
      <div className="muted">{label}</div>
    </div>
  );
}
