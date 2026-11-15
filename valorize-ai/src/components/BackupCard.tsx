import React, { useRef, useState } from 'react';
import { Download, Upload, ShieldAlert, FileSpreadsheet } from 'lucide-react';
import { createBackup, parseBackup, restoreBackup, describeBackup, parsePortfolioCsv, importPortfolioPositions } from '../lib/backup';
import { downloadText } from '../lib/valuation';

/**
 * Backup dos dados: leva conta, carteira e preferências para outro aparelho ou outro
 * endereço do app (ex.: da versão no Netlify para a nova na Vercel).
 */
export const BackupCard: React.FC = () => {
  const fileRef = useRef<HTMLInputElement>(null);
  const csvRef = useRef<HTMLInputElement>(null);

  const importCsv = async (file: File) => {
    setMsg(null);
    try {
      const positions = parsePortfolioCsv(await file.text());
      const ok = window.confirm(
        `Importar ${positions.length} posição(ões) da planilha?\n\n` +
        positions.map(p => `• ${p.ticker}: ${p.quantity} ações`).join('\n') +
        '\n\nAções que já estão na carteira serão atualizadas com os dados da planilha.',
      );
      if (!ok) return;
      importPortfolioPositions(positions);
      setMsg({ type: 'ok', text: 'Carteira importada. Recarregando…' });
      setTimeout(() => window.location.reload(), 600);
    } catch (e: any) {
      setMsg({ type: 'err', text: e?.message || 'Não foi possível ler a planilha.' });
    } finally {
      if (csvRef.current) csvRef.current.value = '';
    }
  };
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const exportData = () => {
    try {
      const b = createBackup();
      downloadText(`valorize-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(b, null, 2), 'application/json');
      const d = describeBackup(b);
      setMsg({ type: 'ok', text: `Backup baixado: ${d.positions} posição(ões) na carteira e ${d.accounts} conta(s).` });
    } catch {
      setMsg({ type: 'err', text: 'Não foi possível gerar o backup neste navegador.' });
    }
  };

  const importData = async (file: File) => {
    setMsg(null);
    try {
      const backup = parseBackup(await file.text());
      const d = describeBackup(backup);
      const when = d.exportedAt && !isNaN(d.exportedAt.getTime()) ? ` de ${d.exportedAt.toLocaleString('pt-BR')}` : '';
      const ok = window.confirm(
        `Importar o backup${when}?\n\n• ${d.positions} posição(ões) na carteira\n• ${d.accounts} conta(s)\n\n` +
        'Os dados atuais deste aparelho serão substituídos.',
      );
      if (!ok) return;
      restoreBackup(backup);
      setMsg({ type: 'ok', text: 'Dados importados. Recarregando…' });
      setTimeout(() => window.location.reload(), 600);
    } catch (e: any) {
      setMsg({ type: 'err', text: e?.message || 'Não foi possível ler o arquivo.' });
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <section className="bg-white data-grid-border rounded-xl p-5 shadow-sm" aria-labelledby="backup-title">
      <h3 id="backup-title" className="font-serif italic text-lg text-zinc-900">Backup dos meus dados</h3>
      <p className="text-xs text-zinc-600 mt-1 max-w-2xl">
        Seus dados (conta, carteira, alertas e preferências) ficam só neste navegador e neste endereço do app.
        Exporte para guardar uma cópia ou levar para outro aparelho ou endereço, e importe lá.
        Também dá para importar a planilha baixada pelo botão "Excel" da Carteira.
      </p>
      <div className="flex flex-wrap gap-2 mt-4">
        <button onClick={exportData}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold">
          <Download className="w-4 h-4" /> Exportar meus dados
        </button>
        <button onClick={() => fileRef.current?.click()}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-xs font-semibold">
          <Upload className="w-4 h-4" /> Importar backup
        </button>
        <button onClick={() => csvRef.current?.click()}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-xs font-semibold">
          <FileSpreadsheet className="w-4 h-4" /> Importar carteira do Excel
        </button>
        <input ref={csvRef} type="file" accept=".csv,text/csv" className="hidden" aria-label="Planilha da carteira"
          onChange={e => { const f = e.target.files?.[0]; if (f) importCsv(f); }} />
        <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" aria-label="Arquivo de backup"
          onChange={e => { const f = e.target.files?.[0]; if (f) importData(f); }} />
      </div>
      {msg && (
        <p role="status" className={`text-xs mt-3 ${msg.type === 'ok' ? 'text-emerald-700' : 'text-rose-600'}`}>{msg.text}</p>
      )}
      <p className="flex items-start gap-1.5 text-[11px] text-zinc-500 mt-3">
        <ShieldAlert className="w-3.5 h-3.5 mt-px shrink-0" />
        O arquivo contém seus dados pessoais e a carteira (a senha vai só como hash). Guarde-o em local seguro e não compartilhe.
      </p>
    </section>
  );
};
