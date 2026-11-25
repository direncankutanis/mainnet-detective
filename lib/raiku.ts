// Raiku validator data: constants, types, live loading and the fallback snapshot.

export const VOTE = "AVD61fbwxDGuLGCanPWQPxRjdqYk3icssz5u7JH8kbta";
export const IDENTITY = "9xcXe4WRAfbVoVgQmFD5xgFHioL9dD7c74pQZ7PeczT";
export const API = "https://api.stakewiz.com/";
export const STAKEWIZ_URL = `https://stakewiz.com/validator/${VOTE}`;
export const VALIDATORS_APP_URL = `https://www.validators.app/validators/${IDENTITY}?locale=en&network=mainnet`;

export type Validator = {
  client: string;
  version: string;
  commission: number;
  jito_commission_bps: number;
  activated_stake: number;
  ip_city: string;
  ip_country: string;
  epoch: number;
  skip_rate: number;
  vote_success: number;
  uptime: number;
  total_apy: number;
  first_epoch_with_stake: number;
  delinquent: boolean;
};

export type BlockStat = {
  epoch: number;
  leader_slots: number;
  blocks_produced: number;
  skipped_slots: number;
  final: boolean;
};

export type EpochInfo = {
  epoch: number;
  slot_height: number;
  duration_seconds: number;
  elapsed_seconds: number;
};

export type Dataset = {
  source: "live" | "snapshot";
  /** Human label for when the data was taken (snapshot only). */
  takenAt?: string;
  v: Validator;
  bs: BlockStat[];
  epochInfo?: EpochInfo;
};

/** Snapshot taken 25 Nov 2026 10:51 UTC from the StakeWiz API. Only used when the live fetch fails. */
export const SNAPSHOT: Dataset = {
  source: "snapshot",
  takenAt: "25 Nov 2026 10:51",
  v: {
    client: "Raiku",
    version: "4.4.1",
    commission: 0,
    jito_commission_bps: 0,
    activated_stake: 406984.849978582,
    ip_city: "Frankfurt am Main",
    ip_country: "Germany",
    epoch: 1096,
    skip_rate: 0,
    vote_success: 99.99,
    uptime: 99.97,
    total_apy: 5.05,
    first_epoch_with_stake: 966,
    delinquent: false,
  },
  bs: [
    { epoch: 1096, leader_slots: 164, blocks_produced: 164, skipped_slots: 0, final: false },
    { epoch: 1095, leader_slots: 412, blocks_produced: 412, skipped_slots: 0, final: true },
  ],
};

async function getJSON<T>(path: string, timeoutMs = 8000): Promise<T> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(API + path, { signal: ctrl.signal, cache: "no-store" });
    if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(t);
  }
}

function forceFail(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).has("offline");
}

/** Load live data from StakeWiz; fall back to the snapshot on any failure. Add ?offline to the URL to test the fallback. */
export async function loadData(): Promise<Dataset> {
  try {
    if (forceFail()) throw new Error("forced offline");
    const [v, bs] = await Promise.all([
      getJSON<Validator>(`validator/${VOTE}`),
      getJSON<BlockStat[]>(`validator_block_stats/${VOTE}?epochs=3`),
    ]);
    if (!v || typeof v.client !== "string" || !Array.isArray(bs) || bs.length === 0) {
      throw new Error("unexpected response shape");
    }
    bs.sort((a, b) => b.epoch - a.epoch);
    let epochInfo: EpochInfo | undefined;
    try {
      epochInfo = await getJSON<EpochInfo>("epoch_info", 5000);
    } catch {
      /* optional */
    }
    return { source: "live", v, bs, epochInfo };
  } catch (err) {
    console.warn("[mainnet-detective] live fetch failed, using snapshot", err);
    return SNAPSHOT;
  }
}

/** Count validators running the Raiku client. Lazy: ~1.5 MB response. */
export async function countRaikuClients(): Promise<{ total: number; raiku: number }> {
  if (forceFail()) throw new Error("forced offline");
  const all = await getJSON<{ client?: string }[]>("validators", 20000);
  return {
    total: all.length,
    raiku: all.filter((x) => (x.client || "").toLowerCase() === "raiku").length,
  };
}

/** "~407K SOL" style. */
export function fmtSol(n: number): string {
  const unit = n >= 1e6 ? ["M", 1e6] : n >= 1e3 ? ["K", 1e3] : ["", 1];
  const x = n / (unit[1] as number);
  const s = x < 10 ? x.toFixed(1).replace(/\.0$/, "") : Math.round(x).toString();
  return `~${s}${unit[0]} SOL`;
}

export function fmtInt(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

export function fmtTime(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export function cityShort(city: string): string {
  return city.split(/\s+/)[0] || city;
}
