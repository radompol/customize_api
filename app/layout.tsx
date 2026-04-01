import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Manrope } from "next/font/google";
import axzTechLogo from "@/assets/logo/axztech-logo.png";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-sans"
});

export const metadata: Metadata = {
  title: " Accreditation Readiness",
  description: "Professional accreditation readiness dashboard, upload workflow, and forecasting workspace."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={manrope.variable}>
        <div className="app-shell">
          <header className="topbar">
            <Link href="/dashboard" className="brand" aria-label="Accreditation Readiness dashboard">
              
              <span className="brand-copy">
          
                <span className="brand-subtitle">Accreditation readiness workspace</span>
              </span>
            </Link>
            <nav className="nav">
              <Link href="/dashboard">Dashboard</Link>
              <Link href="/upload">Upload</Link>
              <Link href="/api/health">API Health</Link>
            </nav>
          </header>
          <div className="shell-gradient" aria-hidden="true" />
          {children}
        </div>
      </body>
    </html>
  );
}
