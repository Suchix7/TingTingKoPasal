// Colour names are typed freely when a product is added ("Light Blue",
// "Rose Gold", "Black / White"). In Chinese, common colour words are
// translated; a name with any word we don't know (a design name, a phone
// model like "iPhone 15") is left exactly as typed.

// whole phrases first
const PHRASES: Record<string, string> = {
  "rose gold": "玫瑰金",
  "sky blue": "天蓝色",
  "navy blue": "藏青色",
  "royal blue": "宝蓝色",
  "baby pink": "浅粉色",
  "hot pink": "玫红色",
  "off white": "米白色",
  "space grey": "深空灰",
  "space gray": "深空灰",
  "army green": "军绿色",
  "dark green": "墨绿色",
  "wine red": "酒红色",
};

// base colours: one character, "色" is added at the end
const BASE: Record<string, string> = {
  black: "黑",
  white: "白",
  red: "红",
  blue: "蓝",
  green: "绿",
  yellow: "黄",
  pink: "粉",
  purple: "紫",
  orange: "橙",
  brown: "棕",
  grey: "灰",
  gray: "灰",
  silver: "银",
  gold: "金",
  golden: "金",
  beige: "米",
};

// complete words, used as they are
const WORDS: Record<string, string> = {
  navy: "藏青色",
  maroon: "酱红色",
  cream: "奶白色",
  olive: "橄榄绿",
  teal: "青色",
  cyan: "青色",
  mint: "薄荷绿",
  lavender: "薰衣草紫",
  lilac: "丁香紫",
  violet: "紫罗兰色",
  magenta: "洋红色",
  peach: "蜜桃色",
  coral: "珊瑚色",
  khaki: "卡其色",
  wine: "酒红色",
  burgundy: "酒红色",
  coffee: "咖啡色",
  chocolate: "巧克力色",
  champagne: "香槟色",
  titanium: "钛色",
  turquoise: "绿松石色",
  nude: "裸色",
  transparent: "透明",
  clear: "透明",
  multicolor: "多色",
  multicolour: "多色",
  rainbow: "彩虹色",
  printed: "印花",
};

// words in front of a colour
const MODS: Record<string, string> = {
  light: "浅",
  dark: "深",
  deep: "深",
  pale: "淡",
  pastel: "淡",
  baby: "浅",
  sky: "天",
  royal: "宝",
  neon: "荧光",
  matte: "哑光",
  matt: "哑光",
  glossy: "亮面",
  shiny: "亮面",
  glitter: "闪粉",
  metallic: "金属",
  rose: "玫瑰",
  midnight: "午夜",
};

function onePart(part: string): string | null {
  let rest = part.trim().toLowerCase().replace(/\s+/g, " ");
  if (!rest) return null;
  if (PHRASES[rest]) return PHRASES[rest];
  // a phrase at the end after some modifiers ("matte rose gold")
  let tail = "";
  for (const [en, zh] of Object.entries(PHRASES)) {
    if (rest.endsWith(" " + en)) {
      tail = zh;
      rest = rest.slice(0, -en.length - 1);
      break;
    }
  }
  const words = rest ? rest.split(/[\s-]+/) : [];
  let out = "";
  let endsWithBase = false;
  for (const w of words) {
    if (MODS[w]) {
      out += MODS[w];
      endsWithBase = false;
    } else if (BASE[w]) {
      out += BASE[w];
      endsWithBase = true;
    } else if (WORDS[w]) {
      out += WORDS[w];
      endsWithBase = false;
    } else {
      return null; // a word we don't know: keep the name as typed
    }
  }
  if (tail) return out + tail;
  return endsWithBase ? out + "色" : out || null;
}

export function zhColour(name: string): string {
  if (!name) return name;
  // "Black / White", "Red & Blue", "Pink + Gold"
  const parts = name.split(/\s*[/&+,]\s*|\s+and\s+/i);
  const done = parts.map(onePart);
  if (done.some((p) => p === null)) return name;
  return done.join(" / ");
}
