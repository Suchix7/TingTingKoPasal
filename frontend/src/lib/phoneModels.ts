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

// One cover can fit several phones: "iPhone 12/13/14/15 Pro Max 14/15 Plus"
// fits iPhone 12 Pro Max ... 15 Pro Max, 14 Plus and 15 Plus. Filters and
// search work on these single phones. Same as the backend's utils/phoneFits.js.
// "PM", "+" and friends, as typed on stock lines
const SHORT_TIERS: Record<string, string> = { pm: "Pro Max", p: "Pro", "+": "Plus" };
const TIER_WORDS: Record<string, string> = { pro: "Pro", max: "Max", plus: "Plus", mini: "mini", ultra: "Ultra", e: "e" };

// one part of a slash list that names a phone number: 12, 14+, 13PM, X, XS, XR
const NUMBER_PART = /^(\d+)(pm|p|\+|e)?$|^(x|xs|xr)$/i;
const isNumberList = (word: string) => word.split("/").every((p) => p && NUMBER_PART.test(p));

const tidyTier = (text: string) =>
  text
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => TIER_WORDS[w.toLowerCase()] ?? w)
    .join(" ");

// "iPhone 13/14/15 Pro" -> ["iPhone 13 Pro", "iPhone 14 Pro", "iPhone 15 Pro"];
// a name without "/" (or one we can't read) comes back as it is
export function expandModel(name: string | null | undefined): string[] {
  const text = String(name ?? "").trim().replace(/\s*\/\s*/g, "/").replace(/\s+/g, " ");
  if (!text.includes("/")) return text ? [text] : [];

  const words = text.split(" ");
  const first = words.findIndex(isNumberList);
  if (first <= 0) return fallback(text);
  const brand = words
    .slice(0, first)
    .map((w) => (w.toLowerCase() === "iphone" ? "iPhone" : w))
    .join(" ");

  // "12/13 Pro Max 14/15 Plus" -> [{ parts: [12, 13], tier: "Pro Max" }, ...]
  const groups: { parts: string[]; tier: string[] }[] = [];
  for (const word of words.slice(first)) {
    const last = groups[groups.length - 1];
    if (isNumberList(word)) {
      if (last && !last.tier.length) last.parts.push(...word.split("/"));
      else groups.push({ parts: word.split("/"), tier: [] });
    } else {
      last.tier.push(word);
    }
  }

  const out: string[] = [];
  for (const g of groups) {
    // "Pro Max/Plus" -> ["Pro Max", "Plus"]
    const tiers = g.tier.join(" ").split("/").map(tidyTier);
    for (const part of g.parts) {
      const m = part.match(NUMBER_PART)!;
      const base = m[1] ?? m[3].toUpperCase();
      const own = m[2] ? (SHORT_TIERS[m[2].toLowerCase()] ?? m[2].toLowerCase()) : null;
      for (const tier of own ? [own] : tiers) {
        const phone = `${brand} ${base}${tier === "e" ? "e" : tier ? ` ${tier}` : ""}`;
        if (!out.some((x) => x.toLowerCase() === phone.toLowerCase())) out.push(phone);
      }
    }
  }
  return out.length ? out : [text];
}

// "Galaxy A54/A55" -> ["Galaxy A54", "Galaxy A55"]; names without a number
// ("S/M", a size) are left alone
function fallback(text: string): string[] {
  const parts = text.split("/").map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2 || !/\d/.test(parts[0])) return [text];
  const head = parts[0].split(" ");
  const brand = head.length > 1 ? head.slice(0, -1).join(" ") : "";
  return parts.map((p, i) => (i === 0 || !brand || p.includes(" ") ? p : `${brand} ${p}`));
}

// does a stock line's phone model fit `phone` ("iPhone 14 Plus")?
export const fitsPhone = (model: string | null | undefined, phone: string | null | undefined) => {
  const want = String(phone ?? "").trim().toLowerCase();
  return !!want && expandModel(model).some((m) => m.toLowerCase() === want);
};
