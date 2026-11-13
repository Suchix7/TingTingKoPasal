import { useId } from "react";

// A round red rubber stamp pressed onto a sold-out product photo: a thick
// outer ring, "OUT OF STOCK" and the shop's name curving around, bold
// "SOLD OUT" in the middle, and a little worn-ink texture. On cards the photo
// is also faded to grey; in the full-screen view ("lg") it keeps its
// colours, so a sold-out colour can still be seen. It never catches taps.
export default function SoldOutMark({
  size = "sm",
  zh = false,
}: {
  size?: "sm" | "lg";
  // the price page in Chinese
  zh?: boolean;
}) {
  const lg = size === "lg";
  // ids for the curves and the ink texture (useId gives ":r1:", which can't
  // be used inside url() / href)
  const id = `so${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const RED = "#d42a20";
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-0 flex select-none items-center justify-center overflow-hidden"
    >
      {!lg && <span className="absolute inset-0 bg-white/35 backdrop-grayscale" />}
      <svg
        viewBox="0 0 200 200"
        className={`relative -rotate-[14deg] opacity-80 drop-shadow-[0_2px_6px_rgba(0,0,0,0.12)] ${
          lg ? "w-52 sm:w-64" : "w-[64%] max-w-[10.5rem]"
        }`}
      >
        <defs>
          {/* top words read along the upper curve, bottom words along the lower */}
          <path id={`${id}-top`} d="M 38 100 A 62 62 0 0 1 162 100" />
          <path id={`${id}-bottom`} d="M 26 100 A 74 74 0 0 0 174 100" />
          {/* worn ink: speckles where the stamp didn't quite touch */}
          <filter id={`${id}-ink`} x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="noise" />
            <feColorMatrix
              in="noise"
              type="matrix"
              values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.4 2.2"
              result="wear"
            />
            <feComposite in="SourceGraphic" in2="wear" operator="in" result="worn" />
            <feTurbulence type="turbulence" baseFrequency="0.05" numOctaves="1" seed="2" result="wobble" />
            <feDisplacementMap in="worn" in2="wobble" scale="1.4" />
          </filter>
        </defs>

        {/* a faint paper-white backing keeps it readable on busy photos */}
        <circle cx="100" cy="100" r="95" fill="rgba(255,255,255,0.55)" />

        <g filter={`url(#${id}-ink)`} fill="none" stroke={RED}>
          <circle cx="100" cy="100" r="92" strokeWidth="6" />
          <circle cx="100" cy="100" r="81" strokeWidth="1.6" />
          <circle cx="100" cy="100" r="55" strokeWidth="1.6" />

          <g fill={RED} stroke="none" fontFamily="'Arial Black', 'Helvetica Neue', Arial, sans-serif" fontWeight="900">
            <text fontSize={zh ? "14" : "12.5"} letterSpacing={zh ? "8" : "3"}>
              <textPath href={`#${id}-top`} startOffset="50%" textAnchor="middle">
                {zh ? "缺货" : "OUT OF STOCK"}
              </textPath>
            </text>
            <text fontSize="9.5" letterSpacing="2.4">
              <textPath href={`#${id}-bottom`} startOffset="50%" textAnchor="middle">
                TING TING KO PASAL
              </textPath>
            </text>
            {/* stars between the two curves */}
            <text x="31" y="104" fontSize="11" textAnchor="middle">★</text>
            <text x="169" y="104" fontSize="11" textAnchor="middle">★</text>

            {zh ? (
              <text x="100" y="114" fontSize="38" letterSpacing="4" textAnchor="middle">
                售罄
              </text>
            ) : (
              <>
                <text x="100" y="97" fontSize="27" textAnchor="middle" textLength="84" lengthAdjust="spacingAndGlyphs">
                  SOLD
                </text>
                <line x1="62" y1="104" x2="138" y2="104" stroke={RED} strokeWidth="2" />
                <text x="100" y="130" fontSize="27" textAnchor="middle" textLength="66" lengthAdjust="spacingAndGlyphs">
                  OUT
                </text>
              </>
            )}
          </g>
        </g>
      </svg>
    </span>
  );
}
