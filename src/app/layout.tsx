import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TENKO AI - Santuario de Anime",
  description: "Plataforma comunitaria de anime, calendarios, tendencias y shorts.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || "";
  const isMaintenance = pathname.startsWith("/mantenimiento");

  return (
    <html lang="es" className="dark">
      <body className={`${inter.className} bg-black text-white min-h-screen flex flex-col selection:bg-purple-500 selection:text-white`}>
        {!isMaintenance && <Header />}
        <main className="flex-1">{children}</main>
        {!isMaintenance && <Footer />}
      </body>
    </html>
  );
}
