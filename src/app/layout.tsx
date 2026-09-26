import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Physics Assessment Hub",
  description: "Modern assessment platform for Physics at WIS Phnom Penh",
};

import { Suspense } from 'react';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading application...</div>}>
          {children}
        </Suspense>
        <Script src="https://unpkg.com/mathlive" strategy="lazyOnload" />
      </body>
    </html>
  );
}
