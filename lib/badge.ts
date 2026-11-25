// Badge parameters: one schema shared by the game (to build URLs), the share
// page and the image route (to validate and clamp everything server-side).

export type BadgeData = {
  handle: string; // "" when anonymous; already sanitized, "@" added for X-style handles
  time: number; // solve time in seconds
  date: string; // YYYY-MM-DD
  client: string;
  version: string;
  skipped: number | null;
  epoch: number | null;
  commission: number | null;
  stake: number | null; // SOL
  score: number | null; // 0-100 detective score
};

type Params = Record<string, string | string[] | undefined> | URLSearchParams;

function get(p: Params, k: string): string {
  const v = p instanceof URLSearchParams ? p.get(k) : p[k];
  return (Array.isArray(v) ? v[0] : v ?? "").toString();
}

function int(raw: string, min: number, max: number): number | null {
  if (!/^\d{1,12}$/.test(raw)) return null;
  const n = Number(raw);
  return n >= min && n <= max ? n : null;
}

function num(raw: string, min: number, max: number): number | null {
  if (!/^\d{1,4}(\.\d{1,2})?$/.test(raw)) return null;
  const n = Number(raw);
  return n >= min && n <= max ? n : null;
}

export function sanitizeHandle(raw: string): string {
  const cleaned = raw
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}_ .\-]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 24);
  if (/^[A-Za-z0-9_]{1,15}$/.test(cleaned) && /^@/.test(raw.trim())) return "@" + cleaned;
  return cleaned;
}

export function parseBadge(p: Params): BadgeData {
  const date = get(p, "d");
  const client = get(p, "c").replace(/[^A-Za-z0-9 .\-]/g, "").slice(0, 20);
  const version = get(p, "v").replace(/[^0-9A-Za-z.\-]/g, "").slice(0, 16);
  return {
    handle: sanitizeHandle(get(p, "h")),
    time: int(get(p, "t"), 0, 99 * 60 + 59) ?? 0,
    date: /^20\d\d-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(date) ? date : "",
    client: client || "Raiku",
    version,
    skipped: int(get(p, "s"), 0, 100000),
    epoch: int(get(p, "e"), 0, 1000000),
    commission: num(get(p, "m"), 0, 100),
    stake: int(get(p, "k"), 0, 1_000_000_000),
    score: int(get(p, "p"), 0, 100),
  };
}

/** Query string for /b and /api/badge. Input is trusted client state, but the server re-validates. */
export function badgeQuery(b: BadgeData): string {
  const q = new URLSearchParams();
  if (b.handle) q.set("h", b.handle);
  q.set("t", String(Math.round(b.time)));
  if (b.date) q.set("d", b.date);
  q.set("c", b.client);
  if (b.version) q.set("v", b.version);
  if (b.skipped !== null) q.set("s", String(b.skipped));
  if (b.epoch !== null) q.set("e", String(b.epoch));
  if (b.commission !== null) q.set("m", String(b.commission));
  if (b.stake !== null) q.set("k", String(Math.round(b.stake)));
  if (b.score !== null) q.set("p", String(b.score));
  return q.toString();
}

export function fmtDate(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${d} ${months[m - 1]} ${y}`;
}

export function shareText(time: string, rank?: string, beat?: { handle: string; time: string }): string {
  const base = `I just verified the @raikucom validator myself on Solana mainnet 🕵️ Certified Mainnet Detective in ${time}`;
  const r = rank ? ` (rank: ${rank})` : "";
  const b = beat ? `, beating ${beat.handle}'s ${beat.time}` : "";
  return `${base}${r}${b}. Can you beat it?`;
}

/** Link that starts a new game with this badge's time as the target. */
export function challengeQuery(b: BadgeData): string {
  const q = new URLSearchParams();
  if (b.handle) q.set("vs", b.handle);
  q.set("vt", String(b.time));
  return q.toString();
}
