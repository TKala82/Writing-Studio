import type { Metadata } from "next";
import { Manrope, Newsreader } from "next/font/google";

import { AppProviders } from "@/components/app-providers";

import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lede — Genre-native writing studio",
  description:
    "Professional, fact-locked rewriting shaped by the conventions of your content type.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${newsreader.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <AppProviders
          clerkEnabled={Boolean(
            process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
          )}
          convexUrl={
            process.env.NEXT_PUBLIC_CONVEX_URL ?? "http://127.0.0.1:3210"
          }
        >
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
