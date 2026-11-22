import { Bell } from 'lucide-react';
import { useEffect } from 'react';
import { EmptyState, TopBar } from '../components/ui';
import { markAllNotificationsRead } from '../data/actions';
import { useStore } from '../data/store';
import { go } from '../lib/router';
import { cx, timeAgo } from '../lib/utils';

export function Notifications() {
  const { db, me } = useStore();
  const list = db.notifications.filter((n) => n.userId === me!.id);
  const unreadIds = list.filter((n) => !n.read).map((n) => n.id);
  useEffect(() => {
    if (unreadIds.length) {
      const t = setTimeout(markAllNotificationsRead, 1500);
      return () => clearTimeout(t);
    }
  }, [unreadIds.length]);
  return (
    <div>
      <TopBar title="Notificações" back={true} />
      {!list.length && <EmptyState icon={<Bell />} title="Nenhuma notificação" />}
      <ul className="divide-y divide-line">
        {list.map((n) => (
          <li key={n.id}>
            <button onClick={() => go(n.link)} className={cx('flex w-full gap-3 px-4 py-3.5 text-left', !n.read && 'bg-brand-50/60')}>
              <span className={cx('mt-1.5 size-2 shrink-0 rounded-full', n.read ? 'bg-transparent' : 'bg-lime-500')} />
              <span className="flex-1">
                <span className={cx('block', !n.read && 'font-semibold')}>{n.text}</span>
                <span className="text-xs text-muted">{timeAgo(n.at)}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <p className="px-4 py-6 text-center text-xs text-muted">Avisos por push, e-mail ou SMS serão enviados somente quando esses canais forem integrados e autorizados por você.</p>
    </div>
  );
}
