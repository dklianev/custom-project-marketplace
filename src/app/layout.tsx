import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  variable: "--font-manrope",
});

const materialSymbolsOutlined = localFont({
  src: "./fonts/material-symbols-outlined.woff2",
  variable: "--font-material-symbols-outlined",
  weight: "100 700",
  display: "block",
});

export const metadata: Metadata = {
  title: "Atelier — AI платформа за проверени професионалисти",
  description: "Премиум AI-воден marketplace за заявки, оферти, защитени плащания и доверени професионалисти.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="bg" className={`${manrope.variable} ${materialSymbolsOutlined.variable}`}>
      <body className="bg-background font-body text-on-surface antialiased selection:bg-primary-fixed selection:text-on-primary-fixed-variant">
        {children}
      </body>
    </html>
  );
}
