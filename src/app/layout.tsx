import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TENKO AI - Santuario de Anime",
  description: "Plataforma comunitaria de anime, calendarios, tendencias y shorts.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark">
      <body className={`${inter.className} bg-black text-white min-h-screen flex flex-col selection:bg-purple-500 selection:text-white`}>
        {/* Cabecera global con indicador de página y modo claro/oscuro */}
        <Header />

        {/* Contenido principal de cada página */}
        <main className="flex-1">
          {children}
        </main>

        {/* Pie de página con Términos, Cookies y Banner legal */}
        <Footer />
      </body>
    </html>
  );
}
