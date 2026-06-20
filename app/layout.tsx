import "./css/style.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Financial Offer System",
  description: "Next.js + Node.js replacement for Financial Offer, Challan, Purchase Order, catalog, reviews, notifications, chat, and migration workflows.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-100 font-inter text-slate-950 antialiased">
        {children}
      </body>
    </html>
  );
}
