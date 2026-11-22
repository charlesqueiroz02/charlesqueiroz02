import { Briefcase, Hammer, Search, Smartphone } from 'lucide-react';
import { useRef, useState } from 'react';
import { Logo } from '../components/Logo';
import { Button, Field, Notice, inputCls, useAction } from '../components/ui';
import { login, requestReset, resetPassword, signup } from '../data/actions';
import { DEMO_CITY, NEIGHBORHOOD_POS } from '../data/catalog';
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from '../data/seed';
import { go } from '../lib/router';
import { cx } from '../lib/utils';

type Mode = 'entrar' | 'cadastro' | 'recuperar';

export function AuthScreen({ mode, gated }: { mode: Mode; gated?: boolean }) {
  return (
    <div className="min-h-dvh px-5 pt-8 pb-10">
      <button onClick={() => go('/')} className="mb-6" aria-label="Ir para o início">
        <Logo />
      </button>
      {gated && <Notice>Entre ou crie sua conta para continuar. Explorar profissionais é livre, sem cadastro.</Notice>}
      <div className="mt-4">{mode === 'entrar' ? <Login /> : mode === 'cadastro' ? <Signup /> : <Recover />}</div>
    </div>
  );
}

function Login() {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const { busy, run } = useAction();
  const after = () => {
    if (/^#\/(entrar|cadastro|recuperar)/.test(location.hash)) go('/');
  };
  const submit = async (e?: React.FormEvent, em = email, p = pw) => {
    e?.preventDefault();
    const ok = await run(async () => {
      await login(em, p);
      return true;
    });
    if (ok) after();
  };
  return (
    <>
      <h1 className="text-2xl font-extrabold">Entrar</h1>
      <p className="mt-1 text-muted">Bom te ver de novo.</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <Field label="E-mail">
          <input className={inputCls} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Field>
        <Field label="Senha">
          <input className={inputCls} type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} required />
        </Field>
        <Button className="w-full" size="lg" loading={busy}>
          Entrar
        </Button>
      </form>
      <div className="mt-3 flex justify-between text-sm">
        <button className="font-semibold text-brand-700" onClick={() => go('/recuperar')}>
          Esqueci minha senha
        </button>
        <button className="font-semibold text-brand-700" onClick={() => go('/cadastro')}>
          Criar conta
        </button>
      </div>
      <ExternalProviders />
      <div className="mt-8 rounded-2xl border border-dashed border-amber-300 bg-amber-50/60 p-4">
        <p className="text-sm font-bold text-amber-900">Contas de demonstração (dados fictícios)</p>
        <p className="mt-1 text-xs text-amber-900/80">Senha de todas: {DEMO_PASSWORD}</p>
        <div className="mt-3 grid gap-2">
          {(
            [
              ['Cliente', DEMO_ACCOUNTS.cliente],
              ['Profissional (perfil novo)', DEMO_ACCOUNTS.profissional],
              ['Administrador', DEMO_ACCOUNTS.admin],
            ] as const
          ).map(([label, em]) => (
            <Button key={em} variant="secondary" size="sm" disabled={busy} onClick={() => submit(undefined, em, DEMO_PASSWORD)}>
              Entrar como {label}
            </Button>
          ))}
        </div>
      </div>
    </>
  );
}

function ExternalProviders() {
  return (
    <div className="mt-6">
      <div className="mb-3 flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-line" /> ou <span className="h-px flex-1 bg-line" />
      </div>
      <div className="grid gap-2">
        <Button variant="secondary" disabled icon={<Smartphone className="size-4" />}>
          Entrar com telefone (SMS)
        </Button>
        <Button variant="secondary" disabled>
          Entrar com Google
        </Button>
      </div>
      <p className="mt-2 text-center text-xs text-muted">Integrações externas ainda não configuradas neste ambiente.</p>
    </div>
  );
}

const INTENTS = [
  { id: 'contratar', label: 'Quero contratar um serviço', icon: Search },
  { id: 'oferecer', label: 'Quero oferecer meus serviços', icon: Hammer },
  { id: 'ambos', label: 'Quero fazer os dois', icon: Briefcase },
] as const;

function Signup() {
  const startedAt = useRef(Date.now());
  const [intent, setIntent] = useState<'contratar' | 'oferecer' | 'ambos' | null>(null);
  const [f, setF] = useState({ name: '', email: '', password: '', city: DEMO_CITY, neighborhood: '', terms: false, privacy: false, marketing: false, hp: '' });
  const set = (k: keyof typeof f, v: string | boolean) => setF((x) => ({ ...x, [k]: v }));
  const { busy, run } = useAction();

  if (!intent)
    return (
      <>
        <h1 className="text-2xl font-extrabold">Como você quer usar o TalentosLocais?</h1>
        <p className="mt-1 text-muted">Você pode mudar isso depois.</p>
        <div className="mt-6 grid gap-3">
          {INTENTS.map((i) => (
            <button key={i.id} onClick={() => setIntent(i.id)} className="flex items-center gap-4 rounded-2xl border border-line bg-white p-4 text-left font-semibold hover:border-lime-500">
              <span className="grid size-12 place-items-center rounded-xl bg-brand-50 text-brand-700">
                <i.icon />
              </span>
              {i.label}
            </button>
          ))}
        </div>
        <p className="mt-6 text-center text-sm">
          Já tem conta?{' '}
          <button className="font-semibold text-brand-700" onClick={() => go('/entrar')}>
            Entrar
          </button>
        </p>
      </>
    );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await run(async () => {
      await signup({ ...f, intent, honeypot: f.hp, startedAt: startedAt.current });
      return true;
    }, 'Conta criada!');
    if (ok) go(intent === 'contratar' ? '/' : '/perfil/vitrine');
  };

  return (
    <>
      <button className="text-sm font-semibold text-brand-700" onClick={() => setIntent(null)}>
        ← {INTENTS.find((i) => i.id === intent)!.label}
      </button>
      <h1 className="mt-2 text-2xl font-extrabold">Criar conta</h1>
      <p className="mt-1 text-sm text-muted">Pedimos só o necessário. {intent !== 'contratar' && 'Os dados profissionais vêm no próximo passo.'}</p>
      <form onSubmit={submit} className="mt-5 space-y-4" noValidate>
        <Field label="Nome de exibição" hint="Como os outros vão te ver. Pode ser só o primeiro nome.">
          <input className={inputCls} value={f.name} onChange={(e) => set('name', e.target.value)} autoComplete="given-name" />
        </Field>
        <Field label="E-mail">
          <input className={inputCls} type="email" value={f.email} onChange={(e) => set('email', e.target.value)} autoComplete="email" />
        </Field>
        <Field label="Senha" hint="Mínimo de 8 caracteres, com letras e números.">
          <input className={inputCls} type="password" value={f.password} onChange={(e) => set('password', e.target.value)} autoComplete="new-password" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Cidade">
            <input className={inputCls} value={f.city} onChange={(e) => set('city', e.target.value)} />
          </Field>
          <Field label="Bairro">
            <input className={inputCls} list="hoods" value={f.neighborhood} onChange={(e) => set('neighborhood', e.target.value)} />
            <datalist id="hoods">
              {Object.keys(NEIGHBORHOOD_POS).map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
          </Field>
        </div>
        {/* honeypot anti-robô: invisível para pessoas */}
        <input tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px] h-0 w-0 opacity-0" value={f.hp} onChange={(e) => set('hp', e.target.value)} name="website" />
        <div className="space-y-2 rounded-2xl bg-white p-4 text-sm">
          <Check checked={f.terms} onChange={(v) => set('terms', v)}>
            Li e aceito os <a href="#/termos" target="_blank" className="font-semibold text-brand-700 underline">Termos de Uso</a> (obrigatório)
          </Check>
          <Check checked={f.privacy} onChange={(v) => set('privacy', v)}>
            Concordo com o tratamento dos meus dados conforme a <a href="#/privacidade" target="_blank" className="font-semibold text-brand-700 underline">Política de Privacidade</a> (obrigatório)
          </Check>
          <Check checked={f.marketing} onChange={(v) => set('marketing', v)}>
            Quero receber novidades e dicas (opcional — você pode mudar a qualquer momento)
          </Check>
        </div>
        <Button className="w-full" size="lg" loading={busy}>
          Criar conta
        </Button>
      </form>
    </>
  );
}

export function Check({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 size-5 shrink-0 accent-lime-600" />
      <span>{children}</span>
    </label>
  );
}

function Recover() {
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [pw, setPw] = useState('');
  const [demoCode, setDemoCode] = useState<string | null>(null);
  const { busy, run } = useAction();
  return (
    <>
      <h1 className="text-2xl font-extrabold">Recuperar senha</h1>
      {step === 1 ? (
        <form
          className="mt-6 space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const r = await run(() => requestReset(email));
            if (r !== undefined) {
              setDemoCode(r);
              setStep(2);
            }
          }}
        >
          <Field label="E-mail da conta">
            <input className={inputCls} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Button className="w-full" loading={busy}>
            Enviar código
          </Button>
        </form>
      ) : (
        <form
          className="mt-6 space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const ok = await run(async () => {
              await resetPassword(email, code, pw);
              return true;
            }, 'Senha alterada. Entre com a nova senha.');
            if (ok) go('/entrar');
          }}
        >
          <p className="text-sm text-muted">Se existir uma conta com esse e-mail, enviamos um código de 6 dígitos válido por 15 minutos.</p>
          <div className={cx('rounded-xl border border-dashed border-amber-300 bg-amber-50 p-3 text-sm text-amber-900')}>
            <b>Caixa de entrada de demonstração:</b> o envio de e-mail não está integrado neste ambiente.{' '}
            {demoCode ? <>Código gerado: <b className="tracking-widest">{demoCode}</b></> : 'Nenhuma conta encontrada para este e-mail.'}
          </div>
          <Field label="Código">
            <input className={inputCls} inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value)} />
          </Field>
          <Field label="Nova senha" hint="Mínimo de 8 caracteres, com letras e números.">
            <input className={inputCls} type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" />
          </Field>
          <Button className="w-full" loading={busy}>
            Alterar senha
          </Button>
        </form>
      )}
      <button className="mt-4 text-sm font-semibold text-brand-700" onClick={() => go('/entrar')}>
        Voltar para entrar
      </button>
    </>
  );
}
