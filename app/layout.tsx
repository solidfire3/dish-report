import type { Metadata } from "next";
import { Playfair_Display, Inter, IBM_Plex_Mono, DM_Sans, Orbitron } from "next/font/google";
import "./globals.css";

const playfair  = Playfair_Display({ subsets: ["latin"], weight: ["400", "700"],            variable: "--font-playfair",  display: "swap" });
const inter     = Inter(            { subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-inter",     display: "swap" });
const mono      = IBM_Plex_Mono(    { subsets: ["latin"], weight: ["400", "600"],            variable: "--font-mono",      display: "swap" });
const dmSans    = DM_Sans(          { subsets: ["latin"], weight: ["400", "500"],            variable: "--font-dm-sans",   display: "swap" });
const orbitron  = Orbitron(         { subsets: ["latin"], weight: ["400", "700", "900"],     variable: "--font-orbitron",  display: "swap" });

export const metadata: Metadata = {
  title: "Dish Report",
  description: "Find where the food stands out.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${playfair.variable} ${inter.variable} ${mono.variable} ${dmSans.variable} ${orbitron.variable}`}>
        {children}
      </body>
    </html>
  );
}
