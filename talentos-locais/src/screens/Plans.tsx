import { Check, Megaphone } from 'lucide-react';
import { Badge, Button, Card, Notice, TopBar, useAction } from '../components/ui';
import { setPlanDemo, setSponsored } from '../data/actions';
import { useStore } from '../data/store';
import { go } from '../lib/router';
import { brl } from '../lib/utils';

export function Plans() {
  const { db, me } = useStore();
  const pro = me ? db.pros.find((p) => p.userId === me.id) : undefined;
  const { busy, run } = useAction();
  return (
    <div>
      <TopBar title="Planos" back={true} />
      <div className="space-y-4 px-4 py-4">
        <div className="rounded-3xl bg-brand-800 p-5 text-white">
          <p className="text-xl font-extrabold">Sem comissão sobre o seu trabalho.</p>
          <p className="mt-1 text-sm text-white/80">O plano gratuito tem tudo para você ser encontrado e fechar serviços. O plano Profissional é opcional, para quem quer organizar e crescer.</p>
        </div>
        {db.plans.filter((p) => p.active).map((plan) => {
          const current = pro?.plan === plan.id;
          return (
            <Card key={plan.id} className={current ? 'border-lime-500 p-5' : 'p-5'}>
              <div className="flex items-center justify-between">
                <p className="text-lg font-extrabold">{plan.name}</p>
                {current && <Badge tone="lime">Seu plano</Badge>}
              </div>
              <p className="mt-1 text-2xl font-extrabold">{plan.priceMonthly ? `${brl(plan.priceMonthly)}/mês` : 'Grátis'}</p>
              <ul className="mt-3 space-y-1.5 text-sm">
                {plan.features.map((f) => <li key={f} className="flex gap-2"><Check className="size-4 shrink-0 text-lime-600" />{f}</li>)}
              </ul>
              {pro && !current && (
                plan.priceMonthly > 0 ? (
                  <>
                    <Button className="mt-4 w-full" loading={busy} onClick={() => run(() => setPlanDemo('pro'), 'Teste demonstrativo ativado (sem cobrança)')}>Ativar teste demonstrativo (sem cobrança)</Button>
                    <p className="mt-2 text-xs text-muted">Pagamento de assinatura ainda não integrado. Nenhum valor será cobrado.</p>
                  </>
                ) : <Button variant="secondary" className="mt-4 w-full" loading={busy} onClick={() => run(() => setPlanDemo('free'), 'Plano gratuito ativado')}>Voltar ao gratuito</Button>
              )}
              {!pro && plan.id === 'free' && <Button className="mt-4 w-full" onClick={() => go(me ? '/perfil/vitrine' : '/cadastro')}>Criar minha vitrine grátis</Button>}
            </Card>
          );
        })}
        {pro?.plan === 'pro' && (
          <Card className="p-5">
            <p className="flex items-center gap-2 font-bold"><Megaphone className="size-5 text-lime-600" /> Destaque patrocinado</p>
            <p className="mt-1 text-sm text-muted">Seu perfil pode aparecer no topo das buscas com o rótulo "Patrocinado". Isso não muda sua nota, suas avaliações nem seus selos.</p>
            <label className="mt-3 flex items-center gap-3 font-semibold">
              <input type="checkbox" className="size-5 accent-lime-600" checked={pro.sponsored} onChange={(e) => run(() => setSponsored(e.target.checked), e.target.checked ? 'Destaque ativado' : 'Destaque desativado')} /> Ativar destaque
            </label>
          </Card>
        )}
        <Notice>Pagar nunca garante avaliações melhores, nunca remove críticas legítimas e nunca concede selo de verificação.</Notice>
      </div>
    </div>
  );
}
