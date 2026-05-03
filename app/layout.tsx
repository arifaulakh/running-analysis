import Link from "next/link";

import "@/app/globals.css";

export const metadata = {
  title: "Personal Running Coach",
  description: "Personal running coach for the SF Half training block.",
  manifest: "/manifest.webmanifest"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="shell">
          <header className="topbar">
            <div className="topbar-inner">
              <Link className="brand" href="/">
                Personal Running Coach
              </Link>
              <nav className="nav" aria-label="Primary">
                <Link href="/">Home</Link>
                <Link href="/memory">Memory</Link>
                <Link href="/traces">Traces</Link>
              </nav>
            </div>
          </header>
          <main className="main">{children}</main>
        </div>
      </body>
    </html>
  );
}
