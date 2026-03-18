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
  description: "배달 수수료, 카드 수수료, 인건비까지 포함한 메뉴 원가를 한 번에 계산하세요. 소상공인·식당 사장님을 위한 무료 세트 메뉴 원가 계산기",
  keywords: [
    "메뉴 원가 계산기",
    "배달 수수료 포함 원가 계산",
    "소상공인 메뉴 원가율",
    "음식점 실수익 계산기",
    "세트 메뉴 원가 계산",
    "음식 원가 계산기",
    "외식업 원가 계산기",
    "레시피 원가 계산기",
    "배달앱 수수료 원가율",
    "식당 원가율 계산",
    "인건비 포함 원가 계산",
    "카드 수수료 포함 마진 계산",
  ],
  authors: [{ name: "Godogi" }],
  verification: {
    google: "Gaxp9t_DzwZ7Rcs8ALCLM5OLWR7YVW_Ebe7E841nOVg",
  },
  openGraph: {
    title: "고독이의 원가계산기",
    description: "배달 수수료, 카드 수수료, 인건비까지 포함한 메뉴 원가를 한 번에 계산하세요. 소상공인·식당 사장님을 위한 무료 세트 메뉴 원가 계산기",
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
