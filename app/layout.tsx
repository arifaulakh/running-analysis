import Link from "next/link";
import { Inter } from "next/font/google";

import { cn } from "@/lib/utils";

import "@/app/globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap"
});

export const metadata = {
  title: "Personal Running Coach",
  description: "Personal running coach for the SF Half training block.",
  manifest: "/manifest.webmanifest"
};

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/memory", label: "Memory" },
  { href: "/traces", label: "Traces" }
] as const;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn(inter.variable)}>
      <body
        className="min-h-screen bg-background text-foreground antialiased"
        suppressHydrationWarning
      >
        <div className="flex min-h-screen flex-col">
          <header className="sticky top-0 z-40 w-full border-b border-border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
            <div className="mx-auto flex h-14 w-full max-w-[1200px] items-center justify-between px-6">
              <Link
                href="/"
                className="text-sm font-semibold tracking-tight text-foreground"
              >
                Running Coach
              </Link>
              <nav aria-label="Primary" className="flex items-center gap-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>
          </header>
          <main className="mx-auto w-full max-w-[1200px] flex-1 px-6 py-10">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
