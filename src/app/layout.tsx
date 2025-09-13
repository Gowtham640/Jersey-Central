import "./globals.css";
import { Geist, Geist_Mono, Roboto, Work_Sans } from "next/font/google";
import type { Metadata } from "next";
import Providers from "./providers"; 

// Fonts
const roboto = Roboto({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});
const sans = Work_Sans({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Jersey Central",
  description: "An online jersey store",
  icons: {
    icon: "/jclogo.png",   
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${roboto.variable} ${sans.variable} antialiased`}
      >
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
