'use client';

import { useEffect, useRef } from 'react';

// ══════════════════════════════════════════════════════════════════
// CONFIGURACIÓN DE LA RED NEURONAL
// ══════════════════════════════════════════════════════════════════
const NODE_COUNT = 55;        // cantidad de nodos
const MAX_DISTANCE = 180;     // distancia máxima para conectar
const NODE_SPEED = 0.35;      // velocidad de los nodos
const CONNECTION_OPACITY = 0.6;
const NODE_SIZE = 2;

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  pulse: number;
}

export default function MantenimientoPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = 0;
    let height = 0;

    // Ajustar tamaño al viewport
    const resize = () => {
      width = canvas.width = window.innerWidth * window.devicePixelRatio;
      height = canvas.height = window.innerHeight * window.devicePixelRatio;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
    };
    resize();
    window.addEventListener('resize', resize);

    // Crear nodos
    const nodes: Node[] = Array.from({ length: NODE_COUNT }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * NODE_SPEED * window.devicePixelRatio,
      vy: (Math.random() - 0.5) * NODE_SPEED * window.devicePixelRatio,
      pulse: Math.random() * Math.PI * 2,
    }));

    // Render loop
    const render = () => {
      // Fondo negro con un pelín de transparencia (crea trail effect)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
      ctx.fillRect(0, 0, width, height);

      const scaledMaxDist = MAX_DISTANCE * window.devicePixelRatio;

      // Actualizar posiciones
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];

        n.x += n.vx;
        n.y += n.vy;
        n.pulse += 0.02;

        // Rebote en los bordes
        if (n.x < 0 || n.x > width) n.vx *= -1;
        if (n.y < 0 || n.y > height) n.vy *= -1;

        // Clamp por las dudas
        n.x = Math.max(0, Math.min(width, n.x));
        n.y = Math.max(0, Math.min(height, n.y));
      }

      // Dibujar conexiones
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];

          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < scaledMaxDist) {
            const opacity = (1 - dist / scaledMaxDist) * CONNECTION_OPACITY;
            ctx.strokeStyle = `rgba(108, 0, 244, ${opacity})`;
            ctx.lineWidth = 0.6 * window.devicePixelRatio;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // Dibujar nodos
      for (const n of nodes) {
        const pulseSize = NODE_SIZE * (1 + Math.sin(n.pulse) * 0.4) * window.devicePixelRatio;

        // Glow exterior
        const gradient = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, pulseSize * 4);
        gradient.addColorStop(0, 'rgba(108, 0, 244, 0.9)');
        gradient.addColorStop(0.5, 'rgba(108, 0, 244, 0.3)');
        gradient.addColorStop(1, 'rgba(108, 0, 244, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(n.x, n.y, pulseSize * 4, 0, Math.PI * 2);
        ctx.fill();

        // Núcleo
        ctx.fillStyle = 'rgba(180, 130, 255, 1)';
        ctx.beginPath();
        ctx.arc(n.x, n.y, pulseSize, 0, Math.PI * 2);
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    // Limpiar el fondo al inicio
    ctx.fillStyle = 'rgba(0, 0, 0, 1)';
    ctx.fillRect(0, 0, width, height);

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <main className="relative min-h-screen bg-black overflow-hidden text-[var(--tenko-text-primary)]">

      {/* CANVAS DE LA RED NEURONAL */}
      <canvas
        ref={canvasRef}
        aria-hidden
        className="absolute inset-0 z-0 pointer-events-none"
      />

      {/* GLOW MORADO CENTRAL SUTIL */}
      <div
        aria-hidden
        className="absolute inset-0 z-0 pointer-events-none opacity-40"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(108,0,244,0.25) 0%, transparent 55%)',
          animation: 'pulse-glow 7s ease-in-out infinite',
        }}
      />

      {/* VIGNETTE SUAVE */}
      <div
        aria-hidden
        className="absolute inset-0 z-20 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 0%, transparent 40%, rgba(0,0,0,0.7) 85%, black 100%)',
        }}
      />

      {/* CONTENIDO CENTRAL */}
      <div className="relative z-40 min-h-screen flex items-center justify-center px-6">
        <div className="max-w-2xl text-center relative">
          {/* Fondo radial oscuro detrás del texto */}
          <div
            aria-hidden
            className="absolute inset-0 -z-10 blur-3xl"
            style={{
              background:
                'radial-gradient(ellipse at center, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.5) 50%, transparent 80%)',
              transform: 'scale(1.6)',
            }}
          />

          {/* Logo */}
          <div className="mb-8 flex items-center justify-center gap-3">
            <span
              className="font-[family-name:var(--font-unbounded)] text-5xl md:text-7xl font-black tracking-tighter text-[var(--tenko-text-primary)]"
              style={{
                textShadow:
                  '0 0 20px rgba(108,0,244,0.9), 0 0 45px rgba(108,0,244,0.6), 0 0 80px rgba(108,0,244,0.4)',
              }}
            >
              TENKO
            </span>
            <span className="text-[#6c00f4] text-3xl md:text-5xl font-mono">天狐</span>
          </div>

          {/* Badge mantenimiento */}
          <div className="inline-flex items-center gap-2 rounded-full bg-[#6c00f4]/15 border border-[#6c00f4]/50 px-4 py-2 mb-6 backdrop-blur-sm">
            <span className="h-2 w-2 rounded-full bg-[#6c00f4] animate-pulse" />
            <span className="font-mono text-[10px] tracking-[0.3em] text-[#6c00f4] font-bold">
              SISTEMA EN MANTENIMIENTO
            </span>
          </div>

          {/* Título */}
          <h1
            className="font-[family-name:var(--font-unbounded)] text-4xl md:text-6xl font-black uppercase tracking-tighter leading-[0.95] mb-6"
            style={{ textShadow: '0 4px 30px rgba(0,0,0,0.95)' }}
          >
            Estamos
            <br />
            <span className="text-[#6c00f4]">reconstruyendo</span>
          </h1>

          {/* Descripción */}
          <p className="font-[family-name:var(--font-space-grotesk)] text-base md:text-lg text-[var(--tenko-text-primary)]/60 mb-10 leading-relaxed max-w-xl mx-auto">
            Migrando todo el catálogo a una nueva fuente de streaming.
            <br />
            Volveremos pronto con mejor calidad y más títulos.
          </p>

          {/* Barra de progreso */}
          <div className="max-w-md mx-auto">
            <div className="flex justify-between items-center mb-2">
              <span className="font-mono text-[10px] tracking-widest text-[var(--tenko-text-primary)]/40">
                MIGRACIÓN EN PROGRESO
              </span>
              <span className="font-mono text-[10px] tracking-widest text-[#6c00f4] font-bold">
                EN CURSO
              </span>
            </div>
            <div className="h-1 w-full rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#6c00f4] to-[#a855f7]"
                style={{
                  width: '40%',
                  animation: 'progress-slide 3s ease-in-out infinite',
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ESTILOS GLOBALES */}
      <style jsx global>{`
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.35; transform: scale(1); }
          50%      { opacity: 0.55; transform: scale(1.06); }
        }
        @keyframes progress-slide {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
        body {
          overflow: hidden;
          background: black;
        }
      `}</style>

    </main>
  );
}
