import type { Metadata, Viewport } from "next";
import { DM_Sans, Syne } from "next/font/google";
import { Toaster } from "sonner";
import { Navbar } from "@/components/navbar";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "JobSwipe — UK Cyber Security jobs",
  description:
    "Swipe UK cyber security roles. Save favourites, generate tailored cover letters, and apply.",
};

export const viewport: Viewport = {
  themeColor: "#fff5f8",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-GB">
      <body
        className={`${dmSans.variable} ${syne.variable} min-h-screen antialiased`}
      >
        <Navbar />
        {children}
        <Toaster
          theme="light"
          position="bottom-center"
          toastOptions={{
            className: "border border-pink-200 bg-white text-pink-950",
          }}
        />
      </body>
    </html>
  );
}
