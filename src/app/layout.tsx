/* eslint-disable @next/next/no-page-custom-font */
import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  variable: "--font-manrope",
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
    <html lang="bg" className={manrope.variable}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-background font-body text-on-surface antialiased selection:bg-primary-fixed selection:text-on-primary-fixed-variant">
        {children}
      </body>
    </html>
  );
}
