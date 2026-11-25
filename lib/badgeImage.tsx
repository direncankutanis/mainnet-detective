import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { MARK_VIEWBOX, halftoneDots } from "./mark";
import { fmtDate, type BadgeData } from "./badge";
import { fmtInt, fmtSol, fmtTime } from "./raiku";
import { isCleanSweep, rankFor } from "./rank";

const PAPER = "#EFEEE9";
const SHEET = "#F6F5F1";
const INK = "#223D0E";
const DEEP = "#0F1D06";
const ink = (a: number) => `rgba(34, 61, 14, ${a})`;

const DOTS = halftoneDots(13);

let fontsP: Promise<{ name: string; data: Buffer; weight: 400 | 500; style: "normal" }[]> | null = null;
function fonts() {
  if (!fontsP) {
    const dir = join(process.cwd(), "assets", "fonts");
    const load = (f: string) => readFile(join(dir, f));
    fontsP = Promise.all([
      load("Geist-Regular.ttf"),
      load("Geist-Medium.ttf"),
      load("GeistMono-Regular.ttf"),
      load("GeistMono-Medium.ttf"),
    ]).then(([r, m, mr, mm]) => [
      { name: "Geist", data: r, weight: 400 as const, style: "normal" as const },
      { name: "Geist", data: m, weight: 500 as const, style: "normal" as const },
      { name: "Geist Mono", data: mr, weight: 400 as const, style: "normal" as const },
      { name: "Geist Mono", data: mm, weight: 500 as const, style: "normal" as const },
    ]);
  }
  return fontsP;
}

let partyP: Promise<string> | null = null;
function partySticker() {
  if (!partyP) {
    partyP = readFile(join(process.cwd(), "assets", "mascot", "party.png")).then(
      (b) => `data:image/png;base64,${b.toString("base64")}`,
    );
  }
  return partyP;
}

const mono = { fontFamily: "Geist Mono", letterSpacing: "0.06em" } as const;

function Mug({ stamp, sticker }: { stamp: string; sticker?: string }) {
  const lines = ["6'", "5'", "4'", "3'", "2'"];
  return (
    <div
      style={{
        display: "flex",
        position: "relative",
        width: 360,
        height: 400,
        border: `2px solid ${ink(0.3)}`,
        background: PAPER,
      }}
    >
      {lines.map((l, i) => (
        <div
          key={l}
          style={{
            display: "flex",
            position: "absolute",
            left: 0,
            right: 0,
            top: 30 + i * 70,
            borderTop: `1.5px solid ${ink(0.3)}`,
          }}
        >
          <span style={{ ...mono, fontSize: 15, color: ink(0.6), marginLeft: 10, marginTop: 4 }}>{l}</span>
        </div>
      ))}
      <svg
        viewBox={MARK_VIEWBOX}
        width={250}
        height={219}
        style={{ position: "absolute", left: 70, top: 78 }}
      >
        {DOTS.map((d, i) => (
          <circle key={i} cx={d.cx} cy={d.cy} r={d.r} fill={INK} />
        ))}
      </svg>
      <div
        style={{
          display: "flex",
          position: "absolute",
          right: -34,
          bottom: 26,
          transform: "rotate(-12deg)",
          border: `5px solid ${INK}`,
          padding: "8px 22px",
          color: INK,
          background: "rgba(246, 245, 241, 0.75)",
          fontFamily: "Geist Mono",
          fontWeight: 500,
          fontSize: 46,
          letterSpacing: "0.14em",
        }}
      >
        {stamp}
      </div>
      {sticker ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={sticker} width={118} height={118} style={{ position: "absolute", top: -34, right: -40 }} alt="" />
      ) : null}
    </div>
  );
}

function Frame({
  tab,
  children,
  stamp,
  sticker,
}: {
  tab: string;
  children: React.ReactNode;
  stamp: string;
  sticker?: string;
}) {
  return (
    <div
      style={{
        width: 1200,
        height: 675,
        display: "flex",
        flexDirection: "column",
        background: PAPER,
        padding: "34px 44px 26px",
        fontFamily: "Geist",
        color: DEEP,
      }}
    >
      <div style={{ display: "flex" }}>
        <div
          style={{
            display: "flex",
            ...mono,
            fontSize: 16,
            color: PAPER,
            background: INK,
            padding: "8px 18px 6px",
            borderTopLeftRadius: 8,
            borderTopRightRadius: 8,
          }}
        >
          {tab}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          flex: 1,
          background: SHEET,
          border: `2px solid ${INK}`,
          padding: "34px 40px",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", width: 660 }}>{children}</div>
        <Mug stamp={stamp} sticker={sticker} />
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          ...mono,
          fontSize: 14,
          color: ink(0.6),
          marginTop: 12,
        }}
      >
        <span>MAINNET DETECTIVE · DATA: STAKEWIZ / VALIDATORS.APP</span>
        <span>COMMUNITY-MADE · NOT AFFILIATED WITH RAIKU</span>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        borderTop: `1.5px solid ${ink(0.12)}`,
        padding: "9px 0",
      }}
    >
      <span style={{ ...mono, fontSize: 15, color: ink(0.6) }}>{k}</span>
      <span style={{ fontSize: 22, fontWeight: 500, color: DEEP }}>{v}</span>
    </div>
  );
}

export async function renderBadge(b: BadgeData) {
  const rows: [string, string][] = [];
  rows.push(["CLIENT", `${b.client}${b.version ? " " + b.version : ""}`]);
  if (b.skipped !== null)
    rows.push([b.epoch !== null ? `SKIPPED · EPOCH ${b.epoch}` : "SKIPPED THIS EPOCH", `${fmtInt(b.skipped)} slots`]);
  if (b.commission !== null) rows.push(["COMMISSION", `${b.commission}%`]);
  if (b.stake !== null) rows.push(["ACTIVE STAKE", `${fmtSol(b.stake)} staked`]);

  const handle = b.handle || "Anonymous detective";
  const handleSize = handle.length > 18 ? 38 : 46;

  return new ImageResponse(
    (
      <Frame tab="CERTIFICATE · CASE CLOSED" stamp="VERIFIED" sticker={await partySticker()}>
        <span style={{ ...mono, fontSize: 16, color: ink(0.6) }}>CERTIFIED MAINNET DETECTIVE</span>
        <span style={{ fontSize: handleSize, fontWeight: 500, color: INK, marginTop: 14, lineHeight: 1.1 }}>
          {handle}
        </span>
        <span style={{ fontSize: 24, color: DEEP, marginTop: 14, lineHeight: 1.35 }}>
          {`Verified the Raiku validator on Solana mainnet in ${fmtTime(b.time)}`}
        </span>
        {b.date ? (
          <span style={{ ...mono, fontSize: 16, color: ink(0.6), marginTop: 12 }}>{fmtDate(b.date).toUpperCase()}</span>
        ) : null}
        {b.score !== null ? (
          <div style={{ display: "flex", marginTop: 18 }}>
            <span
              style={{
                ...mono,
                fontSize: 18,
                fontWeight: 500,
                color: SHEET,
                background: INK,
                padding: "7px 14px 5px",
              }}
            >
              {`${rankFor(b.score).toUpperCase()} · ${b.score}/100${isCleanSweep(b.score) ? " · CLEAN SWEEP" : ""}`}
            </span>
          </div>
        ) : null}
        <div style={{ display: "flex", flexDirection: "column", marginTop: "auto" }}>
          {rows.map(([k, v]) => (
            <Row key={k} k={k} v={v} />
          ))}
        </div>
      </Frame>
    ),
    {
      width: 1200,
      height: 675,
      fonts: await fonts(),
      headers: { "Cache-Control": "public, max-age=31536000, immutable" },
    },
  );
}

export async function renderHome() {
  return new ImageResponse(
    (
      <Frame tab="SUBJECT FILE · UNDER INVESTIGATION" stamp="OPEN">
        <span style={{ ...mono, fontSize: 16, color: ink(0.6) }}>5 CASES · LIVE MAINNET DATA · ~3 MIN</span>
        <span style={{ fontSize: 76, fontWeight: 500, color: INK, marginTop: 14, lineHeight: 1.02 }}>
          Mainnet Detective
        </span>
        <span style={{ fontSize: 36, color: DEEP, marginTop: 18, lineHeight: 1.25 }}>
          Can you verify the Raiku validator?
        </span>
        <div style={{ display: "flex", flexDirection: "column", marginTop: "auto" }}>
          <Row k="CLIENT" v="?" />
          <Row k="SKIPPED THIS EPOCH" v="?" />
          <Row k="COMMISSION" v="?" />
          <Row k="ACTIVE STAKE" v="?" />
        </div>
      </Frame>
    ),
    {
      width: 1200,
      height: 675,
      fonts: await fonts(),
      headers: { "Cache-Control": "public, max-age=86400" },
    },
  );
}
