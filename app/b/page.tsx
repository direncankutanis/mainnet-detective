import type { Metadata } from "next";
import { badgeQuery, challengeQuery, parseBadge } from "@/lib/badge";
import { rankFor } from "@/lib/rank";
import { fmtTime } from "@/lib/raiku";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const b = parseBadge(await searchParams);
  const img = `/api/badge?${badgeQuery(b)}`;
  const who = b.handle || "A detective";
  const title = `${who} is a Certified Mainnet Detective`;
  const rank = b.score !== null ? ` Rank: ${rankFor(b.score)}.` : "";
  const description = `Verified the Raiku validator on Solana mainnet in ${fmtTime(b.time)}.${rank} Can you beat it?`;
  return {
    title,
    description,
    openGraph: { title, description, type: "website", images: [{ url: img, width: 1200, height: 675, alt: title }] },
    twitter: { card: "summary_large_image", title, description, images: [img] },
  };
}

export default async function BadgePage({ searchParams }: Props) {
  const b = parseBadge(await searchParams);
  const img = `/api/badge?${badgeQuery(b)}`;
  return (
    <>
      <header className="site-header">
        <div className="wrap header-row">
          <a className="wordmark" href="/">
            Mainnet Detective
          </a>
        </div>
      </header>
      <main className="wrap main">
        <article className="folder">
          <div className="folder-tab mono">CERTIFICATE</div>
          <div className="folder-body">
            <p className="kicker mono">
              Case closed · {fmtTime(b.time)}
              {b.score !== null ? ` · ${rankFor(b.score)} · ${b.score}/100` : ""}
            </p>
            <h1>{b.handle || "A detective"} verified the Raiku validator.</h1>
            <div className="badge-preview">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img} width={1200} height={675} alt={`Certified Mainnet Detective badge, solved in ${fmtTime(b.time)}`} />
            </div>
            <div className="actions">
              <a className="btn primary" href={`/?${challengeQuery(b)}`}>
                Beat {fmtTime(b.time)} →
              </a>
              <a className="btn" href="/">
                Play it yourself
              </a>
            </div>
            <p className="fine">Five cases. Real mainnet data. Don&rsquo;t trust, verify.</p>
          </div>
        </article>
      </main>
    </>
  );
}
