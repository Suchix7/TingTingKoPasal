// One cover can fit several phones: "iPhone 12/13/14/15 Pro Max 14/15 Plus"
// fits iPhone 12 Pro Max, 13 Pro Max, 14 Pro Max, 15 Pro Max, 14 Plus and
// 15 Plus. The filters and search work on these single phones, so picking
// "iPhone 14 Plus" finds that cover and the combined name is never offered as
// a filter of its own. Kept the same as the frontend's lib/phoneModels.ts.

// "PM", "+" and friends, as typed on stock lines
const SHORT_TIERS = { pm: "Pro Max", p: "Pro", "+": "Plus" };
const TIER_WORDS = { pro: "Pro", max: "Max", plus: "Plus", mini: "mini", ultra: "Ultra", e: "e" };

// one part of a slash list that names a phone number: 12, 14+, 13PM, X, XS, XR
const NUMBER_PART = /^(\d+)(pm|p|\+|e)?$|^(x|xs|xr)$/i;
const isNumberList = (word) => word.split("/").every((p) => p && NUMBER_PART.test(p));

const tidyTier = (text) =>
  text
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => TIER_WORDS[w.toLowerCase()] ?? w)
    .join(" ");

// "iPhone 13/14/15 Pro" -> ["iPhone 13 Pro", "iPhone 14 Pro", "iPhone 15 Pro"];
// a name without "/" (or one we can't read) comes back as it is
export function expandModel(name) {
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
  const groups = [];
  for (const word of words.slice(first)) {
    const last = groups[groups.length - 1];
    if (isNumberList(word)) {
      if (last && !last.tier.length) last.parts.push(...word.split("/"));
      else groups.push({ parts: word.split("/"), tier: [] });
    } else {
      last.tier.push(word);
    }
  }

  const out = [];
  for (const g of groups) {
    // "Pro Max/Plus" -> ["Pro Max", "Plus"]
    const tiers = g.tier.join(" ").split("/").map(tidyTier);
    for (const part of g.parts) {
      const m = part.match(NUMBER_PART);
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
function fallback(text) {
  const parts = text.split("/").map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2 || !/\d/.test(parts[0])) return [text];
  const head = parts[0].split(" ");
  const brand = head.length > 1 ? head.slice(0, -1).join(" ") : "";
  return parts.map((p, i) => (i === 0 || !brand || p.includes(" ") ? p : `${brand} ${p}`));
}

// does a stock line's phone model fit `phone` ("iPhone 14 Plus")?
export const fitsPhone = (model, phone) => {
  const want = String(phone ?? "").trim().toLowerCase();
  return !!want && expandModel(model).some((m) => m.toLowerCase() === want);
};
