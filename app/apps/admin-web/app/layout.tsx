import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import type React from "react";

import { Providers } from "@/components/providers";
import "./globals.css";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-admin" });

export const metadata: Metadata = {
  title: "Joumla Admin",
  description: "Joumla Store back-office",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={manrope.variable}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
