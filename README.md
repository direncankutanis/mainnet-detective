# Mainnet Detective

A 5-case "verify it yourself" game about the Raiku validator on Solana mainnet, built for the Raiku Mainnet Detective community challenge. Every answer is checked against live StakeWiz data; finish all five cases to get a shareable "Certified Mainnet Detective" badge.

Community-made. Not affiliated with Raiku.

- `components/Game.tsx` – intro + 5 cases (client-side StakeWiz fetch, snapshot fallback; add `?offline` to test it)
- `components/CaseClosed.tsx` – case-closed screen, badge, sharing (a future "mint" step slots in after the badge)
- `app/api/badge/route.tsx` – 1200×675 badge image (`next/og`); `?home=1` renders the site's OG image
- `app/b/page.tsx` – share page whose metadata unfurls as the player's badge
- `lib/badge.ts` – badge params; everything is validated and clamped server-side

Data: [StakeWiz](https://stakewiz.com) · [validators.app](https://www.validators.app)

```bash
npm install && npm run dev
```
