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
  title: {
    default: "Lab Buddies — Share Files & Code Snippets with No Login | Snapdrop & AirDrop Alternative",
    template: "%s | Lab Buddies"
  },
  description: "Free, instant, no-login study workspace for students. Share code snippets, lab files, lecture notes, terminal outputs, and live chat across Android, iPhone, Windows, Mac, and Linux using a simple 6-digit Room PIN. Best Snapdrop, Sharedrop, and WeTransfer alternative.",
  keywords: [
    "Snapdrop alternative",
    "Sharedrop alternative",
    "AirDrop for Windows and Android",
    "AirDrop alternative",
    "Pastebin alternative with code and files",
    "Wormhole file transfer alternative",
    "WeTransfer alternative for students",
    "temporary file sharing",
    "share code without login",
    "ephemeral study room",
    "anonymous file sharing",
    "classroom lab file transfer",
    "cross-platform file share",
    "send files between phone and laptop",
    "free study room PIN",
    "real-time lab attendance tracker",
    "self destructing file share"
  ],
  authors: [{ name: "Lab Buddies Team", url: "https://labbuddies.hariommodi.online" }],
  creator: "Lab Buddies",
  publisher: "Lab Buddies",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://labbuddies.hariommodi.online"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Lab Buddies — Share Files & Code Snippets with No Login",
    description: "Instant, temporary study rooms for students. Share files, code snippets, notes, and links anonymously with a 6-digit Room PIN.",
    url: "https://labbuddies.hariommodi.online",
    siteName: "Lab Buddies",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/logo.png?v=3",
        width: 1200,
        height: 630,
        alt: "Lab Buddies - Free No-Login File & Code Sharing Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Lab Buddies — Share Files & Code with No Login | Snapdrop Alternative",
    description: "Instant ephemeral study rooms for students. Share files, code snippets, notes, and links anonymously with a 6-digit Room PIN.",
    images: ["/logo.png?v=3"],
    creator: "@labbuddies",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: "/icon-192.png?v=3",
    shortcut: "/icon-192.png?v=3",
    apple: "/icon-192.png?v=3",
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
