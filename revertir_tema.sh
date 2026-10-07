#!/bin/bash
# Script para desactivar el modo día/noche y volver al tema oscuro original

echo "Desactivando modo día/noche..."

# 1. Eliminar theme.ts
rm -f src/lib/theme.ts

# 2. Revertir globals.css
cat > src/app/globals.css << 'CSSEOF'
@import "tailwindcss";

@layer base {
  :root {
    --background: #09090b;
    --foreground: #f4f4f5;
  }

  body {
    background-color: var(--background);
    color: var(--foreground);
    font-family: var(--font-geist-sans), system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    overflow-x: hidden;
  }
}

::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: #09090b;
}

::-webkit-scrollbar-thumb {
  background: #27272a;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #3f3f46;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in {
  animation: fadeIn 0.3s ease-out forwards;
}

@keyframes marquee {
  0% {
    transform: translateX(0%);
  }
  100% {
    transform: translateX(-50%);
  }
}

.animate-marquee {
  animation: marquee 30s linear infinite;
}

.animate-marquee:hover {
  animation-play-state: paused;
}
CSSEOF

# 3. Revertir layout.tsx
cat > src/app/layout.tsx << 'LTE'
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import Header from '@/components/Header';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'TENKO',
  description: 'Plataforma de streaming de anime',
  keywords: ['Anime', 'Stream', 'TENKO'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}>
      <body className="min-h-screen flex flex-col bg-zinc-950 text-zinc-100 selection:bg-blue-600 selection:text-white">
        <Header />
        <div className="flex-grow flex flex-col">{children}</div>
      </body>
    </html>
  );
}
LTE

# 4. Revertir Header (eliminar import de theme)
sed -i '/import.*theme/d' src/components/Header.tsx
sed -i '/useState.*Theme/d' src/components/Header.tsx
sed -i '/toggleTheme/d' src/components/Header.tsx
sed -i '/Cambiar tema/d' src/components/Header.tsx
sed -i '/theme === .dark. ? .Light. : .Dark./d' src/components/Header.tsx

# 5. Revertir page.tsx (fondo oscuro)
sed -i 's/bg-\[var(--background)\]/bg-zinc-950/g' src/app/page.tsx
sed -i 's/bg-zinc-200 dark:bg-zinc-900/bg-zinc-900/g' src/app/page.tsx
sed -i 's/text-zinc-900 dark:text-white/text-white/g' src/app/page.tsx
sed -i 's/text-zinc-600 dark:text-zinc-400/text-zinc-400/g' src/app/page.tsx
sed -i 's/border-zinc-300 dark:border-zinc-800/border-zinc-800/g' src/app/page.tsx

echo "Tema oscuro restaurado."
