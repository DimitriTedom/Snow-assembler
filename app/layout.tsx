import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./../styles/globals.css";

import { ThemeProvider } from "@/components/theme-provider";
import { SiteHeader } from "@/components/site-header";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: {
    default: "Next.js Template",
    template: "%s | Next.js Template",
  },
  description: "Next.js 15 + Supabase Auth + Prisma starter template.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <SiteHeader />
          <main className="mx-auto max-w-5xl px-4 py-10">{children}</main>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
