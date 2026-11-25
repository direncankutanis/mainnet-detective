"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  STAKEWIZ_URL,
  VALIDATORS_APP_URL,
  VOTE,
  cityShort,
  fmtInt,
  fmtSol,
  fmtTime,
  loadData,
  type Dataset,
} from "@/lib/raiku";
import { MarkIcon, Mugshot } from "./Mark";
import CaseClosed from "./CaseClosed";

type CaseDef = {
  n: number;
  question: string;
  kind: "choice" | "number";
  choices?: string[];
  unit?: string;
  check: (answer: string) => boolean;
  clue: ReactNode;
  evidence: [string, string][];
};

const DECOYS = ["Amsterdam", "Tokyo", "New York", "Singapore"];

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** City choices are shuffled once per browser session. */
function sessionCityChoices(city: string): string[] {
  const key = `md-cities-${city}`;
  try {
    const saved = sessionStorage.getItem(key);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.includes(city)) return parsed;
    }
  } catch {}
  const list = shuffle([city, ...shuffle(DECOYS.filter((d) => d !== city)).slice(0, 3)]);
  try {
    sessionStorage.setItem(key, JSON.stringify(list));
  } catch {}
  return list;
}

function Ext({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

function numEq(answer: string, target: number): boolean {
  const cleaned = answer.replace(/[%\s,]/g, "");
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return false;
  return Math.abs(Number(cleaned) - target) < 1e-9;
}

function buildCases(d: Dataset, cityChoices: string[]): CaseDef[] {
  const { v, bs } = d;
  const cur = bs[0];
  const prev = bs[1];
  const city = cityShort(v.ip_city);
  const stake = v.activated_stake;
  const buckets = [stake / 100, stake / 10, stake, stake * 10].map(fmtSol);

  return [
    {
      n: 1,
      question: "Which client is this validator running?",
      kind: "choice",
      choices: ["Agave", "Jito", "Firedancer", "Raiku"],
      check: (a) => a.toLowerCase() === v.client.toLowerCase(),
      clue: (
        <>
          Open the validator on <Ext href={STAKEWIZ_URL}>StakeWiz</Ext> and read the <b>Version</b> field. The client name
          sits right next to the version number.
        </>
      ),
      evidence: [
        ["Client", v.client],
        ["Version", v.version],
      ],
    },
    {
      n: 2,
      question: "How many of its slots has it skipped this epoch?",
      kind: "number",
      unit: "slots",
      check: (a) => numEq(a, cur.skipped_slots) || (prev ? numEq(a, prev.skipped_slots) : false),
      clue: (
        <>
          On <Ext href={VALIDATORS_APP_URL}>validators.app</Ext>, find the <b>Recent Block Production</b> table. Compare
          leader slots with leader blocks in the latest row: the difference is what it skipped.
        </>
      ),
      evidence: [
        ["Epoch", String(cur.epoch) + (cur.final ? "" : " (in progress)")],
        ["Leader slots", fmtInt(cur.leader_slots)],
        ["Blocks produced", fmtInt(cur.blocks_produced)],
        ["Skipped", fmtInt(cur.skipped_slots)],
      ],
    },
    {
      n: 3,
      question: "What commission does it charge stakers?",
      kind: "number",
      unit: "%",
      check: (a) => numEq(a, v.commission),
      clue: (
        <>
          On <Ext href={STAKEWIZ_URL}>StakeWiz</Ext>, look for the <b>Commission</b> field. It sits next to the JITO
          (MEV) commission.
        </>
      ),
      evidence: [
        ["Commission", `${v.commission}%`],
        ["Jito MEV commission", `${v.jito_commission_bps / 100}%`],
      ],
    },
    {
      n: 4,
      question: "Which city is the server in?",
      kind: "choice",
      choices: cityChoices,
      check: (a) => a === city,
      clue: (
        <>
          <Ext href={VALIDATORS_APP_URL}>validators.app</Ext> lists the data center as <b>ASN-COUNTRY-District</b>{" "}
          (for example &ldquo;395201-DE-Rödelheim&rdquo;). Which city is that district in?
        </>
      ),
      evidence: [
        ["City", v.ip_city],
        ["Country", v.ip_country],
      ],
    },
    {
      n: 5,
      question: "Roughly how much SOL is staked to it?",
      kind: "choice",
      choices: buckets,
      check: (a) => a === fmtSol(stake),
      clue: (
        <>
          On <Ext href={STAKEWIZ_URL}>StakeWiz</Ext>, read the <b>Stake</b> field. Why it matters: more stake means more
          leader slots, and more leader slots means more blocks built by Raiku.
        </>
      ),
      evidence: [["Active stake", `${fmtInt(stake)} SOL`]],
    },
  ];
}

function DataPill({ data }: { data: Dataset | null }) {
  if (!data) {
    return (
      <span className="pill" role="status">
        <span className="dot idle" aria-hidden="true" /> Loading StakeWiz…
      </span>
    );
  }
  if (data.source === "live") {
    return (
      <span className="pill" role="status">
        <span className="dot live" aria-hidden="true" /> Live · StakeWiz · epoch {data.bs[0]?.epoch ?? data.v.epoch}
      </span>
    );
  }
  return (
    <span className="pill snapshot" role="status" title="Live fetch failed. Showing a saved snapshot.">
      <span className="dot idle" aria-hidden="true" /> Snapshot · {data.takenAt} UTC
    </span>
  );
}

export default function Game() {
  const [data, setData] = useState<Dataset | null>(null);
  const [screen, setScreen] = useState<"intro" | "cases" | "closed">("intro");
  const [active, setActive] = useState(0);
  const [solved, setSolved] = useState<boolean[]>([false, false, false, false, false]);
  const [answers, setAnswers] = useState<string[]>(["", "", "", "", ""]);
  const [wrong, setWrong] = useState<number | null>(null);
  const [stampKey, setStampKey] = useState<number | null>(null);
  const [startAt, setStartAt] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [endAt, setEndAt] = useState<number | null>(null);
  const [cityChoices, setCityChoices] = useState<string[]>([]);
  const caseRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    loadData().then((d) => {
      setData(d);
      setCityChoices(sessionCityChoices(cityShort(d.v.ip_city)));
    });
  }, []);

  const cases = useMemo(() => (data && cityChoices.length ? buildCases(data, cityChoices) : []), [data, cityChoices]);

  useEffect(() => {
    if (screen !== "cases" || endAt) return;
    const id = setInterval(() => setElapsed((Date.now() - startAt) / 1000), 1000);
    return () => clearInterval(id);
  }, [screen, startAt, endAt]);

  function open() {
    setStartAt(Date.now());
    setElapsed(0);
    setEndAt(null);
    setScreen("cases");
    setActive(0);
    window.scrollTo({ top: 0 });
  }

  function goto(i: number) {
    setActive(i);
    setWrong(null);
    setStampKey(null);
    requestAnimationFrame(() => caseRef.current?.focus());
  }

  function submit(i: number, answer: string) {
    const c = cases[i];
    if (!c || solved[i]) return;
    setAnswers((a) => a.map((x, j) => (j === i ? answer : x)));
    if (c.check(answer.trim())) {
      setSolved((s) => s.map((x, j) => (j === i ? true : x)));
      setWrong(null);
      setStampKey(i);
      if (solved.filter(Boolean).length === 4) {
        const now = Date.now();
        setEndAt(now);
        setElapsed((now - startAt) / 1000);
      }
    } else {
      setWrong(i);
    }
  }

  function closeCase() {
    setElapsed(((endAt ?? Date.now()) - startAt) / 1000);
    setScreen("closed");
    window.scrollTo({ top: 0 });
  }

  const solvedCount = solved.filter(Boolean).length;

  return (
    <>
      <header className="site-header">
        <div className="wrap header-row">
          <a className="wordmark" href="/" aria-label="Mainnet Detective, home">
            Mainnet Detective
          </a>
          <div className="header-meta">
            <span className="subject-tag mono">
              <MarkIcon size={14} /> Subject: Raiku validator
            </span>
            <DataPill data={data} />
          </div>
        </div>
      </header>

      <main className="wrap main">
        {screen === "intro" && <Intro data={data} onOpen={open} />}

        {screen === "cases" && cases.length > 0 && (
          <section aria-labelledby="case-heading">
            <div className="case-top">
              <nav className="tabs" aria-label="Cases">
                {cases.map((c, i) => {
                  const locked = i > 0 && !solved[i - 1];
                  return (
                    <button
                      key={c.n}
                      type="button"
                      className={`tab-btn${i === active ? " current" : ""}${solved[i] ? " done" : ""}`}
                      aria-current={i === active ? "step" : undefined}
                      disabled={locked}
                      onClick={() => goto(i)}
                    >
                      <span className="mono"><span className="tab-word">CASE </span>{String(c.n).padStart(2, "0")}</span>
                      <span className="tab-state mono">{solved[i] ? "SOLVED" : locked ? "LOCKED" : "OPEN"}</span>
                    </button>
                  );
                })}
              </nav>
              <span className="timer mono" aria-label={`Time ${fmtTime(elapsed)}`}>
                {fmtTime(elapsed)} · {solvedCount}/5
              </span>
            </div>

            <CaseView
              key={active}
              c={cases[active]}
              solved={solved[active]}
              answer={answers[active]}
              wrong={wrong === active}
              stamp={stampKey === active}
              headingRef={caseRef}
              onSubmit={(a) => submit(active, a)}
              onNext={active < 4 ? () => goto(active + 1) : closeCase}
              last={active === 4}
              live={data?.source === "live"}
            />
          </section>
        )}

        {screen === "closed" && data && <CaseClosed data={data} seconds={elapsed} />}
      </main>
    </>
  );
}

function Intro({ data, onOpen }: { data: Dataset | null; onOpen: () => void }) {
  const ep = data?.epochInfo;
  const pct = ep ? Math.min(100, Math.round((ep.elapsed_seconds / ep.duration_seconds) * 100)) : null;
  return (
    <div className="grid intro">
      <div className="intro-copy">
        <p className="kicker mono">Mainnet Detective · 5 cases</p>
        <h1>Raiku says its validator is live. Prove it.</h1>
        <p className="lead">
          Don&rsquo;t take anyone&rsquo;s word for it. Each case sends you to StakeWiz or validators.app to find one piece
          of evidence about the Raiku validator on Solana mainnet. Every answer is checked against live data. Close all
          five and you&rsquo;re a Certified Mainnet Detective.
        </p>
        <button type="button" className="btn primary" onClick={onOpen} disabled={!data}>
          {data ? "Open the case file →" : "Pulling the file…"}
        </button>
        <p className="fine">Takes about 3 minutes. Keep a second tab open for the explorers.</p>
      </div>

      <article className="folder">
        <div className="folder-tab mono">SUBJECT FILE</div>
        <div className="folder-body">
          <Mugshot />
          <dl className="facts">
            <div>
              <dt className="mono">Subject</dt>
              <dd>Raiku validator</dd>
            </div>
            <div>
              <dt className="mono">Vote account</dt>
              <dd className="mono break">{VOTE}</dd>
            </div>
            <div>
              <dt className="mono">Claim</dt>
              <dd>&ldquo;Our validator is live on Solana mainnet.&rdquo;</dd>
            </div>
            <div>
              <dt className="mono">Status</dt>
              <dd>
                <span className="status-chip mono">Under investigation</span>
              </dd>
            </div>
            {pct !== null && ep && (
              <div>
                <dt className="mono">Epoch {ep.epoch}</dt>
                <dd>
                  <span className="bar" aria-label={`${pct}% of epoch elapsed`}>
                    <span style={{ width: `${pct}%` }} />
                  </span>
                  <span className="mono small">{pct}% elapsed</span>
                </dd>
              </div>
            )}
          </dl>
        </div>
      </article>
    </div>
  );
}

function CaseView({
  c,
  solved,
  answer,
  wrong,
  stamp,
  headingRef,
  onSubmit,
  onNext,
  last,
  live,
}: {
  c: CaseDef;
  solved: boolean;
  answer: string;
  wrong: boolean;
  stamp: boolean;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  onSubmit: (a: string) => void;
  onNext: () => void;
  last: boolean;
  live: boolean;
}) {
  const [val, setVal] = useState(c.kind === "number" ? answer : "");
  const label = `CASE ${String(c.n).padStart(2, "0")} OF 05`;
  const nextRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (solved && stamp) nextRef.current?.focus({ preventScroll: true });
  }, [solved, stamp]);

  return (
    <div className="grid case">
      <article className="folder">
        <div className="folder-tab mono">{label}</div>
        <div className="folder-body">
          <h2 id="case-heading" ref={headingRef} tabIndex={-1} className="question">
            {c.question}
          </h2>

          <div className="clue">
            <p className="mono label">Clue</p>
            <p>{c.clue}</p>
          </div>

          {c.kind === "choice" ? (
            <div className="choices" role="group" aria-label="Answers">
              {c.choices!.map((ch) => {
                const picked = answer === ch;
                return (
                  <button
                    key={ch}
                    type="button"
                    className={`choice${picked && solved ? " right" : ""}${picked && wrong ? " wrongpick" : ""}`}
                    disabled={solved}
                    aria-pressed={picked}
                    onClick={() => onSubmit(ch)}
                  >
                    {ch}
                  </button>
                );
              })}
            </div>
          ) : (
            <form
              className="numform"
              onSubmit={(e) => {
                e.preventDefault();
                if (val.trim()) onSubmit(val);
              }}
            >
              <label htmlFor={`ans-${c.n}`} className="mono label">
                Your answer ({c.unit})
              </label>
              <div className="numrow">
                <input
                  id={`ans-${c.n}`}
                  inputMode="decimal"
                  autoComplete="off"
                  value={val}
                  maxLength={12}
                  disabled={solved}
                  onChange={(e) => setVal(e.target.value)}
                  aria-invalid={wrong || undefined}
                  aria-describedby={`fb-${c.n}`}
                />
                <button type="submit" className="btn primary" disabled={solved || !val.trim()}>
                  Check
                </button>
              </div>
            </form>
          )}

          <p id={`fb-${c.n}`} className={`feedback${wrong ? " err" : ""}`} aria-live="polite">
            {wrong && "That doesn't match the evidence. Check the clue and look again."}
            {solved && (live ? "Confirmed against live data. Evidence logged." : "Confirmed against the snapshot. Evidence logged.")}
          </p>

          {solved && (
            <button ref={nextRef} type="button" className="btn primary" onClick={onNext}>
              {last ? "Close the case →" : "Next case →"}
            </button>
          )}
        </div>
      </article>

      <aside className="locker" aria-label="Evidence locker">
        <div className="locker-head">
          <p className="mono label">Evidence locker · case {String(c.n).padStart(2, "0")}</p>
          <div className="stamp-slot" aria-hidden={!solved}>
            {solved && (
              <span className={`stamp${stamp ? " slam" : ""}`} role="img" aria-label="Solved">
                SOLVED
              </span>
            )}
          </div>
        </div>
        <dl className="evidence">
          {c.evidence.map(([k, v]) => (
            <div key={k}>
              <dt className="mono">{k}</dt>
              <dd>{solved ? v : <span className="redacted" aria-label="Sealed until solved" />}</dd>
            </div>
          ))}
        </dl>
        <p className="fine">{solved
            ? live
              ? "Live values as reported by StakeWiz."
              : "Values from the saved snapshot, not live."
            : "Sealed until the case is solved."}</p>
      </aside>
    </div>
  );
}
