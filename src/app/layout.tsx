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
  title: "Lab Buddies - Student Room Sharing",
  description: "Instantly share code snippets, notes, files, terminal outputs, and links with classmates using a simple Room PIN. No login required.",
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
        <meta name="theme-color" content="#FFD600" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="LabBuddies" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body
        className={`${archivoBlack.variable} ${inter.variable} font-sans antialiased bg-cream text-neo-dark min-h-full flex flex-col`}
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
