"use client";

import { useLang } from "@/lib/i18n";
import { byLabel } from "@/lib/sortOptions";

// The choices of a filter drop-down, A-Z by their (translated) label. Put the
// "All ..." option before this, so it stays at the top.
//   <SortedOptions options={[["Active", "Active"], ["Inactive", "Inactive"]]} />
// Each option is [value, English label]; the label is translated here.
export default function SortedOptions({
  options,
}: {
  options: readonly (readonly [value: string, label: string])[];
}) {
  const { t, lang } = useLang();
  const shown = byLabel(
    options.map(([value, label]) => ({ value, label: t(label) })),
    (o) => o.label,
    lang,
  );
  return (
    <>
      {shown.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </>
  );
}
