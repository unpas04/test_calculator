import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "고독이의 원가계산기",
  description: "소상공인을 위한 메뉴 세트 원가 계산기 — 재료비, 인건비, 수수료까지 한눈에",
  keywords: ["원가계산기", "소상공인", "메뉴원가", "배달원가", "식당원가계산"],
  authors: [{ name: "Godogi" }],
  openGraph: {
    title: "고독이의 원가계산기",
    description: "소상공인을 위한 메뉴 세트 원가 계산기",
    url: "https://godogicalculator.vercel.app",
    siteName: "고독이의 원가계산기",
    locale: "ko_KR",
    type: "website",
  },
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-GK7DL033V8"
          strategy="afterInteractive"
        />
        <Script id="ga-init" strategy="afterInteractive">{`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-GK7DL033V8');
        `}</Script>
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
