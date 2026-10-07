import type { Metadata } from "next";
import { Unbounded, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import HeaderWrapper from "@/components/HeaderWrapper";
import { ThemeProvider } from "@/components/ThemeProvider";

const unbounded = Unbounded({
  subsets: ["latin"],
  variable: "--font-unbounded",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "TENKO // 天狐",
  description: "Streaming de anime, simulcasts y descubrimiento con IA.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${unbounded.variable} ${spaceGrotesk.variable} ${jetbrains.variable} bg-[var(--tenko-bg-page)] text-[var(--tenko-text-primary)] antialiased`}
      >
        <ThemeProvider>
          <HeaderWrapper />
          <main className="min-h-screen pt-20">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
