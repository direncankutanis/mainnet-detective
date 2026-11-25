import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geist = Geist({ variable: "--font-geist", subsets: ["latin", "latin-ext"], weight: ["400", "500"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"], weight: ["400", "500"] });

const siteUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "http://localhost:3000";

const description =
  "A 5-case detective game: verify the Raiku validator on Solana mainnet yourself with StakeWiz and validators.app, checked against live data. Community-made, not affiliated with Raiku.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Mainnet Detective",
  description,
  openGraph: {
    title: "Mainnet Detective",
    description: "Can you verify the Raiku validator? 5 cases, live mainnet data.",
    type: "website",
    images: [{ url: "/api/badge?home=1", width: 1200, height: 675, alt: "Mainnet Detective: can you verify the Raiku validator?" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Mainnet Detective",
    description: "Can you verify the Raiku validator? 5 cases, live mainnet data.",
    images: ["/api/badge?home=1"],
  },
};

export const viewport: Viewport = { themeColor: "#EFEEE9" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable}`}>
      <body>
        {children}
        <footer className="site-footer">
          <div className="wrap footer-row">
            <p className="mono">
              Data:{" "}
              <a href="https://stakewiz.com/validator/AVD61fbwxDGuLGCanPWQPxRjdqYk3icssz5u7JH8kbta" target="_blank" rel="noopener noreferrer">
                StakeWiz
              </a>{" "}
              ·{" "}
              <a
                href="https://www.validators.app/validators/9xcXe4WRAfbVoVgQmFD5xgFHioL9dD7c74pQZ7PeczT?locale=en&network=mainnet"
                target="_blank"
                rel="noopener noreferrer"
              >
                validators.app
              </a>
            </p>
            <p>
              Built by a community member for the Raiku Mainnet Detective challenge. Not affiliated with Raiku. Mascot art from
              the Raiku community media kit.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
