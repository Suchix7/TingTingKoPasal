export const pcs = (n: number) => `${n} ${n === 1 ? "pc" : "pcs"}`;

export const rs = (n: number) => `Rs. ${Math.round(n).toLocaleString("en-IN")}`;

// "Rs. 500" or "Rs. 500 – 700"; empty when there is no price
export const priceLabel = (min?: number, max?: number) => {
  if (min == null || min <= 0) return "";
  return max != null && max > min
    ? `${rs(min)} – ${Math.round(max).toLocaleString("en-IN")}`
    : rs(min);
};
