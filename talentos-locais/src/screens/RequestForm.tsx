import { Camera, X } from 'lucide-react';
import { useState } from 'react';
import { Check } from './Auth';
import { Avatar, Button, Field, Notice, TopBar, inputCls, toast, useAction } from '../components/ui';
import { createRequest } from '../data/actions';
import { useStore } from '../data/store';
import { go } from '../lib/router';
import { compressImage } from '../lib/utils';

export function RequestForm({ proId }: { proId?: string }) {
  const { db, me } = useStore();
  const pro = proId ? db.pros.find((p) => p.id === proId) : undefined;
  const [f, setF] = useState({
    title: '', description: '', details: '', category: pro?.categories[0] ?? '', neighborhood: me!.neighborhood, city: me!.city,
    preferredDate: '', urgent: false, publicBoard: !pro, photos: [] as string[],
  });
  const { busy, run } = useAction();
  const region = db.regions.find((r) => r.city === f.city);

  const addPhotos = async (files: FileList | null) => {
    if (!files) return;
    const list = [...files].slice(0, 4 - f.photos.length);
    try {
      const imgs = await Promise.all(list.map((x) => compressImage(x, 800, 0.7)));
      setF((s) => ({ ...s, photos: [...s.photos, ...imgs] }));
    } catch (e) {
      toast((e as Error).message, 'err');
    }
  };

  return (
    <div>
      <TopBar title={pro ? 'Solicitar orçamento' : 'Publicar necessidade'} back={true} />
      <form
        className="space-y-4 px-4 py-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const id = await run(() => createRequest({ ...f, proIds: pro ? [pro.id] : [] }), pro ? 'Solicitação enviada!' : 'Necessidade publicada no Mural!');
          if (id) go(`/solicitacao/${id}`);
        }}
      >
        {pro && (
          <div className="flex items-center gap-3 rounded-2xl border border-line bg-white p-3">
            <Avatar name={pro.displayName} hue={pro.avatarHue} photo={pro.photo} size={40} />
            <div>
              <p className="text-xs text-muted">Para</p>
              <p className="font-bold">{pro.displayName}</p>
            </div>
          </div>
        )}
        <Field label="O que você precisa?" hint="Um título curto. Ex.: Consertar portão de correr">
          <input className={inputCls} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
        </Field>
        <Field label="Categoria">
          <select className={inputCls} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
            <option value="">Escolha…</option>
            {db.categories.filter((c) => c.active).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Explique o problema">
          <textarea className={inputCls} rows={4} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="O que aconteceu, o que você espera do serviço…" />
        </Field>
        <Field label="Medidas, quantidades ou características (opcional)">
          <input className={inputCls} value={f.details} onChange={(e) => setF({ ...f, details: e.target.value })} placeholder="Ex.: portão de 3 m, 2 folhas" />
        </Field>
        <div>
          <p className="mb-2 text-sm font-semibold">Fotos (até 4, opcional)</p>
          <div className="flex flex-wrap gap-2">
            {f.photos.map((p, i) => (
              <div key={i} className="relative">
                <img src={p} alt={`Foto ${i + 1}`} className="size-20 rounded-xl object-cover" />
                <button type="button" aria-label="Remover foto" onClick={() => setF({ ...f, photos: f.photos.filter((_, k) => k !== i) })} className="absolute -top-1.5 -right-1.5 rounded-full bg-ink p-0.5 text-white">
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
            {f.photos.length < 4 && (
              <label className="grid size-20 cursor-pointer place-items-center rounded-xl border-2 border-dashed border-line bg-white text-muted">
                <Camera className="size-6" />
                <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => addPhotos(e.target.files)} />
              </label>
            )}
          </div>
          <p className="mt-1 text-xs text-muted">Removemos a localização gravada nas fotos antes de enviar.</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Bairro (aproximado)" hint="O endereço completo só é compartilhado depois, se você quiser.">
            <select className={inputCls} value={f.neighborhood} onChange={(e) => setF({ ...f, neighborhood: e.target.value })}>
              {!region?.neighborhoods.includes(f.neighborhood) && <option>{f.neighborhood}</option>}
              {region?.neighborhoods.map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </Field>
          <Field label="Data desejada">
            <input type="date" className={inputCls} value={f.preferredDate} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setF({ ...f, preferredDate: e.target.value })} />
          </Field>
        </div>
        <div className="space-y-2.5 rounded-2xl bg-white p-4 text-sm">
          <Check checked={f.urgent} onChange={(v) => setF({ ...f, urgent: v })}>
            É urgente
          </Check>
          <Check checked={f.publicBoard} onChange={(v) => setF({ ...f, publicBoard: v })}>
            {pro ? 'Também publicar no Mural de Oportunidades' : 'Publicar no Mural de Oportunidades'}
            <span className="block text-xs text-muted">Profissionais compatíveis veem apenas título, categoria, bairro e data. Descrição e fotos só aparecem para quem você convidar.</span>
          </Check>
        </div>
        <Notice>A conversa e o orçamento ficam registrados no app. Você não é obrigado a contratar.</Notice>
        <Button className="w-full" size="lg" loading={busy}>
          {pro ? 'Enviar solicitação' : 'Publicar'}
        </Button>
      </form>
    </div>
  );
}
