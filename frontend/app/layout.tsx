import type { Metadata } from "next";
import { Inter, Sora, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const sora = Sora({ subsets: ["latin"], weight: ["500", "700", "800"], variable: "--font-sora" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["500", "700"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "Vehicle Intelligence Console",
  description:
    "Instant, explainable resale valuations for used Volkswagen & Audi vehicles — a premium automotive pricing platform.",
  keywords: ["vehicle valuation", "car price prediction", "resale value", "automotive"],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${sora.variable} ${mono.variable}`}>
        {children}
      </body>
    </html>
  );
}
