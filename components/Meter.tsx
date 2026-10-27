export function Meter({ d, label, large }: { d: number; label: string; large?: boolean }) {
  return (
    <span className={`meter d${d}${large ? " meter-lg" : ""}`} aria-label={`Difficulty: ${label}, ${d} of 5`}>
      <span className="meter-bars" aria-hidden>
        {[1, 2, 3, 4, 5].map((i) => (
          <span key={i} className={i <= d ? "on" : ""} />
        ))}
      </span>
      <span className="meter-label">{label}</span>
    </span>
  );
}
