import type { Metadata } from "next";
import { Orbitron } from "next/font/google";
import "./globals.css";

export const metadata: Metadata = {
  title: "F1 Sweepstake",
  description: "F1 Sweepstake Tracker",
};

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${orbitron.className}`}>
      <body>
        <div className="h-20 bg-red-600 text-white flex items-center justify-between px-4 ">
          <h1 className="font-bold text-2xl md:text-4xl ">F1 Sweepstake</h1>
        </div>
        {children}
      </body>
    </html>
  );
}
