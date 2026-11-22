import { Clock, MapPin, Megaphone, Sprout, Zap } from 'lucide-react';
import { AVAILABILITY_LABEL } from '../data/catalog';
import { go } from '../lib/router';
import type { Ranked } from '../lib/search';
import { brl, cx } from '../lib/utils';
import type { Category } from '../types';
import { Avatar, Badge, DemoTag, Stars, TrustRow } from './ui';

export function ProCard({ r, categories, sponsored, wide }: { r: Ranked; categories: Category[]; sponsored?: boolean; wide?: boolean }) {
  const { pro, stats, km, servesArea } = r;
  const catNames = pro.categories.map((c) => categories.find((x) => x.id === c)?.name).filter(Boolean);
  return (
    <button
      onClick={() => go(`/p/${pro.slug}`)}
      className={cx('flex flex-col gap-3 rounded-2xl border bg-white p-4 text-left transition hover:border-brand-200', sponsored ? 'border-lime-400/60' : 'border-line', wide ? 'w-full' : 'w-[290px] shrink-0')}
    >
      <div className="flex gap-3">
        <Avatar name={pro.displayName} hue={pro.avatarHue} photo={pro.photo} size={56} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {sponsored && (
              <Badge tone="lime">
                <Megaphone className="size-3" /> Patrocinado
              </Badge>
            )}
            {pro.demo && <DemoTag />}
          </div>
          <p className="mt-0.5 truncate font-bold leading-tight">{pro.displayName}</p>
          <p className="truncate text-[13px] text-muted">{catNames.join(' · ')}</p>
          <div className="mt-1 flex items-center gap-1.5 text-[13px]">
            {stats.reviewCount > 0 ? (
              <>
                <Stars value={stats.avg!} size={13} />
                <span className="font-semibold">{stats.avg!.toFixed(1)}</span>
                <span className="text-muted">({stats.reviewCount})</span>
              </>
            ) : (
              <span className="inline-flex items-center gap-1 text-muted">
                <Sprout className="size-3.5 text-lime-600" /> Ainda sem avaliações
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[13px] text-muted">
        <span className="inline-flex items-center gap-1">
          <MapPin className="size-3.5" />
          {servesArea ? 'Atende seu bairro' : km !== undefined ? `~${km.toLocaleString('pt-BR')} km` : pro.neighborhoods[0]}
        </span>
        <span className={cx('inline-flex items-center gap-1', pro.availability === 'hoje' && 'font-semibold text-lime-600')}>
          <Clock className="size-3.5" />
          {AVAILABILITY_LABEL[pro.availability]}
        </span>
        {pro.urgent && (
          <span className="inline-flex items-center gap-1">
            <Zap className="size-3.5" /> Urgências
          </span>
        )}
        {stats.minPrice !== undefined && <span>a partir de {brl(stats.minPrice)}</span>}
      </div>
      <TrustRow identity={pro.identityVerified} confirmedJobs={stats.confirmedJobs} references={stats.references} compact />
    </button>
  );
}
