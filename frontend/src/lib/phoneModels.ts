// iPhone models offered when adding stock for mobile covers (iPhone X to 18).
// Newest first. Anything not listed can be added by hand in the picker.
export const IPHONE_MODELS: string[] = [
  "iPhone 18 Pro Max",
  "iPhone 18 Pro",
  "iPhone 18",
  "iPhone 17 Pro Max",
  "iPhone 17 Pro",
  "iPhone Air",
  "iPhone 17",
  "iPhone 16e",
  "iPhone 16 Pro Max",
  "iPhone 16 Pro",
  "iPhone 16 Plus",
  "iPhone 16",
  "iPhone 15 Pro Max",
  "iPhone 15 Pro",
  "iPhone 15 Plus",
  "iPhone 15",
  "iPhone 14 Pro Max",
  "iPhone 14 Pro",
  "iPhone 14 Plus",
  "iPhone 14",
  "iPhone SE (3rd gen)",
  "iPhone 13 Pro Max",
  "iPhone 13 Pro",
  "iPhone 13",
  "iPhone 13 mini",
  "iPhone 12 Pro Max",
  "iPhone 12 Pro",
  "iPhone 12",
  "iPhone 12 mini",
  "iPhone SE (2nd gen)",
  "iPhone 11 Pro Max",
  "iPhone 11 Pro",
  "iPhone 11",
  "iPhone XS Max",
  "iPhone XS",
  "iPhone XR",
  "iPhone X",
];

// Where an iPhone sits in one straight line, oldest to newest:
// X, XR, XS, XS Max, 11, 11 Pro, 11 Pro Max, SE (2nd gen), 12 mini, 12,
// 12 Plus, 12 Pro, 12 Pro Max, ... 16 Pro Max, 16e, 17, 17 Pro, 17 Pro Max,
// Air, 18 ... null when the name isn't an iPhone we can place.
const SPECIAL_IPHONES: Record<string, number> = {
  x: 10,
  xr: 10.1,
  xs: 10.2,
  "xs max": 10.3,
  "se (2nd gen)": 11.8,
  "se 2": 11.8,
  "se 2020": 11.8,
  "se (3rd gen)": 13.8,
  "se 3": 13.8,
  "se 2022": 13.8,
  air: 17.8,
};
// within a number: mini < plain < Plus < Pro < Pro Max < e (16e came last)
const IPHONE_TIERS = ["mini", "", "plus", "pro", "pro max", "e"];

function iphoneRank(name: string): number | null {
  const s = name.trim().toLowerCase().replace(/\s+/g, " ");
  if (!s.startsWith("iphone")) return null;
  const rest = s.slice(6).trim();
  if (rest in SPECIAL_IPHONES) return SPECIAL_IPHONES[rest];
  const m = rest.match(/^(\d+)\s*(.*)$/);
  if (!m) return null;
  const tier = IPHONE_TIERS.indexOf(m[2].trim());
  return tier === -1 ? null : Number(m[1]) + tier / 10;
}

// Other phones: same brand by number then plain < Plus < Pro < Pro Max
const OTHER_TIERS = ["", "mini", "e", "plus", "pro", "pro max", "ultra"];

// Phone models in order: iPhones newest to oldest (17 Pro Max, 17 Pro,
// 17 ... X), then other phones newest first
// (Samsung S24, S23...), then anything else A-Z.
export function compareModels(a: string, b: string): number {
  const ra = iphoneRank(a);
  const rb = iphoneRank(b);
  if (ra !== null && rb !== null && ra !== rb) return rb - ra;
  if (ra !== null && rb === null) return -1;
  if (ra === null && rb !== null) return 1;
  if (ra === null && rb === null) {
    const parse = (s: string) => {
      const m = s.match(/^(.*?)(\d+)\s*(.*)$/);
      return m
        ? { brand: m[1].trim().toLowerCase(), n: Number(m[2]), tier: m[3].trim().toLowerCase() }
        : null;
    };
    const pa = parse(a);
    const pb = parse(b);
    if (pa && pb && pa.brand === pb.brand) {
      if (pa.n !== pb.n) return pb.n - pa.n;
      const ta = OTHER_TIERS.indexOf(pa.tier);
      const tb = OTHER_TIERS.indexOf(pb.tier);
      if (ta !== -1 && tb !== -1 && ta !== tb) return tb - ta;
    }
  }
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

// Where a clothing size sits: XS < S < M < L < XL < 2XL (= XXL)... read from
// the start of the label, so "L (48kg-58kg)" counts as L (same as the backend)
export function sizeRank(label: string): number | null {
  const m = label.trim().toUpperCase().match(/^(\d*)(X*)(S|M|L)(?![A-Z])/);
  if (!m) return null;
  const [, digits, xs, letter] = m;
  const x = digits ? Number(digits) : xs.length;
  if (letter === "M") return 0;
  return letter === "S" ? -(1 + x) : 1 + x;
}

// S, M, L, XL, 2XL... then numbers, then the rest
export function compareSizes(a: string, b: string): number {
  const ra = sizeRank(a);
  const rb = sizeRank(b);
  if (ra !== null || rb !== null) {
    if (ra === null) return 1;
    if (rb === null) return -1;
    if (ra !== rb) return ra - rb;
  }
  const na = Number(a);
  const nb = Number(b);
  if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
  return a.localeCompare(b, undefined, { numeric: true });
}

// A filter list that can hold phone models or sizes: sizes S, M, L... first,
// then phone models in order
export function compareModelOrSize(a: string, b: string): number {
  const sa = sizeRank(a) !== null;
  const sb = sizeRank(b) !== null;
  if (sa || sb) return compareSizes(a, b);
  return compareModels(a, b);
}
