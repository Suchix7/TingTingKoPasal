import { useId } from "react";

// Round red "SOLD OUT" rubber stamp laid over a product photo on the
// customer site. The photo keeps its real colours underneath; the stamp
// never catches taps or swipes.
export default function SoldOutMark({ size = "sm" }: { size?: "sm" | "lg" }) {
  const id = useId();
  const top = `${id}-top`;
  const bottom = `${id}-bottom`;
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-0 flex select-none items-center justify-center"
    >
      <svg
        viewBox="0 0 200 200"
        className={`-rotate-[14deg] drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)] ${
          size === "lg" ? "w-44 sm:w-60" : "w-[58%] max-w-40"
        }`}
      >
        <defs>
          <path id={top} d="M 32 100 A 68 68 0 0 1 168 100" />
          <path id={bottom} d="M 26 100 A 74 74 0 0 0 174 100" />
        </defs>
        <g fill="none" stroke="#dc2626" opacity="0.92">
          <circle cx="100" cy="100" r="94" strokeWidth="7" fill="rgba(255,255,255,0.55)" />
          <circle cx="100" cy="100" r="82" strokeWidth="2.5" />
          <circle cx="100" cy="100" r="52" strokeWidth="2" strokeDasharray="3 4" />
        </g>
        <g fill="#dc2626" opacity="0.92" fontFamily="Arial Black, Arial, sans-serif" fontWeight="900">
          <text fontSize="15" letterSpacing="3">
            <textPath href={`#${top}`} startOffset="50%" textAnchor="middle">
              OUT OF STOCK
            </textPath>
          </text>
          <text fontSize="13" letterSpacing="6">
            <textPath href={`#${bottom}`} startOffset="50%" textAnchor="middle" dominantBaseline="hanging">
              ★ ★ ★
            </textPath>
          </text>
          <rect x="8" y="80" width="184" height="40" rx="4" fill="#dc2626" />
          <text
            x="100"
            y="109"
            fontSize="30"
            letterSpacing="2"
            textAnchor="middle"
            fill="#fff"
          >
            SOLD OUT
          </text>
        </g>
      </svg>
    </span>
  );
}
