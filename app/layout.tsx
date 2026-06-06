import type { Metadata } from "next";
import { Playfair_Display, Inter, IBM_Plex_Mono, DM_Sans, Orbitron } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { isMaintenanceMode } from "@/lib/maintenance";
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

function MaintenancePage() {
  return (
    <div style={{
      minHeight: "100vh",
      backgroundColor: "#0d1a17",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "2rem",
    }}>
      <div style={{ textAlign: "center", maxWidth: "400px" }}>
        <p style={{
          fontFamily: "var(--font-orbitron)",
          fontSize: "0.65rem",
          letterSpacing: "0.35em",
          color: "#7fe3c8",
          textTransform: "uppercase",
          marginBottom: "2.5rem",
        }}>
          Dish Report
        </p>
        <div style={{
          width: "2rem",
          height: "1px",
          backgroundColor: "#2c4a44",
          margin: "0 auto 2.5rem",
        }} />
        <h1 style={{
          fontFamily: "var(--font-playfair)",
          fontSize: "1.5rem",
          fontWeight: 400,
          color: "#f0f4f1",
          marginBottom: "1rem",
          lineHeight: 1.5,
        }}>
          Getting an upgrade.
        </h1>
        <p style={{
          fontSize: "0.875rem",
          color: "#8aa9a2",
          lineHeight: 1.6,
        }}>
          Back soon.
        </p>
      </div>
    </div>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const inMaintenance = isMaintenanceMode();
  return (
    <html lang="en">
      <body className={`${playfair.variable} ${inter.variable} ${mono.variable} ${dmSans.variable} ${orbitron.variable}`}>
        {inMaintenance ? <MaintenancePage /> : children}
        <Analytics />
      </body>
    </html>
  );
}
