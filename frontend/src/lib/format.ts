export const today = () => new Date().toISOString().slice(0, 10);

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

export const initials = (name: string) =>
  name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();

export const issueNumber = (url: string) => url.split("/").pop();

export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
