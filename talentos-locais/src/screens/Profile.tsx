import {
  BarChart3, Bell, Bookmark, ChevronRight, Crown, Download, FileText, Hammer, LogOut, Megaphone, RotateCcw, Settings, Shield, ShieldCheck, Store, Trash2, Type,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { ProCard } from '../components/ProCard';
import { Avatar, Badge, Button, Card, EmptyState, Field, Modal, Notice, TopBar, inputCls, useAction } from '../components/ui';
import { deleteAccount, exportMyData, logout, setMarketingConsent, updateMe } from '../data/actions';
import { resetDemo, useStore } from '../data/store';
import { ROLE_LABEL, isAdmin } from '../lib/permissions';
import { go } from '../lib/router';
import { distanceFor, proStats } from '../lib/search';
import { fmtDate } from '../lib/utils';

function Row({ icon, label, hint, onClick, right }: { icon: ReactNode; label: string; hint?: string; onClick: () => void; right?: ReactNode }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-brand-50/50">
      <span className="grid size-9 place-items-center rounded-xl bg-brand-50 text-brand-700">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{label}</span>
        {hint && <span className="block truncate text-xs text-muted">{hint}</span>}
      </span>
      {right ?? <ChevronRight className="size-5 text-muted" />}
    </button>
  );
}

export function ProfileHub() {
  const { db, me } = useStore();
  const pro = db.pros.find((p) => p.userId === me!.id);
  const unread = db.notifications.filter((n) => n.userId === me!.id && !n.read).length;
  return (
    <div>
      <TopBar title="Perfil" />
      <div className="flex items-center gap-4 px-4 py-5">
        <Avatar name={me!.name} hue={150} photo={pro?.photo} size={64} />
        <div className="min-w-0">
          <p className="truncate text-xl font-extrabold">{me!.name}</p>
          <p className="text-sm text-muted">{me!.neighborhood}, {me!.city}</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {me!.demo && <Badge tone="amber">Conta de demonstração</Badge>}
            {me!.adminRole && <Badge tone="violet">{ROLE_LABEL[me!.adminRole]}</Badge>}
          </div>
        </div>
      </div>

      <Card className="mx-4 divide-y divide-line overflow-hidden">
        {pro ? (
          <>
            <Row icon={<Store className="size-5" />} label="Minha vitrine" hint="Dados, portfólio e verificação" onClick={() => go('/perfil/vitrine')} />
            <Row icon={<BarChart3 className="size-5" />} label="Painel do profissional" hint="Indicadores, agenda e pedidos" onClick={() => go('/painel')} />
            <Row icon={<Megaphone className="size-5" />} label="Mural de Oportunidades" onClick={() => go('/mural')} />
            <Row icon={<Crown className="size-5" />} label="Planos" hint={pro.plan === 'pro' ? 'Profissional (teste)' : 'Gratuito'} onClick={() => go('/planos')} />
          </>
        ) : (
          <Row icon={<Hammer className="size-5" />} label="Quero oferecer meus serviços" hint="Crie sua vitrine grátis em 3 passos" onClick={() => go('/perfil/vitrine')} />
        )}
      </Card>

      <Card className="mx-4 mt-4 divide-y divide-line overflow-hidden">
        <Row icon={<Bell className="size-5" />} label="Notificações" onClick={() => go('/notificacoes')} right={unread ? <Badge tone="lime">{unread}</Badge> : undefined} />
        <Row icon={<Bookmark className="size-5" />} label="Profissionais salvos" hint={`${me!.saved.length} salvo(s)`} onClick={() => go('/salvos')} />
        <Row icon={<Settings className="size-5" />} label="Conta e preferências" onClick={() => go('/perfil/conta')} />
        <Row
          icon={<Type className="size-5" />}
          label="Modo de baixa complexidade"
          hint="Letras e botões maiores, passos curtos"
          onClick={() => updateMe({ lowComplexity: !me!.lowComplexity })}
          right={<span className={`h-6 w-11 rounded-full p-0.5 transition ${me!.lowComplexity ? 'bg-lime-500' : 'bg-stone-300'}`}><span className={`block size-5 rounded-full bg-white transition ${me!.lowComplexity ? 'translate-x-5' : ''}`} /></span>}
        />
        <Row icon={<ShieldCheck className="size-5" />} label="Privacidade e dados (LGPD)" onClick={() => go('/perfil/privacidade')} />
        {isAdmin(me) && <Row icon={<Shield className="size-5" />} label="Painel administrativo" onClick={() => go('/admin')} />}
      </Card>

      <Card className="mx-4 mt-4 divide-y divide-line overflow-hidden">
        <Row icon={<FileText className="size-5" />} label="Termos de Uso" onClick={() => go('/termos')} />
        <Row icon={<LogOut className="size-5" />} label="Sair" onClick={() => { logout(); go('/'); }} right={<span />} />
      </Card>
      <div className="mt-6 px-4 text-center">
        <Button variant="ghost" size="sm" icon={<RotateCcw className="size-4" />} onClick={async () => { if (confirm('Apagar todos os dados deste navegador e restaurar a demonstração?')) { await resetDemo(); go('/'); } }}>
          Restaurar dados de demonstração
        </Button>
        <p className="mt-1 text-xs text-muted">Modo demonstração: os dados ficam apenas neste navegador.</p>
      </div>
    </div>
  );
}

export function Account() {
  const { db, me } = useStore();
  const [f, setF] = useState({ name: me!.name, city: me!.city, neighborhood: me!.neighborhood, phone: me!.phone ?? '' });
  const { busy, run } = useAction();
  const region = db.regions.find((r) => r.city === f.city);
  return (
    <div>
      <TopBar title="Conta e preferências" back="/perfil" />
      <div className="space-y-4 px-4 py-4">
        <Field label="Nome de exibição"><input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Cidade"><input className={inputCls} value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} /></Field>
          <Field label="Bairro">
            <input className={inputCls} list="acc-hoods" value={f.neighborhood} onChange={(e) => setF({ ...f, neighborhood: e.target.value })} />
            <datalist id="acc-hoods">{region?.neighborhoods.map((n) => <option key={n} value={n} />)}</datalist>
          </Field>
        </div>
        <Field label="Telefone (opcional)" hint="Usado apenas para contato nos serviços que você combinar. Não fica público.">
          <input className={inputCls} inputMode="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
        </Field>
        <p className="text-sm text-muted">E-mail: {me!.email}</p>
        <Button className="w-full" loading={busy} onClick={() => run(() => updateMe(f), 'Dados atualizados')}>Salvar</Button>
        <Notice>Notificações por push, e-mail ou SMS ainda não estão integradas. Por enquanto, os avisos aparecem dentro do app.</Notice>
      </div>
    </div>
  );
}

export function Privacy() {
  const { me } = useStore();
  const [del, setDel] = useState(false);
  const [pw, setPw] = useState('');
  const { busy, run } = useAction();
  const download = () => {
    const blob = new Blob([JSON.stringify(exportMyData(), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'meus-dados-talentoslocais.json';
    a.click();
    URL.revokeObjectURL(a.href);
  };
  return (
    <div>
      <TopBar title="Privacidade e dados" back="/perfil" />
      <div className="space-y-4 px-4 py-4">
        <Card className="space-y-2 p-4 text-sm">
          <p className="font-bold">Seus consentimentos</p>
          <p>Termos de Uso e Política de Privacidade: aceitos em {fmtDate(me!.consent.at)}</p>
          <label className="flex items-center justify-between gap-3">
            <span>Receber novidades e dicas</span>
            <input type="checkbox" className="size-5 accent-lime-600" checked={me!.consent.marketing} onChange={(e) => run(() => setMarketingConsent(e.target.checked), 'Preferência atualizada')} />
          </label>
        </Card>
        <Card className="space-y-2 p-4 text-sm">
          <p className="font-bold">O que fica público</p>
          <ul className="list-disc space-y-1 pl-5 text-muted">
            <li>Clientes: apenas nome de exibição em avaliações (e em indicações, se você autorizar).</li>
            <li>Profissionais: vitrine, bairros atendidos (nunca o endereço residencial), serviços e portfólio aprovado.</li>
            <li>Telefone, e-mail e documentos nunca são exibidos publicamente.</li>
            <li>Endereço do serviço é compartilhado só com a outra parte do pedido, se você informar.</li>
          </ul>
        </Card>
        <Button variant="secondary" className="w-full" icon={<Download className="size-4" />} onClick={download}>Baixar uma cópia dos meus dados</Button>
        <Button variant="danger" className="w-full" icon={<Trash2 className="size-4" />} onClick={() => setDel(true)}>Excluir minha conta</Button>
        <p className="text-center text-xs text-muted"><a className="underline" href="#/privacidade">Política de Privacidade</a></p>
      </div>
      <Modal open={del} onClose={() => setDel(false)} title="Excluir conta">
        <p className="text-sm">Isso remove seu perfil, portfólio, indicações e solicitações abertas. Avaliações que você escreveu ficam anônimas ("Usuário removido") para preservar a integridade das reputações. Esta ação não pode ser desfeita.</p>
        <div className="mt-4"><Field label="Confirme sua senha"><input type="password" className={inputCls} value={pw} onChange={(e) => setPw(e.target.value)} /></Field></div>
        <Button variant="danger" className="mt-4 w-full" loading={busy} onClick={async () => { const ok = await run(async () => { await deleteAccount(pw); return true; }, 'Conta excluída'); if (ok) go('/'); }}>Excluir definitivamente</Button>
      </Modal>
    </div>
  );
}

export function Saved() {
  const { db, me } = useStore();
  const list = db.pros.filter((p) => me!.saved.includes(p.id) && p.published);
  return (
    <div>
      <TopBar title="Profissionais salvos" back="/perfil" />
      {!list.length && <EmptyState icon={<Bookmark />} title="Nenhum profissional salvo" text="Toque no marcador no perfil de um profissional para guardá-lo aqui." />}
      <div className="space-y-3 px-4 py-4">
        {list.map((p) => (
          <ProCard key={p.id} r={{ pro: p, stats: proStats(db, p), ...distanceFor(p, me!.neighborhood), score: 0 }} categories={db.categories} wide />
        ))}
      </div>
    </div>
  );
}
