import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

export const dynamic = "force-dynamic";

// const geistSans = Geist({
//   variable: "--font-geist-sans",
//   subsets: ["latin"],
// });

// const geistMono = Geist_Mono({
//   variable: "--font-geist-mono",
//   subsets: ["latin"],
// });

// export const metadata: Metadata = {
//   title: "ZEA | Protocol Command Center",
//   description: "Unified administrative interface for ZEA Protocol governance and infrastructure monitoring.",
// };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <head>
        <title>ZEA | Protocol Command Center</title>
        <meta name="description" content="Unified administrative interface for ZEA Protocol governance and infrastructure monitoring." />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
