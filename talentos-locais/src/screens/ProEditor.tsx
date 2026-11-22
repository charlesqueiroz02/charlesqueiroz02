import { BadgeCheck, Camera, Eye, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Check } from './Auth';
import { Avatar, Badge, Button, Card, Chip, Field, Modal, Notice, PortfolioThumb, TopBar, inputCls, toast, useAction } from '../components/ui';
import {
  addCredential, addPortfolio, confirmPhone, removeCredential, removePortfolio, requestVerification, saveProProfile, setAvailability, setPublished,
  startPhoneVerification, updateMe, type ProInput,
} from '../data/actions';
import { AVAILABILITY_LABEL, MODE_LABEL } from '../data/catalog';
import { useStore } from '../data/store';
import { go } from '../lib/router';
import { compressImage, cx } from '../lib/utils';
import type { Availability, AttendMode, Credential, ProProfile } from '../types';

function toInput(p: ProProfile | undefined, city: string, hood: string): ProInput {
  return {
    displayName: p?.displayName ?? '', categories: p?.categories ?? [], bio: p?.bio ?? '', experienceYears: p?.experienceYears ?? 0,
    neighborhoods: p?.neighborhoods ?? (hood ? [hood] : []), city: p?.city ?? city, modes: p?.modes ?? ['local'], availability: p?.availability ?? 'semana',
    urgent: p?.urgent ?? false, services: p?.services.map((s) => ({ name: s.name, priceFrom: s.priceFrom, unit: s.unit })) ?? [{ name: '' }], photo: p?.photo,
  };
}

export function ProEditor() {
  const { db, me } = useStore();
  const pro = db.pros.find((p) => p.userId === me!.id);
  const [tab, setTab] = useState<'dados' | 'portfolio' | 'confianca'>('dados');
  if (!pro) return <Wizard />;
  return (
    <div>
      <TopBar title="Minha vitrine" back="/perfil" right={<Button size="sm" variant="ghost" icon={<Eye className="size-4" />} onClick={() => go(`/p/${pro.slug}`)}>Ver</Button>} />
      <div className="px-4 pt-3">
        <Card className="flex items-center justify-between gap-3 p-3">
          <div>
            <p className="text-sm font-semibold">Disponibilidade</p>
            <select className="mt-1 rounded-lg border border-line bg-white px-2 py-1 text-sm" value={pro.availability} onChange={(e) => setAvailability(e.target.value as Availability)}>
              {Object.entries(AVAILABILITY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" className="size-5 accent-lime-600" checked={pro.published} onChange={(e) => setPublished(e.target.checked)} /> Visível nas buscas
          </label>
        </Card>
      </div>
      <div className="mx-4 mt-3 grid grid-cols-3 rounded-xl bg-stone-100 p-1">
        {(['dados', 'portfolio', 'confianca'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={cx('rounded-lg py-2 text-sm font-semibold', tab === t ? 'bg-white shadow-sm' : 'text-muted')}>
            {t === 'dados' ? 'Dados' : t === 'portfolio' ? 'Portfólio' : 'Verificação'}
          </button>
        ))}
      </div>
      <div className="px-4 py-4">
        {tab === 'dados' && <ProForm initial={toInput(pro, me!.city, me!.neighborhood)} />}
        {tab === 'portfolio' && <PortfolioManager pro={pro} />}
        {tab === 'confianca' && <TrustManager pro={pro} />}
      </div>
    </div>
  );
}

/** Cadastro guiado em 3 passos — pensado para quem tem pouca familiaridade digital. */
function Wizard() {
  const { me } = useStore();
  const [step, setStep] = useState(0);
  const [f, setF] = useState<ProInput>(toInput(undefined, me!.city, me!.neighborhood));
  const { busy, run } = useAction();
  const steps = ['Quem é você', 'O que você faz', 'Onde e quando'];
  const canNext = step === 0 ? f.displayName.trim().length >= 3 && f.categories.length > 0 : step === 1 ? f.services.some((s) => s.name.trim().length >= 3) : true;
  return (
    <div>
      <TopBar title="Oferecer meus serviços" back="/perfil" />
      <div className="px-4 py-4">
        <div className="mb-5 flex gap-1.5">
          {steps.map((s, i) => <div key={s} className={cx('h-1.5 flex-1 rounded-full', i <= step ? 'bg-lime-500' : 'bg-stone-200')} />)}
        </div>
        <p className="text-sm font-semibold text-lime-600">Passo {step + 1} de 3</p>
        <h1 className="text-2xl font-extrabold">{steps[step]}</h1>
        {!me!.lowComplexity && (
          <button className="mt-2 text-sm text-brand-700 underline" onClick={() => updateMe({ lowComplexity: true })}>Prefiro letras e botões maiores</button>
        )}
        <div className="mt-5 space-y-5">
          {step === 0 && <><BasicFields f={f} setF={setF} /></>}
          {step === 1 && <ServicesFields f={f} setF={setF} />}
          {step === 2 && <WhereFields f={f} setF={setF} />}
        </div>
        <div className="mt-8 flex gap-2">
          {step > 0 && <Button variant="secondary" size="lg" onClick={() => setStep(step - 1)}>Voltar</Button>}
          {step < 2 ? (
            <Button size="lg" className="flex-1" disabled={!canNext} onClick={() => setStep(step + 1)}>Continuar</Button>
          ) : (
            <Button size="lg" className="flex-1" loading={busy} onClick={async () => { const id = await run(() => saveProProfile({ ...f, services: f.services.filter((s) => s.name.trim()) }), 'Sua vitrine está no ar!'); if (id) go('/perfil/vitrine'); }}>
              Publicar minha vitrine
            </Button>
          )}
        </div>
        <p className="mt-4 text-center text-xs text-muted">Grátis. Sem comissão sobre os serviços. Você pode completar portfólio e qualificações depois.</p>
      </div>
    </div>
  );
}

type FP = { f: ProInput; setF: (f: ProInput) => void };

function BasicFields({ f, setF }: FP) {
  const { db } = useStore();
  const pickPhoto = async (file?: File) => {
    if (!file) return;
    try { setF({ ...f, photo: await compressImage(file, 400, 0.8) }); } catch (e) { toast((e as Error).message, 'err'); }
  };
  return (
    <>
      <div className="flex items-center gap-4">
        <Avatar name={f.displayName || '?'} hue={140} photo={f.photo} size={72} />
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-line bg-white px-3 py-2 text-sm font-semibold">
          <Camera className="size-4" /> {f.photo ? 'Trocar foto' : 'Adicionar foto'}
          <input type="file" accept="image/*" className="sr-only" onChange={(e) => pickPhoto(e.target.files?.[0])} />
        </label>
        {f.photo && <button className="text-sm text-muted underline" onClick={() => setF({ ...f, photo: '' })}>Remover</button>}
      </div>
      <Field label="Nome profissional ou comercial" hint="Ex.: Serralheria do João, Rita Costuras">
        <input className={inputCls} value={f.displayName} onChange={(e) => setF({ ...f, displayName: e.target.value })} />
      </Field>
      <div>
        <p className="mb-2 text-sm font-semibold">Categorias (até 3)</p>
        <div className="flex flex-wrap gap-2">
          {db.categories.filter((c) => c.active).map((c) => (
            <Chip key={c.id} active={f.categories.includes(c.id)} onClick={() => setF({ ...f, categories: f.categories.includes(c.id) ? f.categories.filter((x) => x !== c.id) : f.categories.length < 3 ? [...f.categories, c.id] : f.categories })}>
              {c.name}
            </Chip>
          ))}
        </div>
      </div>
    </>
  );
}

function ServicesFields({ f, setF }: FP) {
  const upd = (i: number, patch: Partial<ProInput['services'][number]>) => setF({ ...f, services: f.services.map((s, k) => (k === i ? { ...s, ...patch } : s)) });
  return (
    <>
      {f.services.map((s, i) => (
        <Card key={i} className="space-y-3 p-3">
          <Field label={`Serviço ${i + 1}`}>
            <input className={inputCls} value={s.name} onChange={(e) => upd(i, { name: e.target.value })} placeholder="Ex.: Conserto de portão" />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Preço inicial (opcional)">
              <input className={inputCls} type="number" min={0} value={s.priceFrom ?? ''} onChange={(e) => upd(i, { priceFrom: e.target.value === '' ? undefined : Number(e.target.value) })} placeholder="R$" />
            </Field>
            <Field label="Unidade (opcional)">
              <input className={inputCls} value={s.unit ?? ''} onChange={(e) => upd(i, { unit: e.target.value })} placeholder="por visita" />
            </Field>
          </div>
          {f.services.length > 1 && <button className="text-sm text-red-700" onClick={() => setF({ ...f, services: f.services.filter((_, k) => k !== i) })}>Remover serviço</button>}
        </Card>
      ))}
      {f.services.length < 15 && <Button variant="secondary" icon={<Plus className="size-4" />} onClick={() => setF({ ...f, services: [...f.services, { name: '' }] })}>Adicionar outro serviço</Button>}
      <Field label="Apresentação (opcional)" hint="Conte o que você faz, como trabalha e o que te diferencia.">
        <textarea className={inputCls} rows={4} value={f.bio} onChange={(e) => setF({ ...f, bio: e.target.value })} />
      </Field>
      <Field label="Anos de experiência">
        <input className={inputCls} type="number" min={0} max={70} value={f.experienceYears || ''} onChange={(e) => setF({ ...f, experienceYears: Number(e.target.value) || 0 })} />
      </Field>
    </>
  );
}

function WhereFields({ f, setF }: FP) {
  const { db } = useStore();
  const region = db.regions.find((r) => r.city === f.city) ?? db.regions[0]!;
  const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  return (
    <>
      <Field label="Cidade">
        <select className={inputCls} value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })}>
          {!db.regions.some((r) => r.city === f.city) && <option>{f.city}</option>}
          {db.regions.map((r) => <option key={r.city}>{r.city}</option>)}
        </select>
      </Field>
      <div>
        <p className="mb-2 text-sm font-semibold">Bairros que você atende</p>
        <div className="flex flex-wrap gap-2">
          {region.neighborhoods.map((n) => <Chip key={n} active={f.neighborhoods.includes(n)} onClick={() => setF({ ...f, neighborhoods: toggle(f.neighborhoods, n) })}>{n}</Chip>)}
        </div>
        <p className="mt-1 text-xs text-muted">Seu endereço residencial nunca é exibido.</p>
      </div>
      <div>
        <p className="mb-2 text-sm font-semibold">Como você atende</p>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(MODE_LABEL) as AttendMode[]).map((m) => <Chip key={m} active={f.modes.includes(m)} onClick={() => setF({ ...f, modes: toggle(f.modes, m) })}>{MODE_LABEL[m]}</Chip>)}
        </div>
      </div>
      <div>
        <p className="mb-2 text-sm font-semibold">Disponibilidade</p>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(AVAILABILITY_LABEL) as Availability[]).map((a) => <Chip key={a} active={f.availability === a} onClick={() => setF({ ...f, availability: a })}>{AVAILABILITY_LABEL[a]}</Chip>)}
        </div>
      </div>
      <Check checked={f.urgent} onChange={(v) => setF({ ...f, urgent: v })}>Atendo urgências</Check>
    </>
  );
}

function ProForm({ initial }: { initial: ProInput }) {
  const [f, setF] = useState(initial);
  const { busy, run } = useAction();
  return (
    <div className="space-y-5">
      <BasicFields f={f} setF={setF} />
      <ServicesFields f={f} setF={setF} />
      <WhereFields f={f} setF={setF} />
      <Button className="w-full" size="lg" loading={busy} onClick={() => run(() => saveProProfile({ ...f, services: f.services.filter((s) => s.name.trim()) }), 'Vitrine atualizada')}>
        Salvar alterações
      </Button>
    </div>
  );
}

function PortfolioManager({ pro }: { pro: ProProfile }) {
  const { db } = useStore();
  const items = db.portfolio.filter((p) => p.proId === pro.id);
  const limit = db.plans.find((p) => p.id === pro.plan)?.portfolioLimit ?? 8;
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ title: '', description: '', category: pro.categories[0] ?? '', approxDate: new Date().toISOString().slice(0, 7), image: '', beforeImage: '' });
  const { busy, run } = useAction();
  const pick = async (k: 'image' | 'beforeImage', file?: File) => {
    if (!file) return;
    try { const img = await compressImage(file); setF((s) => ({ ...s, [k]: img })); } catch (e) { toast((e as Error).message, 'err'); }
  };
  const used = items.filter((i) => i.status !== 'recusado').length;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">{used} de {limit} trabalhos ({pro.plan === 'pro' ? 'plano Profissional' : 'plano gratuito'})</p>
        <Button size="sm" icon={<Plus className="size-4" />} disabled={used >= limit} onClick={() => setOpen(true)}>Adicionar</Button>
      </div>
      {used >= limit && pro.plan === 'free' && <Notice>Limite atingido. <button className="font-semibold underline" onClick={() => go('/planos')}>Conheça o plano Profissional</button>.</Notice>}
      <div className="grid grid-cols-2 gap-3">
        {items.map((p) => (
          <Card key={p.id} className="overflow-hidden">
            <PortfolioThumb image={p.image} hue={p.hue} title={p.title} className="aspect-square w-full" />
            <div className="p-2.5">
              <p className="line-clamp-1 text-sm font-semibold">{p.title}</p>
              <div className="mt-1 flex items-center justify-between">
                <Badge tone={p.status === 'aprovado' ? 'green' : p.status === 'pendente' ? 'amber' : 'red'}>{p.status === 'aprovado' ? 'Publicado' : p.status === 'pendente' ? 'Em moderação' : 'Recusado'}</Badge>
                <button aria-label="Remover" onClick={() => confirm('Remover este trabalho?') && run(() => removePortfolio(p.id), 'Removido')}><Trash2 className="size-4 text-muted" /></button>
              </div>
            </div>
          </Card>
        ))}
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title="Novo trabalho no portfólio">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {(['beforeImage', 'image'] as const).map((k) => (
              <label key={k} className="grid aspect-square cursor-pointer place-items-center overflow-hidden rounded-xl border-2 border-dashed border-line bg-stone-50 text-center text-sm text-muted">
                {f[k] ? <img src={f[k]} alt="" className="h-full w-full object-cover" /> : <span><Camera className="mx-auto mb-1 size-6" />{k === 'image' ? 'Foto (depois)' : 'Antes (opcional)'}</span>}
                <input type="file" accept="image/*" className="sr-only" onChange={(e) => pick(k, e.target.files?.[0])} />
              </label>
            ))}
          </div>
          <Field label="Título"><input className={inputCls} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
          <Field label="Descrição do serviço"><textarea className={inputCls} rows={2} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Tipo de trabalho">
              <select className={inputCls} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
                {pro.categories.map((c) => <option key={c} value={c}>{db.categories.find((x) => x.id === c)?.name}</option>)}
              </select>
            </Field>
            <Field label="Data aproximada"><input type="month" className={inputCls} value={f.approxDate} onChange={(e) => setF({ ...f, approxDate: e.target.value })} /></Field>
          </div>
          <p className="text-xs text-muted">Envie apenas fotos de trabalhos seus, sem rostos ou endereços de clientes. Fotos passam por moderação antes de aparecer.</p>
          <Button className="w-full" loading={busy} onClick={async () => { const ok = await run(() => { addPortfolio({ ...f, image: f.image || undefined, beforeImage: f.beforeImage || undefined }); return true; }, 'Trabalho adicionado'); if (ok) { setOpen(false); setF({ ...f, title: '', description: '', image: '', beforeImage: '' }); } }}>
            Salvar
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function TrustManager({ pro }: { pro: ProProfile }) {
  const { db, me } = useStore();
  const [phone, setPhone] = useState(me!.phone ?? '');
  const [code, setCode] = useState('');
  const [demoCode, setDemoCode] = useState<string | null>(null);
  const [cred, setCred] = useState({ name: '', kind: 'curso' as Credential['kind'] });
  const [idNote, setIdNote] = useState('');
  const { busy, run } = useAction();
  const pendingId = db.verifications.find((v) => v.proId === pro.id && v.kind === 'identidade' && v.status === 'pendente');
  const lastId = db.verifications.filter((v) => v.proId === pro.id && v.kind === 'identidade').at(-1);
  return (
    <div className="space-y-4">
      <Notice>Verificação progressiva: cada etapa comprova uma coisa diferente. Confirmar telefone <b>não</b> comprova identidade, e identidade <b>não</b> comprova habilitação profissional.</Notice>
      <Card className="space-y-3 p-4">
        <p className="font-bold">1. Telefone de contato {me!.phoneVerified && <Badge tone="green"><BadgeCheck className="size-3" /> confirmado</Badge>}</p>
        <div className="flex gap-2">
          <input className={inputCls} inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(19) 99999-9999" />
          <Button variant="secondary" onClick={() => run(() => updateMe({ phone }), 'Telefone salvo')}>Salvar</Button>
        </div>
        {me!.phone && !me!.phoneVerified && (
          <>
            <Button size="sm" variant="dark" onClick={() => run(() => setDemoCode(startPhoneVerification()))}>Enviar código</Button>
            {demoCode && (
              <>
                <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-900">Envio de SMS não integrado neste ambiente. Código de demonstração: <b>{demoCode}</b></p>
                <div className="flex gap-2">
                  <input className={inputCls} inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Código" />
                  <Button onClick={() => run(() => confirmPhone(code), 'Telefone confirmado')}>Confirmar</Button>
                </div>
              </>
            )}
          </>
        )}
      </Card>
      <Card className="space-y-3 p-4">
        <p className="font-bold">2. Identidade {pro.identityVerified && <Badge tone="green"><BadgeCheck className="size-3" /> verificada</Badge>}</p>
        {!pro.identityVerified && (pendingId ? <Badge tone="amber">Em análise pela equipe</Badge> : (
          <>
            {lastId?.status === 'recusada' && <Notice tone="warn">Solicitação anterior recusada: {lastId.decisionNote}</Notice>}
            <p className="text-sm text-muted">Envie a solicitação e a equipe orientará a conferência do documento por canal seguro. Documentos nunca ficam visíveis no perfil.</p>
            <input className={inputCls} value={idNote} onChange={(e) => setIdNote(e.target.value)} placeholder="Observação (opcional)" />
            <Button size="sm" variant="dark" loading={busy} onClick={() => run(() => requestVerification('identidade', idNote), 'Solicitação enviada')}>Solicitar verificação de identidade</Button>
          </>
        ))}
      </Card>
      <Card className="space-y-3 p-4">
        <p className="font-bold">3. Cursos e qualificações</p>
        <ul className="space-y-2">
          {pro.credentials.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-2 text-sm">
              <span>{c.name}</span>
              <span className="flex shrink-0 items-center gap-2">
                <Badge tone={c.status === 'verificado' ? 'green' : c.status === 'em_analise' ? 'amber' : c.status === 'recusado' ? 'red' : 'neutral'}>
                  {{ declarado: 'Declarado', em_analise: 'Em análise', verificado: 'Verificado', recusado: 'Não verificado' }[c.status]}
                </Badge>
                {c.status === 'declarado' && <button className="text-xs font-semibold text-brand-700" onClick={() => run(() => requestVerification('credencial', '', c.id), 'Enviado para verificação')}>Verificar</button>}
                <button aria-label="Remover" onClick={() => run(() => removeCredential(c.id))}><Trash2 className="size-4 text-muted" /></button>
              </span>
            </li>
          ))}
        </ul>
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <input className={inputCls} value={cred.name} onChange={(e) => setCred({ ...cred, name: e.target.value })} placeholder="Ex.: Curso de NR-10" />
          <select className="rounded-xl border border-line bg-white px-2 text-sm" value={cred.kind} onChange={(e) => setCred({ ...cred, kind: e.target.value as Credential['kind'] })}>
            <option value="curso">Curso</option><option value="formacao">Formação</option><option value="certificacao">Certificação</option><option value="registro">Registro</option>
          </select>
        </div>
        <Button size="sm" variant="secondary" icon={<Plus className="size-4" />} onClick={async () => { const ok = await run(() => { addCredential(cred.name, cred.kind); return true; }, 'Qualificação adicionada'); if (ok) setCred({ ...cred, name: '' }); }}>Adicionar qualificação</Button>
        <p className="text-xs text-muted">Qualificações aparecem como "Informado pelo profissional" até serem verificadas. Nunca afirmamos habilitação para atividades regulamentadas sem comprovação.</p>
      </Card>
    </div>
  );
}
