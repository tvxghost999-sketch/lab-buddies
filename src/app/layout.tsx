import type { Metadata } from "next";
import { Archivo_Black, Inter } from "next/font/google";
import "./globals.css";
import QueryProvider from "@/providers/queryProvider";
import { ToastContainer } from "@/components/ui/toast";
import TermsConsentModal from "@/components/TermsConsentModal";
import PWARegister from "@/components/PWARegister";
import ConfirmModal from "@/components/ConfirmModal";

const archivoBlack = Archivo_Black({
  weight: "400",
  variable: "--font-archivo-black",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lab Buddies — Share Files & Code with No Login | Student Room Sharing",
  description: "Lab Buddies is a secure, no login temporary study room workspace for students. Share files, code snippets, notes, and links instantly using a simple 6-digit room PIN.",
  metadataBase: new URL("https://lab-buddies-bme8.onrender.com"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Lab Buddies — Share Files & Code with No Login | Student Room Sharing",
    description: "Lab Buddies is a secure, no login temporary study room workspace for students. Share files, code snippets, notes, and links instantly using a simple 6-digit room PIN.",
    url: "https://lab-buddies-bme8.onrender.com",
    siteName: "Lab Buddies",
    type: "website",
    images: [
      {
        url: "/logo.png",
        width: 800,
        height: 400,
        alt: "Lab Buddies logo - anonymous student file sharing platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Lab Buddies — Share Files & Code with No Login | Student Room Sharing",
    description: "Lab Buddies is a secure, no login temporary study room workspace for students. Share files, code snippets, notes, and links instantly using a simple 6-digit room PIN.",
    images: ["/logo.png"],
  },
  icons: {
    icon: "/icon-192.png",
    shortcut: "/icon-192.png",
    apple: "/icon-192.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full scroll-smooth">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#050608" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="LabBuddies" />
        <link rel="icon" href="/icon-192.png" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body
        className={`${archivoBlack.variable} ${inter.variable} font-sans antialiased bg-[#050608] text-[#f4f4f5] min-h-full flex flex-col`}
      >
        <QueryProvider>
          {children}
          <ToastContainer />
          <TermsConsentModal />
          <PWARegister />
          <ConfirmModal />
        </QueryProvider>
      </body>
    </html>
  );
}
