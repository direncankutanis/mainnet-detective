// Scoring: start at 100, -10 per wrong answer, -5 per hint opened.
export const START_SCORE = 100;
export const WRONG_COST = 10;
export const HINT_COST = 5;

export function computeScore(wrongs: number, hints: number): number {
  return Math.max(0, START_SCORE - wrongs * WRONG_COST - hints * HINT_COST);
}

export function rankFor(score: number): string {
  if (score >= 95) return "Chief Detective";
  if (score >= 75) return "Inspector";
  return "Rookie";
}

export function isCleanSweep(score: number): boolean {
  return score >= START_SCORE;
}

/** Challenge params (?vs=handle&vt=seconds), sanitized for display. */
export type Challenge = { handle: string; time: number };

export function parseChallenge(search: string): Challenge | null {
  const q = new URLSearchParams(search);
  const vt = q.get("vt") || "";
  if (!/^\d{1,4}$/.test(vt)) return null;
  const time = Number(vt);
  if (time <= 0 || time > 99 * 60 + 59) return null;
  const handle = (q.get("vs") || "")
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}_ .@\-]/gu, "")
    .trim()
    .slice(0, 25);
  return { handle: handle || "a fellow detective", time };
}
