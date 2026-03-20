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

const BASE_URL = 'https://godogicalculator.vercel.app'

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
  metadataBase: new URL(BASE_URL),
  verification: {
    google: "Gaxp9t_DzwZ7Rcs8ALCLM5OLWR7YVW_Ebe7E841nOVg",
  },
  openGraph: {
    title: "고독이의 원가계산기",
    description: "배달 수수료, 카드 수수료, 인건비까지 포함한 메뉴 원가를 한 번에 계산하세요. 소상공인·식당 사장님을 위한 무료 세트 메뉴 원가 계산기",
    url: BASE_URL,
    siteName: "고독이의 원가계산기",
    locale: "ko_KR",
    type: "website",
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: '고독이의 원가계산기 — 우리 메뉴, 진짜로 남는 장사일까요?',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '고독이의 원가계산기',
    description: '배달 수수료, 카드 수수료, 인건비까지 포함한 메뉴 원가를 한 번에 계산하세요.',
    images: ['/opengraph-image'],
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-48.png', sizes: '48x48', type: 'image/png' },
    ],
    apple: '/favicon-192.png',
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
        {process.env.NEXT_PUBLIC_KAKAO_JS_KEY && (
          <>
            <Script
              src="https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js"
              integrity="sha384-TiCUE00h649CAMonG018J2ujOgDKW/kVWlChEuu4jK2vxfAAD0eZxzCKakxg55G4"
              crossOrigin="anonymous"
              strategy="afterInteractive"
            />
            <Script id="kakao-init" strategy="afterInteractive">{`
              if (window.Kakao && !window.Kakao.isInitialized()) {
                window.Kakao.init('${process.env.NEXT_PUBLIC_KAKAO_JS_KEY}');
              }
            `}</Script>
          </>
        )}
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
