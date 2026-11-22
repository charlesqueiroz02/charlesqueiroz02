import { ClipboardList, Compass, Home as HomeIcon, MessageCircle, User as UserIcon, WifiOff } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { Spinner, Toasts } from './components/ui';
import { initStore, useStore } from './data/store';
import { isAdmin } from './lib/permissions';
import { go, match, useRoute } from './lib/router';
import { cx } from './lib/utils';
import { Admin } from './screens/Admin';
import { AuthScreen } from './screens/Auth';
import { Board } from './screens/Board';
import { Dashboard } from './screens/Dashboard';
import { Explore } from './screens/Explore';
import { Home } from './screens/Home';
import { Legal } from './screens/Legal';
import { Chat, Inbox } from './screens/Messages';
import { Notifications } from './screens/Notifications';
import { OrderDetail, Orders, RequestDetail } from './screens/Orders';
import { Plans } from './screens/Plans';
import { ProEditor } from './screens/ProEditor';
import { ProProfileScreen } from './screens/ProProfile';
import { Account, Privacy, ProfileHub, Saved } from './screens/Profile';
import { RequestForm } from './screens/RequestForm';

function useOnline() {
  const [on, setOn] = useState(navigator.onLine);
  useEffect(() => {
    const a = () => setOn(true);
    const b = () => setOn(false);
    addEventListener('online', a);
    addEventListener('offline', b);
    return () => {
      removeEventListener('online', a);
      removeEventListener('offline', b);
    };
  }, []);
  return on;
}

const TABS = [
  { path: '/', label: 'Início', icon: HomeIcon, match: (p: string) => p === '/' },
  { path: '/explorar', label: 'Explorar', icon: Compass, match: (p: string) => p.startsWith('/explorar') || p.startsWith('/p/') || p.startsWith('/mural') },
  { path: '/pedidos', label: 'Pedidos', icon: ClipboardList, match: (p: string) => /^\/(pedido|solicita)/.test(p) },
  { path: '/mensagens', label: 'Mensagens', icon: MessageCircle, match: (p: string) => p.startsWith('/mensagens') },
  { path: '/perfil', label: 'Perfil', icon: UserIcon, match: (p: string) => /^\/(perfil|painel|admin|planos|salvos|notificacoes)/.test(p) },
];

export default function App() {
  const [ready, setReady] = useState(false);
  const [fatal, setFatal] = useState<string | null>(null);
  useEffect(() => {
    initStore().then(() => setReady(true)).catch((e) => setFatal(String(e)));
  }, []);
  if (fatal) return <p className="p-6 text-red-700">Não foi possível iniciar o aplicativo: {fatal}</p>;
  if (!ready) return <Spinner />;
  return <Shell />;
}

function Shell() {
  const path = useRoute();
  const online = useOnline();
  const { db, me } = useStore();
  const unreadMsgs = me
    ? db.messages.filter((m) => !m.readBy.includes(me.id) && m.senderId !== me.id && db.conversations.some((c) => c.id === m.convId && (c.clientId === me.id || c.proUserId === me.id))).length
    : 0;

  const authRoutes = ['/entrar', '/cadastro', '/recuperar'];
  const isAuth = authRoutes.includes(path);
  const publicRoute = path === '/' || path.startsWith('/explorar') || path.startsWith('/p/') || path === '/termos' || path === '/privacidade' || path === '/planos';
  const hideNav = isAuth || /^\/mensagens\/.+/.test(path);

  let screen: ReactNode;
  if (isAuth) screen = <AuthScreen mode={path.slice(1) as 'entrar' | 'cadastro' | 'recuperar'} />;
  else if (!me && !publicRoute) screen = <AuthScreen mode="entrar" gated />;
  else screen = route(path, !!me && isAdmin(me));

  return (
    <div className={cx('mx-auto min-h-dvh max-w-2xl bg-bg', me?.lowComplexity && 'lowc')}>
      <Toasts />
      {!online && (
        <div className="sticky top-0 z-40 flex items-center justify-center gap-2 bg-stone-800 px-3 py-1.5 text-xs font-medium text-white">
          <WifiOff className="size-3.5" /> Sem conexão. Você pode navegar pelo que já está salvo neste aparelho.
        </div>
      )}
      <main className={cx(!hideNav && 'pb-24')}>{screen}</main>
      {!hideNav && (
        <nav aria-label="Navegação principal" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 backdrop-blur safe-b">
          <div className="mx-auto grid max-w-2xl grid-cols-5">
            {TABS.map((t) => {
              const active = t.match(path);
              return (
                <button key={t.path} onClick={() => go(t.path)} aria-current={active ? 'page' : undefined} className={cx('relative flex flex-col items-center gap-0.5 pt-2 pb-1 text-[11px] font-semibold', active ? 'text-brand-800' : 'text-muted')}>
                  <t.icon className={cx('size-[22px]', active && 'stroke-[2.4]')} />
                  {t.label}
                  {t.path === '/mensagens' && unreadMsgs > 0 && (
                    <span className="absolute top-1 left-1/2 ml-2 grid h-4 min-w-4 place-items-center rounded-full bg-lime-500 px-1 text-[10px] text-white">{unreadMsgs}</span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}

function route(path: string, admin: boolean): ReactNode {
  let m: Record<string, string> | null;
  if (path === '/') return <Home />;
  if (path === '/explorar') return <Explore key={location.hash} />;
  if ((m = match('/p/:slug', path))) return <ProProfileScreen slug={m.slug!} />;
  if ((m = match('/solicitar/:proId', path))) return <RequestForm proId={m.proId!} />;
  if (path === '/solicitar') return <RequestForm />;
  if (path === '/pedidos') return <Orders />;
  if ((m = match('/solicitacao/:id', path))) return <RequestDetail id={m.id!} />;
  if ((m = match('/pedido/:id', path))) return <OrderDetail id={m.id!} />;
  if (path === '/mensagens') return <Inbox />;
  if ((m = match('/mensagens/:id', path))) return <Chat id={m.id!} />;
  if (path === '/perfil') return <ProfileHub />;
  if (path === '/perfil/conta') return <Account />;
  if (path === '/perfil/vitrine') return <ProEditor />;
  if (path === '/perfil/privacidade') return <Privacy />;
  if (path === '/salvos') return <Saved />;
  if (path === '/painel') return <Dashboard />;
  if (path === '/mural') return <Board />;
  if (path === '/planos') return <Plans />;
  if (path === '/notificacoes') return <Notifications />;
  if (path === '/admin') return admin ? <Admin /> : <Legal kind="403" />;
  if (path === '/termos') return <Legal kind="termos" />;
  if (path === '/privacidade') return <Legal kind="privacidade" />;
  return <Legal kind="404" />;
}
