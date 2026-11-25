import { MARK_PATH, MARK_VIEWBOX, halftoneDots } from "@/lib/mark";

const DOTS = halftoneDots(13);

/** Solid single-colour Raiku mark (inherits currentColor). */
export function MarkIcon({ size = 16, title }: { size?: number; title?: string }) {
  return (
    <svg
      viewBox={MARK_VIEWBOX}
      width={size}
      height={(size * 285) / 326}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      style={{ display: "block", flex: "none" }}
    >
      <path d={MARK_PATH} fill="currentColor" />
    </svg>
  );
}

/** The mark rendered as a halftone dot pattern, never distorted. */
export function HalftoneMark({ className }: { className?: string }) {
  return (
    <svg viewBox={MARK_VIEWBOX} className={className} role="img" aria-label="Raiku mark, halftone">
      {DOTS.map((d, i) => (
        <circle key={i} cx={d.cx} cy={d.cy} r={d.r} fill="currentColor" />
      ))}
    </svg>
  );
}

/** Police-lineup "mugshot": height lines + ruler with the halftone mark. */
export function Mugshot() {
  const marks = ["6'", "5'", "4'", "3'", "2'"];
  return (
    <div className="mugshot">
      <div className="mug-ruler" aria-hidden="true">
        {marks.map((m) => (
          <span key={m}>{m}</span>
        ))}
      </div>
      <div className="mug-lines" aria-hidden="true">
        {marks.map((m) => (
          <i key={m} />
        ))}
      </div>
      <HalftoneMark className="mug-mark" />
      <div className="mug-plate" aria-hidden="true">
        <span>RAIKU</span>
        <span>SOL-MAINNET</span>
      </div>
    </div>
  );
}
