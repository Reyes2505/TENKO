'use client';

import { useEffect, useRef, useState } from 'react';

interface LogEntry {
  id: number;
  type: 'input' | 'output' | 'error' | 'system';
  text: string;
}

export default function TerminalPage() {
  const [logs, setLogs] = useState<LogEntry[]>([
    { id: 1, type: 'system', text: 'TENKO Terminal v1.0.0 — Sistema inicializado.' },
    { id: 2, type: 'system', text: 'Comandos disponibles: help, sync, scrape, clear' },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const ejecutar = async () => {
    if (!input.trim() || busy) return;
    const cmd = input.trim();

    setLogs(prev => [...prev, { id: Date.now(), type: 'input', text: `$ ${cmd}` }]);
    setInput('');
    setBusy(true);

    try {
      if (cmd === 'clear') {
        setLogs([{ id: Date.now(), type: 'system', text: 'Consola limpiada.' }]);
      } else if (cmd === 'help') {
        setLogs(prev => [...prev, {
          id: Date.now(),
          type: 'output',
          text: 'Comandos: help, sync, scrape, clear',
        }]);
      } else if (cmd.startsWith('sync')) {
        setLogs(prev => [...prev, { id: Date.now(), type: 'system', text: 'Ejecutando sincronización con AniList...' }]);
        const res = await fetch('/api/anilist-sync', { method: 'POST' });
        const data = await res.json();
        setLogs(prev => [...prev, { id: Date.now(), type: 'output', text: JSON.stringify(data, null, 2) }]);
      } else if (cmd.startsWith('scrape')) {
        setLogs(prev => [...prev, { id: Date.now(), type: 'system', text: 'Disparando scraping...' }]);
        const res = await fetch('/api/admin/scrape', { method: 'POST' });
        const data = await res.json();
        setLogs(prev => [...prev, { id: Date.now(), type: 'output', text: JSON.stringify(data, null, 2) }]);
      } else {
        setLogs(prev => [...prev, { id: Date.now(), type: 'error', text: `Comando no reconocido: ${cmd}` }]);
      }
    } catch (err: any) {
      setLogs(prev => [...prev, { id: Date.now(), type: 'error', text: `Error: ${err.message}` }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-black text-[#6c00f4] font-mono p-4 sm:p-6 pb-20 selection:bg-[#6c00f4]/30 selection:text-white">
      <div className="max-w-5xl mx-auto">
        <div className="rounded-2xl border border-[#6c00f4]/30 bg-[var(--tenko-bg-page)] shadow-2xl shadow-[#6c00f4]/10 overflow-hidden">
          {/* Barra superior tipo terminal */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-[#6c00f4]/20 bg-black/60">
            <div className="w-3 h-3 rounded-full bg-red-500/70" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
            <div className="w-3 h-3 rounded-full bg-[#6c00f4]/80" />
            <span className="ml-4 font-mono text-[10px] tracking-widest text-[var(--tenko-text-muted)]">
              TENKO@ADMIN:~$ terminal
            </span>
          </div>

          {/* Logs */}
          <div className="p-4 sm:p-6 h-[65vh] overflow-y-auto space-y-1.5 text-sm">
            {logs.map((log) => (
              <div
                key={log.id}
                className={`whitespace-pre-wrap leading-relaxed ${
                  log.type === 'input' ? 'text-white' :
                  log.type === 'error' ? 'text-red-400' :
                  log.type === 'system' ? 'text-amber-400/90' :
                  'text-[#6c00f4]/80'
                }`}
              >
                {log.text}
              </div>
            ))}
            <div ref={endRef} />
          </div>

          {/* Input */}
          <div className="border-t border-[#6c00f4]/20 p-4 flex gap-2 bg-black/60">
            <span className="text-[#6c00f4] font-mono text-sm self-center">$</span>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && ejecutar()}
              placeholder="Escribe un comando... (help)"
              disabled={busy}
              className="flex-1 bg-transparent text-[var(--tenko-text-primary)] placeholder-white/30 outline-none text-sm font-mono"
            />
            <button
              onClick={ejecutar}
              disabled={busy || !input.trim()}
              className="px-4 py-2 bg-[#6c00f4]/20 border border-[#6c00f4]/40 text-[#6c00f4] hover:bg-[#6c00f4] hover:text-[var(--tenko-text-primary)] transition-all rounded-md text-[10px] font-bold tracking-widest uppercase disabled:opacity-50"
            >
              {busy ? 'EJECUTANDO...' : 'EJECUTAR'}
            </button>
          </div>
        </div>

        <div className="mt-4 font-mono text-[10px] tracking-widest text-[var(--tenko-text-muted)] text-center">
          // COMANDOS: help · sync · scrape · clear
        </div>
      </div>
    </main>
  );
}
