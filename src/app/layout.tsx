import type { Metadata } from "next";
import { Suspense } from "react";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";

import { AuthProvider } from "@/components/auth/AuthProvider";
import { ToastProvider } from "@/components/ui/toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TopProgressBar } from "@/components/ui/top-progress";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "KR Restaurant — POS & Management",
    template: "%s — KR Restaurant",
  },
  description: "Restaurant POS and Management System for KR Restaurant.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[hsl(var(--background))] font-sans text-[hsl(var(--foreground))]">
        <Suspense fallback={null}>
          <TopProgressBar />
        </Suspense>
        <AuthProvider>
          <TooltipProvider delayDuration={150} skipDelayDuration={120}>
            <ToastProvider>{children}</ToastProvider>
          </TooltipProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
