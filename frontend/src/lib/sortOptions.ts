// Filter lists are shown in ascending (A-Z) order of what the person reads:
// the translated label, so in Chinese they follow the Chinese names. Numbers
// inside names sort as numbers ("iPhone 9" before "iPhone 13").

const collators = new Map<string, Intl.Collator>();
const collator = (lang?: string) => {
  const locale = lang === "zh" ? "zh-Hans" : "en";
  let c = collators.get(locale);
  if (!c) {
    c = new Intl.Collator(locale, { numeric: true, sensitivity: "base" });
    collators.set(locale, c);
  }
  return c;
};

// A sorted copy of `items`, by the label each one shows
export function byLabel<T>(items: readonly T[], label: (item: T) => string, lang?: string): T[] {
  const c = collator(lang);
  return [...items].sort((a, b) => c.compare(label(a).trim(), label(b).trim()));
}
