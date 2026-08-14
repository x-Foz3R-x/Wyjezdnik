import "~/styles/globals.css";

import { type Metadata } from "next";
import {
  Architects_Daughter,
  Bricolage_Grotesque,
  Inconsolata,
  Nunito_Sans,
} from "next/font/google";
import type { Viewport } from "next";
import { Suspense } from "react";
import { NavigationFeedback } from "~/components/navigation-feedback";
import { PwaProvider } from "~/components/pwa/pwa-provider";
import { MotionProvider } from "~/providers/motion-provider";

const fontHeading = Bricolage_Grotesque({
  subsets: ["latin", "latin-ext"],
  variable: "--font-heading",
});

const fontBody = Nunito_Sans({
  subsets: ["latin", "latin-ext"],
  variable: "--font-body",
});

const fontMono = Inconsolata({
  subsets: ["latin", "latin-ext"],
  variable: "--font-mono",
});

const fontNote = Architects_Daughter({
  subsets: ["latin", "latin-ext"],
  weight: "400",
  variable: "--font-note",
});

export const metadata: Metadata = {
  applicationName: "Wyjezdnik",
  title: "Wyjezdnik",
  description: "Baza wyjazdu i organizacja w jednym miejscu.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/favicon.png", sizes: "512x512", type: "image/png" }],
  },
  formatDetection: { telephone: false },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Wyjezdnik",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  interactiveWidget: "resizes-visual",
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="pl"
      className={`${fontHeading.variable} ${fontBody.variable} ${fontMono.variable} ${fontNote.variable} dark`}
    >
      <body className="bg-theme-bg font-body text-theme-text selection:bg-theme-primary/30 relative min-h-dvh overflow-x-hidden antialiased">
        <div className="pointer-events-none fixed inset-0 -z-10">
          <div className="bg-theme-primary/10 absolute top-[-10%] left-[-20%] h-[50vh] w-[70vw] rounded-full blur-[100px]" />

          <div className="bg-theme-accent/15 absolute right-[-10%] bottom-[-20%] h-[40vh] w-[60vw] rounded-full blur-[120px]" />

          <div className="via-theme-bg/50 to-theme-bg absolute inset-0 bg-linear-to-b from-transparent" />
        </div>

        <PwaProvider>
          <MotionProvider>
            <Suspense fallback={null}>
              <NavigationFeedback />
            </Suspense>
            <main className="relative z-10 mx-auto min-h-dvh w-full max-w-md">{children}</main>
          </MotionProvider>
        </PwaProvider>
      </body>
    </html>
  );
}
