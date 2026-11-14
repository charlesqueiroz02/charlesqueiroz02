import React, { useEffect, useState } from 'react';
import { Download, Share, PlusSquare, X, WifiOff } from 'lucide-react';

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

/**
 * Botão "Instalar app": cria o atalho com ícone na tela inicial / área de trabalho.
 * - Android/Chrome/Edge: abre a janela nativa de instalação.
 * - iPhone/iPad (Safari): mostra o passo a passo (Compartilhar → Adicionar à Tela de Início).
 * - Já instalado: o botão some.
 */
export const InstallApp: React.FC = () => {
  const [prompt, setPrompt] = useState<any>(null);
  const [installed, setInstalled] = useState(isStandalone());
  const [showIOS, setShowIOS] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => { e.preventDefault(); setPrompt(e); };
    const onInstalled = () => { setInstalled(true); setPrompt(null); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (installed) return null;

  const click = async () => {
    if (prompt) {
      prompt.prompt();
      const { outcome } = await prompt.userChoice;
      if (outcome === 'accepted') setInstalled(true);
      setPrompt(null);
    } else if (isIOS()) setShowIOS(true);
    else setShowHelp(true);
  };

  return (
    <>
      <button
        onClick={click}
        className="flex items-center gap-1.5 px-2.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold"
        title="Criar atalho do Valorize na tela inicial"
      >
        <Download className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Instalar app</span>
      </button>

      {(showIOS || showHelp) && (
        <div className="fixed inset-0 z-[70] bg-zinc-950/40 flex items-end sm:items-center justify-center" onClick={() => { setShowIOS(false); setShowHelp(false); }}>
          <div role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}
            className="w-full sm:max-w-sm bg-white rounded-t-2xl sm:rounded-2xl p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-xl">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <img src="/icons/icon-96.png" alt="" className="w-12 h-12 rounded-xl" />
                <div>
                  <div className="font-bold text-zinc-950">Instalar o Valorize</div>
                  <div className="text-xs text-zinc-500">Abre como app, com ícone próprio</div>
                </div>
              </div>
              <button onClick={() => { setShowIOS(false); setShowHelp(false); }} className="p-1.5 rounded hover:bg-zinc-100" aria-label="Fechar"><X className="w-4 h-4" /></button>
            </div>

            {showIOS ? (
              <ol className="space-y-3 text-sm text-zinc-700">
                <li className="flex items-center gap-3"><span className="w-6 h-6 rounded-full bg-zinc-950 text-white text-xs font-bold flex items-center justify-center shrink-0">1</span>
                  Toque em <Share className="w-4 h-4 inline text-blue-600" /> <b>Compartilhar</b> na barra do Safari.</li>
                <li className="flex items-center gap-3"><span className="w-6 h-6 rounded-full bg-zinc-950 text-white text-xs font-bold flex items-center justify-center shrink-0">2</span>
                  Escolha <PlusSquare className="w-4 h-4 inline" /> <b>Adicionar à Tela de Início</b>.</li>
                <li className="flex items-center gap-3"><span className="w-6 h-6 rounded-full bg-zinc-950 text-white text-xs font-bold flex items-center justify-center shrink-0">3</span>
                  Confirme em <b>Adicionar</b>. O ícone aparece junto dos seus apps.</li>
              </ol>
            ) : (
              <ol className="space-y-3 text-sm text-zinc-700">
                <li className="flex gap-3"><span className="w-6 h-6 rounded-full bg-zinc-950 text-white text-xs font-bold flex items-center justify-center shrink-0">1</span>
                  No Chrome ou Edge, clique no ícone de instalar na barra de endereço (ou menu ⋮ → <b>Instalar Valorize</b>).</li>
                <li className="flex gap-3"><span className="w-6 h-6 rounded-full bg-zinc-950 text-white text-xs font-bold flex items-center justify-center shrink-0">2</span>
                  No Android: menu ⋮ → <b>Adicionar à tela inicial</b>.</li>
              </ol>
            )}
            <p className="text-[11px] text-zinc-500 mt-4 border-t border-zinc-100 pt-3">
              Depois da primeira visita com internet, o atalho abre o app mesmo offline, com as últimas cotações consultadas.
            </p>
          </div>
        </div>
      )}
    </>
  );
};

/** Aviso discreto quando a conexão cai: o app segue com os dados salvos. */
export const OfflineBanner: React.FC = () => {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false);
    window.addEventListener('online', on); window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  if (online) return null;
  return (
    <div role="status" className="mb-6 p-3 bg-zinc-900 text-zinc-100 rounded-xl text-xs flex items-center gap-2.5">
      <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
      Você está sem internet. Mostrando os dados da última conexão; a análise por IA volta quando reconectar.
    </div>
  );
};
