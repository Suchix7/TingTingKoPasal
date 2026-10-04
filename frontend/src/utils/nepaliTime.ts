export const dateTime = (value?: string) => {
  if (!value) return "-";
  const isoValue = value.includes("T") ? value : value.replace(" ", "T") + "Z";

  return new Intl.DateTimeFormat("en-NP", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kathmandu",
  }).format(new Date(isoValue));
};
