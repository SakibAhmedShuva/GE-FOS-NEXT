import "./css/style.css";
import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const plusJakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-plus-jakarta", display: "swap" });

export const metadata: Metadata = {
  title: "Financial Offer System",
  description: "Next.js + Node.js replacement for Financial Offer, Challan, Purchase Order, catalog, reviews, notifications, chat, and migration workflows.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${plusJakarta.variable} bg-slate-100 font-inter text-slate-950 antialiased`}>
        {children}
      </body>
    </html>
  );
}
