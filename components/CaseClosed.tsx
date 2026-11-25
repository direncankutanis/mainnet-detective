"use client";

import { useEffect, useMemo, useState } from "react";
import { countRaikuClients, fmtInt, fmtSol, fmtTime, type Dataset } from "@/lib/raiku";
import { Mascot } from "./Mascot";
import { badgeQuery, sanitizeHandle, shareText, type BadgeData } from "@/lib/badge";
import { isCleanSweep, rankFor, type Challenge } from "@/lib/rank";

type Bonus = { state: "loading" } | { state: "ok"; total: number; raiku: number } | { state: "error" };

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function CaseClosed({
  data,
  seconds,
  score,
  challenge,
}: {
  data: Dataset;
  seconds: number;
  score: number;
  challenge: Challenge | null;
}) {
  const { v, bs } = data;
  const time = fmtTime(seconds);
  const rank = rankFor(score);
  const clean = isCleanSweep(score);
  const mySecs = Math.floor(seconds);
  const beat = challenge ? mySecs < challenge.time : false;
  const diff = challenge ? Math.abs(challenge.time - mySecs) : 0;
  const gap = diff >= 60 ? fmtTime(diff) : `${diff}s`;
  const [bonus, setBonus] = useState<Bonus>({ state: "loading" });
  const [handleInput, setHandleInput] = useState("");
  const [badge, setBadge] = useState<BadgeData | null>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    countRaikuClients()
      .then((r) => alive && setBonus({ state: "ok", ...r }))
      .catch(() => alive && setBonus({ state: "error" }));
    return () => {
      alive = false;
    };
  }, []);

  const date = useMemo(todayUTC, []);
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  function makeBadge(e: React.FormEvent) {
    e.preventDefault();
    setBadge({
      handle: sanitizeHandle(handleInput),
      time: Math.floor(seconds),
      date,
      client: v.client,
      version: v.version,
      skipped: bs[0]?.skipped_slots ?? null,
      epoch: bs[0]?.epoch ?? null,
      commission: v.commission,
      stake: Math.round(v.activated_stake),
      score,
    });
    setStatus("");
  }

  const q = badge ? badgeQuery(badge) : "";
  const shareUrl = badge ? `${origin}/b?${q}` : "";
  const imgUrl = badge ? `/api/badge?${q}` : "";
  const tweetUrl = badge
    ? `https://x.com/intent/tweet?${new URLSearchParams({
        text: shareText(
          time,
          rank,
          beat && challenge ? { handle: challenge.handle, time: fmtTime(challenge.time) } : undefined,
        ),
        url: shareUrl,
      })}`
    : "";

  async function download() {
    if (!badge) return;
    setBusy(true);
    setStatus("");
    try {
      const res = await fetch(imgUrl);
      if (!res.ok) throw new Error(String(res.status));
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "mainnet-detective-badge.png";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      setStatus("Badge downloaded.");
    } catch {
      setStatus("Couldn't download the badge. Long-press the image to save it instead.");
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setStatus("Link copied.");
    } catch {
      window.prompt("Copy this link:", shareUrl);
    }
  }

  const live = data.source === "live";

  return (
    <div className="closed">
      <article className="folder">
        <div className="folder-tab mono">CASE CLOSED</div>
        <div className="folder-body closed-body">
          <div className="closed-head">
            <div>
              <p className="kicker mono">All 5 cases solved · {time}</p>
              <h1>The Raiku validator checks out.</h1>
              <p className="lead">
                You verified it yourself, on {live ? "live mainnet data" : "a saved snapshot (live data was unavailable)"}
                . That makes you a Certified Mainnet Detective.
              </p>
            </div>
            <div className="stamp-slot big">
              <Mascot kind="party" />
              <span className="stamp slam verified" role="img" aria-label="Verified">
                VERIFIED
              </span>
            </div>
          </div>

          <div className="rank-card">
            <div>
              <p className="mono label">Detective rank</p>
              <p className="rank-name">{rank}</p>
            </div>
            <div>
              <p className="mono label">Score</p>
              <p className="rank-name">{score}/100</p>
            </div>
            {clean && <span className="mini-stamp mono">Clean sweep</span>}
          </div>

          {challenge && (
            <p className={`challenge-result${beat ? " won" : ""}`} aria-live="polite">
              {beat
                ? `You beat ${challenge.handle}'s ${fmtTime(challenge.time)} by ${gap}.`
                : diff === 0
                  ? `Dead heat with ${challenge.handle}: ${fmtTime(challenge.time)}.`
                  : `${challenge.handle} still leads by ${gap} (${fmtTime(challenge.time)}). Play again?`}
            </p>
          )}

          <dl className="evidence summary">
            <div>
              <dt className="mono">Client</dt>
              <dd>
                {v.client} {v.version}
              </dd>
            </div>
            <div>
              <dt className="mono">Skipped · epoch {bs[0]?.epoch}</dt>
              <dd>
                {fmtInt(bs[0]?.skipped_slots ?? 0)} of {fmtInt(bs[0]?.leader_slots ?? 0)} leader slots
              </dd>
            </div>
            <div>
              <dt className="mono">Commission</dt>
              <dd>{v.commission}%</dd>
            </div>
            <div>
              <dt className="mono">Location</dt>
              <dd>
                {v.ip_city}, {v.ip_country}
              </dd>
            </div>
            <div>
              <dt className="mono">Active stake</dt>
              <dd>{fmtSol(v.activated_stake)}</dd>
            </div>
            <div>
              <dt className="mono">Solve time</dt>
              <dd>{time}</dd>
            </div>
          </dl>

          <div className="bonus" aria-live="polite">
            <p className="mono label">Bonus finding</p>
            {bonus.state === "loading" && <p>Counting every validator StakeWiz tracks…</p>}
            {bonus.state === "ok" && (
              <p>
                Out of {fmtInt(bonus.total)} validators tracked by StakeWiz, {bonus.raiku}{" "}
                {bonus.raiku === 1 ? "runs" : "run"} the Raiku client.
                {bonus.raiku === 1 && " That one is Raiku's own."}
              </p>
            )}
            {bonus.state === "error" && (
              <p>Couldn&rsquo;t load the full validator list right now. At the last snapshot, 1 of 670 ran the Raiku client.</p>
            )}
          </div>
        </div>
      </article>

      {/* Reward steps. A future "mint your badge" step can be appended after BadgeStep. */}
      <article className="folder">
        <div className="folder-tab mono">YOUR BADGE</div>
        <div className="folder-body">
          <form className="badge-form" onSubmit={makeBadge}>
            <label htmlFor="handle" className="mono label">
              X handle or name (optional)
            </label>
            <div className="numrow">
              <input
                id="handle"
                value={handleInput}
                maxLength={25}
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                placeholder="@yourhandle"
                onChange={(e) => setHandleInput(e.target.value)}
              />
              <button type="submit" className="btn primary">
                {badge ? "Update badge" : "Get my badge"}
              </button>
            </div>
          </form>

          {badge && (
            <>
              <div className="badge-preview">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imgUrl}
                  width={1200}
                  height={675}
                  alt={`Certified Mainnet Detective badge${badge.handle ? ` for ${badge.handle}` : ""}, solved in ${time}`}
                />
              </div>
              <div className="actions">
                <a className="btn primary" href={tweetUrl} target="_blank" rel="noopener noreferrer">
                  Share on X
                </a>
                <button type="button" className="btn" onClick={download} disabled={busy}>
                  {busy ? "Preparing…" : "Download badge (PNG)"}
                </button>
                <button type="button" className="btn" onClick={copy}>
                  Copy link
                </button>
              </div>
              <p className="feedback" aria-live="polite">
                {status}
              </p>
              <p className="fine">
                Tag @raikucom when you post. Your link unfurls on X as this badge, and anyone who opens it gets your time as
                the target to beat.
              </p>
            </>
          )}
        </div>
      </article>
    </div>
  );
}
