// Forgiving phone-model search: ignores case, spacing and punctuation
// ("iphone14pro" finds "iPhone 14 Pro") and, when asked, tolerates typos
// ("iphne 14 prro"). Numbers never fuzz, so "13" never matches "14".

// "iPhone-14Pro" -> ["iphone", "14", "pro"]
export const tokenize = (text) =>
  String(text || "")
    .toLowerCase()
    .replace(/([a-z])(\d)/g, "$1 $2")
    .replace(/(\d)([a-z])/g, "$1 $2")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    // spelled like it sounds: "ifone" finds "iphone"
    .map((t) => t.replace(/ph/g, "f"));

function distance(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (cur[j] < rowMin) rowMin = cur[j];
    }
    if (rowMin > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

const allowedTypos = (word) => {
  if (/\d/.test(word) || word.length <= 3) return 0;
  return word.length <= 5 ? 1 : 2;
};

// cost of one typed word against one model token, or null if no match
function wordCost(word, token, fuzzy) {
  if (token === word) return 0;
  if (token.startsWith(word)) return 0.25; // still typing it
  if (!fuzzy) return null;
  const max = allowedTypos(word);
  if (!max) return null;
  const whole = distance(word, token, max);
  // a half-typed word with a typo: compare against the same-length start
  const start = distance(word, token.slice(0, word.length), max);
  const best = Math.min(whole, start);
  return best <= max ? best : null;
}

// Lower is better; null when the model does not match every typed word.
export function modelScore(queryWords, model, fuzzy) {
  const tokens = tokenize(model);
  // spacing ignored: "iphone15promax" and "i phone 17" still find the model
  const typed = queryWords.join("");
  if (typed.length >= 4 && tokens.join("").includes(typed)) return 0.5;
  let total = 0;
  for (const word of queryWords) {
    let best = null;
    for (const token of tokens) {
      const c = wordCost(word, token, fuzzy);
      if (c !== null && (best === null || c < best)) best = c;
    }
    if (best === null) return null;
    total += best;
  }
  return total;
}

// Closest model names to what was typed, best first.
export function suggestModels(queryWords, modelNames, limit = 5) {
  if (!queryWords.length) return [];
  return [...new Set(modelNames)]
    .map((model) => ({ model, score: modelScore(queryWords, model, true) }))
    .filter((m) => m.score !== null)
    .sort((a, b) => a.score - b.score || a.model.localeCompare(b.model))
    .slice(0, limit)
    .map((m) => m.model);
}
