// The red "SOLD OUT" stamp (public/soldouts.png) laid diagonally over a
// sold-out product photo, with a light black veil that dims the photo while
// keeping its colours. It never catches taps.
export default function SoldOutMark({
  size = "sm",
}: {
  size?: "sm" | "lg";
  // kept for callers; the stamp image reads the same in both languages
  zh?: boolean;
}) {
  const lg = size === "lg";
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-0 flex select-none items-center justify-center overflow-hidden"
    >
      <span className="absolute inset-0 bg-black/30" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/soldouts.png"
        alt=""
        draggable={false}
        decoding="async"
        className={`relative h-auto -rotate-[10deg] drop-shadow-[0_2px_6px_rgba(0,0,0,0.3)] ${
          lg ? "w-64 sm:w-80" : "w-[85%] max-w-[14rem]"
        }`}
      />
    </span>
  );
}
