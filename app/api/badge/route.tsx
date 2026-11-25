import { parseBadge } from "@/lib/badge";
import { renderBadge, renderHome } from "@/lib/badgeImage";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  if (params.has("home") || !params.has("t")) return renderHome();
  return renderBadge(parseBadge(params));
}
